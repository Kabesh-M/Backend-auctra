const mongoose = require('mongoose');

const complianceLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    action: {
        type: String,
        required: true,
        enum: [
            'login',
            'logout',
            'password_change',
            'kyc_submission',
            'kyc_approval',
            'kyc_rejection',
            '2fa_enabled',
            '2fa_disabled',
            'device_trusted',
            'device_revoked',
            'transaction_initiated',
            'transaction_completed',
            'transaction_failed',
            'withdrawal_requested',
            'deposit_processed',
            'account_locked',
            'account_unlocked',
            'suspicious_activity',
            'access_denied',
            'permission_granted',
            'data_export',
            'settings_changed',
            'failed_login_attempt',
            'high_value_transaction'
        ]
    },
    details: {
        description: String,
        changes: mongoose.Schema.Types.Mixed,
        previousValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed
    },
    ipAddress: String,
    userAgent: String,
    deviceInfo: {
        type: String,
        os: String,
        browser: String,
        deviceId: String
    },
    location: {
        latitude: Number,
        longitude: Number,
        country: String,
        city: String,
        region: String
    },
    riskScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    flaggedAsAnomalous: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['success', 'failed', 'suspicious', 'blocked'],
        default: 'success'
    },
    transactionId: mongoose.Schema.Types.ObjectId,
    relatedAuction: mongoose.Schema.Types.ObjectId,
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'info'
    },
    requiresManualReview: {
        type: Boolean,
        default: false
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewNotes: String,
    reviewedAt: Date
}, {
    timestamps: true
});

complianceLogSchema.index({ user: 1, createdAt: -1 });
complianceLogSchema.index({ action: 1, createdAt: -1 });
complianceLogSchema.index({ flaggedAsAnomalous: 1 });
complianceLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model('ComplianceLog', complianceLogSchema);
