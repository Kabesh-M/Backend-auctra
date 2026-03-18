const crypto = require('crypto');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || Buffer.alloc(32);
const ALGORITHM = 'aes-256-cbc';

const encryptData = (data) => {
    if (!data) return null;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(JSON.stringify(data));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decryptData = (encryptedData) => {
    if (!encryptedData) return null;
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return JSON.parse(decrypted.toString());
};

const hashPassword = async (password) => {
    const bcrypt = require('bcryptjs');
    return await bcrypt.hash(password, 12);
};

const comparePassword = async (password, hash) => {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(password, hash);
};

const generateOTP = (length = 6) => {
    return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)).toString();
};

const generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

const maskSensitiveData = (data, type = 'email') => {
    if (type === 'email') {
        const [name, domain] = data.split('@');
        return name.substring(0, 2) + '****@' + domain;
    } else if (type === 'phone') {
        return data.substring(0, 2) + '****' + data.substring(data.length - 2);
    } else if (type === 'account') {
        return '****' + data.substring(data.length - 4);
    }
    return data;
};

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePhone = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
};

const validatePassword = (password) => {
    // At least 8 characters, one uppercase, one lowercase, one number, one special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

module.exports = {
    encryptData,
    decryptData,
    hashPassword,
    comparePassword,
    generateOTP,
    generateSecureToken,
    maskSensitiveData,
    validateEmail,
    validatePhone,
    validatePassword
};
