const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get User Notifications
// @route   GET /api/notifications
// @access  Private
const getUserNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 10, isRead, type } = req.query;

        const query = { recipient: req.user._id };
        if (isRead !== undefined) query.isRead = isRead === 'true';
        if (type) query.type = type;

        const skip = (page - 1) * limit;

        const notifications = await Notification.find(query)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({
            recipient: req.user._id,
            isRead: false
        });

        res.json({
            notifications,
            unreadCount,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get Notifications Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark Notification as Read
// @route   PUT /api/notifications/:notificationId/read
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notification = await Notification.findById(notificationId);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (notification.recipient.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark as Read Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark All Notifications as Read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark All as Read Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete Notification
// @route   DELETE /api/notifications/:notificationId
// @access  Private
const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notification = await Notification.findById(notificationId);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (notification.recipient.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await Notification.findByIdAndDelete(notificationId);

        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Delete Notification Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Notification Preferences
// @route   GET /api/notifications/preferences
// @access  Private
const getNotificationPreferences = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        res.json({
            preferences: {
                emailNotifications: user.emailNotificationsEnabled !== false,
                smsNotifications: user.smsNotificationsEnabled !== false,
                pushNotifications: user.pushNotificationsEnabled !== false,
                inAppNotifications: user.inAppNotificationsEnabled !== false,
                securityAlerts: user.securityAlertsEnabled !== false,
                transactionAlerts: user.transactionAlertsEnabled !== false,
                auctionUpdates: user.auctionUpdatesEnabled !== false,
                weeklyDigest: user.weeklyDigestEnabled !== false
            }
        });
    } catch (error) {
        console.error('Get Preferences Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Notification Preferences
// @route   PUT /api/notifications/preferences
// @access  Private
const updateNotificationPreferences = async (req, res) => {
    try {
        const { preferences } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                emailNotificationsEnabled: preferences.emailNotifications,
                smsNotificationsEnabled: preferences.smsNotifications,
                pushNotificationsEnabled: preferences.pushNotifications,
                inAppNotificationsEnabled: preferences.inAppNotifications,
                securityAlertsEnabled: preferences.securityAlerts,
                transactionAlertsEnabled: preferences.transactionAlerts,
                auctionUpdatesEnabled: preferences.auctionUpdates,
                weeklyDigestEnabled: preferences.weeklyDigest
            },
            { new: true }
        );

        res.json({ message: 'Preferences updated successfully', preferences: user });
    } catch (error) {
        console.error('Update Preferences Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationPreferences,
    updateNotificationPreferences
};
