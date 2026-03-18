const KYC = require('../models/KYC');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ComplianceLog = require('../models/ComplianceLog');
const { sendKYCApprovalEmail } = require('../utils/notificationService');

// @desc    Submit KYC
// @route   POST /api/kyc/submit
// @access  Private
const submitKYC = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            dateOfBirth,
            gender,
            nationality,
            addressLine1,
            addressLine2,
            city,
            state,
            postalCode,
            country,
            documentType,
            documentNumber,
            documentExpiry,
            bankAccountNumber,
            bankIfscCode,
            bankName,
            accountHolderName,
            accountType
        } = req.body;

        // Validation
        if (!firstName || !lastName || !documentType || !documentNumber || !bankAccountNumber) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        let kyc = await KYC.findOne({ user: req.user._id });

        if (kyc && kyc.status === 'under_review') {
            return res.status(400).json({ message: 'Your KYC is already under review' });
        }

        if (kyc && kyc.status === 'approved') {
            return res.status(400).json({ message: 'Your KYC is already approved' });
        }

        kyc = await KYC.findOneAndUpdate(
            { user: req.user._id },
            {
                user: req.user._id,
                firstName,
                lastName,
                dateOfBirth,
                gender,
                nationality,
                addressLine1,
                addressLine2,
                city,
                state,
                postalCode,
                country,
                documentType,
                documentNumber,
                documentExpiry,
                bankAccountNumber,
                bankIfscCode,
                bankName,
                accountHolderName,
                accountType,
                status: 'submitted',
                submittedAt: new Date()
            },
            { upsert: true, new: true }
        );

        // Create notification
        await Notification.create({
            recipient: req.user._id,
            type: 'kyc_approval',
            title: 'KYC Submitted',
            message: 'Your KYC has been submitted for verification',
            channels: ['in_app', 'email'],
            email: req.user.email,
            status: 'sent'
        });

        // Log compliance event
        await ComplianceLog.create({
            user: req.user._id,
            action: 'kyc_submission',
            details: { documentType, status: 'submitted' },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            status: 'success'
        });

        res.json({
            message: 'KYC submitted successfully',
            kyc
        });
    } catch (error) {
        console.error('KYC Submit Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get KYC Status
// @route   GET /api/kyc/status
// @access  Private
const getKYCStatus = async (req, res) => {
    try {
        const kyc = await KYC.findOne({ user: req.user._id });

        if (!kyc) {
            return res.json({
                status: 'not_started',
                message: 'KYC verification not started'
            });
        }

        res.json({
            status: kyc.status,
            kyc: {
                firstName: kyc.firstName,
                lastName: kyc.lastName,
                documentType: kyc.documentType,
                riskLevel: kyc.riskLevel,
                submittedAt: kyc.submittedAt,
                approvalDate: kyc.approvalDate
            }
        });
    } catch (error) {
        console.error('Get KYC Status Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve KYC (Admin only)
// @route   POST /api/kyc/:kycId/approve
// @access  Private/Admin
const approveKYC = async (req, res) => {
    try {
        const { kycId } = req.params;
        const { notes } = req.body;

        const kyc = await KYC.findById(kycId);

        if (!kyc) {
            return res.status(404).json({ message: 'KYC not found' });
        }

        kyc.status = 'approved';
        kyc.approvalDate = new Date();
        kyc.expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
        kyc.nextReviewDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        kyc.reviewedBy = req.user._id;
        kyc.reviewedAt = new Date();
        kyc.approvalNotes = notes;
        kyc.documentVerified = true;
        kyc.phoneVerified = true;
        kyc.emailVerified = true;

        await kyc.save();

        // Update user
        await User.findByIdAndUpdate(kyc.user, { kycVerified: true });

        const user = await User.findById(kyc.user);

        // Send approval email
        await sendKYCApprovalEmail(user.email, user.firstName);

        // Create notification
        await Notification.create({
            recipient: kyc.user,
            type: 'kyc_approved',
            title: 'KYC Approved',
            message: 'Congratulations! Your KYC has been approved',
            channels: ['in_app', 'email'],
            email: user.email,
            status: 'sent'
        });

        // Log compliance event
        await ComplianceLog.create({
            user: req.user._id,
            action: 'kyc_approval',
            details: { approvedKycId: kycId, notes },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            status: 'success'
        });

        res.json({
            message: 'KYC approved successfully',
            kyc
        });
    } catch (error) {
        console.error('Approve KYC Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject KYC (Admin only)
// @route   POST /api/kyc/:kycId/reject
// @access  Private/Admin
const rejectKYC = async (req, res) => {
    try {
        const { kycId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ message: 'Rejection reason is required' });
        }

        const kyc = await KYC.findById(kycId);

        if (!kyc) {
            return res.status(404).json({ message: 'KYC not found' });
        }

        kyc.status = 'rejected';
        kyc.rejectionReason = reason;
        kyc.reviewedBy = req.user._id;
        kyc.reviewedAt = new Date();

        await kyc.save();

        const user = await User.findById(kyc.user);

        // Create notification
        await Notification.create({
            recipient: kyc.user,
            type: 'kyc_rejected',
            title: 'KYC Rejected',
            message: `Your KYC has been rejected. Reason: ${reason}`,
            channels: ['in_app', 'email'],
            email: user.email,
            status: 'sent'
        });

        // Log compliance event
        await ComplianceLog.create({
            user: req.user._id,
            action: 'kyc_rejection',
            details: { rejectedKycId: kycId, reason },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            status: 'success',
            severity: 'info'
        });

        res.json({
            message: 'KYC rejected',
            kyc
        });
    } catch (error) {
        console.error('Reject KYC Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get All KYC (Admin only)
// @route   GET /api/kyc/all
// @access  Private/Admin
const getAllKYC = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const query = status ? { status } : {};
        const skip = (page - 1) * limit;

        const kycs = await KYC.find(query)
            .populate('user', 'email firstName lastName')
            .populate('reviewedBy', 'email firstName')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await KYC.countDocuments(query);

        res.json({
            kycs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get All KYC Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    submitKYC,
    getKYCStatus,
    approveKYC,
    rejectKYC,
    getAllKYC
};
