const express = require('express');
const router = express.Router();
const { protect, rolePermission } = require('../middleware/advancedAuthMiddleware');
const {
    createPaymentOrder,
    verifyPayment,
    getTransactionHistory,
    getTransactionDetails,
    refundPayment
} = require('../controllers/paymentTransactionController');

// Create Payment Order
router.post('/create-order', protect, createPaymentOrder);

// Verify Payment
router.post('/verify', protect, verifyPayment);

// Get Transaction History
router.get('/history', protect, getTransactionHistory);

// Get Transaction Details
router.get('/:transactionId', protect, getTransactionDetails);

// Refund Payment (Admin only)
router.post('/:transactionId/refund', protect, rolePermission(['admin']), refundPayment);

module.exports = router;
