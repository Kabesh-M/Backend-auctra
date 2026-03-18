const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const auditLogger = require('../utils/auditLogger');

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
    const { email, mobile, password, role, bankName, bankAccount } = req.body;

    // Basic validation
    if (!email || !mobile || !password || !bankName || !bankAccount) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    try {
        const userExists = await User.findOne({ $or: [{ email }, { mobile }] });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email or mobile' });
        }

        const user = await User.create({
            email,
            mobile,
            password,
            bankName,
            bankAccount,
            role: role || 'participant'
        });

        if (user) {
            try {
                await auditLogger(user._id, 'user_signup', req);
            } catch (auditError) {
                console.error('Signup Audit Error:', auditError);
                // Continue even if audit logging fails
            }

            res.status(201).json({
                _id: user._id,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ message: error.message || 'Server synchronization error' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    try {
        const user = await User.findOne({ email });

        if (user && (await user.comparePassword(password))) {
            if (user.status === 'blocked') {
                return res.status(403).json({ message: 'Your account is blocked. Contact support.' });
            }

            try {
                await auditLogger(user._id, 'user_login', req);
            } catch (auditError) {
                console.error('Login Audit Error:', auditError);
            }

            res.json({
                _id: user._id,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: error.message || 'Authentication error' });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            res.json({
                _id: user._id,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                status: user.status,
                bankName: user.bankName,
                bankAccount: user.bankAccount
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Profile retrieval error' });
    }
};

module.exports = { signup, authUser, getUserProfile };
