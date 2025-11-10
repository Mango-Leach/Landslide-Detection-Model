const brain = require('brain.js');

class PredictionService {
    constructor() {
        this.tempNetwork = new brain.recurrent.LSTMTimeStep({
            inputSize: 1,
            hiddenLayers: [10],
            outputSize: 1
        });
        
        this.humidityNetwork = new brain.recurrent.LSTMTimeStep({
            inputSize: 1,
            hiddenLayers: [10],
            outputSize: 1
        });
        
        // Landslide prediction neural network
        this.landslideNetwork = new brain.NeuralNetwork({
            hiddenLayers: [12, 8],
            activation: 'sigmoid'
        });
        
        this.trained = false;
        this.landslideTrained = false;
        this.landslideHistory = [];
    }
    
    async trainModels(data) {
        if (data.length < 20) {
            console.log('Not enough data for training (minimum 20 points required)');
            return false;
        }
        
        try {
            // Prepare temperature data
            const tempData = data.map(d => d.temperature).filter(t => t != null);
            const humidityData = data.map(d => d.humidity).filter(h => h != null);
            
            // Normalize data
            const tempNormalized = this.normalizeData(tempData);
            const humidityNormalized = this.normalizeData(humidityData);
            
            // Train networks
            console.log('Training temperature prediction model...');
            this.tempNetwork.train([tempNormalized], {
                iterations: 100,
                errorThresh: 0.01
            });
            
            console.log('Training humidity prediction model...');
            this.humidityNetwork.train([humidityNormalized], {
                iterations: 100,
                errorThresh: 0.01
            });
            
            this.trained = true;
            this.tempMin = Math.min(...tempData);
            this.tempMax = Math.max(...tempData);
            this.humidityMin = Math.min(...humidityData);
            this.humidityMax = Math.max(...humidityData);
            
            console.log('AI models trained successfully');
            return true;
        } catch (error) {
            console.error('Failed to train models:', error);
            return false;
        }
    }
    
    normalizeData(data) {
        const min = Math.min(...data);
        const max = Math.max(...data);
        return data.map(val => (val - min) / (max - min));
    }
    
    denormalize(value, min, max) {
        return value * (max - min) + min;
    }
    
    predict(recentData, steps = 5) {
        if (!this.trained) {
            return null;
        }
        
        try {
            const tempData = recentData.map(d => d.temperature).filter(t => t != null);
            const humidityData = recentData.map(d => d.humidity).filter(h => h != null);
            
            if (tempData.length < 10) {
                return null;
            }
            
            // Normalize recent data
            const tempNormalized = this.normalizeData(tempData);
            const humidityNormalized = this.normalizeData(humidityData);
            
            // Predict next values
            const tempPredictions = this.tempNetwork.forecast(tempNormalized, steps);
            const humidityPredictions = this.humidityNetwork.forecast(humidityNormalized, steps);
            
            // Denormalize predictions
            const predictions = [];
            for (let i = 0; i < steps; i++) {
                predictions.push({
                    temperature: this.denormalize(tempPredictions[i], this.tempMin, this.tempMax),
                    humidity: this.denormalize(humidityPredictions[i], this.humidityMin, this.humidityMax),
                    timestamp: new Date(Date.now() + (i + 1) * 60000) // Predict next 5 minutes
                });
            }
            
            return predictions;
        } catch (error) {
            console.error('Prediction error:', error);
            return null;
        }
    }
    
    detectAnomalies(data, threshold = 2) {
        if (data.length < 10) return [];
        
        const anomalies = [];
        
        // Calculate rolling average and standard deviation
        const windowSize = 10;
        for (let i = windowSize; i < data.length; i++) {
            const window = data.slice(i - windowSize, i);
            
            ['temperature', 'humidity', 'pressure'].forEach(field => {
                const values = window.map(d => d[field]).filter(v => v != null);
                const mean = values.reduce((a, b) => a + b, 0) / values.length;
                const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
                const stdDev = Math.sqrt(variance);
                
                const currentValue = data[i][field];
                const zScore = Math.abs((currentValue - mean) / stdDev);
                
                if (zScore > threshold) {
                    anomalies.push({
                        field,
                        value: currentValue,
                        mean,
                        zScore,
                        timestamp: data[i].timestamp
                    });
                }
            });
        }
        
        return anomalies;
    }
    
    getTrend(data, field) {
        if (data.length < 2) return 'stable';
        
        const values = data.map(d => d[field]).filter(v => v != null);
        const recentAvg = values.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, values.length);
        const olderAvg = values.slice(0, 10).reduce((a, b) => a + b, 0) / Math.min(10, values.length);
        
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;
        
        if (change > 5) return 'increasing';
        if (change < -5) return 'decreasing';
        return 'stable';
    }
    
    // Record a landslide event for learning
    recordLandslideEvent(sensorData) {
        const event = {
            temperature: sensorData.temperature,
            humidity: sensorData.humidity,
            pressure: sensorData.pressure,
            motion: sensorData.motion ? 1 : 0,
            soilMoisture: sensorData.soilMoisture || 0,
            timestamp: new Date(),
            outcome: 1 // 1 = landslide occurred
        };
        
        this.landslideHistory.push(event);
        
        // Keep only last 100 events
        if (this.landslideHistory.length > 100) {
            this.landslideHistory.shift();
        }
        
        // Retrain if we have enough events
        if (this.landslideHistory.length >= 10) {
            this.trainLandslideModel();
        }
    }
    
    // Train landslide prediction model
    trainLandslideModel() {
        if (this.landslideHistory.length < 10) {
            console.log('Not enough landslide data for training');
            return false;
        }
        
        try {
            const trainingData = this.landslideHistory.map(event => ({
                input: {
                    temperature: event.temperature / 50,  // Normalize to 0-1
                    humidity: event.humidity / 100,
                    pressure: (event.pressure - 900) / 200,
                    motion: event.motion,
                    soilMoisture: event.soilMoisture / 100
                },
                output: { landslide: event.outcome }
            }));
            
            console.log('🧠 Training landslide prediction model...');
            this.landslideNetwork.train(trainingData, {
                iterations: 2000,
                errorThresh: 0.05,
                log: false
            });
            
            this.landslideTrained = true;
            console.log('✅ Landslide prediction model trained');
            return true;
        } catch (error) {
            console.error('Failed to train landslide model:', error);
            return false;
        }
    }
    
    // Predict landslide probability
    predictLandslide(sensorData) {
        if (!this.landslideTrained) {
            return null;
        }
        
        try {
            const input = {
                temperature: (sensorData.temperature || 20) / 50,
                humidity: (sensorData.humidity || 50) / 100,
                pressure: ((sensorData.pressure || 1013) - 900) / 200,
                motion: sensorData.motion ? 1 : 0,
                soilMoisture: (sensorData.soilMoisture || 0) / 100
            };
            
            const result = this.landslideNetwork.run(input);
            const probability = result.landslide;
            
            return {
                probability: (probability * 100).toFixed(2),
                risk: probability > 0.7 ? 'HIGH' : probability > 0.4 ? 'MODERATE' : 'LOW',
                confidence: this.landslideTrained ? 'LEARNING' : 'LOW',
                eventsAnalyzed: this.landslideHistory.length
            };
        } catch (error) {
            console.error('Landslide prediction error:', error);
            return null;
        }
    }
    
    // Detect complex multi-sensor anomalies
    detectLandslidePatterns(recentData) {
        if (recentData.length < 5) return null;
        
        const patterns = {
            rapidHumidityIncrease: false,
            temperatureSpike: false,
            pressureDrop: false,
            sustainedMotion: false,
            anomalyScore: 0
        };
        
        // Check for rapid humidity increase
        const humidityTrend = this.getTrend(recentData.slice(-10), 'humidity');
        if (humidityTrend === 'increasing') {
            const recent = recentData.slice(-5);
            const humidityValues = recent.map(d => d.humidity).filter(h => h != null);
            const avgHumidity = humidityValues.reduce((a, b) => a + b, 0) / humidityValues.length;
            
            if (avgHumidity > 70) {
                patterns.rapidHumidityIncrease = true;
                patterns.anomalyScore += 3;
            }
        }
        
        // Check for temperature anomalies
        const tempValues = recentData.slice(-10).map(d => d.temperature).filter(t => t != null);
        const avgTemp = tempValues.reduce((a, b) => a + b, 0) / tempValues.length;
        const currentTemp = recentData[recentData.length - 1].temperature;
        
        if (Math.abs(currentTemp - avgTemp) > 10) {
            patterns.temperatureSpike = true;
            patterns.anomalyScore += 2;
        }
        
        // Check for pressure drop
        const pressureValues = recentData.slice(-10).map(d => d.pressure).filter(p => p != null);
        if (pressureValues.length > 0) {
            const avgPressure = pressureValues.reduce((a, b) => a + b, 0) / pressureValues.length;
            const currentPressure = recentData[recentData.length - 1].pressure;
            
            if (currentPressure < avgPressure - 15) {
                patterns.pressureDrop = true;
                patterns.anomalyScore += 2;
            }
        }
        
        // Check for sustained motion
        const motionCount = recentData.slice(-5).filter(d => d.motion).length;
        if (motionCount >= 3) {
            patterns.sustainedMotion = true;
            patterns.anomalyScore += 2;
        }
        
        patterns.warning = patterns.anomalyScore >= 5 ? 'CRITICAL' : 
                          patterns.anomalyScore >= 3 ? 'WARNING' : 'NORMAL';
        
        return patterns;
    }
}

module.exports = new PredictionService();
