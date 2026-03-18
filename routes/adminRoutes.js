const express = require('express');
const { getAllUsers, updateUserStatus, getLogs } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/users', protect, admin, getAllUsers);
router.put('/users/:id/status', protect, admin, updateUserStatus);
router.get('/logs', protect, admin, getLogs);

module.exports = router;
