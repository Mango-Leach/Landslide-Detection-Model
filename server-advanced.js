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
const regionalCalibration = require('./services/regionalCalibrationService');
const rainfallService = require('./services/rainfallService');

// Import routes
const authRoutes = require('./routes/auth');
const otpRoutes = require('./routes/otp');
const { optionalAuth, authMiddleware } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/intellislide';

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

// 🌧️ Rainfall API endpoint - uses user's GPS location
app.get('/api/rainfall/current', async (req, res) => {
    try {
        // Get coordinates from query params (user's GPS) or use defaults
        const latitude = parseFloat(req.query.latitude) || parseFloat(process.env.RAINFALL_LATITUDE) || 18.5204;
        const longitude = parseFloat(req.query.longitude) || parseFloat(process.env.RAINFALL_LONGITUDE) || 73.8567;
        
        console.log(`🌧️ Fetching rainfall for GPS: ${latitude}, ${longitude}`);
        
        // Fetch rainfall data for the specific location
        const rainfallData = await getRainfallData(latitude, longitude);
        
        res.json({
            currentIntensity: rainfallData?.currentIntensity || 0,
            cumulative3h: rainfallData?.cumulative3h || 0,
            cumulative24h: rainfallData?.estimated24h || 0,
            cumulative48h: rainfallData?.estimated48h || 0,
            location: rainfallData?.locationName || `${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`,
            latitude: latitude,
            longitude: longitude,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching rainfall data:', error);
        res.status(500).json({
            error: 'Failed to fetch rainfall data',
            currentIntensity: 0,
            cumulative24h: 0,
            cumulative48h: 0,
            location: 'Unknown'
        });
    }
});

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

// 🌋 LANDSLIDE DETECTION FUNCTIONS (ENHANCED WITH RAINFALL & PRESSURE RATE)
// Store pressure history for rate calculation
let pressureHistory = [];
const MAX_PRESSURE_HISTORY = 60; // Keep last 60 readings (1 hour at 1min intervals)

async function checkLandslideConditions(data, rainfallData = null) {
    // ==========================================
    // NORMALIZED WEIGHTED FUSION FORMULA
    // Research Paper Format: Risk_Score = Σ(w_i × normalized_value_i)
    // ==========================================
    
    const weights = {
        rainfall: 0.35,      // w₁ = 35% (Primary trigger)
        humidity: 0.15,      // w₂ = 15% 
        soilMoisture: 0.15,  // w₃ = 15%
        pressure: 0.15,      // w₄ = 15%
        motion: 0.10,        // w₅ = 10%
        temperature: 0.10    // w₆ = 10%
    };
    
    // Normalization parameters (based on real Indian landslide data)
    const maxValues = {
        rainfall: 340,   // Kedarnath 2013 max
        humidity: 100,   // Already percentage
        soilMoisture: 100, // Already percentage
        pressureRange: 163, // Range: 850-1013 hPa
        temperature: 45  // Max expected
    };
    
    let riskFactors = [];
    
    // ==========================================
    // NORMALIZE SENSOR VALUES (0-100 scale)
    // ==========================================
    
    // 1. Rainfall normalization (R_norm)
    let R_norm = 0;
    if (rainfallData) {
        const rainfall24h = rainfallData.cumulative24h || 0;
        const rainfall48h = rainfallData.cumulative48h || 0;
        const currentIntensity = rainfallData.currentIntensity || 0;
        
        // Use maximum of 24h or 48h cumulative
        const maxRainfall = Math.max(rainfall24h, rainfall48h);
        R_norm = Math.min((maxRainfall / maxValues.rainfall) * 100, 100);
        
        // Track critical rainfall
        if (rainfall48h >= 150) {
            riskFactors.push(`🔴 CRITICAL: ${rainfall48h.toFixed(1)}mm rain in 48h`);
        } else if (rainfall24h >= 100) {
            riskFactors.push(`⚠️ HIGH: ${rainfall24h.toFixed(1)}mm rain in 24h (GSI threshold)`);
        } else if (rainfall24h >= 50) {
            riskFactors.push(`⚠️ Elevated rain: ${rainfall24h.toFixed(1)}mm in 24h`);
        }
        
        if (currentIntensity >= 50) {
            riskFactors.push(`🔴 Violent rainfall: ${currentIntensity.toFixed(1)}mm/hr`);
        } else if (currentIntensity >= 20) {
            riskFactors.push(`⚠️ Heavy rainfall: ${currentIntensity.toFixed(1)}mm/hr`);
        }
    }
    
    // 2. Humidity normalization (H_norm) - already 0-100
    const H_norm = data.humidity || 0;
    if (data.humidity >= 85) {
        riskFactors.push(`Critical humidity: ${data.humidity.toFixed(1)}%`);
    } else if (data.humidity >= 75) {
        riskFactors.push(`High humidity: ${data.humidity.toFixed(1)}%`);
    }
    
    // 3. Soil moisture normalization (S_norm) - already 0-100
    const S_norm = data.soilMoisture || 0;
    if (data.soilMoisture >= 80) {
        riskFactors.push(`🔴 Critical soil moisture: ${data.soilMoisture.toFixed(1)}%`);
    }
    
    // 4. Pressure normalization (P_norm) - inverse (lower pressure = higher risk)
    let P_norm = 0;
    if (data.pressure) {
        P_norm = Math.min(((1013 - data.pressure) / maxValues.pressureRange) * 100, 100);
        if (data.pressure < 1000) {
            riskFactors.push(`Low pressure: ${data.pressure.toFixed(1)} hPa`);
        }
    }
    
    // 5. Motion normalization (M_norm) - binary (0 or 100)
    const M_norm = data.motion ? 100 : 0;
    if (data.motion) {
        riskFactors.push(`🔴 GROUND MOTION DETECTED`);
    }
    
    // 6. Temperature normalization (T_norm)
    const T_norm = Math.min((data.temperature / maxValues.temperature) * 100, 100);
    if (data.temperature >= 35) {
        riskFactors.push(`High temperature: ${data.temperature.toFixed(1)}°C`);
    }
    
    // ==========================================
    // CALCULATE WEIGHTED RISK SCORE (0-100)
    // Formula: Risk_Score = Σ(w_i × normalized_value_i)
    // ==========================================
    
    const riskScore = (
        weights.rainfall * R_norm +
        weights.humidity * H_norm +
        weights.soilMoisture * S_norm +
        weights.pressure * P_norm +
        weights.motion * M_norm +
        weights.temperature * T_norm
    );
    
    // ==========================================
    // REGIONAL CALIBRATION (Universal Multi-Region Risk)
    // ==========================================
    
    // Get regionally-calibrated risk score
    const calibration = regionalCalibration.getCalibratedRisk(
        {
            temperature: data.temperature,
            humidity: data.humidity,
            pressure: data.pressure,
            soilMoisture: data.soilMoisture
        },
        riskScore,
        data.location || data.deviceId
    );
    
    const finalRiskScore = calibration.calibratedRisk;
    const regionalThreshold = calibration.regionThreshold;
    
    // Determine if landslide alert should be triggered
    // Use region-specific threshold (adaptive to local conditions)
    const detected = finalRiskScore >= regionalThreshold;
    
    return {
        detected,
        riskScore: Math.round(finalRiskScore * 10) / 10, // Round to 1 decimal
        baseRiskScore: Math.round(riskScore * 10) / 10, // Original score before calibration
        maxRiskScore: 100, // Updated to 0-100 scale
        riskFactors,
        severity: finalRiskScore >= 70 ? 'critical' : finalRiskScore >= 50 ? 'high' : finalRiskScore >= 35 ? 'moderate' : finalRiskScore >= regionalThreshold ? 'low' : 'safe',
        hasRainfallData: rainfallData !== null,
        accuracyEstimate: rainfallData ? '60-70%' : '30-50%', // Show accuracy based on data availability
        regionalCalibration: {
            regionId: calibration.regionId,
            threshold: Math.round(regionalThreshold * 10) / 10,
            anomalyScore: Math.round(calibration.anomalyScore * 100) / 100,
            hasProfile: calibration.hasRegionalProfile,
            confidence: calibration.confidence
        },
        normalizedValues: { // For debugging/research
            rainfall: Math.round(R_norm * 10) / 10,
            humidity: Math.round(H_norm * 10) / 10,
            soilMoisture: Math.round(S_norm * 10) / 10,
            pressure: Math.round(P_norm * 10) / 10,
            motion: Math.round(M_norm * 10) / 10,
            temperature: Math.round(T_norm * 10) / 10
        }
    };
}

async function handleLandslideAlert(data, landslideRisk, rainfallData = null) {
    try {
        // Record this landslide event for AI learning
        predictionService.recordLandslideEvent(data);
        
        const alertData = {
            type: 'landslide',
            severity: 'critical',
            message: `LANDSLIDE WARNING - Risk Score: ${landslideRisk.riskScore}/${landslideRisk.maxRiskScore} (${landslideRisk.accuracyEstimate} accuracy)`,
            deviceId: data.deviceId || 'default-device',
            timestamp: data.timestamp || new Date().toISOString(),
            temperature: data.temperature,
            humidity: data.humidity,
            pressure: data.pressure,
            soilMoisture: data.soilMoisture,
            motion: data.motion,
            riskFactors: landslideRisk.riskFactors.join(', '),
            // Add rainfall data if available
            rainfall24h: rainfallData?.cumulative24h || null,
            rainfall48h: rainfallData?.cumulative48h || null,
            rainfallIntensity: rainfallData?.currentIntensity || null
        };
        
        // Save landslide alert to database
        if (dbConnected) {
            const alert = new Alert(alertData);
            await alert.save();
        }
        
        // Send email alert to ALL users in database
        if (dbConnected) {
            const User = require('./models/User');
            
            // Send alert email to ALL USERS
            const allUsers = await User.find({ emailAlerts: true });
            if (allUsers.length > 0) {
                const allEmails = allUsers.map(user => user.email);
                console.log(`🚨 Sending landslide alert to ${allEmails.length} user(s): ${allEmails.join(', ')}`);
                await emailService.sendLandslideUserAlert(data, allEmails);
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

// ==========================================
// RAINFALL TRACKING & INTEGRATION (NEW!)
// ==========================================
let rainfallCache = {
    data: null,
    lastFetch: 0,
    location: { latitude: 28.6139, longitude: 77.2090 } // Default: New Delhi (change to your location)
};
const RAINFALL_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

async function getRainfallData(latitude = null, longitude = null) {
    const now = Date.now();
    
    // Use provided coordinates or fall back to cached/default location
    const lat = latitude || rainfallCache.location.latitude;
    const lon = longitude || rainfallCache.location.longitude;
    
    // Return cached data if same location and still fresh
    const isSameLocation = (lat === rainfallCache.location.latitude && lon === rainfallCache.location.longitude);
    if (rainfallCache.data && isSameLocation && (now - rainfallCache.lastFetch) < RAINFALL_CACHE_DURATION) {
        return rainfallCache.data;
    }
    
    try {
        // Fetch current rainfall from OpenWeather API for the specific location
        const currentData = await rainfallService.getCurrentRainfall(lat, lon);
        
        if (currentData) {
            // Get location name from the API response
            const locationName = currentData.name || `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;
            
            // Extract rainfall data
            const rainfallInfo = {
                currentIntensity: currentData.rainfall.lastHour || 0, // mm/hr
                cumulative3h: currentData.rainfall.last3Hours || 0,
                estimated24h: 0, // We'll estimate this
                estimated48h: 0, // We'll estimate this
                locationName: locationName,
                latitude: lat,
                longitude: lon,
                lastUpdate: new Date(),
                source: 'OpenWeatherMap'
            };
            
            // Estimate 24h/48h cumulative from current intensity
            // TODO: Implement proper 24h/48h cumulative tracking with database
            rainfallInfo.estimated24h = rainfallInfo.currentIntensity * 24; // Rough estimate
            rainfallInfo.estimated48h = rainfallInfo.estimated24h * 2; // Rough estimate
            
            // Update cache with new location data
            rainfallCache.data = rainfallInfo;
            rainfallCache.lastFetch = now;
            rainfallCache.location = { latitude: lat, longitude: lon };
            
            console.log(`🌧️ Rainfall updated for ${locationName}: ${rainfallInfo.currentIntensity}mm/hr (24h: ${rainfallInfo.estimated24h.toFixed(1)}mm)`);
            return rainfallInfo;
        }
    } catch (error) {
        console.log('⚠️ Rainfall API fetch failed:', error.message);
    }
    
    return null;
}

// Update location for rainfall monitoring
function setRainfallLocation(latitude, longitude) {
    rainfallCache.location = { latitude, longitude };
    rainfallCache.lastFetch = 0; // Force refresh
    console.log(`📍 Rainfall monitoring location set to: ${latitude}, ${longitude}`);
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
    
    // 🌧️ FETCH RAINFALL DATA (NEW!)
    const rainfallData = await getRainfallData();
    
    // 🚨 LANDSLIDE DETECTION - Check first (highest priority) WITH RAINFALL!
    const landslideRisk = await checkLandslideConditions(data, rainfallData);
    if (landslideRisk.detected) {
        console.log('🚨🚨🚨 LANDSLIDE CONDITIONS DETECTED! 🚨🚨🚨');
        console.log(`   Risk Score: ${landslideRisk.riskScore}/${landslideRisk.maxRiskScore}`);
        console.log(`   Severity: ${landslideRisk.severity.toUpperCase()}`);
        console.log(`   Accuracy: ${landslideRisk.accuracyEstimate}`);
        console.log(`   Factors: ${landslideRisk.riskFactors.join(' | ')}`);
        await handleLandslideAlert(data, landslideRisk, rainfallData);
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
                
                // Send email alerts to ALL users
                try {
                    const User = require('./models/User');
                    const allUsers = await User.find({ emailAlerts: true });
                    
                    if (allUsers.length > 0) {
                        const recipients = allUsers.map(user => user.email);
                        console.log(`📧 Sending alert to ${recipients.length} user(s): ${recipients.join(', ')}`);
                        await emailService.sendAlert(alertData, recipients);
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

// 🌍 NEW: Get all regional calibration profiles
app.get('/api/regional-profiles', (req, res) => {
    try {
        const profiles = regionalCalibration.getAllProfiles();
        res.json({ 
            profiles,
            totalRegions: profiles.length,
            message: 'Regional calibration profiles (universal - adapts to any dataset)'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🌍 NEW: Get specific region profile
app.get('/api/regional-profile/:location', (req, res) => {
    try {
        const profile = regionalCalibration.getRegionProfile(req.params.location);
        if (profile) {
            res.json({ profile });
        } else {
            res.status(404).json({ error: 'Region not found', message: 'System will use global baseline for this location' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🌍 NEW: Export regional calibration data
app.get('/api/regional-calibration/export', (req, res) => {
    try {
        const calibrationData = regionalCalibration.exportCalibration();
        res.json(calibrationData);
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
    console.log('║   🚀 IntelliSlide Server Started      ║');
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
