const UAParser = require('ua-parser-js');

const getDeviceInfo = (userAgent) => {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    return {
        browser: result.browser.name || 'Unknown',
        os: result.os.name || 'Unknown',
        device: result.device.type || 'desktop'
    };
};

const calculateRiskScore = (user, transaction, location, loginHistory) => {
    let riskScore = 0;

    // Check for unusual transaction amount
    if (transaction && transaction.amount > 100000) {
        riskScore += 15;
    }

    // Check for unusual transaction frequency
    if (loginHistory && loginHistory.length > 5) {
        riskScore += 10;
    }

    // Check for unusual location
    if (location && user.lastLogin) {
        // This would require geo-distance calculation
        // Simplified version: if location is new, add points
        riskScore += 5;
    }

    // Check for multiple failed login attempts
    if (user.failedLoginAttempts > 3) {
        riskScore += 20;
    }

    // Check if user is new (< 30 days)
    const daysSinceCreation = (Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 30) {
        riskScore += 10;
    }

    // Check if KYC is not verified
    if (!user.kycVerified) {
        riskScore += 25;
    }

    return Math.min(riskScore, 100);
};

const checkAnomalousActivity = (riskScore, transaction, user) => {
    const alerts = [];

    if (riskScore > 70) {
        alerts.push({
            level: 'high',
            message: 'High risk score detected',
            action: 'manual_review_required'
        });
    }

    if (transaction && transaction.amount > user.dailyTransactionLimit && user.dailyTransactionLimit) {
        alerts.push({
            level: 'high',
            message: 'Transaction exceeds daily limit',
            action: 'block_transaction'
        });
    }

    if (riskScore > 50 && riskScore <= 70) {
        alerts.push({
            level: 'medium',
            message: 'Medium risk detected - additional verification may be required',
            action: 'additional_verification'
        });
    }

    return alerts;
};

const generateComplianceReport = (transactions, compliance) => {
    const report = {
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
        suspiciousTransactions: transactions.filter(t => t.flaggedForReview).length,
        failedTransactions: transactions.filter(t => t.status === 'failed').length,
        complianceIssues: compliance.length,
        generatedAt: new Date()
    };
    return report;
};

const validateTransaction = (transaction, limits) => {
    const errors = [];

    if (!transaction.amount || transaction.amount <= 0) {
        errors.push('Invalid transaction amount');
    }

    if (limits && transaction.amount > limits.maxTransactionAmount) {
        errors.push(`Transaction exceeds maximum limit of ${limits.maxTransactionAmount}`);
    }

    if (!transaction.type || !['deposit', 'withdrawal', 'transfer'].includes(transaction.type)) {
        errors.push('Invalid transaction type');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = {
    getDeviceInfo,
    calculateRiskScore,
    checkAnomalousActivity,
    generateComplianceReport,
    validateTransaction
};
