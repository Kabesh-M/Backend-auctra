const express = require('express');
const router = express.Router();
const { protect, rolePermission } = require('../middleware/advancedAuthMiddleware');
const {
    submitKYC,
    getKYCStatus,
    approveKYC,
    rejectKYC,
    getAllKYC
} = require('../controllers/kycController');

// Submit KYC
router.post('/submit', protect, submitKYC);

// Get KYC Status
router.get('/status', protect, getKYCStatus);

// Get All KYC (Admin only)
router.get('/all', protect, rolePermission(['admin', 'compliance_officer']), getAllKYC);

// Approve KYC (Admin only)
router.post('/:kycId/approve', protect, rolePermission(['admin', 'compliance_officer']), approveKYC);

// Reject KYC (Admin only)
router.post('/:kycId/reject', protect, rolePermission(['admin', 'compliance_officer']), rejectKYC);

module.exports = router;
