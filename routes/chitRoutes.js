const express = require('express');
const {
    createChit,
    joinChit,
    getMyChits,
    getParticipants,
    approveParticipant,
    getChitReport
} = require('../controllers/chitController');
const { protect, conductor } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
    .post(protect, conductor, createChit);

router.post('/join', protect, joinChit);
router.get('/my', protect, getMyChits);

router.get('/:id/participants', protect, conductor, getParticipants);
router.get('/:id/report', protect, conductor, getChitReport);
router.put('/:id/approve/:participantId', protect, conductor, approveParticipant);

module.exports = router;
