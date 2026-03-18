const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const TwoFactorAuth = require('../models/TwoFactorAuth');
const User = require('../models/User');
const ComplianceLog = require('../models/ComplianceLog');
const { generateOTP, generateSecureToken } = require('../utils/encryptionUtils');
const { sendOTPEmail, sendSecurityAlert } = require('../utils/notificationService');

// @desc    Generate 2FA Secret
// @route   POST /api/auth/2fa/setup
// @access  Private
const setup2FA = async (req, res) => {
    try {
        const existingAuth = await TwoFactorAuth.findOne({ user: req.user._id });
        
        if (existingAuth && existingAuth.isEnabled) {
            return res.status(400).json({ message: '2FA is already enabled for your account' });
        }

        const secret = speakeasy.generateSecret({
            name: `Auctra (${req.user.email})`,
            issuer: 'Auctra',
            length: 32
        });

        // Generate backup codes
        const backupCodes = Array.from({ length: 10 }, () => ({
            code: generateSecureToken(8),
            used: false
        }));

        if (existingAuth) {
            existingAuth.secret = secret.base32;
            existingAuth.backupCodes = backupCodes;
            await existingAuth.save();
        } else {
            await TwoFactorAuth.create({
                user: req.user._id,
                secret: secret.base32,
                backupCodes
            });
        }

        // Generate QR code
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

        res.json({
            message: '2FA setup initiated',
            qrCode: qrCodeUrl,
            secret: secret.base32,
            backupCodes: backupCodes.map(b => b.code)
        });
    } catch (error) {
        console.error('2FA Setup Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify 2FA
// @route   POST /api/auth/2fa/verify
// @access  Private
const verify2FA = async (req, res) => {
    try {
        const { token, useBackupCode } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'OTP token is required' });
        }

        let twoFactor = await TwoFactorAuth.findOne({ user: req.user._id });

        if (!twoFactor) {
            return res.status(400).json({ message: '2FA is not set up for your account' });
        }

        // Check if account is locked
        if (twoFactor.lockedUntil && twoFactor.lockedUntil > new Date()) {
            return res.status(429).json({ message: 'Account locked due to multiple failed attempts. Please try again later.' });
        }

        let isValid = false;

        if (useBackupCode) {
            const backupCode = twoFactor.backupCodes.find(b => b.code === token && !b.used);
            if (backupCode) {
                backupCode.used = true;
                isValid = true;
            }
        } else {
            isValid = speakeasy.totp.verify({
                secret: twoFactor.secret,
                encoding: 'base32',
                token,
                window: 2
            });
        }

        if (!isValid) {
            twoFactor.failedAttempts += 1;
            if (twoFactor.failedAttempts >= 5) {
                twoFactor.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
                await ComplianceLog.create({
                    user: req.user._id,
                    action: 'suspicious_activity',
                    details: { reason: 'Multiple failed 2FA attempts' },
                    severity: 'warning',
                    flaggedAsAnomalous: true
                });
            }
            await twoFactor.save();
            return res.status(401).json({ message: 'Invalid OTP token' });
        }

        // Reset failed attempts on success
        twoFactor.failedAttempts = 0;
        twoFactor.isEnabled = true;
        twoFactor.lastVerified = new Date();
        await twoFactor.save();

        // Log compliance event
        await ComplianceLog.create({
            user: req.user._id,
            action: '2fa_enabled',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            status: 'success'
        });

        res.json({ message: '2FA verified and enabled successfully' });
    } catch (error) {
        console.error('2FA Verification Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Disable 2FA
// @route   POST /api/auth/2fa/disable
// @access  Private
const disable2FA = async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        const user = await User.findById(req.user._id);
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const twoFactor = await TwoFactorAuth.findOne({ user: req.user._id });

        if (!twoFactor || !twoFactor.isEnabled) {
            return res.status(400).json({ message: '2FA is not enabled for your account' });
        }

        twoFactor.isEnabled = false;
        twoFactor.failedAttempts = 0;
        await twoFactor.save();

        // Send security alert
        await sendSecurityAlert(
            req.user.email,
            req.user.firstName,
            'Two-Factor Authentication has been disabled on your account.',
            `${process.env.FRONTEND_URL}/security`
        );

        // Log compliance event
        await ComplianceLog.create({
            user: req.user._id,
            action: '2fa_disabled',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            status: 'success',
            severity: 'warning'
        });

        res.json({ message: '2FA has been disabled' });
    } catch (error) {
        console.error('2FA Disable Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send OTP via Email
// @route   POST /api/auth/2fa/send-otp
// @access  Public
const sendOTPViaEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        let twoFactor = await TwoFactorAuth.findOne({ user: user._id });

        if (!twoFactor) {
            twoFactor = await TwoFactorAuth.create({
                user: user._id,
                emailOtpSecret: otp,
                emailOtpExpiry: otpExpiry
            });
        } else {
            twoFactor.emailOtpSecret = otp;
            twoFactor.emailOtpExpiry = otpExpiry;
            await twoFactor.save();
        }

        // Send OTP email
        const result = await sendOTPEmail(email, otp, user.firstName);

        if (!result.success) {
            return res.status(500).json({ message: 'Failed to send OTP' });
        }

        res.json({ message: 'OTP sent to your email' });
    } catch (error) {
        console.error('Send OTP Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/2fa/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const twoFactor = await TwoFactorAuth.findOne({ user: user._id });

        if (!twoFactor || !twoFactor.emailOtpSecret || !twoFactor.emailOtpExpiry) {
            return res.status(400).json({ message: 'OTP not found or expired' });
        }

        if (new Date() > twoFactor.emailOtpExpiry) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        if (twoFactor.emailOtpSecret !== otp) {
            return res.status(401).json({ message: 'Invalid OTP' });
        }

        twoFactor.emailOtpSecret = null;
        twoFactor.emailOtpExpiry = null;
        await twoFactor.save();

        res.json({ message: 'OTP verified successfully' });
    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get 2FA Status
// @route   GET /api/auth/2fa/status
// @access  Private
const get2FAStatus = async (req, res) => {
    try {
        const twoFactor = await TwoFactorAuth.findOne({ user: req.user._id })
            .select('isEnabled lastVerified trustedDevices -backupCodes -secret');

        res.json({
            isEnabled: twoFactor?.isEnabled || false,
            lastVerified: twoFactor?.lastVerified,
            trustedDevices: twoFactor?.trustedDevices || []
        });
    } catch (error) {
        console.error('Get 2FA Status Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    setup2FA,
    verify2FA,
    disable2FA,
    sendOTPViaEmail,
    verifyOTP,
    get2FAStatus
};
