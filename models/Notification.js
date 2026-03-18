const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: [
            'payment_success',
            'payment_failed',
            'auction_start',
            'auction_end',
            'bid_placed',
            'bid_outbid',
            'kyc_approved',
            'kyc_rejected',
            'security_alert',
            'account_update',
            'withdrawal',
            'deposit',
            'transaction_alert',
            'account_locked',
            'login_notification',
            'password_changed'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    description: String,
    
    // Recipient Details
    email: String,
    phone: String,
    
    // Notification Channels
    channels: [{
        type: String,
        enum: ['in_app', 'email', 'sms', 'push'],
        default: 'in_app'
    }],
    
    // Status
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'read'],
        default: 'pending'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: Date,
    
    // Related Data
    relatedEntity: {
        entityType: String,
        entityId: mongoose.Schema.Types.ObjectId
    },
    
    // Delivery Tracking
    sentAt: Date,
    failureReason: String,
    retryCount: {
        type: Number,
        default: 0
    },
    
    // Action Link
    actionUrl: String,
    actionText: String,
    
    // Priority
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    
    // Expiry
    expiresAt: Date
}, {
    timestamps: true
});

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);
