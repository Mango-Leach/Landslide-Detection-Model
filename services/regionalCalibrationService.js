const fs = require('fs');
const path = require('path');

/**
 * 🌍 UNIVERSAL REGIONAL CALIBRATION SERVICE
 * 
 * Automatically learns regional patterns from ANY dataset
 * No hardcoded regions - adapts to whatever data is provided
 * 
 * Key Features:
 * - Auto-detects patterns in training data
 * - Creates region profiles dynamically
 * - Adjusts thresholds based on local climate
 * - Works with any geographic region globally
 */

class RegionalCalibrationService {
    constructor() {
        this.calibrationDir = path.join(__dirname, '../regional_calibration');
        this.ensureCalibrationDirectory();
        
        // Dynamic region profiles (learned from data)
        this.regionProfiles = new Map();
        
        // Global baseline (fallback for unknown regions)
        this.globalBaseline = {
            temperature: { min: -10, max: 45, mean: 22, std: 8 },
            humidity: { min: 30, max: 100, mean: 70, std: 15 },
            pressure: { min: 850, max: 1050, mean: 1013, std: 50 },
            rainfall: { min: 0, max: 500, mean: 100, std: 80 },
            soilMoisture: { min: 20, max: 100, mean: 60, std: 20 }
        };
        
        this.loadCalibrationProfiles();
    }
    
    ensureCalibrationDirectory() {
        if (!fs.existsSync(this.calibrationDir)) {
            fs.mkdirSync(this.calibrationDir, { recursive: true });
            console.log('📁 Created regional_calibration directory');
        }
    }
    
    /**
     * Load all saved calibration profiles
     */
    loadCalibrationProfiles() {
        try {
            const profilesPath = path.join(this.calibrationDir, 'profiles.json');
            if (fs.existsSync(profilesPath)) {
                const data = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
                this.regionProfiles = new Map(Object.entries(data.profiles || {}));
                this.globalBaseline = data.globalBaseline || this.globalBaseline;
                console.log(`✅ Loaded ${this.regionProfiles.size} regional calibration profiles`);
            }
        } catch (error) {
            console.error('⚠️ Error loading calibration profiles:', error.message);
        }
    }
    
    /**
     * Save calibration profiles to disk
     */
    saveCalibrationProfiles() {
        try {
            const profilesPath = path.join(this.calibrationDir, 'profiles.json');
            const data = {
                profiles: Object.fromEntries(this.regionProfiles),
                globalBaseline: this.globalBaseline,
                lastUpdated: new Date().toISOString(),
                totalRegions: this.regionProfiles.size
            };
            fs.writeFileSync(profilesPath, JSON.stringify(data, null, 2));
            console.log(`💾 Saved ${this.regionProfiles.size} regional calibration profiles`);
        } catch (error) {
            console.error('⚠️ Error saving calibration profiles:', error.message);
        }
    }
    
    /**
     * Extract region identifier from location string
     * Works with any format: "State (District)", "Country-Region", "Latitude,Longitude", etc.
     */
    extractRegionId(location) {
        if (!location) return 'unknown';
        
        // Normalize location string
        const normalized = location.toLowerCase()
            .replace(/[^\w\s,()-]/g, '')
            .trim();
        
        // Try to extract primary identifier (first major word/token)
        const tokens = normalized.split(/[\s,()-]+/).filter(t => t.length > 2);
        
        // Use first meaningful token as region ID
        return tokens[0] || 'unknown';
    }
    
    /**
     * Calculate statistical profile from data array
     */
    calculateStatistics(values) {
        if (values.length === 0) return null;
        
        const sorted = values.slice().sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        
        // Calculate standard deviation
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance);
        
        // Calculate percentiles
        const p25 = sorted[Math.floor(values.length * 0.25)];
        const p50 = sorted[Math.floor(values.length * 0.50)];
        const p75 = sorted[Math.floor(values.length * 0.75)];
        const p90 = sorted[Math.floor(values.length * 0.90)];
        const p95 = sorted[Math.floor(values.length * 0.95)];
        
        return { min, max, mean, std, p25, p50, p75, p90, p95 };
    }
    
    /**
     * Learn regional patterns from disaster events
     * Works with ANY dataset structure - automatically adapts
     */
    learnFromEvents(events) {
        if (!events || events.length === 0) {
            console.log('⚠️ No events provided for regional learning');
            return;
        }
        
        console.log(`\n🌍 Learning regional patterns from ${events.length} events...`);
        
        // Group events by region
        const regionData = new Map();
        
        for (const event of events) {
            // Extract region ID (works with any location format)
            const regionId = this.extractRegionId(event.location || event.region || event.area);
            
            if (!regionData.has(regionId)) {
                regionData.set(regionId, {
                    events: [],
                    temperature: [],
                    humidity: [],
                    pressure: [],
                    rainfall: [],
                    soilMoisture: [],
                    motion: [],
                    outcomes: []
                });
            }
            
            const region = regionData.get(regionId);
            region.events.push(event);
            
            // Collect sensor data (handles missing fields gracefully)
            const conditions = event.conditions || event;
            if (conditions.temperature != null) region.temperature.push(conditions.temperature);
            if (conditions.humidity != null) region.humidity.push(conditions.humidity);
            if (conditions.pressure != null) region.pressure.push(conditions.pressure);
            if (conditions.rainfall_24h != null) region.rainfall.push(conditions.rainfall_24h);
            if (conditions.soilMoisture != null) region.soilMoisture.push(conditions.soilMoisture);
            if (conditions.motion != null) region.motion.push(conditions.motion ? 1 : 0);
            
            // Track outcomes (landslide occurred or not)
            region.outcomes.push(event.outcome != null ? event.outcome : 1);
        }
        
        // Create profiles for each region
        let profilesCreated = 0;
        
        for (const [regionId, data] of regionData.entries()) {
            const profile = {
                regionId,
                eventCount: data.events.length,
                temperature: this.calculateStatistics(data.temperature),
                humidity: this.calculateStatistics(data.humidity),
                pressure: this.calculateStatistics(data.pressure),
                rainfall: this.calculateStatistics(data.rainfall),
                soilMoisture: this.calculateStatistics(data.soilMoisture),
                motionFrequency: data.motion.length > 0 ? 
                    data.motion.reduce((a, b) => a + b, 0) / data.motion.length : 0,
                landslideRate: data.outcomes.length > 0 ? 
                    data.outcomes.reduce((a, b) => a + b, 0) / data.outcomes.length : 0,
                lastUpdated: new Date().toISOString()
            };
            
            // Calculate risk threshold for this region (adaptive)
            profile.riskThreshold = this.calculateRegionalThreshold(profile);
            
            this.regionProfiles.set(regionId, profile);
            profilesCreated++;
            
            console.log(`   📍 ${regionId}: ${data.events.length} events, threshold: ${profile.riskThreshold.toFixed(1)}`);
        }
        
        // Update global baseline from all data
        this.updateGlobalBaseline(events);
        
        // Save profiles
        this.saveCalibrationProfiles();
        
        console.log(`✅ Created ${profilesCreated} regional profiles\n`);
    }
    
    /**
     * Calculate adaptive risk threshold for region
     * Based on local climate patterns and historical landslide rates
     */
    calculateRegionalThreshold(profile) {
        // Base threshold (global)
        let threshold = 25;
        
        // Adjust based on rainfall patterns
        if (profile.rainfall && profile.rainfall.mean > 200) {
            // High rainfall region (e.g., Western Ghats) - higher threshold
            threshold += 10;
        } else if (profile.rainfall && profile.rainfall.mean < 100) {
            // Low rainfall region (e.g., Himalayas) - lower threshold
            threshold -= 5;
        }
        
        // Adjust based on historical landslide rate
        if (profile.landslideRate > 0.8) {
            // High risk region - more sensitive
            threshold -= 10;
        }
        
        // Adjust based on motion frequency
        if (profile.motionFrequency > 0.7) {
            // Seismically active region - lower threshold
            threshold -= 5;
        }
        
        // Ensure threshold stays in reasonable range
        return Math.max(15, Math.min(40, threshold));
    }
    
    /**
     * Update global baseline from all events
     */
    updateGlobalBaseline(events) {
        const allData = {
            temperature: [],
            humidity: [],
            pressure: [],
            rainfall: [],
            soilMoisture: []
        };
        
        for (const event of events) {
            const conditions = event.conditions || event;
            if (conditions.temperature != null) allData.temperature.push(conditions.temperature);
            if (conditions.humidity != null) allData.humidity.push(conditions.humidity);
            if (conditions.pressure != null) allData.pressure.push(conditions.pressure);
            if (conditions.rainfall_24h != null) allData.rainfall.push(conditions.rainfall_24h);
            if (conditions.soilMoisture != null) allData.soilMoisture.push(conditions.soilMoisture);
        }
        
        // Update global baseline statistics
        for (const [key, values] of Object.entries(allData)) {
            if (values.length > 0) {
                this.globalBaseline[key] = this.calculateStatistics(values);
            }
        }
    }
    
    /**
     * Get regional calibration for sensor data
     * Automatically selects best matching region or uses global baseline
     */
    getCalibratedRisk(sensorData, baseRiskScore, location = null) {
        let regionId = 'unknown';
        let profile = null;
        
        // Try to match region from location
        if (location) {
            regionId = this.extractRegionId(location);
            profile = this.regionProfiles.get(regionId);
        }
        
        // If no location or no matching profile, find best match by sensor similarity
        if (!profile && this.regionProfiles.size > 0) {
            profile = this.findBestMatchingRegion(sensorData);
            regionId = profile ? profile.regionId : 'unknown';
        }
        
        // Use global baseline if no profile found
        const reference = profile || { 
            riskThreshold: 25,
            temperature: this.globalBaseline.temperature,
            humidity: this.globalBaseline.humidity,
            pressure: this.globalBaseline.pressure,
            rainfall: this.globalBaseline.rainfall
        };
        
        // Calculate anomaly score (how different from regional normal)
        const anomalyScore = this.calculateAnomalyScore(sensorData, reference);
        
        // Adjust base risk score
        let calibratedRisk = baseRiskScore;
        
        // Increase risk if conditions are anomalous for the region
        if (anomalyScore > 2) {
            calibratedRisk += anomalyScore * 5; // Add up to 15 points for extreme anomalies
        }
        
        // Apply regional threshold adjustment
        const thresholdMultiplier = reference.riskThreshold / 25; // Normalize to base 25
        
        return {
            originalRisk: baseRiskScore,
            calibratedRisk: Math.min(100, calibratedRisk),
            anomalyScore,
            regionId,
            regionThreshold: reference.riskThreshold,
            thresholdMultiplier,
            hasRegionalProfile: profile != null,
            confidence: profile ? 'HIGH' : 'MEDIUM'
        };
    }
    
    /**
     * Calculate how anomalous current conditions are for the region
     * Returns Z-score (standard deviations from mean)
     */
    calculateAnomalyScore(sensorData, reference) {
        const anomalies = [];
        
        // Check temperature anomaly
        if (sensorData.temperature != null && reference.temperature && reference.temperature.std > 0) {
            const zScore = Math.abs((sensorData.temperature - reference.temperature.mean) / reference.temperature.std);
            anomalies.push(zScore);
        }
        
        // Check humidity anomaly
        if (sensorData.humidity != null && reference.humidity && reference.humidity.std > 0) {
            const zScore = Math.abs((sensorData.humidity - reference.humidity.mean) / reference.humidity.std);
            anomalies.push(zScore);
        }
        
        // Check pressure anomaly
        if (sensorData.pressure != null && reference.pressure && reference.pressure.std > 0) {
            const zScore = Math.abs((sensorData.pressure - reference.pressure.mean) / reference.pressure.std);
            anomalies.push(zScore);
        }
        
        // Return maximum anomaly (worst case)
        return anomalies.length > 0 ? Math.max(...anomalies) : 0;
    }
    
    /**
     * Find region profile that best matches current sensor data
     * Uses similarity scoring across all parameters
     */
    findBestMatchingRegion(sensorData) {
        let bestMatch = null;
        let bestScore = Infinity;
        
        for (const profile of this.regionProfiles.values()) {
            let score = 0;
            let count = 0;
            
            // Compare each sensor parameter
            if (sensorData.temperature != null && profile.temperature && profile.temperature.std > 0) {
                const diff = Math.abs(sensorData.temperature - profile.temperature.mean);
                score += diff / profile.temperature.std;
                count++;
            }
            
            if (sensorData.humidity != null && profile.humidity && profile.humidity.std > 0) {
                const diff = Math.abs(sensorData.humidity - profile.humidity.mean);
                score += diff / profile.humidity.std;
                count++;
            }
            
            if (sensorData.pressure != null && profile.pressure && profile.pressure.std > 0) {
                const diff = Math.abs(sensorData.pressure - profile.pressure.mean);
                score += diff / profile.pressure.std;
                count++;
            }
            
            // Average similarity score
            const avgScore = count > 0 ? score / count : Infinity;
            
            if (avgScore < bestScore) {
                bestScore = avgScore;
                bestMatch = profile;
            }
        }
        
        return bestMatch;
    }
    
    /**
     * Get statistics for a specific region
     */
    getRegionProfile(location) {
        const regionId = this.extractRegionId(location);
        return this.regionProfiles.get(regionId) || null;
    }
    
    /**
     * Get all region profiles (for display/analysis)
     */
    getAllProfiles() {
        return Array.from(this.regionProfiles.entries()).map(([id, profile]) => ({
            regionId: id,
            eventCount: profile.eventCount,
            riskThreshold: profile.riskThreshold,
            avgRainfall: profile.rainfall ? profile.rainfall.mean.toFixed(1) : 'N/A',
            avgHumidity: profile.humidity ? profile.humidity.mean.toFixed(1) : 'N/A',
            landslideRate: (profile.landslideRate * 100).toFixed(1) + '%',
            lastUpdated: profile.lastUpdated
        }));
    }
    
    /**
     * Export calibration data for sharing/backup
     */
    exportCalibration() {
        return {
            profiles: Array.from(this.regionProfiles.entries()),
            globalBaseline: this.globalBaseline,
            exportedAt: new Date().toISOString(),
            totalRegions: this.regionProfiles.size
        };
    }
    
    /**
     * Import calibration data from external source
     */
    importCalibration(data) {
        try {
            if (data.profiles) {
                this.regionProfiles = new Map(data.profiles);
            }
            if (data.globalBaseline) {
                this.globalBaseline = data.globalBaseline;
            }
            this.saveCalibrationProfiles();
            console.log(`✅ Imported ${this.regionProfiles.size} regional profiles`);
            return true;
        } catch (error) {
            console.error('❌ Failed to import calibration:', error.message);
            return false;
        }
    }
}

module.exports = new RegionalCalibrationService();
