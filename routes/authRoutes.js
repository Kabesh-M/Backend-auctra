const express = require('express');
const { signup, authUser, getUserProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', authUser);
router.get('/profile', protect, getUserProfile);

module.exports = router;
