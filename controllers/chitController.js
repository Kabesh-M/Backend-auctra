const Chit = require('../models/Chit');
const Participant = require('../models/Participant');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');

// @desc    Create a new chit log
// @route   POST /api/chits
// @access  Private/Conductor
const createChit = async (req, res) => {
    const {
        logCode,
        password,
        totalAmount,
        participantsCount,
        floorPrice,
        bidOptions,
        formula
    } = req.body;

    try {
        const chitExists = await Chit.findOne({ logCode });

        if (chitExists) {
            return res.status(400).json({ message: 'Chit with this code already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const chit = await Chit.create({
            logCode,
            password: hashedPassword,
            conductor: req.user._id,
            totalAmount,
            participantsCount,
            floorPrice,
            bidOptions,
            formula
        });

        await AuditLog.create({
            action: 'create_chit',
            actor: req.user._id,
            ipDevice: req.ip,
            details: { chitId: chit._id, logCode }
        });

        res.status(201).json(chit);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Join a chit log
// @route   POST /api/chits/join
// @access  Private
const joinChit = async (req, res) => {
    const { logCode, password } = req.body;

    try {
        const chit = await Chit.findOne({ logCode });

        if (!chit) {
            return res.status(404).json({ message: 'Chit not found' });
        }

        // Check if log is locked (participants count reached)
        const currentParticipants = await Participant.countDocuments({ chit: chit._id });
        if (currentParticipants >= chit.participantsCount || chit.lockStatus) {
            return res.status(400).json({ message: 'Chit is locked for new participants' });
        }

        const isMatch = await bcrypt.compare(password, chit.password);

        if (isMatch) {
            // Check if already a participant
            const alreadyJoined = await Participant.findOne({ chit: chit._id, user: req.user._id });
            if (alreadyJoined) {
                return res.status(400).json({ message: 'Already joined this chit' });
            }

            const participant = await Participant.create({
                chit: chit._id,
                user: req.user._id,
                mobile: req.user.mobile
            });

            await AuditLog.create({
                action: 'join_chit',
                actor: req.user._id,
                ipDevice: req.ip,
                details: { chitId: chit._id, logCode }
            });

            res.status(201).json(participant);
        } else {
            res.status(401).json({ message: 'Invalid log password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all active chits for a user
// @route   GET /api/chits/my
// @access  Private
const getMyChits = async (req, res) => {
    try {
        const participations = await Participant.find({ user: req.user._id }).populate('chit');
        const conducted = await Chit.find({ conductor: req.user._id });

        res.json({
            participations: participations.map(p => p.chit),
            conducted
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all participants for a chit
// @route   GET /api/chits/:id/participants
// @access  Private/Conductor
const getParticipants = async (req, res) => {
    try {
        const chit = await Chit.findById(req.params.id);
        if (!chit || chit.conductor.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const participants = await Participant.find({ chit: req.params.id }).populate('user', 'mobile role');
        res.json(participants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve a participant
// @route   PUT /api/chits/:id/approve/:participantId
// @access  Private/Conductor
const approveParticipant = async (req, res) => {
    try {
        const chit = await Chit.findById(req.params.id);
        if (!chit || chit.conductor.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const participant = await Participant.findById(req.params.participantId);
        if (!participant) return res.status(404).json({ message: 'Participant not found' });

        participant.approved = req.body.approved;
        await participant.save();

        res.json(participant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get chit log report with contributions
// @route   GET /api/chits/:id/report
// @access  Private/Conductor
const getChitReport = async (req, res) => {
    try {
        const chit = await Chit.findById(req.params.id);
        if (!chit || chit.conductor.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const auctions = await Auction.find({ chit: req.params.id, status: 'completed' })
            .populate('winner', 'mobile');

        const participants = await Participant.find({ chit: req.params.id });

        const report = auctions.map(auc => {
            const dividend = (chit.totalAmount - auc.finalBid) / chit.participantsCount;
            const contribution = (chit.totalAmount / chit.participantsCount) - dividend;

            return {
                auctionDate: auc.auctionDate,
                winner: auc.winner ? auc.winner.mobile : 'N/A',
                finalBid: auc.finalBid,
                dividend,
                contribution
            };
        });

        res.json({ chit, report, participantsCount: participants.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createChit, joinChit, getMyChits, getParticipants, approveParticipant, getChitReport };
