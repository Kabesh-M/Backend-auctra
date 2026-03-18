const express = require('express');
const {
    getMyAuctions,
    scheduleAuction,
    startAuction,
    submitBid,
    getAuctionDetails,
    endAuction
} = require('../controllers/auctionController');
const { protect, conductor } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
    .post(protect, conductor, scheduleAuction);

router.route('/my')
    .get(protect, getMyAuctions);

router.route('/:id')
    .get(protect, getAuctionDetails);

router.route('/:id/start')
    .put(protect, conductor, startAuction);

router.route('/:id/end')
    .put(protect, conductor, endAuction);

router.route('/:id/bid')
    .post(protect, submitBid);

module.exports = router;
