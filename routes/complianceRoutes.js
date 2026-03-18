const express = require('express');
const router = express.Router();
const { protect, rolePermission } = require('../middleware/advancedAuthMiddleware');
const {
    getComplianceLogs,
    getUserActivityReport,
    getComplianceDashboard,
    reviewFlaggedActivity,
    generateComplianceReport
} = require('../controllers/complianceController');

// Get Compliance Logs
router.get('/logs', protect, rolePermission(['admin', 'compliance_officer']), getComplianceLogs);

// Get User Activity Report
router.get('/user-activity/:userId', protect, rolePermission(['admin', 'compliance_officer']), getUserActivityReport);

// Get Compliance Dashboard
router.get('/dashboard', protect, rolePermission(['admin', 'compliance_officer']), getComplianceDashboard);

// Review Flagged Activity
router.post('/review/:logId', protect, rolePermission(['admin', 'compliance_officer']), reviewFlaggedActivity);

// Generate Compliance Report
router.get('/report', protect, rolePermission(['admin', 'compliance_officer']), generateComplianceReport);

module.exports = router;
