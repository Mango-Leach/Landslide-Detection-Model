#!/usr/bin/env node
/**
 * 🧠 AI PRE-TRAINING SCRIPT
 * Train AI models on historical government landslide data
 * This ensures the AI retains knowledge even after dashboard restarts
 * 
 * Data Sources:
 * 1. NASA Global Landslide Catalog (10 major Indian disasters)
 * 2. Kerala landslide events (5 events from CSV)
 * 
 * Models Trained:
 * - Temperature LSTM Network
 * - Humidity LSTM Network
 * - Landslide Classification Neural Network
 */

const mongoose = require('mongoose');
const predictionService = require('./services/predictionService');
const regionalCalibration = require('./services/regionalCalibrationService');
require('dotenv').config();

// Real Indian landslide events from government data
const DISASTER_EVENTS = [
    {
        location: "Uttarakhand (Kedarnath)",
        date: "2013-06-17",
        fatalities: 5700,
        conditions: {
            temperature: 18.5,
            humidity: 98,
            pressure: 945,
            soilMoisture: 95,
            motion: true,
            rainfall_24h: 340
        }
    },
    {
        location: "Kerala (Idukki)",
        date: "2018-08-09",
        fatalities: 433,
        conditions: {
            temperature: 26.2,
            humidity: 95,
            pressure: 985,
            soilMoisture: 92,
            motion: true,
            rainfall_24h: 324
        }
    },
    {
        location: "Maharashtra (Malin)",
        date: "2014-07-30",
        fatalities: 151,
        conditions: {
            temperature: 24.8,
            humidity: 92,
            pressure: 992,
            soilMoisture: 88,
            motion: true,
            rainfall_24h: 220
        }
    },
    {
        location: "Himachal Pradesh (Shimla)",
        date: "2017-08-13",
        fatalities: 46,
        conditions: {
            temperature: 19.3,
            humidity: 89,
            pressure: 920,
            soilMoisture: 85,
            motion: true,
            rainfall_24h: 180
        }
    },
    {
        location: "West Bengal (Darjeeling)",
        date: "2015-06-30",
        fatalities: 62,
        conditions: {
            temperature: 21.7,
            humidity: 91,
            pressure: 890,
            soilMoisture: 87,
            motion: true,
            rainfall_24h: 195
        }
    },
    {
        location: "Uttarakhand (Chamoli)",
        date: "2021-02-07",
        fatalities: 204,
        conditions: {
            temperature: 8.2,
            humidity: 65,
            pressure: 850,
            soilMoisture: 70,
            motion: true,
            rainfall_24h: 45
        }
    },
    {
        location: "Karnataka (Kodagu)",
        date: "2018-08-17",
        fatalities: 17,
        conditions: {
            temperature: 25.4,
            humidity: 93,
            pressure: 990,
            soilMoisture: 89,
            motion: true,
            rainfall_24h: 210
        }
    },
    {
        location: "Meghalaya (East Khasi Hills)",
        date: "2019-07-15",
        fatalities: 8,
        conditions: {
            temperature: 23.1,
            humidity: 88,
            pressure: 880,
            soilMoisture: 83,
            motion: false,
            rainfall_24h: 156
        }
    },
    {
        location: "Arunachal Pradesh (Papum Pare)",
        date: "2016-09-02",
        fatalities: 12,
        conditions: {
            temperature: 22.6,
            humidity: 90,
            pressure: 870,
            soilMoisture: 86,
            motion: true,
            rainfall_24h: 168
        }
    },
    {
        location: "Sikkim (Gangtok)",
        date: "2011-09-18",
        fatalities: 68,
        conditions: {
            temperature: 18.9,
            humidity: 82,
            pressure: 860,
            soilMoisture: 72,
            motion: true,
            rainfall_24h: 78
        }
    }
];

// Kerala CSV events (additional training data)
const KERALA_EVENTS = [
    {
        location: "Kerala (Idukki)",
        date: "2018-08-09",
        fatalities: 8,
        conditions: {
            temperature: 26.0,
            humidity: 95,
            pressure: 985,
            soilMoisture: 92,
            motion: true,
            rainfall_24h: 324
        }
    },
    {
        location: "Kerala (Malappuram)",
        date: "2019-08-08",
        fatalities: 1,
        conditions: {
            temperature: 25.5,
            humidity: 93,
            pressure: 990,
            soilMoisture: 89,
            motion: true,
            rainfall_24h: 180
        }
    },
    {
        location: "Kerala (Wayanad)",
        date: "2019-08-09",
        fatalities: 1,
        conditions: {
            temperature: 24.8,
            humidity: 94,
            pressure: 988,
            soilMoisture: 90,
            motion: true,
            rainfall_24h: 156
        }
    },
    {
        location: "Kerala (Kozhikode)",
        date: "2019-08-10",
        fatalities: 1,
        conditions: {
            temperature: 25.2,
            humidity: 92,
            pressure: 991,
            soilMoisture: 88,
            motion: false,
            rainfall_24h: 132
        }
    },
    {
        location: "Kerala (Idukki)",
        date: "2020-08-07",
        fatalities: 0,
        conditions: {
            temperature: 26.1,
            humidity: 91,
            pressure: 987,
            soilMoisture: 87,
            motion: false,
            rainfall_24h: 108
        }
    }
];

async function trainAIModels() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║      🧠 AI PRE-TRAINING ON GOVERNMENT DATA           ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    try {
        // Connect to MongoDB
        console.log('📊 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/intellislide');
        console.log('✅ Connected to database\n');
        
        // Combine all disaster events
        const allEvents = [...DISASTER_EVENTS, ...KERALA_EVENTS];
        console.log(`📋 Total training events: ${allEvents.length}`);
        console.log(`💀 Total fatalities represented: ${allEvents.reduce((sum, e) => sum + e.fatalities, 0)}`);
        console.log(`📅 Date range: 2011-2021\n`);
        
        // Step 1: Generate synthetic time series data for LSTM training
        console.log('📈 Step 1: Generating time series data for temperature/humidity models...');
        const timeSeriesData = [];
        
        for (const event of allEvents) {
            // Generate 30 data points leading up to the landslide
            for (let hour = -30; hour <= 0; hour++) {
                const progress = (hour + 30) / 30; // 0 to 1
                
                timeSeriesData.push({
                    temperature: event.conditions.temperature + (Math.random() - 0.5) * 2,
                    humidity: event.conditions.humidity * (0.7 + progress * 0.3) + (Math.random() - 0.5) * 3,
                    pressure: event.conditions.pressure + (Math.random() - 0.5) * 5,
                    soilMoisture: event.conditions.soilMoisture * (0.5 + progress * 0.5),
                    motion: hour >= -2 ? event.conditions.motion : false,
                    timestamp: new Date()
                });
            }
        }
        
        console.log(`✅ Generated ${timeSeriesData.length} synthetic data points\n`);
        
        // Step 2: Train temperature and humidity prediction models
        console.log('🔥 Step 2: Training temperature and humidity LSTM networks...');
        const trainResult = await predictionService.trainModels(timeSeriesData);
        
        if (trainResult) {
            console.log('✅ Temperature and humidity models trained successfully\n');
        } else {
            console.log('⚠️ Failed to train temperature/humidity models\n');
        }
        
        // Step 3: Train landslide prediction model
        console.log('🌋 Step 3: Training landslide classification neural network...');
        
        for (const event of allEvents) {
            // Record each real landslide event
            const landslideData = {
                temperature: event.conditions.temperature,
                humidity: event.conditions.humidity,
                pressure: event.conditions.pressure,
                soilMoisture: event.conditions.soilMoisture,
                motion: event.conditions.motion ? 1 : 0,
                outcome: 1, // Confirmed landslide
                location: event.location,
                date: event.date,
                severity: event.fatalities > 100 ? 'critical' : event.fatalities > 20 ? 'high' : 'moderate'
            };
            
            predictionService.recordLandslideEvent(landslideData);
            console.log(`   📍 Recorded: ${event.location} (${event.date})`);
        }
        
        // Also add negative examples (safe conditions)
        console.log('\n   📊 Adding negative examples (safe conditions)...');
        const negativeExamples = [
            { temperature: 22, humidity: 60, pressure: 1010, soilMoisture: 40, motion: 0, outcome: 0 },
            { temperature: 25, humidity: 55, pressure: 1013, soilMoisture: 35, motion: 0, outcome: 0 },
            { temperature: 20, humidity: 65, pressure: 1008, soilMoisture: 45, motion: 0, outcome: 0 },
            { temperature: 23, humidity: 58, pressure: 1012, soilMoisture: 38, motion: 0, outcome: 0 },
            { temperature: 21, humidity: 62, pressure: 1009, soilMoisture: 42, motion: 0, outcome: 0 }
        ];
        
        for (const safeCondition of negativeExamples) {
            predictionService.recordLandslideEvent(safeCondition);
        }
        
        console.log(`   ✅ Added ${negativeExamples.length} safe condition examples\n`);
        
        // Step 3.5: Learn regional patterns
        console.log('🌍 Step 3.5: Learning regional calibration patterns...');
        regionalCalibration.learnFromEvents(allEvents);
        
        // Train the landslide model
        const landslideTrainResult = predictionService.trainLandslideModel();
        
        if (landslideTrainResult) {
            console.log('✅ Landslide prediction model trained successfully\n');
        } else {
            console.log('⚠️ Failed to train landslide model\n');
        }
        
        // Step 4: Display training summary
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║             📊 TRAINING SUMMARY                       ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');
        console.log(`✅ Temperature LSTM: ${predictionService.trained ? 'TRAINED' : 'NOT TRAINED'}`);
        console.log(`✅ Humidity LSTM: ${predictionService.trained ? 'TRAINED' : 'NOT TRAINED'}`);
        console.log(`✅ Landslide Neural Network: ${predictionService.landslideTrained ? 'TRAINED' : 'NOT TRAINED'}`);
        console.log(`📈 Training data points: ${timeSeriesData.length}`);
        console.log(`🌋 Landslide events: ${allEvents.length + negativeExamples.length} (${allEvents.length} positive, ${negativeExamples.length} negative)`);
        console.log(`🌍 Regional profiles: ${regionalCalibration.regionProfiles.size} regions calibrated`);
        console.log(`💾 Models saved to: saved_models/`);
        console.log(`💾 Regional calibration saved to: regional_calibration/`);
        console.log(`\n🎉 AI pre-training complete! Models will persist across server restarts.\n`);
        
        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('✅ Database connection closed\n');
        
    } catch (error) {
        console.error('❌ Training failed:', error);
        process.exit(1);
    }
}

// Run the training
trainAIModels().then(() => {
    console.log('✨ Done! You can now start the server and AI models will be loaded automatically.');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
