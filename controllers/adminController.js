const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// @desc    Get all users (Admin only)
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user status (block/unblock)
const updateUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            user.status = req.body.status || user.status;
            await user.save();
            res.json({ message: 'User status updated' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get system logs
const getLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find({}).populate('actor', 'email').sort({ createdAt: -1 }).limit(100);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAllUsers, updateUserStatus, getLogs };
