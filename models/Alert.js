const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['temperature', 'humidity', 'light', 'pressure', 'co2', 'motion', 'system', 'landslide'],
        required: true
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'info'
    },
    message: {
        type: String,
        required: true
    },
    value: {
        type: Number
    },
    threshold: {
        type: Number
    },
    deviceId: {
        type: String,
        default: 'default-device'
    },
    riskFactors: {
        type: String
    },
    acknowledged: {
        type: Boolean,
        default: false
    },
    acknowledgedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    acknowledgedAt: {
        type: Date
    },
    emailSent: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

alertSchema.index({ timestamp: -1 });
alertSchema.index({ acknowledged: 1, timestamp: -1 });

module.exports = mongoose.model('Alert', alertSchema);
