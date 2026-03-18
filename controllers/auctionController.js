const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Chit = require('../models/Chit');
const Participant = require('../models/Participant');
const { getIO } = require('../config/socket');

// @desc    Get user's auctions
// @route   GET /api/auctions/my
// @access  Private
const getMyAuctions = async (req, res) => {
    try {
        // Find all auctions with status 'scheduled' or 'ongoing'
        // and populate chit data
        const auctions = await Auction.find({
            status: { $in: ['scheduled', 'ongoing'] }
        })
        .populate({
            path: 'chit',
            select: 'logCode totalAmount floorPrice bidOptions participantsCount conductor'
        })
        .sort({ auctionDate: 1 });

        res.json(auctions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get auction details
// @route   GET /api/auctions/:id
// @access  Private
const getAuctionDetails = async (req, res) => {
    try {
        const auction = await Auction.findById(req.params.id)
            .populate({
                path: 'chit',
                select: 'logCode totalAmount floorPrice bidOptions participantsCount'
            });

        if (!auction) return res.status(404).json({ message: 'Auction not found' });

        const bids = await Bid.find({ auction: auction._id })
            .populate({
                path: 'participant',
                populate: { path: 'user', select: 'mobile' }
            })
            .sort({ bidTime: -1 });

        res.json({ auction, bids });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Schedule an auction
// @route   POST /api/auctions
// @access  Private/Conductor
const scheduleAuction = async (req, res) => {
    const { chitId, auctionDate } = req.body;

    try {
        const chit = await Chit.findById(chitId);
        if (!chit) return res.status(404).json({ message: 'Chit not found' });

        if (chit.conductor.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized as conductor of this chit' });
        }

        const auction = await Auction.create({
            chit: chitId,
            auctionDate,
            status: 'scheduled'
        });

        res.status(201).json(auction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Start an auction
// @route   PUT /api/auctions/:id/start
// @access  Private/Conductor
const startAuction = async (req, res) => {
    try {
        const auction = await Auction.findById(req.params.id);
        if (!auction) return res.status(404).json({ message: 'Auction not found' });

        auction.status = 'ongoing';
        auction.startedAt = Date.now();
        await auction.save();

        const io = getIO();
        io.to(`auction_${auction._id}`).emit('auction_started', { auctionId: auction._id });

        res.json(auction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit a bid
// @route   POST /api/auctions/:id/bid
// @access  Private
const submitBid = async (req, res) => {
    const { bidAmount } = req.body;

    try {
        const auction = await Auction.findById(req.params.id);
        if (!auction || auction.status !== 'ongoing') {
            return res.status(400).json({ message: 'Auction is not active' });
        }

        const participant = await Participant.findOne({
            chit: auction.chit,
            user: req.user._id,
            approved: true
        });

        if (!participant) {
            return res.status(401).json({ message: 'You are not an approved participant for this auction' });
        }

        const bid = await Bid.create({
            auction: auction._id,
            participant: participant._id,
            bidAmount
        });

        // Broadcast the bid
        const io = getIO();
        io.to(`auction_${auction._id}`).emit('new_bid', {
            id: bid._id,
            user: req.user.mobile,
            amount: bidAmount,
            time: bid.bidTime
        });

        res.status(201).json(bid);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    End an auction
// @route   PUT /api/auctions/:id/end
// @access  Private/Conductor
const endAuction = async (req, res) => {
    try {
        const auction = await Auction.findById(req.params.id);
        if (!auction) return res.status(404).json({ message: 'Auction not found' });

        // Find the lowest bid (Chit fund logic: lowest bid = highest discount offered)
        const lowestBid = await Bid.findOne({ auction: auction._id })
            .sort({ bidAmount: 1 })
            .populate('participant');

        if (!lowestBid) {
            auction.status = 'completed';
            await auction.save();
            return res.json({ message: 'No bids placed, auction closed' });
        }

        auction.status = 'completed';
        auction.endedAt = Date.now();
        auction.winner = lowestBid.participant._id;
        auction.finalBid = lowestBid.bidAmount;
        await auction.save();

        // Mark participant as won
        const participant = await Participant.findById(lowestBid.participant._id);
        participant.hasWon = true;
        await participant.save();

        const io = getIO();
        io.to(`auction_${auction._id}`).emit('auction_ended', {
            winner: lowestBid.participant.mobile,
            finalBid: lowestBid.bidAmount
        });

        res.json(auction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getMyAuctions, scheduleAuction, startAuction, submitBid, getAuctionDetails, endAuction };
