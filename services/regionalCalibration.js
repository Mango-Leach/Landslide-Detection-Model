/**
 * 🌍 REGIONAL CALIBRATION PROFILES
 * 
 * Patent Enhancement Feature
 * Different regions have different baseline environmental conditions
 * This calibration system adjusts thresholds based on geographical location
 * 
 * Based on scientific research:
 * - Geological Survey of India (GSI) Landslide Hazard Reports
 * - Indian Meteorological Department (IMD) Climate Data
 * - Regional Soil Composition Studies
 */

const regionalProfiles = {
    // Himalayan Region (High altitude, cold, prone to snowmelt landslides)
    himalayan: {
        id: 'himalayan',
        name: 'Himalayan Mountain Region',
        states: ['Jammu & Kashmir', 'Himachal Pradesh', 'Uttarakhand', 'Sikkim', 'Arunachal Pradesh'],
        characteristics: {
            baselineTemperature: 15, // °C average
            baselineHumidity: 65, // % average
            baselinePressure: 850, // hPa (lower due to altitude)
            soilType: 'rocky_debris',
            vegetationCover: 'sparse_to_moderate',
            averageElevation: 2500, // meters
            rainfallPattern: 'monsoon_heavy',
            snowmeltFactor: 'high'
        },
        thresholds: {
            humidityThreshold: 75, // Lower than standard 85% (less humidity at altitude)
            temperatureThreshold: 28, // Lower (cooler region)
            soilMoistureThreshold: 70, // Lower (rocky soil drains faster)
            pressureThreshold: 800, // Much lower (high altitude)
            motionSensitivity: 'high' // Very sensitive to tremors
        },
        weights: {
            humidity: 3.5, // Very important (sudden moisture increase = snowmelt)
            temperature: 3.0, // Important (rapid warming = snowmelt risk)
            soilMoisture: 2.5, // Moderate (rocky soil)
            pressure: 2.0, // Less critical at altitude
            motion: 4.0 // Most critical (seismic activity common)
        },
        riskMultiplier: 1.3, // Higher base risk
        seasonalAdjustments: {
            monsoon: { months: [6, 7, 8, 9], riskMultiplier: 1.8 },
            winter: { months: [12, 1, 2], riskMultiplier: 0.8 },
            spring: { months: [3, 4, 5], riskMultiplier: 1.4 } // Snowmelt season
        }
    },

    // Western Ghats (Tropical, high rainfall, laterite soil)
    western_ghats: {
        id: 'western_ghats',
        name: 'Western Ghats Region',
        states: ['Maharashtra', 'Goa', 'Karnataka', 'Kerala', 'Tamil Nadu'],
        characteristics: {
            baselineTemperature: 26,
            baselineHumidity: 80,
            baselinePressure: 1010,
            soilType: 'laterite',
            vegetationCover: 'dense_forest',
            averageElevation: 800,
            rainfallPattern: 'very_heavy_monsoon',
            landslideType: 'rainfall_induced'
        },
        thresholds: {
            humidityThreshold: 88, // Higher (naturally humid)
            temperatureThreshold: 35,
            soilMoistureThreshold: 85, // Higher (laterite soil retains water)
            pressureThreshold: 995,
            motionSensitivity: 'moderate'
        },
        weights: {
            humidity: 4.5, // Most critical (rainfall = landslides)
            temperature: 2.0,
            soilMoisture: 4.0, // Very important (laterite saturation)
            pressure: 3.0, // Important (pressure drop = heavy rain)
            motion: 2.0
        },
        riskMultiplier: 1.5,
        seasonalAdjustments: {
            monsoon: { months: [6, 7, 8], riskMultiplier: 2.5 }, // Peak risk
            preMonsoon: { months: [4, 5], riskMultiplier: 1.2 },
            postMonsoon: { months: [9, 10], riskMultiplier: 1.3 }
        }
    },

    // Coastal Plains (Sea-level, sandy soil, cyclone-prone)
    coastal: {
        id: 'coastal',
        name: 'Coastal Plains',
        states: ['Gujarat', 'West Bengal', 'Odisha', 'Andhra Pradesh', 'Tamil Nadu (coastal)'],
        characteristics: {
            baselineTemperature: 28,
            baselineHumidity: 75,
            baselinePressure: 1013,
            soilType: 'sandy_alluvial',
            vegetationCover: 'moderate',
            averageElevation: 50,
            rainfallPattern: 'cyclone_heavy',
            landslideType: 'erosion_slope_failure'
        },
        thresholds: {
            humidityThreshold: 82,
            temperatureThreshold: 38,
            soilMoistureThreshold: 75, // Sandy soil drains faster
            pressureThreshold: 985, // Critical for cyclone detection
            motionSensitivity: 'low'
        },
        weights: {
            humidity: 3.0,
            temperature: 2.5,
            soilMoisture: 3.5,
            pressure: 4.0, // Most important (cyclone indicator)
            motion: 1.5
        },
        riskMultiplier: 1.1,
        seasonalAdjustments: {
            cycloneSeason: { months: [5, 6, 10, 11], riskMultiplier: 1.8 },
            monsoon: { months: [7, 8, 9], riskMultiplier: 1.4 }
        }
    },

    // Eastern Hills (Assam, Meghalaya, etc.)
    eastern_hills: {
        id: 'eastern_hills',
        name: 'Eastern Hill Region',
        states: ['Assam', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland', 'Tripura'],
        characteristics: {
            baselineTemperature: 24,
            baselineHumidity: 85,
            baselinePressure: 990,
            soilType: 'clay_heavy',
            vegetationCover: 'dense',
            averageElevation: 600,
            rainfallPattern: 'extreme_monsoon',
            landslideType: 'rainfall_soil_saturation'
        },
        thresholds: {
            humidityThreshold: 90, // Extremely humid region
            temperatureThreshold: 32,
            soilMoistureThreshold: 88, // Clay soil retains maximum water
            pressureThreshold: 980,
            motionSensitivity: 'high'
        },
        weights: {
            humidity: 4.0,
            temperature: 2.0,
            soilMoisture: 4.5, // Most critical (clay soil saturation)
            pressure: 3.5,
            motion: 3.0
        },
        riskMultiplier: 1.6,
        seasonalAdjustments: {
            preMonsoon: { months: [4, 5], riskMultiplier: 1.3 },
            monsoon: { months: [6, 7, 8], riskMultiplier: 2.8 }, // Highest risk in India
            postMonsoon: { months: [9, 10], riskMultiplier: 1.5 }
        }
    },

    // Deccan Plateau (Semi-arid, moderate risk)
    deccan_plateau: {
        id: 'deccan_plateau',
        name: 'Deccan Plateau',
        states: ['Maharashtra (central)', 'Telangana', 'Karnataka (central)'],
        characteristics: {
            baselineTemperature: 27,
            baselineHumidity: 60,
            baselinePressure: 1005,
            soilType: 'black_cotton_regur',
            vegetationCover: 'sparse',
            averageElevation: 600,
            rainfallPattern: 'moderate',
            landslideType: 'rare_localized'
        },
        thresholds: {
            humidityThreshold: 70, // Lower (semi-arid)
            temperatureThreshold: 40, // Higher (hotter region)
            soilMoistureThreshold: 65,
            pressureThreshold: 990,
            motionSensitivity: 'low'
        },
        weights: {
            humidity: 2.5,
            temperature: 2.0,
            soilMoisture: 3.0,
            pressure: 2.5,
            motion: 2.0
        },
        riskMultiplier: 0.8, // Lower base risk
        seasonalAdjustments: {
            monsoon: { months: [6, 7, 8, 9], riskMultiplier: 1.3 },
            summer: { months: [3, 4, 5], riskMultiplier: 0.6 }
        }
    },

    // Default profile (if region unknown)
    default: {
        id: 'default',
        name: 'Standard Profile',
        characteristics: {
            baselineTemperature: 25,
            baselineHumidity: 70,
            baselinePressure: 1010,
            soilType: 'mixed',
            vegetationCover: 'moderate',
            averageElevation: 300
        },
        thresholds: {
            humidityThreshold: 85,
            temperatureThreshold: 35,
            soilMoistureThreshold: 80,
            pressureThreshold: 1000,
            motionSensitivity: 'moderate'
        },
        weights: {
            humidity: 3.0,
            temperature: 2.0,
            soilMoisture: 3.0,
            pressure: 2.0,
            motion: 2.0
        },
        riskMultiplier: 1.0,
        seasonalAdjustments: {}
    }
};

/**
 * Get regional profile by state name or coordinates
 * @param {string} state - State name
 * @param {number} latitude - Optional latitude for GPS-based detection
 * @param {number} longitude - Optional longitude
 * @returns {Object} Regional profile
 */
function getRegionalProfile(state = null, latitude = null, longitude = null) {
    // If GPS coordinates provided, detect region
    if (latitude && longitude) {
        return detectRegionByCoordinates(latitude, longitude);
    }
    
    // If state name provided, match to profile
    if (state) {
        for (const [key, profile] of Object.entries(regionalProfiles)) {
            if (profile.states && profile.states.some(s => 
                state.toLowerCase().includes(s.toLowerCase()) || 
                s.toLowerCase().includes(state.toLowerCase())
            )) {
                return profile;
            }
        }
    }
    
    // Return default if no match
    return regionalProfiles.default;
}

/**
 * Detect region based on GPS coordinates
 * Simplified bounding box approach
 */
function detectRegionByCoordinates(lat, lon) {
    // Himalayan region (far north)
    if (lat > 30) {
        return regionalProfiles.himalayan;
    }
    
    // Eastern hills (northeast)
    if (lat > 24 && lon > 90) {
        return regionalProfiles.eastern_hills;
    }
    
    // Western Ghats (western coast + elevation)
    if (lon < 77 && lat < 20) {
        return regionalProfiles.western_ghats;
    }
    
    // Coastal (near sea level, close to coast)
    if (lon < 73 || lon > 85) {
        return regionalProfiles.coastal;
    }
    
    // Deccan Plateau (central)
    if (lat > 15 && lat < 22 && lon > 74 && lon < 80) {
        return regionalProfiles.deccan_plateau;
    }
    
    return regionalProfiles.default;
}

/**
 * Apply regional calibration to sensor data
 * @param {Object} sensorData - Raw sensor readings
 * @param {string} region - Region ID or auto-detect
 * @returns {Object} Calibrated data with adjusted risk scores
 */
function applyCalibratedThresholds(sensorData, region = 'default') {
    const profile = typeof region === 'string' ? 
        regionalProfiles[region] || regionalProfiles.default : 
        region;
    
    // Get current month for seasonal adjustment
    const currentMonth = new Date().getMonth() + 1;
    let seasonalMultiplier = 1.0;
    
    for (const [season, config] of Object.entries(profile.seasonalAdjustments || {})) {
        if (config.months.includes(currentMonth)) {
            seasonalMultiplier = config.riskMultiplier;
            break;
        }
    }
    
    // Calculate deviation from baseline
    const tempDeviation = sensorData.temperature - profile.characteristics.baselineTemperature;
    const humidityDeviation = sensorData.humidity - profile.characteristics.baselineHumidity;
    const pressureDeviation = profile.characteristics.baselinePressure - sensorData.pressure;
    
    // Calculate weighted risk score using regional weights
    let riskScore = 0;
    
    // Humidity risk
    if (sensorData.humidity >= profile.thresholds.humidityThreshold) {
        riskScore += profile.weights.humidity;
    } else if (humidityDeviation > 10) {
        // Rapid increase is also risky
        riskScore += profile.weights.humidity * 0.5;
    }
    
    // Temperature risk
    if (sensorData.temperature >= profile.thresholds.temperatureThreshold) {
        riskScore += profile.weights.temperature;
    } else if (tempDeviation > 5) {
        riskScore += profile.weights.temperature * 0.3;
    }
    
    // Soil moisture risk
    if (sensorData.soilMoisture >= profile.thresholds.soilMoistureThreshold) {
        riskScore += profile.weights.soilMoisture;
    }
    
    // Pressure risk
    if (sensorData.pressure < profile.thresholds.pressureThreshold) {
        riskScore += profile.weights.pressure;
    } else if (pressureDeviation > 15) {
        riskScore += profile.weights.pressure * 0.4;
    }
    
    // Motion risk
    if (sensorData.motion) {
        const sensitivity = profile.thresholds.motionSensitivity;
        const motionWeight = sensitivity === 'high' ? profile.weights.motion * 1.5 :
                            sensitivity === 'low' ? profile.weights.motion * 0.7 :
                            profile.weights.motion;
        riskScore += motionWeight;
    }
    
    // Apply regional and seasonal multipliers
    const finalRiskScore = riskScore * profile.riskMultiplier * seasonalMultiplier;
    
    // Determine risk level
    const riskLevel = finalRiskScore >= 15 ? 'CRITICAL' :
                      finalRiskScore >= 10 ? 'HIGH' :
                      finalRiskScore >= 6 ? 'MODERATE' :
                      finalRiskScore >= 3 ? 'LOW' : 'MINIMAL';
    
    return {
        rawRiskScore: riskScore,
        regionalMultiplier: profile.riskMultiplier,
        seasonalMultiplier,
        finalRiskScore,
        riskLevel,
        profile: {
            region: profile.name,
            characteristics: profile.characteristics
        },
        deviations: {
            temperature: tempDeviation,
            humidity: humidityDeviation,
            pressure: pressureDeviation
        },
        thresholdsUsed: profile.thresholds,
        recommendation: generateRecommendation(riskLevel, profile)
    };
}

/**
 * Generate recommendation based on risk level
 */
function generateRecommendation(riskLevel, profile) {
    const recommendations = {
        'CRITICAL': `IMMEDIATE EVACUATION REQUIRED. ${profile.name} is at critical landslide risk. Proceed to nearest safe zone immediately.`,
        'HIGH': `HIGH ALERT. Monitor conditions closely. Be prepared to evacuate. Avoid slopes and unstable areas.`,
        'MODERATE': `Moderate risk detected. Stay alert. Avoid unnecessary outdoor activities near slopes.`,
        'LOW': `Low risk. Normal precautions advised. Continue monitoring.`,
        'MINIMAL': `Minimal risk. Environmental conditions are within normal range for ${profile.name}.`
    };
    
    return recommendations[riskLevel] || recommendations['MINIMAL'];
}

/**
 * Get all available regional profiles
 */
function getAllProfiles() {
    return Object.keys(regionalProfiles).map(key => ({
        id: key,
        name: regionalProfiles[key].name,
        states: regionalProfiles[key].states || [],
        riskMultiplier: regionalProfiles[key].riskMultiplier
    }));
}

module.exports = {
    regionalProfiles,
    getRegionalProfile,
    applyCalibratedThresholds,
    detectRegionByCoordinates,
    getAllProfiles
};
