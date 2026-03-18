const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const createOrder = async (amount, currency = 'INR', description = '', customerId = '') => {
    try {
        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency,
            description,
            customer_notify: 1,
            notes: {
                userId: customerId
            }
        };

        const order = await razorpay.orders.create(options);
        return {
            success: true,
            order
        };
    } catch (error) {
        console.error('Razorpay Order Creation Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

const verifyPayment = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
    try {
        const body = razorpayOrderId + '|' + razorpayPaymentId;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isValid = expectedSignature === razorpaySignature;
        return {
            isValid,
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId
        };
    } catch (error) {
        console.error('Payment Verification Error:', error);
        return {
            isValid: false,
            error: error.message
        };
    }
};

const getPaymentDetails = async (paymentId) => {
    try {
        const payment = await razorpay.payments.fetch(paymentId);
        return {
            success: true,
            payment
        };
    } catch (error) {
        console.error('Fetch Payment Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

const refundPayment = async (paymentId, amount = null, description = '') => {
    try {
        const options = {
            payment_id: paymentId
        };

        if (amount) {
            options.amount = amount * 100; // Convert to paise
        }

        if (description) {
            options.notes = { reason: description };
        }

        const refund = await razorpay.payments.refund(paymentId, options);
        return {
            success: true,
            refund
        };
    } catch (error) {
        console.error('Refund Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

const createCustomer = async (email, phone, name) => {
    try {
        const customer = await razorpay.customers.create({
            email,
            phone,
            name
        });
        return {
            success: true,
            customer
        };
    } catch (error) {
        console.error('Customer Creation Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Webhook handler for Razorpay events
const handleRazorpayWebhook = (event) => {
    const supportedEvents = [
        'order.paid',
        'payment.failed',
        'payment.authorized',
        'refund.created',
        'refund.failed'
    ];

    if (!supportedEvents.includes(event.event)) {
        return { success: false, message: 'Unsupported event' };
    }

    return {
        success: true,
        event: event.event,
        data: event.payload
    };
};

module.exports = {
    createOrder,
    verifyPayment,
    getPaymentDetails,
    refundPayment,
    createCustomer,
    handleRazorpayWebhook
};
