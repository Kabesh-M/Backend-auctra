const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        unique: true,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'bid_amount', 'chit_payment', 'chit_payout', 'refund', 'fee'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    
    // Payment Gateway Information
    paymentGateway: {
        type: String,
        enum: ['razorpay', 'stripe', 'bank_transfer', 'wallet'],
        default: 'razorpay'
    },
    paymentGatewayId: String,
    paymentGatewayOrderId: String,
    paymentGatewaySignature: String,
    
    // Status
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
        required: true,
        default: 'pending'
    },
    
    // Bank Details
    bankName: String,
    bankAccount: String,
    bankIfsc: String,
    utrNumber: String,
    
    // Related Entities
    relatedAuction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Auction'
    },
    relatedChit: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chit'
    },
    relatedBid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bid'
    },
    
    // Timestamps
    initiatedAt: {
        type: Date,
        default: Date.now
    },
    processedAt: Date,
    completedAt: Date,
    
    // Security
    ipAddress: String,
    deviceId: String,
    
    // Verification
    isVerified: {
        type: Boolean,
        default: false
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: Date,
    
    // Error Handling
    errorMessage: String,
    retryCount: {
        type: Number,
        default: 0
    },
    
    // Reconciliation
    isReconciled: {
        type: Boolean,
        default: false
    },
    reconciledAt: Date,
    reconciledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Risk
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
    
    // Metadata
    description: String,
    metadata: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ paymentGatewayId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ flaggedForReview: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
