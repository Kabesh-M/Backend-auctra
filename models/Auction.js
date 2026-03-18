const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
    chit: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chit',
        required: true
    },
    auctionDate: {
        type: Date,
        required: true
    },
    startedAt: {
        type: Date
    },
    endedAt: {
        type: Date
    },
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participant'
    },
    finalBid: {
        type: Number
    },
    status: {
        type: String,
        enum: ['scheduled', 'ongoing', 'completed'],
        default: 'scheduled'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Auction', auctionSchema);
