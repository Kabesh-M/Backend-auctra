const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    chit: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chit',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    mobile: {
        type: String,
        required: true
    },
    photoUrl: {
        type: String
    },
    approved: {
        type: Boolean,
        default: false
    },
    hasWon: {
        type: Boolean,
        default: false
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Participant', participantSchema);
