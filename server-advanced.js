require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Import models
const SensorData = require('./models/SensorData');
const User = require('./models/User');
const Alert = require('./models/Alert');

// Import services
const emailService = require('./services/emailService');
const predictionService = require('./services/predictionService');
const safeZoneService = require('./services/safeZoneService');
const regionalCalibration = require('./services/regionalCalibration');
const rainfallService = require('./services/rainfallService');

// Import routes
const authRoutes = require('./routes/auth');
const otpRoutes = require('./routes/otp');
const { optionalAuth, authMiddleware } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iot-dashboard';

// In-memory fallback storage
let inMemoryData = [];
const MAX_MEMORY_DATA = 1000;
let dbConnected = false;

// Connect to MongoDB
if (MONGODB_URI && MONGODB_URI !== '') {
    mongoose.connect(MONGODB_URI).then(() => {
        console.log('✅ Connected to MongoDB');
        dbConnected = true;
        initializeData();
        startBackgroundTasks();
    }).catch((error) => {
        console.log('⚠️  MongoDB connection failed. Using in-memory storage.');
        console.log('Error:', error.message);
        dbConnected = false;
    });
} else {
    console.log('⚠️  MongoDB URI not configured. Using in-memory storage.');
    dbConnected = false;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    store: dbConnected ? MongoStore.create({
        mongoUrl: MONGODB_URI,
        touchAfter: 24 * 3600
    }) : undefined,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));

// Auth routes
app.use('/api/auth', authRoutes);
app.use('/api/otp', otpRoutes);

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('🔌 New client connected');
    
    // Send existing data to new client
    getRecentData(50).then(data => {
        ws.send(JSON.stringify({
            type: 'initial',
            data: data
        }));
    });

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            // Add timestamp if not present
            if (!data.timestamp) {
                data.timestamp = new Date().toISOString();
            }
            
            // Broadcast IMMEDIATELY to all connected clients (don't wait for DB)
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'update',
                        data: data
                    }));
                }
            });
            
            // Store data and check alerts asynchronously (non-blocking)
            // Don't await these - let them run in background
            saveDataPoint(data).catch(err => console.error('Error saving data:', err));
            checkThresholdsAndAlert(data).catch(err => console.error('Error checking alerts:', err));
            
        } catch (error) {
            console.error('❌ Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('🔌 Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
});

// Save data point to database or memory
async function saveDataPoint(data) {
    if (dbConnected) {
        try {
            const sensorData = new SensorData(data);
            await sensorData.save();
        } catch (error) {
            console.error('Error saving to database:', error);
            saveToMemory(data);
        }
    } else {
        saveToMemory(data);
    }
}

function saveToMemory(data) {
    inMemoryData.push(data);
    if (inMemoryData.length > MAX_MEMORY_DATA) {
        inMemoryData.shift();
    }
}

// Get recent data
async function getRecentData(limit = 50) {
    if (dbConnected) {
        try {
            return await SensorData.find()
                .sort({ timestamp: -1 })
                .limit(limit)
                .lean();
        } catch (error) {
            return inMemoryData.slice(-limit);
        }
    }
    return inMemoryData.slice(-limit);
}

// 🌋 LANDSLIDE DETECTION FUNCTIONS
function checkLandslideConditions(data) {
    const landslideThresholds = {
        criticalHumidity: parseFloat(process.env.LANDSLIDE_HUMIDITY_THRESHOLD) || 85,
        criticalTemp: parseFloat(process.env.LANDSLIDE_TEMP_THRESHOLD) || 35,
        criticalSoilMoisture: parseFloat(process.env.LANDSLIDE_SOIL_THRESHOLD) || 80,
        lowPressure: parseFloat(process.env.LANDSLIDE_PRESSURE_THRESHOLD) || 1000
    };
    
    let riskFactors = [];
    let riskScore = 0;
    
    // High humidity (major risk factor)
    if (data.humidity >= landslideThresholds.criticalHumidity) {
        riskFactors.push(`Critical humidity: ${data.humidity.toFixed(1)}%`);
        riskScore += 3;
    } else if (data.humidity >= 75) {
        riskFactors.push(`High humidity: ${data.humidity.toFixed(1)}%`);
        riskScore += 2;
    }
    
    // High temperature (increases soil instability)
    if (data.temperature >= landslideThresholds.criticalTemp) {
        riskFactors.push(`High temperature: ${data.temperature.toFixed(1)}°C`);
        riskScore += 2;
    }
    
    // Soil moisture (if available)
    if (data.soilMoisture !== undefined && data.soilMoisture >= landslideThresholds.criticalSoilMoisture) {
        riskFactors.push(`Critical soil moisture: ${data.soilMoisture.toFixed(1)}%`);
        riskScore += 3;
    }
    
    // Low pressure (often indicates storms/rain)
    if (data.pressure && data.pressure < landslideThresholds.lowPressure) {
        riskFactors.push(`Low pressure: ${data.pressure.toFixed(1)} hPa`);
        riskScore += 1;
    }
    
    // Motion detection (ground movement)
    if (data.motion) {
        riskFactors.push('Ground motion detected');
        riskScore += 2;
    }
    
    // Determine if landslide alert should be triggered
    // Risk score >= 5 indicates high landslide risk
    const detected = riskScore >= 5;
    
    return {
        detected,
        riskScore,
        riskFactors,
        severity: riskScore >= 7 ? 'critical' : riskScore >= 5 ? 'high' : 'moderate'
    };
}

async function handleLandslideAlert(data, landslideRisk) {
    try {
        // Record this landslide event for AI learning
        predictionService.recordLandslideEvent(data);
        
        const alertData = {
            type: 'landslide',
            severity: 'critical',
            message: `LANDSLIDE WARNING - Risk Score: ${landslideRisk.riskScore}/10`,
            deviceId: data.deviceId || 'default-device',
            timestamp: data.timestamp || new Date().toISOString(),
            temperature: data.temperature,
            humidity: data.humidity,
            pressure: data.pressure,
            soilMoisture: data.soilMoisture,
            motion: data.motion,
            riskFactors: landslideRisk.riskFactors.join(', ')
        };
        
        // Save landslide alert to database
        if (dbConnected) {
            const alert = new Alert(alertData);
            await alert.save();
        }
        
        // Get admin and regular users
        if (dbConnected) {
            const User = require('./models/User');
            
            // Send WARNING email to ADMINS
            const adminUsers = await User.find({ role: 'admin', emailAlerts: true });
            if (adminUsers.length > 0) {
                const adminEmails = adminUsers.map(user => user.email);
                console.log(`🚨 Sending landslide ADMIN WARNING to: ${adminEmails.join(', ')}`);
                await emailService.sendLandslideAdminWarning(data, adminEmails);
            }
            
            // Send EVACUATION email to ALL USERS
            const regularUsers = await User.find({ 
                role: { $ne: 'admin' },
                emailAlerts: true 
            });
            if (regularUsers.length > 0) {
                const userEmails = regularUsers.map(user => user.email);
                console.log(`🚨 Sending landslide EVACUATION ALERT to ${userEmails.length} users`);
                await emailService.sendLandslideUserAlert(data, userEmails);
            }
            
            // Send SMS to all users with SMS enabled
            const smsUsers = await User.find({ 
                smsAlerts: true,
                phone: { $exists: true, $ne: '' }
            });
            if (smsUsers.length > 0) {
                const phoneNumbers = smsUsers.map(user => user.phone);
                const smsMessage = `🚨 LANDSLIDE ALERT! Evacuate immediately to safe location. Risk: ${landslideRisk.severity.toUpperCase()}. Call emergency services.`;
                console.log(`📱 Sending landslide SMS to ${phoneNumbers.length} user(s)`);
                const smsService = require('./services/smsService');
                await smsService.sendAlert({
                    ...alertData,
                    message: smsMessage
                }, phoneNumbers);
            }
        }
        
        // Broadcast CRITICAL alert to all connected WebSocket clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'landslide-alert',
                    alert: alertData,
                    riskScore: landslideRisk.riskScore,
                    riskFactors: landslideRisk.riskFactors
                }));
            }
        });
        
        console.log(`🚨 LANDSLIDE ALERT SENT - Risk Score: ${landslideRisk.riskScore}, Factors: ${landslideRisk.riskFactors.join(', ')}`);
    } catch (error) {
        console.error('❌ Error handling landslide alert:', error);
    }
}

// Check thresholds and create alerts
async function checkThresholdsAndAlert(data) {
    const thresholds = {
        tempMax: parseFloat(process.env.TEMP_MAX_THRESHOLD) || 30,
        tempMin: parseFloat(process.env.TEMP_MIN_THRESHOLD) || 10,
        humidityMax: parseFloat(process.env.HUMIDITY_MAX_THRESHOLD) || 80,
        humidityMin: parseFloat(process.env.HUMIDITY_MIN_THRESHOLD) || 20,
        pressureMin: parseFloat(process.env.PRESSURE_MIN_THRESHOLD) || 980,
        pressureMax: parseFloat(process.env.PRESSURE_MAX_THRESHOLD) || 1050
    };
    
    const alerts = [];
    
    // 🚨 LANDSLIDE DETECTION - Check first (highest priority)
    const landslideRisk = checkLandslideConditions(data);
    if (landslideRisk.detected) {
        console.log('🚨🚨🚨 LANDSLIDE CONDITIONS DETECTED! 🚨🚨🚨');
        await handleLandslideAlert(data, landslideRisk);
    }
    
    // Temperature alerts
    if (data.temperature > thresholds.tempMax) {
        alerts.push({
            type: 'temperature',
            severity: 'warning',
            message: `High temperature detected: ${data.temperature.toFixed(1)}°C`,
            value: data.temperature,
            threshold: thresholds.tempMax,
            deviceId: data.deviceId || 'default-device'
        });
    } else if (data.temperature < thresholds.tempMin) {
        alerts.push({
            type: 'temperature',
            severity: 'warning',
            message: `Low temperature detected: ${data.temperature.toFixed(1)}°C`,
            value: data.temperature,
            threshold: thresholds.tempMin,
            deviceId: data.deviceId || 'default-device'
        });
    }
    
    // Humidity alerts
    if (data.humidity > thresholds.humidityMax) {
        alerts.push({
            type: 'humidity',
            severity: 'warning',
            message: `High humidity detected: ${data.humidity.toFixed(1)}%`,
            value: data.humidity,
            threshold: thresholds.humidityMax,
            deviceId: data.deviceId || 'default-device'
        });
    }
    
    // Pressure alerts (low pressure can indicate landslides, storms)
    if (data.pressure < thresholds.pressureMin) {
        alerts.push({
            type: 'pressure',
            severity: 'warning',
            message: `⚠️ Low pressure detected: ${data.pressure.toFixed(1)} hPa - Potential landslide/storm risk!`,
            value: data.pressure,
            threshold: thresholds.pressureMin,
            deviceId: data.deviceId || 'default-device'
        });
    }
    
    if (data.pressure > thresholds.pressureMax) {
        alerts.push({
            type: 'pressure',
            severity: 'info',
            message: `High pressure detected: ${data.pressure.toFixed(1)} hPa`,
            value: data.pressure,
            threshold: thresholds.pressureMax,
            deviceId: data.deviceId || 'default-device'
        });
    }
    
    // Save and send alerts
    for (const alertData of alerts) {
        try {
            if (dbConnected) {
                const alert = new Alert(alertData);
                await alert.save();
                
                // Send email alerts to all ADMIN users only
                try {
                    const User = require('./models/User');
                    const adminUsers = await User.find({ 
                        role: 'admin',
                        emailAlerts: true 
                    });
                    
                    if (adminUsers.length > 0) {
                        const recipients = adminUsers.map(user => user.email);
                        console.log(`📧 Sending alert to ${recipients.length} admin(s): ${recipients.join(', ')}`);
                        await emailService.sendAlert(alertData, recipients);
                    }
                    
                    // Also send to admin emails from .env if configured
                    if (process.env.ALERT_EMAILS) {
                        const adminRecipients = process.env.ALERT_EMAILS.split(',').map(e => e.trim()).filter(e => e);
                        if (adminRecipients.length > 0) {
                            console.log(`📧 Sending alert to admin email(s): ${adminRecipients.join(', ')}`);
                            await emailService.sendAlert(alertData, adminRecipients);
                        }
                    }
                    
                    // Send SMS alerts to users with SMS enabled
                    const smsUsers = await User.find({ 
                        smsAlerts: true,
                        phone: { $exists: true, $ne: '' }
                    });
                    
                    if (smsUsers.length > 0) {
                        const phoneNumbers = smsUsers.map(user => user.phone);
                        console.log(`📱 Sending SMS alert to ${phoneNumbers.length} user(s)`);
                        // SMS will be sent via Twilio service
                        const smsService = require('./services/smsService');
                        await smsService.sendAlert(alertData, phoneNumbers);
                    }
                } catch (emailError) {
                    console.error('❌ Error sending alerts:', emailError.message);
                }
            }
            
            // Broadcast alert to all connected clients
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'alert',
                        alert: alertData
                    }));
                }
            });
        } catch (error) {
            console.error('Error creating alert:', error);
        }
    }
}

// REST API endpoints

// Get all data
app.get('/api/data', optionalAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 1000;
        const data = await getRecentData(limit);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get data with date range
app.get('/api/data/range', optionalAuth, async (req, res) => {
    try {
        const { start, end } = req.query;
        
        if (dbConnected) {
            const data = await SensorData.find({
                timestamp: {
                    $gte: new Date(start),
                    $lte: new Date(end)
                }
            }).sort({ timestamp: -1 }).lean();
            res.json(data);
        } else {
            const filtered = inMemoryData.filter(d => {
                const timestamp = new Date(d.timestamp);
                return timestamp >= new Date(start) && timestamp <= new Date(end);
            });
            res.json(filtered);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get statistics
app.get('/api/stats', optionalAuth, async (req, res) => {
    try {
        const data = await getRecentData(1000);
        
        const stats = {
            temperature: calculateStats(data.map(d => d.temperature)),
            humidity: calculateStats(data.map(d => d.humidity)),
            pressure: calculateStats(data.map(d => d.pressure)),
            dataPoints: data.length
        };
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function calculateStats(values) {
    const filtered = values.filter(v => v != null);
    if (filtered.length === 0) return null;
    
    const avg = filtered.reduce((a, b) => a + b, 0) / filtered.length;
    const min = Math.min(...filtered);
    const max = Math.max(...filtered);
    const variance = filtered.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / filtered.length;
    const std = Math.sqrt(variance);
    
    return { avg, min, max, std };
}

// Get predictions
app.get('/api/predictions', optionalAuth, async (req, res) => {
    try {
        const data = await getRecentData(100);
        const predictions = predictionService.predict(data, 5);
        res.json({ predictions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get anomalies
app.get('/api/anomalies', optionalAuth, async (req, res) => {
    try {
        const data = await getRecentData(100);
        const anomalies = predictionService.detectAnomalies(data);
        res.json({ anomalies });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get landslide prediction
app.get('/api/landslide-prediction', optionalAuth, async (req, res) => {
    try {
        const recentData = await getRecentData(50);
        if (recentData.length === 0) {
            return res.json({ 
                prediction: null, 
                patterns: null,
                message: 'Insufficient data' 
            });
        }
        
        const latestData = recentData[recentData.length - 1];
        const prediction = predictionService.predictLandslide(latestData);
        const patterns = predictionService.detectLandslidePatterns(recentData);
        
        res.json({ 
            prediction,
            patterns,
            currentConditions: {
                temperature: latestData.temperature,
                humidity: latestData.humidity,
                pressure: latestData.pressure,
                motion: latestData.motion
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🗺️ NEW: Get nearest safe zones
app.get('/api/safe-zones/nearest', async (req, res) => {
    try {
        const { latitude, longitude, maxResults } = req.query;
        
        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Latitude and longitude required' });
        }
        
        const zones = safeZoneService.findNearestSafeZones(
            parseFloat(latitude),
            parseFloat(longitude),
            parseInt(maxResults) || 3
        );
        
        res.json({ zones });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🗺️ NEW: Get complete evacuation plan
app.get('/api/evacuation-plan', async (req, res) => {
    try {
        const { latitude, longitude } = req.query;
        console.log(`🗺️ Evacuation plan requested for: ${latitude}, ${longitude}`);
        
        if (!latitude || !longitude) {
            console.error('❌ Missing latitude or longitude');
            return res.status(400).json({ error: 'Latitude and longitude required' });
        }
        
        const plan = safeZoneService.getEvacuationPlan(
            parseFloat(latitude),
            parseFloat(longitude)
        );
        
        console.log('✅ Evacuation plan generated:', plan ? 'Success' : 'Failed');
        res.json(plan);
    } catch (error) {
        console.error('❌ Error generating evacuation plan:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🗺️ NEW: Get all safe zones (admin)
app.get('/api/safe-zones/all', async (req, res) => {
    try {
        const zones = safeZoneService.getAllSafeZones();
        res.json({ zones, total: zones.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🗺️ ADMIN: Add new safe zone
app.post('/api/safe-zones', authMiddleware, async (req, res) => {
    try {
        const { name, type, latitude, longitude, address, capacity, facilities, contact, elevation, isTemporary } = req.body;
        
        // Validation
        if (!name || !latitude || !longitude || !address) {
            return res.status(400).json({ error: 'Name, latitude, longitude, and address are required' });
        }
        
        const newZone = safeZoneService.addSafeZone({
            name,
            type,
            latitude,
            longitude,
            address,
            capacity,
            facilities,
            contact,
            elevation,
            isTemporary,
            createdBy: req.user?.username || 'admin'
        });
        
        res.status(201).json({ 
            success: true,
            message: 'Safe zone created successfully',
            zone: newZone 
        });
    } catch (error) {
        console.error('Error creating safe zone:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🗺️ ADMIN: Update safe zone
app.put('/api/safe-zones/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const updatedZone = safeZoneService.updateSafeZone(id, updates);
        
        if (!updatedZone) {
            return res.status(404).json({ error: 'Safe zone not found' });
        }
        
        res.json({ 
            success: true,
            message: 'Safe zone updated successfully',
            zone: updatedZone 
        });
    } catch (error) {
        console.error('Error updating safe zone:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🗺️ ADMIN: Delete safe zone
app.delete('/api/safe-zones/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const deleted = safeZoneService.deleteSafeZone(id);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Safe zone not found' });
        }
        
        res.json({ 
            success: true,
            message: 'Safe zone deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting safe zone:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🗺️ Get safe zone by ID
app.get('/api/safe-zones/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const zone = safeZoneService.getSafeZoneById(id);
        
        if (!zone) {
            return res.status(404).json({ error: 'Safe zone not found' });
        }
        
        res.json({ zone });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🌍 NEW: Get regional profile
app.get('/api/regional-profile', async (req, res) => {
    try {
        const { state, latitude, longitude } = req.query;
        
        const profile = regionalCalibration.getRegionalProfile(
            state,
            latitude ? parseFloat(latitude) : null,
            longitude ? parseFloat(longitude) : null
        );
        
        res.json({ profile });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🌍 NEW: Apply regional calibration to sensor data
app.post('/api/calibrated-risk', async (req, res) => {
    try {
        const { sensorData, region } = req.body;
        
        const calibratedRisk = regionalCalibration.applyCalibratedThresholds(
            sensorData,
            region || 'default'
        );
        
        res.json(calibratedRisk);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🌧️ NEW: Get current rainfall data
app.get('/api/rainfall/current', async (req, res) => {
    try {
        const { latitude, longitude } = req.query;
        
        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Latitude and longitude required' });
        }
        
        const rainfall = await rainfallService.getCurrentRainfall(
            parseFloat(latitude),
            parseFloat(longitude)
        );
        
        if (!rainfall) {
            // Return graceful fallback instead of 500 error
            return res.json({
                current: 0,
                intensity: 'none',
                available: false,
                message: 'Rainfall API unavailable - configure OpenWeather API key'
            });
        }
        
        res.json(rainfall);
    } catch (error) {
        console.log('⚠️ Rainfall current endpoint error:', error.message);
        // Return graceful fallback
        res.json({
            current: 0,
            intensity: 'none',
            available: false,
            message: 'Rainfall API unavailable'
        });
    }
});

// 🌧️ NEW: Get rainfall forecast
app.get('/api/rainfall/forecast', async (req, res) => {
    try {
        const { latitude, longitude } = req.query;
        
        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Latitude and longitude required' });
        }
        
        const forecast = await rainfallService.getRainfallForecast(
            parseFloat(latitude),
            parseFloat(longitude)
        );
        
        if (!forecast) {
            // Return graceful fallback instead of 500 error
            return res.json({
                hourly: [],
                daily: [],
                available: false,
                message: 'Rainfall API unavailable - configure OpenWeather API key'
            });
        }
        
        res.json(forecast);
    } catch (error) {
        console.log('⚠️ Rainfall forecast endpoint error:', error.message);
        // Return graceful fallback
        res.json({
            hourly: [],
            daily: [],
            available: false,
            message: 'Rainfall API unavailable'
        });
    }
});

// 🚀 NEW: Enhanced landslide risk (combines sensors + rainfall + regional)
app.get('/api/enhanced-risk', async (req, res) => {
    try {
        const { latitude, longitude } = req.query;
        
        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Latitude and longitude required' });
        }
        
        // Get latest sensor data
        const latestData = await SensorData.findOne().sort({ timestamp: -1 });
        
        if (!latestData) {
            return res.status(404).json({ error: 'No sensor data available' });
        }
        
        // Get enhanced risk assessment (with graceful fallback)
        const enhancedRisk = await rainfallService.getEnhancedLandslideRisk(
            latestData,
            parseFloat(latitude),
            parseFloat(longitude)
        );
        
        // Ensure all required fields exist with fallbacks
        const safeRisk = {
            probability: enhancedRisk.probability || 0,
            riskLevel: enhancedRisk.riskLevel || 'LOW',
            factors: {
                sensorRisk: enhancedRisk.factors?.sensorRisk || 0,
                rainfallRisk: enhancedRisk.factors?.rainfallRisk || 0,
                soilMoistureRisk: enhancedRisk.factors?.soilMoistureRisk || 0,
                weatherRisk: enhancedRisk.factors?.weatherRisk || 0
            },
            recommendations: enhancedRisk.recommendations || ['Monitor sensor data regularly'],
            rainfallAvailable: enhancedRisk.rainfallAvailable !== undefined ? enhancedRisk.rainfallAvailable : false
        };
        
        res.json(safeRisk);
    } catch (error) {
        console.log('⚠️ Enhanced risk endpoint error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get alerts
app.get('/api/alerts', optionalAuth, async (req, res) => {
    try {
        if (dbConnected) {
            const alerts = await Alert.find()
                .sort({ timestamp: -1 })
                .limit(50)
                .lean();
            res.json({ alerts });
        } else {
            res.json({ alerts: [] });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Acknowledge alert
app.put('/api/alerts/:id/acknowledge', authMiddleware, async (req, res) => {
    try {
        if (dbConnected) {
            const alert = await Alert.findByIdAndUpdate(
                req.params.id,
                {
                    acknowledged: true,
                    acknowledgedBy: req.user._id,
                    acknowledgedAt: new Date()
                },
                { new: true }
            );
            res.json({ success: true, alert });
        } else {
            res.json({ success: false, message: 'Database not connected' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Post data
app.post('/api/data', async (req, res) => {
    try {
        const data = req.body;
        
        if (!data.timestamp) {
            data.timestamp = new Date().toISOString();
        }
        
        await saveDataPoint(data);
        await checkThresholdsAndAlert(data);
        
        // Broadcast to WebSocket clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'update',
                    data: data
                }));
            }
        });
        
        res.json({ success: true, message: 'Data received' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete all data
app.delete('/api/data', authMiddleware, async (req, res) => {
    try {
        if (dbConnected) {
            await SensorData.deleteMany({});
        }
        inMemoryData = [];
        res.json({ success: true, message: 'Data cleared' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// System info
app.get('/api/system/info', optionalAuth, (req, res) => {
    res.json({
        version: '2.0.0',
        database: dbConnected ? 'connected' : 'disconnected',
        dataPoints: dbConnected ? 'stored in database' : inMemoryData.length,
        aiEnabled: predictionService.trained,
        emailEnabled: emailService.initialized,
        uptime: process.uptime()
    });
});

// Serve the dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize data and train AI
async function initializeData() {
    try {
        const data = await getRecentData(100);
        if (data.length > 20) {
            await predictionService.trainModels(data);
        }
    } catch (error) {
        console.error('Error initializing data:', error);
    }
}

// Background tasks
function startBackgroundTasks() {
    // Retrain AI model every hour
    setInterval(async () => {
        try {
            const data = await getRecentData(100);
            if (data.length > 20) {
                await predictionService.trainModels(data);
            }
        } catch (error) {
            console.error('Error retraining model:', error);
        }
    }, 60 * 60 * 1000);
    
    // Clean old data (keep last 30 days)
    setInterval(async () => {
        if (dbConnected) {
            try {
                const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS) || 30;
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
                
                const result = await SensorData.deleteMany({
                    timestamp: { $lt: cutoffDate }
                });
                
                if (result.deletedCount > 0) {
                    console.log(`🗑️  Cleaned ${result.deletedCount} old records`);
                }
            } catch (error) {
                console.error('Error cleaning old data:', error);
            }
        }
    }, 24 * 60 * 60 * 1000); // Daily
}

// Start server
server.listen(PORT, () => {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   🚀 IoT Dashboard Server Started     ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║   🌐 URL: http://localhost:${PORT}       ║`);
    console.log(`║   📊 Database: ${dbConnected ? 'Connected ✅' : 'Memory Mode ⚠️ '}  ║`);
    console.log(`║   📧 Email: ${emailService.initialized ? 'Enabled ✅' : 'Disabled ⚠️'}     ║`);
    console.log(`║   🤖 AI Predictions: Ready            ║`);
    console.log('╚════════════════════════════════════════╝');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        if (dbConnected) {
            mongoose.connection.close(false, () => {
                console.log('MongoDB connection closed');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    });
});
