const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Basic Information
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    mobile: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    firstName: String,
    lastName: String,
    
    // Bank Information
    bankName: {
        type: String,
        trim: true,
        default: 'Pending'
    },
    bankAccount: {
        type: String,
        trim: true,
        default: 'Pending'
    },
    bankIfscCode: String,
    
    // Role and Status
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'compliance_officer', 'conductor', 'participant', 'support_agent', 'financial_advisor'],
        default: 'participant'
    },
    status: {
        type: String,
        enum: ['active', 'blocked', 'suspended', 'pending_verification'],
        default: 'active'
    },
    
    // KYC and Verification
    kycVerified: {
        type: Boolean,
        default: false
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    phoneVerified: {
        type: Boolean,
        default: false
    },
    
    // Security
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    ipWhitelistEnabled: {
        type: Boolean,
        default: false
    },
    whitelistedIPs: [String],
    
    // Failed Login Attempts
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    lockedUntil: Date,
    
    // Financial Information
    wallet: {
        type: Number,
        default: 0
    },
    totalDeposits: {
        type: Number,
        default: 0
    },
    totalWithdrawals: {
        type: Number,
        default: 0
    },
    accountBalance: {
        type: Number,
        default: 0
    },
    
    // Transaction Limits
    dailyTransactionLimit: {
        type: Number,
        default: 100000
    },
    monthlyTransactionLimit: {
        type: Number,
        default: 1000000
    },
    
    // Notification Preferences
    emailNotificationsEnabled: {
        type: Boolean,
        default: true
    },
    smsNotificationsEnabled: {
        type: Boolean,
        default: true
    },
    pushNotificationsEnabled: {
        type: Boolean,
        default: true
    },
    inAppNotificationsEnabled: {
        type: Boolean,
        default: true
    },
    securityAlertsEnabled: {
        type: Boolean,
        default: true
    },
    transactionAlertsEnabled: {
        type: Boolean,
        default: true
    },
    auctionUpdatesEnabled: {
        type: Boolean,
        default: true
    },
    weeklyDigestEnabled: {
        type: Boolean,
        default: true
    },
    
    // Activity Tracking
    lastLogin: Date,
    lastLoginIP: String,
    lastPasswordChange: Date,
    lastSecurityAudit: Date,
    deviceCount: {
        type: Number,
        default: 0
    },
    
    // Compliance Flags
    riskScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    flaggedForReview: {
        type: Boolean,
        default: false
    },
    complianceNotes: String,
    
    // Account Information
    accountCreatedFrom: String,
    accountCreatedIP: String,
    accountUpgradedAt: Date,
    
    // Privacy and Preferences
    acceptedTerms: {
        type: Boolean,
        default: false
    },
    acceptedPrivacyPolicy: {
        type: Boolean,
        default: false
    },
    acceptedTermsAt: Date,
    
    // Session Management
    activeSessions: [{
        sessionId: String,
        deviceId: String,
        ipAddress: String,
        loginTime: Date,
        lastActivityTime: Date,
        expiresAt: Date
    }],
    
    // Metadata
    metadata: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isAccountLocked = function () {
    return this.lockedUntil && this.lockedUntil > new Date();
};

userSchema.index({ email: 1, status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ flaggedForReview: 1 });
userSchema.index({ lastLogin: -1 });

module.exports = mongoose.model('User', userSchema);
