const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ComplianceLog = require('../models/ComplianceLog');
const { getDeviceInfo, calculateRiskScore } = require('../utils/complianceUtils');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            const user = await User.findById(decoded.id).select('-password');
            
            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }

            if (user.status === 'blocked') {
                // Log access denied
                await ComplianceLog.create({
                    user: user._id,
                    action: 'access_denied',
                    details: { reason: 'Account blocked' },
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    status: 'failed'
                });
                return res.status(403).json({ message: 'Your account is blocked' });
            }

            req.user = user;
            req.token = token;
            next();
        } catch (error) {
            console.error('Auth Error:', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const rolePermission = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            // Log unauthorized access attempt
            ComplianceLog.create({
                user: req.user._id,
                action: 'access_denied',
                details: { reason: 'Insufficient permissions', requiredRole: allowedRoles, userRole: req.user.role },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                status: 'failed',
                severity: 'warning'
            });

            return res.status(403).json({ 
                message: 'You do not have permission to access this resource' 
            });
        }

        next();
    };
};

const checkTwoFactorEnabled = async (req, res, next) => {
    try {
        const TwoFactorAuth = require('../models/TwoFactorAuth');
        const twoFactor = await TwoFactorAuth.findOne({ user: req.user._id });

        if (twoFactor && twoFactor.isEnabled && !req.body.skip2FA) {
            if (!req.user.twoFactorVerified) {
                return res.status(403).json({ 
                    message: '2FA verification required',
                    require2FA: true
                });
            }
        }

        next();
    } catch (error) {
        console.error('2FA Check Error:', error);
        res.status(500).json({ message: 'Error checking 2FA status' });
    }
};

const rateLimitByUser = (req, res, next) => {
    // Store request timestamp
    if (!req.user.requestTimestamps) {
        req.user.requestTimestamps = [];
    }

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old timestamps
    req.user.requestTimestamps = req.user.requestTimestamps.filter(ts => ts > oneMinuteAgo);

    // Check limit (e.g., 100 requests per minute)
    if (req.user.requestTimestamps.length > 100) {
        return res.status(429).json({ message: 'Too many requests, please try again later' });
    }

    req.user.requestTimestamps.push(now);
    next();
};

const validateIPAddress = async (req, res, next) => {
    try {
        const userIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        
        // Check if user has IP whitelist enabled
        if (req.user.ipWhitelistEnabled && req.user.whitelistedIPs) {
            if (!req.user.whitelistedIPs.includes(userIp)) {
                // Log suspicious activity
                await ComplianceLog.create({
                    user: req.user._id,
                    action: 'suspicious_activity',
                    details: { reason: 'Access from unauthorized IP', ipAddress: userIp },
                    ipAddress: userIp,
                    userAgent: req.headers['user-agent'],
                    status: 'suspicious',
                    severity: 'warning',
                    flaggedAsAnomalous: true
                });

                return res.status(403).json({ message: 'Access from unauthorized IP address' });
            }
        }

        req.clientIp = userIp;
        next();
    } catch (error) {
        console.error('IP Validation Error:', error);
        next(); // Continue on error
    }
};

module.exports = {
    protect,
    rolePermission,
    checkTwoFactorEnabled,
    rateLimitByUser,
    validateIPAddress
};
