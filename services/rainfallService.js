/**
 * 🌧️ RAINFALL PREDICTION & INTEGRATION
 * 
 * Patent Enhancement Feature
 * Integrates weather API data with landslide risk prediction
 * 
 * Features:
 * - Real-time rainfall data from OpenWeather API
 * - 24-hour rainfall prediction
 * - Cumulative rainfall tracking
 * - Rainfall intensity correlation with landslide risk
 * 
 * Scientific Basis:
 * - Guzzetti et al. (2008): Rainfall thresholds for landslide initiation
 * - GSI Report: Critical rainfall = 100mm in 24 hours
 */

const axios = require('axios');

// OpenWeather API configuration
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || 'YOUR_API_KEY_HERE';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Check API key on module load
if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === 'YOUR_API_KEY_HERE') {
    console.log('⚠️  OpenWeather API key not configured');
    console.log('ℹ️  Rainfall prediction features will be disabled');
    console.log('📝 To enable: Add OPENWEATHER_API_KEY to your .env file');
    console.log('🔗 Get free API key at: https://openweathermap.org/api');
}

// Rainfall thresholds (mm per hour)
const RAINFALL_THRESHOLDS = {
    LIGHT: 2.5,      // Light rain
    MODERATE: 7.5,   // Moderate rain
    HEAVY: 50,       // Heavy rain
    VIOLENT: 100,    // Violent rain (extreme landslide risk)
    CRITICAL_24HR: 100  // Critical cumulative in 24 hours
};

/**
 * Get current weather and rainfall data
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Object} Current weather data
 */
async function getCurrentRainfall(latitude, longitude) {
    // Check if API key is configured
    if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === '7930cf2a0521be60817b1bddf3052183') {

        console.log('ℹ️  OpenWeather API key not configured - rainfall features disabled');
        return null;
    }
    
    try {
        const response = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
            params: {
                lat: latitude,
                lon: longitude,
                appid: OPENWEATHER_API_KEY,
                units: 'metric'
            }
        });
        
        const data = response.data;
        
        // Extract rainfall data (can be in rain.1h or rain.3h)
        const rainfallLastHour = data.rain?.['1h'] || 0;
        const rainfallLast3Hours = data.rain?.['3h'] || 0;
        
        return {
            location: {
                name: data.name,
                coordinates: {
                    latitude: data.coord.lat,
                    longitude: data.coord.lon
                }
            },
            timestamp: new Date(data.dt * 1000),
            weather: {
                condition: data.weather[0].main,
                description: data.weather[0].description,
                icon: data.weather[0].icon
            },
            rainfall: {
                lastHour: rainfallLastHour,
                last3Hours: rainfallLast3Hours,
                intensity: classifyRainfallIntensity(rainfallLastHour)
            },
            temperature: data.main.temp,
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            windSpeed: data.wind.speed,
            clouds: data.clouds.all
        };
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('⚠️  OpenWeather API: Invalid API key - please configure in .env file');
        } else {
            console.error('❌ Error fetching current rainfall:', error.message);
        }
        return null;
    }
}

/**
 * Get rainfall forecast for next 5 days (3-hour intervals)
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Object} Forecast data
 */
async function getRainfallForecast(latitude, longitude) {
    // Check if API key is configured
    if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === 'YOUR_API_KEY_HERE') {
        console.log('ℹ️  OpenWeather API key not configured - forecast features disabled');
        return null;
    }
    
    try {
        const response = await axios.get(`${OPENWEATHER_BASE_URL}/forecast`, {
            params: {
                lat: latitude,
                lon: longitude,
                appid: OPENWEATHER_API_KEY,
                units: 'metric'
            }
        });
        
        const forecasts = response.data.list;
        
        // Group by day
        const dailyForecasts = {};
        let cumulativeRainfall = 0;
        
        forecasts.forEach(forecast => {
            const date = new Date(forecast.dt * 1000).toISOString().split('T')[0];
            const rainfall = forecast.rain?.['3h'] || 0;
            
            if (!dailyForecasts[date]) {
                dailyForecasts[date] = {
                    date,
                    totalRainfall: 0,
                    maxIntensity: 0,
                    forecasts: []
                };
            }
            
            dailyForecasts[date].totalRainfall += rainfall;
            dailyForecasts[date].maxIntensity = Math.max(
                dailyForecasts[date].maxIntensity,
                rainfall / 3 // Convert to mm/hour
            );
            dailyForecasts[date].forecasts.push({
                time: new Date(forecast.dt * 1000),
                rainfall,
                temperature: forecast.main.temp,
                humidity: forecast.main.humidity,
                pressure: forecast.main.pressure,
                weather: forecast.weather[0].description
            });
            
            cumulativeRainfall += rainfall;
        });
        
        // Calculate risk for each day
        const dailyRisks = Object.values(dailyForecasts).map(day => {
            const riskScore = calculateRainfallRiskScore(day.totalRainfall, day.maxIntensity);
            return {
                ...day,
                riskScore,
                riskLevel: getRiskLevel(riskScore),
                isAboveThreshold: day.totalRainfall >= RAINFALL_THRESHOLDS.CRITICAL_24HR
            };
        });
        
        return {
            location: {
                name: response.data.city.name,
                coordinates: {
                    latitude: response.data.city.coord.lat,
                    longitude: response.data.city.coord.lon
                }
            },
            dailyForecasts: dailyRisks,
            summary: {
                totalForecastDays: dailyRisks.length,
                totalExpectedRainfall: cumulativeRainfall,
                highRiskDays: dailyRisks.filter(d => d.riskScore >= 7).length,
                maxDailyRainfall: Math.max(...dailyRisks.map(d => d.totalRainfall))
            },
            alerts: generateRainfallAlerts(dailyRisks)
        };
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('⚠️  OpenWeather API: Invalid API key - please configure in .env file');
        } else {
            console.error('❌ Error fetching rainfall forecast:', error.message);
        }
        return null;
    }
}

/**
 * Classify rainfall intensity
 */
function classifyRainfallIntensity(mmPerHour) {
    if (mmPerHour >= RAINFALL_THRESHOLDS.VIOLENT) return 'VIOLENT';
    if (mmPerHour >= RAINFALL_THRESHOLDS.HEAVY) return 'HEAVY';
    if (mmPerHour >= RAINFALL_THRESHOLDS.MODERATE) return 'MODERATE';
    if (mmPerHour >= RAINFALL_THRESHOLDS.LIGHT) return 'LIGHT';
    return 'NONE';
}

/**
 * Calculate landslide risk score based on rainfall
 * Based on GSI guidelines and research papers
 */
function calculateRainfallRiskScore(totalRainfall24hr, maxIntensity) {
    let score = 0;
    
    // Total rainfall in 24 hours
    if (totalRainfall24hr >= 200) score += 10; // Extreme
    else if (totalRainfall24hr >= 150) score += 8;
    else if (totalRainfall24hr >= 100) score += 6; // Critical threshold
    else if (totalRainfall24hr >= 75) score += 4;
    else if (totalRainfall24hr >= 50) score += 2;
    
    // Peak intensity (mm/hour)
    if (maxIntensity >= 100) score += 5; // Violent
    else if (maxIntensity >= 50) score += 3; // Heavy
    else if (maxIntensity >= 20) score += 1; // Moderate
    
    return Math.min(score, 15); // Cap at 15
}

/**
 * Get risk level from score
 */
function getRiskLevel(score) {
    if (score >= 12) return 'CRITICAL';
    if (score >= 8) return 'HIGH';
    if (score >= 5) return 'MODERATE';
    if (score >= 2) return 'LOW';
    return 'MINIMAL';
}

/**
 * Generate rainfall alerts
 */
function generateRainfallAlerts(dailyForecasts) {
    const alerts = [];
    
    dailyForecasts.forEach((day, index) => {
        if (day.riskLevel === 'CRITICAL' || day.riskLevel === 'HIGH') {
            alerts.push({
                day: index + 1,
                date: day.date,
                severity: day.riskLevel,
                message: `${day.riskLevel} RAINFALL RISK: Expected ${Math.round(day.totalRainfall)}mm in 24 hours. Landslide probability HIGH. Avoid travel to hilly areas.`,
                recommendations: [
                    'Monitor weather updates continuously',
                    'Avoid unnecessary travel to slopes',
                    'Keep emergency supplies ready',
                    'Stay informed about evacuation routes'
                ]
            });
        }
    });
    
    return alerts;
}

/**
 * Integrate rainfall data with existing sensor data for enhanced prediction
 * @param {Object} sensorData - Current sensor readings
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Object} Enhanced risk assessment
 */
async function getEnhancedLandslideRisk(sensorData, latitude, longitude) {
    try {
        // Get current rainfall
        const currentWeather = await getCurrentRainfall(latitude, longitude);
        
        // Get forecast
        const forecast = await getRainfallForecast(latitude, longitude);
        
        if (!currentWeather || !forecast) {
            return {
                error: 'Unable to fetch weather data',
                fallbackToSensorOnly: true
            };
        }
        
        // Calculate combined risk score
        const sensorRisk = calculateSensorRisk(sensorData);
        const rainfallRisk = calculateRainfallRiskScore(
            currentWeather.rainfall.lastHour * 24, // Extrapolate to 24hr
            currentWeather.rainfall.lastHour
        );
        
        // Get next 24 hours forecast risk
        const next24hrRainfall = forecast.dailyForecasts[0]?.totalRainfall || 0;
        const forecastRisk = calculateRainfallRiskScore(next24hrRainfall, forecast.dailyForecasts[0]?.maxIntensity || 0);
        
        // Combined risk (weighted average)
        const combinedRisk = (sensorRisk * 0.4) + (rainfallRisk * 0.3) + (forecastRisk * 0.3);
        
        return {
            timestamp: new Date(),
            location: currentWeather.location,
            sensorData: {
                ...sensorData,
                riskScore: sensorRisk
            },
            currentWeather: {
                ...currentWeather,
                rainfallRiskScore: rainfallRisk
            },
            forecast: {
                next24Hours: forecast.dailyForecasts[0],
                forecastRiskScore: forecastRisk,
                alerts: forecast.alerts
            },
            combinedRisk: {
                score: combinedRisk,
                level: getRiskLevel(combinedRisk),
                probability: Math.min((combinedRisk / 15) * 100, 100) // Convert to percentage
            },
            recommendation: generateEnhancedRecommendation(combinedRisk, forecast.alerts.length),
            scientificBasis: 'Risk calculation based on GSI guidelines (100mm/24hr threshold) and Guzzetti et al. (2008) rainfall-landslide correlation studies.'
        };
    } catch (error) {
        console.error('❌ Error in enhanced risk assessment:', error);
        return { error: error.message };
    }
}

/**
 * Calculate risk from sensor data only
 */
function calculateSensorRisk(sensorData) {
    let score = 0;
    
    if (sensorData.humidity >= 85) score += 3;
    if (sensorData.temperature >= 35) score += 2;
    if (sensorData.soilMoisture >= 80) score += 3;
    if (sensorData.pressure < 1000) score += 2;
    if (sensorData.motion) score += 2;
    
    return score;
}

/**
 * Generate enhanced recommendation
 */
function generateEnhancedRecommendation(riskScore, alertCount) {
    if (riskScore >= 12) {
        return {
            level: 'CRITICAL',
            action: 'IMMEDIATE EVACUATION',
            message: 'Combined sensor and rainfall data indicate CRITICAL landslide risk. Evacuate to safe zone immediately.',
            color: '#dc2626'
        };
    } else if (riskScore >= 8) {
        return {
            level: 'HIGH',
            action: 'PREPARE TO EVACUATE',
            message: `HIGH landslide risk detected. ${alertCount > 0 ? 'Heavy rainfall expected.' : ''} Be ready to evacuate. Monitor updates closely.`,
            color: '#ea580c'
        };
    } else if (riskScore >= 5) {
        return {
            level: 'MODERATE',
            action: 'STAY ALERT',
            message: 'Moderate risk. Avoid slopes and unstable areas. Continue monitoring.',
            color: '#d97706'
        };
    } else {
        return {
            level: 'LOW',
            action: 'NORMAL PRECAUTIONS',
            message: 'Risk is within acceptable limits. Normal precautions apply.',
            color: '#059669'
        };
    }
}

/**
 * Get simplified rainfall status for dashboard
 */
async function getRainfallStatus(latitude, longitude) {
    const current = await getCurrentRainfall(latitude, longitude);
    if (!current) return null;
    
    return {
        current: current.rainfall.lastHour,
        intensity: current.rainfall.intensity,
        description: current.weather.description,
        icon: current.weather.icon
    };
}

module.exports = {
    getCurrentRainfall,
    getRainfallForecast,
    getEnhancedLandslideRisk,
    getRainfallStatus,
    RAINFALL_THRESHOLDS
};
