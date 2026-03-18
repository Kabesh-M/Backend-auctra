const nodemailer = require('nodemailer');
require('dotenv').config();

// Email Configuration
const emailTransporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// SMS Configuration (Lazy initialization)
let smsClient = null;
const initializeSmsClient = () => {
    if (smsClient) return smsClient;
    
    try {
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            const twilio = require('twilio');
            smsClient = twilio(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
            );
        }
    } catch (error) {
        console.warn('Twilio SMS service not available:', error.message);
    }
    return smsClient;
};

const sendEmail = async (to, subject, htmlContent, text = '') => {
    try {
        // Skip if email not configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.warn('Email service not configured, skipping email to:', to);
            return { success: true, messageId: 'skipped' };
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to,
            subject,
            html: htmlContent,
            text: text || htmlContent.replace(/<[^>]*>/g, '')
        };

        const result = await emailTransporter.sendMail(mailOptions);
        console.log('Email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Email sending failed:', error);
        return { success: false, error: error.message };
    }
};

const sendSMS = async (phoneNumber, message) => {
    try {
        const client = initializeSmsClient();
        if (!client) {
            console.warn('SMS service not configured, skipping SMS to:', phoneNumber);
            return { success: true, messageId: 'skipped' };
        }

        const result = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });
        console.log('SMS sent successfully:', result.sid);
        return { success: true, messageId: result.sid };
    } catch (error) {
        console.error('SMS sending failed:', error);
        return { success: false, error: error.message };
    }
};

const sendOTPEmail = async (email, otp, userName) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your One-Time Password (OTP)</h2>
            <p>Hello ${userName},</p>
            <p>Your OTP for two-factor authentication is:</p>
            <h1 style="background-color: #f0f0f0; padding: 10px; text-align: center; letter-spacing: 5px;">${otp}</h1>
            <p>This OTP is valid for 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr/>
            <p style="color: #666; font-size: 12px;">This is an automated message from Auctra. Please do not reply.</p>
        </div>
    `;
    return sendEmail(email, 'Your Auctra OTP', htmlContent);
};

const sendPasswordResetEmail = async (email, resetLink, userName) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Hello ${userName},</p>
            <p>We received a request to reset your password. Click the link below:</p>
            <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
            <p>Or copy and paste this link in your browser:</p>
            <p><code>${resetLink}</code></p>
            <p>This link is valid for 24 hours.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr/>
            <p style="color: #666; font-size: 12px;">This is an automated message from Auctra. Please do not reply.</p>
        </div>
    `;
    return sendEmail(email, 'Reset Your Auctra Password', htmlContent);
};

const sendKYCApprovalEmail = async (email, userName) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>KYC Verification Approved</h2>
            <p>Hello ${userName},</p>
            <p>Congratulations! Your KYC verification has been approved.</p>
            <p>You can now:</p>
            <ul>
                <li>Create and participate in auctions</li>
                <li>Make transactions without limits</li>
                <li>Access all platform features</li>
            </ul>
            <p><a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
            <hr/>
            <p style="color: #666; font-size: 12px;">This is an automated message from Auctra. Please do not reply.</p>
        </div>
    `;
    return sendEmail(email, 'KYC Verification Approved', htmlContent);
};

const sendSecurityAlert = async (email, userName, alertMessage, actionUrl) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #dc3545;">
            <div style="background-color: #dc3545; color: white; padding: 15px;">
                <h2>Security Alert</h2>
            </div>
            <div style="padding: 20px;">
                <p>Hello ${userName},</p>
                <p>${alertMessage}</p>
                <p>If this wasn't you, please take immediate action:</p>
                <p><a href="${actionUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Take Action</a></p>
                <hr/>
                <p style="color: #666; font-size: 12px;">This is an automated message from Auctra. Please do not reply.</p>
            </div>
        </div>
    `;
    return sendEmail(email, 'Security Alert - Immediate Action Required', htmlContent);
};

const sendTransactionEmail = async (email, userName, transactionDetails) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Transaction Confirmation</h2>
            <p>Hello ${userName},</p>
            <p>Your transaction has been processed successfully.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Transaction ID</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${transactionDetails.transactionId}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">₹${transactionDetails.amount}</td>
                </tr>
                <tr style="background-color: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Type</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${transactionDetails.type}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Status</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${transactionDetails.status}</td>
                </tr>
                <tr style="background-color: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${new Date(transactionDetails.timestamp).toLocaleString()}</td>
                </tr>
            </table>
            <hr/>
            <p style="color: #666; font-size: 12px;">This is an automated message from Auctra. Please do not reply.</p>
        </div>
    `;
    return sendEmail(email, 'Transaction Confirmation', htmlContent);
};

module.exports = {
    sendEmail,
    sendSMS,
    sendOTPEmail,
    sendPasswordResetEmail,
    sendKYCApprovalEmail,
    sendSecurityAlert,
    sendTransactionEmail
};
