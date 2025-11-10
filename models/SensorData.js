const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
    temperature: {
        type: Number,
        required: true
    },
    humidity: {
        type: Number,
        required: true
    },
    light: {
        type: Number,
        required: true
    },
    pressure: {
        type: Number,
        default: null
    },
    co2: {
        type: Number,
        default: null
    },
    motion: {
        type: Boolean,
        default: null
    },
    deviceId: {
        type: String,
        default: 'default-device'
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Index for faster queries
sensorDataSchema.index({ timestamp: -1 });
sensorDataSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
