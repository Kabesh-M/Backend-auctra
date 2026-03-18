const Payment = require('../models/Payment');
const Auction = require('../models/Auction');
const Participant = require('../models/Participant');

// @desc    Initiate a UPI payment (Mock)
// @route   POST /api/payments/initiate
// @access  Private
const initiatePayment = async (req, res) => {
    const { auctionId, amount } = req.body;

    try {
        const participant = await Participant.findOne({ user: req.user._id });
        if (!participant) return res.status(404).json({ message: 'Participant not found' });

        // Mock UPI Gateway logic
        // In production, integration with Razorpay/PhonePe would happen here
        const payment = await Payment.create({
            auction: auctionId,
            participant: participant._id,
            amount,
            mode: 'UPI',
            status: 'pending'
        });

        // Mock successful response with VPA/Intent URL
        res.json({
            success: true,
            paymentId: payment._id,
            upiIntent: `upi://pay?pa=auctra@bank&am=${amount}&tr=${payment._id}&tn=AuctraContribution`
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify payment (Mock)
// @route   POST /api/payments/verify/:id
// @access  Private
const verifyPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ message: 'Payment record not found' });

        // Mock verification: Always successes in mock
        payment.status = 'confirmed';
        await payment.save();

        res.json({ success: true, message: 'Payment confirmed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { initiatePayment, verifyPayment };
