const ComplianceLog = require('../models/ComplianceLog');
const Transaction = require('../models/Transaction');
const KYC = require('../models/KYC');
const User = require('../models/User');

// @desc    Get Compliance Logs
// @route   GET /api/admin/compliance/logs
// @access  Private/Admin
const getComplianceLogs = async (req, res) => {
    try {
        const { page = 1, limit = 20, action, status, severity, flagged } = req.query;

        const query = {};
        if (action) query.action = action;
        if (status) query.status = status;
        if (severity) query.severity = severity;
        if (flagged === 'true') query.flaggedAsAnomalous = true;

        const skip = (page - 1) * limit;

        const logs = await ComplianceLog.find(query)
            .populate('user', 'email firstName lastName')
            .populate('reviewedBy', 'email')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await ComplianceLog.countDocuments(query);
        const flaggedCount = await ComplianceLog.countDocuments({ flaggedAsAnomalous: true });

        res.json({
            logs,
            flaggedCount,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get Compliance Logs Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get User Activity Report
// @route   GET /api/admin/compliance/user-activity/:userId
// @access  Private/Admin
const getUserActivityReport = async (req, res) => {
    try {
        const { userId } = req.params;
        const { days = 30 } = req.query;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const logs = await ComplianceLog.find({
            user: userId,
            createdAt: { $gte: startDate }
        }).sort({ createdAt: -1 });

        const transactions = await Transaction.find({
            user: userId,
            createdAt: { $gte: startDate }
        }).sort({ createdAt: -1 });

        const actionSummary = {};
        logs.forEach(log => {
            actionSummary[log.action] = (actionSummary[log.action] || 0) + 1;
        });

        const riskScore = logs.reduce((sum, log) => sum + (log.riskScore || 0), 0) / logs.length || 0;

        res.json({
            user: {
                _id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                kycVerified: user.kycVerified,
                accountCreatedAt: user.createdAt
            },
            report: {
                period: `Last ${days} days`,
                totalActivities: logs.length,
                totalTransactions: transactions.length,
                averageRiskScore: Math.round(riskScore),
                flaggedActivities: logs.filter(l => l.flaggedAsAnomalous).length,
                suspiciousActivities: logs.filter(l => l.status === 'suspicious').length,
                actionSummary,
                uniqueIPs: new Set(logs.map(l => l.ipAddress)).size
            },
            recentLogs: logs.slice(0, 10),
            recentTransactions: transactions.slice(0, 10)
        });
    } catch (error) {
        console.error('Get User Activity Report Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Compliance Dashboard
// @route   GET /api/admin/compliance/dashboard
// @access  Private/Admin
const getComplianceDashboard = async (req, res) => {
    try {
        const lastSevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const totalUsers = await User.countDocuments();
        const kycVerifiedUsers = await User.countDocuments({ kycVerified: true });
        const blockedUsers = await User.countDocuments({ status: 'blocked' });

        const totalTransactions = await Transaction.countDocuments();
        const failedTransactions = await Transaction.countDocuments({ status: 'failed' });
        const flaggedTransactions = await Transaction.countDocuments({ flaggedForReview: true });
        const totalTransactionAmount = await Transaction.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const suspiciousActivities = await ComplianceLog.countDocuments({
            flaggedAsAnomalous: true,
            createdAt: { $gte: lastSevenDays }
        });

        const pendingKYC = await KYC.countDocuments({ status: 'pending' || 'submitted' });
        const approvedKYC = await KYC.countDocuments({ status: 'approved' });
        const rejectedKYC = await KYC.countDocuments({ status: 'rejected' });

        const highRiskUsers = await ComplianceLog.aggregate([
            { $match: { riskScore: { $gte: 70 } } },
            { $group: { _id: '$user' } },
            { $count: 'total' }
        ]);

        res.json({
            dashboard: {
                users: {
                    total: totalUsers,
                    kycVerified: kycVerifiedUsers,
                    blocked: blockedUsers,
                    highRisk: highRiskUsers[0]?.total || 0
                },
                transactions: {
                    total: totalTransactions,
                    failed: failedTransactions,
                    flagged: flaggedTransactions,
                    totalAmount: totalTransactionAmount[0]?.total || 0
                },
                kyc: {
                    pending: pendingKYC,
                    approved: approvedKYC,
                    rejected: rejectedKYC
                },
                securityAlerts: {
                    suspiciousActivitiesLastWeek: suspiciousActivities
                }
            }
        });
    } catch (error) {
        console.error('Get Compliance Dashboard Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Review Flagged Activity
// @route   POST /api/admin/compliance/review/:logId
// @access  Private/Admin
const reviewFlaggedActivity = async (req, res) => {
    try {
        const { logId } = req.params;
        const { action, notes } = req.body;

        if (!['approve', 'block_user', 'investigate'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action' });
        }

        const log = await ComplianceLog.findById(logId);

        if (!log) {
            return res.status(404).json({ message: 'Log not found' });
        }

        log.reviewedBy = req.user._id;
        log.reviewedAt = new Date();
        log.reviewNotes = notes;
        log.requiresManualReview = false;
        await log.save();

        // If action is block_user
        if (action === 'block_user' && log.user) {
            await User.findByIdAndUpdate(log.user, { status: 'blocked' });
        }

        res.json({
            message: `Activity reviewed and ${action} action taken`,
            log
        });
    } catch (error) {
        console.error('Review Flagged Activity Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate Compliance Report
// @route   GET /api/admin/compliance/report
// @access  Private/Admin
const generateComplianceReport = async (req, res) => {
    try {
        const { startDate, endDate, type = 'overview' } = req.query;

        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);

        const query = startDate || endDate ? { createdAt: dateFilter } : {};

        const report = {
            generatedAt: new Date(),
            period: {
                start: startDate || 'All time',
                end: endDate || new Date()
            }
        };

        if (type === 'overview' || type === 'all') {
            const logs = await ComplianceLog.find(query);
            report.overview = {
                totalLogEntries: logs.length,
                uniqueUsers: new Set(logs.map(l => l.user.toString())).size,
                criticalEvents: logs.filter(l => l.severity === 'critical').length,
                warningEvents: logs.filter(l => l.severity === 'warning').length,
                failedLogins: logs.filter(l => l.action === 'login' && l.status === 'failed').length
            };
        }

        if (type === 'transactions' || type === 'all') {
            const transactions = await Transaction.find(query);
            report.transactions = {
                total: transactions.length,
                totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
                byStatus: transactions.reduce((acc, t) => {
                    acc[t.status] = (acc[t.status] || 0) + 1;
                    return acc;
                }, {})
            };
        }

        if (type === 'kyc' || type === 'all') {
            const kycs = await KYC.find(query);
            report.kyc = {
                total: kycs.length,
                byStatus: kycs.reduce((acc, k) => {
                    acc[k.status] = (acc[k.status] || 0) + 1;
                    return acc;
                }, {})
            };
        }

        res.json(report);
    } catch (error) {
        console.error('Generate Report Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getComplianceLogs,
    getUserActivityReport,
    getComplianceDashboard,
    reviewFlaggedActivity,
    generateComplianceReport
};
