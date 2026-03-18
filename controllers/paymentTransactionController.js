const Transaction = require('../models/Transaction');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ComplianceLog = require('../models/ComplianceLog');
const { v1: uuidv1 } = require('uuid');
const paymentGateway = require('../utils/paymentGateway');
const { sendTransactionEmail } = require('../utils/notificationService');

// @desc    Create Payment Order
// @route   POST /api/payments/create-order
// @access  Private
const createPaymentOrder = async (req, res) => {
    try {
        const { amount, description, type } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        if (!type || !['deposit', 'withdrawal'].includes(type)) {
            return res.status(400).json({ message: 'Invalid transaction type' });
        }

        // Create Razorpay order
        const order = await paymentGateway.createOrder(
            amount,
            'INR',
            description,
            req.user._id
        );

        if (!order.success) {
            return res.status(500).json({ message: 'Failed to create payment order' });
        }

        // Create Transaction record
        const transaction = await Transaction.create({
            transactionId: uuidv1(),
            user: req.user._id,
            type,
            amount,
            currency: 'INR',
            paymentGateway: 'razorpay',
            paymentGatewayOrderId: order.order.id,
            status: 'pending',
            ipAddress: req.ip,
            description: description
        });

        res.json({
            order: order.order,
            transaction: {
                _id: transaction._id,
                transactionId: transaction.transactionId
            }
        });
    } catch (error) {
        console.error('Create Payment Order Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Payment
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: 'Missing payment verification details' });
        }

        // Verify signature
        const verification = paymentGateway.verifyPayment(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!verification.isValid) {
            // Log suspicious activity
            await ComplianceLog.create({
                user: req.user._id,
                action: 'transaction_failed',
                details: { reason: 'Payment signature verification failed' },
                ipAddress: req.ip,
                status: 'failed',
                severity: 'critical',
                flaggedAsAnomalous: true
            });

            return res.status(401).json({ message: 'Payment verification failed' });
        }

        // Update transaction
        const transaction = await Transaction.findOne({ transactionId });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        transaction.status = 'completed';
        transaction.paymentGatewayId = razorpay_payment_id;
        transaction.paymentGatewaySignature = razorpay_signature;
        transaction.completedAt = new Date();
        transaction.isVerified = true;
        await transaction.save();

        // Update user balance if deposit
        if (transaction.type === 'deposit') {
            await User.findByIdAndUpdate(
                req.user._id,
                { $inc: { wallet: transaction.amount } }
            );
        }

        // Create notification
        await Notification.create({
            recipient: req.user._id,
            type: 'payment_success',
            title: 'Payment Successful',
            message: `Your ${transaction.type} of ₹${transaction.amount} has been processed`,
            channels: ['in_app', 'email'],
            email: req.user.email,
            status: 'sent'
        });

        // Send email
        await sendTransactionEmail(req.user.email, req.user.firstName, {
            transactionId: transaction.transactionId,
            amount: transaction.amount,
            type: transaction.type,
            status: 'completed',
            timestamp: transaction.completedAt
        });

        // Log compliance event
        await ComplianceLog.create({
            user: req.user._id,
            action: 'transaction_completed',
            details: {
                amount: transaction.amount,
                type: transaction.type,
                paymentGatewayId: razorpay_payment_id
            },
            transactionId: transaction._id,
            ipAddress: req.ip,
            status: 'success'
        });

        res.json({
            message: 'Payment verified successfully',
            transaction
        });
    } catch (error) {
        console.error('Verify Payment Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Transaction History
// @route   GET /api/payments/history
// @access  Private
const getTransactionHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10, type, status } = req.query;

        const query = { user: req.user._id };
        if (type) query.type = type;
        if (status) query.status = status;

        const skip = (page - 1) * limit;

        const transactions = await Transaction.find(query)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Transaction.countDocuments(query);

        res.json({
            transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get Transaction History Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Transaction Details
// @route   GET /api/payments/:transactionId
// @access  Private
const getTransactionDetails = async (req, res) => {
    try {
        const { transactionId } = req.params;

        const transaction = await Transaction.findById(transactionId);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Verify ownership
        if (transaction.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        res.json({ transaction });
    } catch (error) {
        console.error('Get Transaction Details Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Refund Payment
// @route   POST /api/payments/:transactionId/refund
// @access  Private/Admin
const refundPayment = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { reason } = req.body;

        const transaction = await Transaction.findById(transactionId);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.status !== 'completed') {
            return res.status(400).json({ message: 'Only completed transactions can be refunded' });
        }

        // Process refund
        const refund = await paymentGateway.refundPayment(
            transaction.paymentGatewayId,
            transaction.amount,
            reason
        );

        if (!refund.success) {
            return res.status(500).json({ message: 'Refund failed' });
        }

        transaction.status = 'refunded';
        transaction.metadata = { refundReason: reason, refundInfo: refund.refund };
        await transaction.save();

        // Update user balance
        await User.findByIdAndUpdate(
            transaction.user,
            { $inc: { wallet: transaction.amount } }
        );

        // Create notification
        const user = await User.findById(transaction.user);
        await Notification.create({
            recipient: transaction.user,
            type: 'refund',
            title: 'Refund Processed',
            message: `Your refund of ₹${transaction.amount} has been processed`,
            channels: ['in_app', 'email'],
            email: user.email,
            status: 'sent'
        });

        res.json({
            message: 'Refund processed successfully',
            transaction
        });
    } catch (error) {
        console.error('Refund Payment Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createPaymentOrder,
    verifyPayment,
    getTransactionHistory,
    getTransactionDetails,
    refundPayment
};
