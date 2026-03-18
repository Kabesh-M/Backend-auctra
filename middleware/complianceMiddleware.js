const ComplianceLog = require('../models/ComplianceLog');
const { getDeviceInfo, calculateRiskScore, checkAnomalousActivity } = require('../utils/complianceUtils');

const logUserActivity = async (req, res, next) => {
    try {
        // Capture request details for logging
        req.activityLog = {
            ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            deviceInfo: getDeviceInfo(req.headers['user-agent']),
            timestamp: new Date()
        };

        next();
    } catch (error) {
        console.error('Activity Logging Error:', error);
        next(); // Continue on error
    }
};

const detectAnomalousActivity = async (req, res, next) => {
    try {
        if (!req.user) {
            return next();
        }

        // Get recent activity
        const recentActivities = await ComplianceLog.find({
            user: req.user._id,
            createdAt: { $gte: new Date(Date.now() - 3600000) } // Last 1 hour
        }).limit(10);

        // Calculate risk score
        const riskScore = calculateRiskScore(
            req.user,
            req.body,
            req.activityLog.ipAddress,
            recentActivities
        );

        // Check for anomalies
        const anomalies = checkAnomalousActivity(riskScore, req.body, req.user);

        req.riskScore = riskScore;
        req.anomalies = anomalies;

        // If high risk, flag for review
        if (riskScore > 80) {
            req.requiresManualReview = true;
        }

        next();
    } catch (error) {
        console.error('Anomaly Detection Error:', error);
        next(); // Continue on error
    }
};

const recordComplianceEvent = async (action, details, req, status = 'success', severity = 'info') => {
    try {
        const log = await ComplianceLog.create({
            user: req.user?._id,
            action,
            details,
            ipAddress: req.activityLog?.ipAddress,
            userAgent: req.activityLog?.userAgent,
            status,
            severity,
            riskScore: req.riskScore || 0,
            flaggedAsAnomalous: req.requiresManualReview || false
        });

        return log;
    } catch (error) {
        console.error('Compliance Log Recording Error:', error);
    }
};

const auditSensitiveOperation = async (req, res, next) => {
    const originalJson = res.json;

    res.json = function(body) {
        if (req.user && body.success !== false) {
            recordComplianceEvent(
                req.method === 'POST' ? 'transaction_initiated' : 'data_accessed',
                { 
                    endpoint: req.originalUrl,
                    method: req.method,
                    changes: req.body
                },
                req,
                'success',
                'info'
            );
        }

        return originalJson.call(this, body);
    };

    next();
};

module.exports = {
    logUserActivity,
    detectAnomalousActivity,
    recordComplianceEvent,
    auditSensitiveOperation
};
