const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: [
            'super_admin',
            'admin',
            'compliance_officer',
            'conductor',
            'participant',
            'support_agent',
            'financial_advisor'
        ]
    },
    description: String,
    
    // Permissions
    permissions: [{
        resource: String,
        actions: [String]  // ['read', 'create', 'update', 'delete', 'export']
    }],
    
    // Feature Access
    featureAccess: {
        canCreateAuctions: Boolean,
        canApproveAuctions: Boolean,
        canManageUsers: Boolean,
        canViewReports: Boolean,
        canExportData: Boolean,
        canManageFunds: Boolean,
        canAccessCompliance: Boolean,
        canViewAuditLogs: Boolean,
        canApproveKYC: Boolean,
        canManageRoles: Boolean
    },
    
    // Limitations
    limitations: {
        maxAuctionsPerMonth: Number,
        maxBidAmount: Number,
        maxWithdrawalAmount: Number,
        dailyTransactionLimit: Number
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // System Generated
    isSystem: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Role', roleSchema);
