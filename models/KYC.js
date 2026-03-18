const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['pending', 'submitted', 'under_review', 'approved', 'rejected', 'expires_soon'],
        default: 'pending'
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    dateOfBirth: Date,
    gender: String,
    nationality: String,
    
    // Address Information
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    
    // Document Information
    documentType: {
        type: String,
        enum: ['passport', 'aadhar', 'driver_license', 'pan'],
        required: true
    },
    documentNumber: {
        type: String,
        required: true
    },
    documentExpiry: Date,
    documentImages: [{
        type: String,
        url: String,
        uploadedAt: Date
    }],
    
    // Bank Information (Encrypted)
    bankAccountNumber: String,
    bankIfscCode: String,
    bankName: String,
    accountHolderName: String,
    accountType: {
        type: String,
        enum: ['savings', 'current', 'business']
    },
    bankVerificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'failed'],
        default: 'pending'
    },
    
    // PEP (Politically Exposed Person) and Sanctions Check
    pepStatus: {
        type: String,
        enum: ['clear', 'under_review', 'flagged'],
        default: 'clear'
    },
    sanctionsCheckStatus: {
        type: String,
        enum: ['clear', 'under_review', 'flagged'],
        default: 'clear'
    },
    
    // Submission Details
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectionReason: String,
    approvalNotes: String,
    
    // Verification
    emailVerified: {
        type: Boolean,
        default: false
    },
    phoneVerified: {
        type: Boolean,
        default: false
    },
    documentVerified: {
        type: Boolean,
        default: false
    },
    
    // Expiry and Re-verification
    approvalDate: Date,
    expiryDate: Date,
    nextReviewDate: Date,
    
    // Risk Assessment
    riskScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('KYC', kycSchema);
