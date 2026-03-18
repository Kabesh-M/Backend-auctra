const express = require('express');
const router = express.Router();
const { protect, rolePermission } = require('../middleware/advancedAuthMiddleware');
const {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationPreferences,
    updateNotificationPreferences
} = require('../controllers/notificationController');

// Get User Notifications
router.get('/', protect, getUserNotifications);

// Mark Notification as Read
router.put('/:notificationId/read', protect, markAsRead);

// Mark All Notifications as Read
router.put('/mark-all-read', protect, markAllAsRead);

// Delete Notification
router.delete('/:notificationId', protect, deleteNotification);

// Get Notification Preferences
router.get('/preferences', protect, getNotificationPreferences);

// Update Notification Preferences
router.put('/preferences', protect, updateNotificationPreferences);

module.exports = router;
