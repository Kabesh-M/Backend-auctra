const Chit = require('../models/Chit');
const Auction = require('../models/Auction');

const enforceLocking = async (req, res, next) => {
    try {
        const chitId = req.body.chitId || req.params.id;
        const chit = await Chit.findById(chitId);

        if (chit && chit.lockStatus) {
            return res.status(403).json({ message: 'Action forbidden: Chit is locked (Closed/Read-only)' });
        }

        next();
    } catch (error) {
        res.status(500).json({ message: 'Locking validation failed' });
    }
};

const auctionActiveOnly = async (req, res, next) => {
    try {
        const auction = await Auction.findById(req.params.id);
        if (!auction || auction.status !== 'ongoing') {
            return res.status(403).json({ message: 'Action forbidden: Auction is not ongoing' });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: 'Auction validation failed' });
    }
};

module.exports = { enforceLocking, auctionActiveOnly };
