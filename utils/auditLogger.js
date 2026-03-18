const AuditLog = require('../models/AuditLog');
const { UAParser } = require('ua-parser-js');

const auditLogger = async (actorId, action, req, details = {}) => {
    try {
        const uaString = req.headers['user-agent'] || '';
        const parser = new UAParser(uaString);
        const ua = parser.getResult();

        const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
        const browser = ua.browser.name || 'Unknown Browser';
        const os = ua.os.name || 'Unknown OS';
        const device = `${browser} on ${os}`;

        await AuditLog.create({
            action,
            actor: actorId,
            ipDevice: `${ip} (${device})`,
            details
        });
    } catch (error) {
        console.error('Audit Log Error:', error);
        // Fallback log if parser fails
        try {
            const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
            await AuditLog.create({
                action,
                actor: actorId,
                ipDevice: `${ip} (Unknown Device)`,
                details: { ...details, parseError: error.message }
            });
        } catch (innerError) {
            console.error('Critical Audit Log Error:', innerError);
        }
    }
};

module.exports = auditLogger;
