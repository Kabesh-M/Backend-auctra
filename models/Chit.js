const mongoose = require('mongoose');

const chitSchema = new mongoose.Schema({
    logCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    conductor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    participantsCount: {
        type: Number,
        required: true
    },
    floorPrice: {
        type: Number,
        required: true
    },
    bidOptions: [{
        type: Number,
        required: true
    }],
    formula: {
        type: String
    },
    lockStatus: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'closed'],
        default: 'active'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Chit', chitSchema);
