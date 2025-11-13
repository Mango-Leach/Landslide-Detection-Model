/**
 * 🗺️ GPS SAFE ZONE CALCULATOR
 * 
 * Patent Enhancement Feature
 * Calculates nearest safe evacuation zones during landslide alerts
 * 
 * Features:
 * - Haversine distance calculation
 * - Nearest shelter identification
 * - Capacity-based recommendations
 * - Evacuation route suggestions
 * - Real-time availability tracking
 */

// Safe zone database (would be in MongoDB in production)
const safeZones = [
    {
        id: 'SZ001',
        name: 'Municipal Community Center',
        type: 'community_center',
        location: {
            latitude: 18.5204,
            longitude: 73.8567,
            address: 'Shivaji Nagar, Pune, Maharashtra'
        },
        capacity: 500,
        currentOccupancy: 0,
        facilities: ['Medical Aid', 'Food', 'Water', 'Power Backup'],
        contact: '+91-20-2553-1234',
        elevation: 560 // meters above sea level
    },
    {
        id: 'SZ002',
        name: 'Government School Building',
        type: 'school',
        location: {
            latitude: 18.5314,
            longitude: 73.8446,
            address: 'Kothrud, Pune, Maharashtra'
        },
        capacity: 1000,
        currentOccupancy: 0,
        facilities: ['Medical Aid', 'Food', 'Water', 'Toilets', 'Power Backup'],
        contact: '+91-20-2543-5678',
        elevation: 580
    },
    {
        id: 'SZ003',
        name: 'District Hospital Emergency Ward',
        type: 'hospital',
        location: {
            latitude: 18.5089,
            longitude: 73.8553,
            address: 'Camp Area, Pune, Maharashtra'
        },
        capacity: 300,
        currentOccupancy: 0,
        facilities: ['Medical Aid', 'Emergency Care', 'Ambulance', 'Food', 'Water'],
        contact: '+91-20-2612-0000',
        elevation: 550
    },
    {
        id: 'SZ004',
        name: 'Sports Complex Shelter',
        type: 'sports_complex',
        location: {
            latitude: 18.5362,
            longitude: 73.8297,
            address: 'Baner, Pune, Maharashtra'
        },
        capacity: 800,
        currentOccupancy: 0,
        facilities: ['Large Open Space', 'Water', 'Toilets', 'Parking'],
        contact: '+91-20-2729-8888',
        elevation: 600
    },
    {
        id: 'SZ005',
        name: 'Temple Relief Center',
        type: 'religious',
        location: {
            latitude: 18.5195,
            longitude: 73.8674,
            address: 'Deccan Gymkhana, Pune, Maharashtra'
        },
        capacity: 400,
        currentOccupancy: 0,
        facilities: ['Food', 'Water', 'Community Kitchen', 'Prayer Hall'],
        contact: '+91-20-2567-3333',
        elevation: 565
    }
];

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Calculate bearing/direction from one point to another
 * @returns {string} Direction like "North", "Northeast", "East", etc.
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = toRadians(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
    const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
              Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);
    
    const brng = Math.atan2(y, x);
    const degrees = (brng * 180 / Math.PI + 360) % 360;
    
    const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
    const index = Math.round(degrees / 45) % 8;
    
    return directions[index];
}

/**
 * Find nearest safe zones based on user location
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {number} maxResults - Maximum number of results to return (default: 3)
 * @returns {Array} Sorted array of nearest safe zones with distance and direction
 */
function findNearestSafeZones(userLat, userLon, maxResults = 3) {
    // Calculate distance to each safe zone
    const zonesWithDistance = safeZones.map(zone => {
        const distance = calculateDistance(
            userLat,
            userLon,
            zone.location.latitude,
            zone.location.longitude
        );
        
        const direction = calculateBearing(
            userLat,
            userLon,
            zone.location.latitude,
            zone.location.longitude
        );
        
        const availableCapacity = zone.capacity - zone.currentOccupancy;
        const occupancyPercent = Math.round((zone.currentOccupancy / zone.capacity) * 100);
        
        return {
            ...zone,
            distance,
            direction,
            availableCapacity,
            occupancyPercent,
            score: calculateSafeZoneScore(distance, availableCapacity, zone.type)
        };
    });
    
    // Sort by score (higher is better)
    zonesWithDistance.sort((a, b) => b.score - a.score);
    
    // Return top N results
    return zonesWithDistance.slice(0, maxResults);
}

/**
 * Calculate safe zone score based on multiple factors
 * - Closer is better
 * - More capacity is better
 * - Certain types preferred (hospital > school > community center)
 */
function calculateSafeZoneScore(distance, availableCapacity, type) {
    // Distance score (closer = higher score, max 50 points)
    const distanceScore = Math.max(0, 50 - (distance * 10));
    
    // Capacity score (more capacity = higher score, max 30 points)
    const capacityScore = Math.min(30, availableCapacity / 20);
    
    // Type score (hospital = 20, school = 15, others = 10)
    const typeScores = {
        'hospital': 20,
        'school': 15,
        'community_center': 12,
        'sports_complex': 10,
        'religious': 10
    };
    const typeScore = typeScores[type] || 10;
    
    return distanceScore + capacityScore + typeScore;
}

/**
 * Get evacuation route instructions
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {Object} safeZone - Safe zone object
 * @returns {Object} Route instructions
 */
function getEvacuationRoute(userLat, userLon, safeZone) {
    const distance = calculateDistance(userLat, userLon, safeZone.location.latitude, safeZone.location.longitude);
    const direction = calculateBearing(userLat, userLon, safeZone.location.latitude, safeZone.location.longitude);
    
    // Estimate travel time (walking speed ~4 km/h)
    const walkingTimeMinutes = Math.round((distance / 4) * 60);
    
    // Estimate driving time (avg speed ~30 km/h in emergency)
    const drivingTimeMinutes = Math.round((distance / 30) * 60);
    
    return {
        distance: `${distance} km`,
        direction,
        walkingTime: formatTime(walkingTimeMinutes),
        drivingTime: formatTime(drivingTimeMinutes),
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${safeZone.location.latitude},${safeZone.location.longitude}&travelmode=driving`,
        instructions: generateRouteInstructions(direction, distance, safeZone)
    };
}

/**
 * Format time in human-readable format
 */
function formatTime(minutes) {
    if (minutes < 60) {
        return `${minutes} min`;
    } else {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}min`;
    }
}

/**
 * Generate step-by-step route instructions
 */
function generateRouteInstructions(direction, distance, safeZone) {
    const steps = [
        ` Current Location`,
        ` Head ${direction} for ${distance} km`,
        ` Destination: ${safeZone.name}`,
        ` ${safeZone.location.address}`,
        ` Emergency Contact: ${safeZone.contact}`
    ];
    
    // Add elevation warning if significant climb
    if (safeZone.elevation > 600) {
        steps.splice(2, 0, ` Moderate uphill climb (elevation: ${safeZone.elevation}m)`);
    }
    
    return steps;
}

/**
 * Update safe zone occupancy (called when people check in)
 */
function updateOccupancy(zoneId, count) {
    const zone = safeZones.find(z => z.id === zoneId);
    if (zone) {
        zone.currentOccupancy = Math.min(zone.capacity, zone.currentOccupancy + count);
        return {
            success: true,
            availableCapacity: zone.capacity - zone.currentOccupancy,
            occupancyPercent: Math.round((zone.currentOccupancy / zone.capacity) * 100)
        };
    }
    return { success: false, error: 'Zone not found' };
}

/**
 * Get all safe zones (for admin dashboard)
 */
function getAllSafeZones() {
    return safeZones.map(zone => ({
        ...zone,
        availableCapacity: zone.capacity - zone.currentOccupancy,
        occupancyPercent: Math.round((zone.currentOccupancy / zone.capacity) * 100)
    }));
}

/**
 * Main function: Get emergency evacuation plan
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @returns {Object} Complete evacuation plan with nearest zones and routes
 */
function getEvacuationPlan(userLat, userLon) {
    const nearestZones = findNearestSafeZones(userLat, userLon, 3);
    
    const primaryZone = nearestZones[0];
    const route = getEvacuationRoute(userLat, userLon, primaryZone);
    
    return {
        emergency: true,
        timestamp: new Date().toISOString(),
        userLocation: { latitude: userLat, longitude: userLon },
        primaryShelter: {
            ...primaryZone,
            route
        },
        alternativeShelters: nearestZones.slice(1).map(zone => ({
            ...zone,
            route: getEvacuationRoute(userLat, userLon, zone)
        })),
        emergencyContacts: [
            { name: 'Emergency Services', number: '112' },
            { name: 'Disaster Management', number: '1078' },
            { name: 'Police', number: '100' },
            { name: 'Ambulance', number: '108' }
        ]
    };
}

/**
 * Add a new safe zone (Admin only)
 * @param {Object} zoneData - Safe zone information
 * @returns {Object} Created safe zone
 */
function addSafeZone(zoneData) {
    // Generate new ID
    const maxId = safeZones.reduce((max, zone) => {
        const num = parseInt(zone.id.replace('SZ', ''));
        return num > max ? num : max;
    }, 0);
    
    const newZone = {
        id: `SZ${String(maxId + 1).padStart(3, '0')}`,
        name: zoneData.name,
        type: zoneData.type || 'emergency_shelter',
        location: {
            latitude: parseFloat(zoneData.latitude),
            longitude: parseFloat(zoneData.longitude),
            address: zoneData.address
        },
        capacity: parseInt(zoneData.capacity) || 100,
        currentOccupancy: 0,
        facilities: zoneData.facilities || [],
        contact: zoneData.contact || 'N/A',
        elevation: parseFloat(zoneData.elevation) || 0,
        isTemporary: zoneData.isTemporary || false,
        createdAt: new Date().toISOString(),
        createdBy: zoneData.createdBy || 'admin'
    };
    
    safeZones.push(newZone);
    console.log(` New safe zone added: ${newZone.name} (${newZone.id})`);
    return newZone;
}

/**
 * Update an existing safe zone (Admin only)
 * @param {string} id - Safe zone ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated safe zone or null if not found
 */
function updateSafeZone(id, updates) {
    const index = safeZones.findIndex(zone => zone.id === id);
    
    if (index === -1) {
        return null;
    }
    
    // Update allowed fields
    if (updates.name) safeZones[index].name = updates.name;
    if (updates.type) safeZones[index].type = updates.type;
    if (updates.capacity) safeZones[index].capacity = parseInt(updates.capacity);
    if (updates.facilities) safeZones[index].facilities = updates.facilities;
    if (updates.contact) safeZones[index].contact = updates.contact;
    if (updates.address) safeZones[index].location.address = updates.address;
    if (updates.latitude) safeZones[index].location.latitude = parseFloat(updates.latitude);
    if (updates.longitude) safeZones[index].location.longitude = parseFloat(updates.longitude);
    if (updates.elevation) safeZones[index].elevation = parseFloat(updates.elevation);
    
    safeZones[index].updatedAt = new Date().toISOString();
    
    console.log(` Safe zone updated: ${safeZones[index].name} (${id})`);
    return safeZones[index];
}

/**
 * Delete a safe zone (Admin only)
 * @param {string} id - Safe zone ID
 * @returns {boolean} True if deleted, false if not found
 */
function deleteSafeZone(id) {
    const index = safeZones.findIndex(zone => zone.id === id);
    
    if (index === -1) {
        return false;
    }
    
    const deletedZone = safeZones.splice(index, 1)[0];
    console.log(` Safe zone deleted: ${deletedZone.name} (${id})`);
    return true;
}

/**
 * Get safe zone by ID
 * @param {string} id - Safe zone ID
 * @returns {Object} Safe zone or null if not found
 */
function getSafeZoneById(id) {
    return safeZones.find(zone => zone.id === id) || null;
}

module.exports = {
    findNearestSafeZones,
    getEvacuationPlan,
    getEvacuationRoute,
    updateOccupancy,
    getAllSafeZones,
    calculateDistance,
    addSafeZone,
    updateSafeZone,
    deleteSafeZone,
    getSafeZoneById
};

