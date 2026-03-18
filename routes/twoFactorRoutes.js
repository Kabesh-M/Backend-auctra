const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/advancedAuthMiddleware');
const {
    setup2FA,
    verify2FA,
    disable2FA,
    sendOTPViaEmail,
    verifyOTP,
    get2FAStatus
} = require('../controllers/twoFactorController');

// Setup 2FA
router.post('/setup', protect, setup2FA);

// Verify 2FA
router.post('/verify', protect, verify2FA);

// Disable 2FA
router.post('/disable', protect, disable2FA);

// Send OTP via Email
router.post('/send-otp', sendOTPViaEmail);

// Verify OTP
router.post('/verify-otp', verifyOTP);

// Get 2FA Status
router.get('/status', protect, get2FAStatus);

module.exports = router;
