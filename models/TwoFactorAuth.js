const mongoose = require('mongoose');

const twoFactorAuthSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    secret: {
        type: String,
        required: true
    },
    backupCodes: [{
        code: String,
        used: {
            type: Boolean,
            default: false
        }
    }],
    isEnabled: {
        type: Boolean,
        default: false
    },
    emailOtpSecret: String,
    emailOtpExpiry: Date,
    phoneOtpSecret: String,
    phoneOtpExpiry: Date,
    trustedDevices: [{
        deviceId: String,
        deviceName: String,
        lastUsed: Date,
        ipAddress: String,
        userAgent: String,
        isTrusted: Boolean
    }],
    lastVerified: Date,
    failedAttempts: {
        type: Number,
        default: 0
    },
    lockedUntil: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('TwoFactorAuth', twoFactorAuthSchema);
