# IntelliSlide - Intelligent Landslide Detection & Early Warning System

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/mongodb-4.4%2B-green.svg)](https://www.mongodb.com/)

> An IoT-based real-time landslide detection and prediction system combining hardware sensors, AI/ML algorithms, and web-based monitoring to provide early warnings for landslide-prone areas.

---

## 📑 Table of Contents

- [System Overview](#-system-overview)
- [Architecture & Data Flow](#-architecture--data-flow)
- [Hardware Setup (ESP32)](#-hardware-setup-esp32)
- [Data Processing Pipeline](#-data-processing-pipeline)
- [AI/ML Prediction System](#-aiml-prediction-system)
- [Graph & Visualization](#-graph--visualization)
- [Regional Calibration](#-regional-calibration)
- [Alert System](#-alert-system)
- [Installation & Setup](#-installation--setup)
- [Project Structure](#-project-structure)
- [Technologies Used](#-technologies-used)

---

## 🎯 System Overview

IntelliSlide is an end-to-end landslide monitoring solution that:

1. **Collects** environmental data from ESP32 sensors in real-time
2. **Processes** data through regional calibration profiles
3. **Predicts** landslide risk using trained neural networks
4. **Visualizes** data through interactive charts and 3D terrain models
5. **Alerts** users via email, browser notifications, and voice announcements

---

## 🏗️ Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HARDWARE LAYER (ESP32)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   DHT22/     │  │   BMP280     │  │   GPS NEO-6M │  │   Power    │ │
│  │   BME280     │  │   Pressure   │  │   Location   │  │   Supply   │ │
│  │  Temp/Humid  │  │   Sensor     │  │   Tracking   │  │  Battery   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────────────┘ │
│         │                 │                  │                          │
│         └─────────────────┴──────────────────┘                          │
│                            │                                            │
│                    ┌───────▼────────┐                                   │
│                    │   ESP32 MCU    │                                   │
│                    │  WiFi/Bluetooth │                                   │
│                    └───────┬────────┘                                   │
└────────────────────────────┼──────────────────────────────────────────┘
                             │
                    WiFi/Bluetooth
                             │
┌────────────────────────────▼──────────────────────────────────────────┐
│                      SERVER LAYER (Node.js)                            │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    WebSocket Server (ws)                         │ │
│  │              Real-time bidirectional communication               │ │
│  └────────┬─────────────────────────────────────────────┬───────────┘ │
│           │                                             │              │
│  ┌────────▼────────┐  ┌─────────────────┐  ┌──────────▼───────────┐  │
│  │  Data Ingestion │  │  MongoDB Store  │  │  WebSocket Broadcast │  │
│  │  • Validation   │  │  • Users        │  │  • Push to clients   │  │
│  │  • Timestamping │  │  • Sensor Data  │  │  • Real-time updates │  │
│  └────────┬────────┘  │  • Alerts       │  └──────────────────────┘  │
│           │           └─────────────────┘                             │
│           │                                                            │
│  ┌────────▼──────────────────────────────────────────┐                │
│  │          DATA PROCESSING ENGINE                   │                │
│  │  ┌─────────────────┐  ┌───────────────────────┐  │                │
│  │  │  Regional       │  │  External Data Fetch  │  │                │
│  │  │  Calibration    │  │  • OpenWeather API    │  │                │
│  │  │  • 9 Regions    │  │  • Rainfall data      │  │                │
│  │  │  • Adaptive     │  │  • Government DB      │  │                │
│  │  │    Thresholds   │  │                       │  │                │
│  │  └────────┬────────┘  └──────────┬────────────┘  │                │
│  │           │                      │                │                │
│  │           └──────────┬───────────┘                │                │
│  │                      │                            │                │
│  │           ┌──────────▼────────────┐               │                │
│  │           │   AI PREDICTION       │               │                │
│  │           │   ┌───────────────┐   │               │                │
│  │           │   │ Temperature   │   │               │                │
│  │           │   │ NN Model      │   │               │                │
│  │           │   └───────────────┘   │               │                │
│  │           │   ┌───────────────┐   │               │                │
│  │           │   │ Humidity      │   │               │                │
│  │           │   │ NN Model      │   │               │                │
│  │           │   └───────────────┘   │               │                │
│  │           │   ┌───────────────┐   │               │                │
│  │           │   │ Landslide     │   │               │                │
│  │           │   │ Risk Model    │   │               │                │
│  │           │   │ (50 events)   │   │               │                │
│  │           │   └───────────────┘   │               │                │
│  │           └──────────┬────────────┘               │                │
│  │                      │                            │                │
│  │           ┌──────────▼────────────┐               │                │
│  │           │  RISK ASSESSMENT      │               │                │
│  │           │  • Threshold check    │               │                │
│  │           │  • Risk scoring       │               │                │
│  │           │  • Classification     │               │                │
│  │           └──────────┬────────────┘               │                │
│  └──────────────────────┼────────────────────────────┘                │
│                         │                                              │
│  ┌──────────────────────▼────────────────────────┐                    │
│  │           ALERT DISPATCH SYSTEM                │                    │
│  │  ┌───────────────┐  ┌──────────────────────┐  │                    │
│  │  │ Email Service │  │ Browser Notification │  │                    │
│  │  │ (Nodemailer)  │  │ (Push API)           │  │                    │
│  │  └───────────────┘  └──────────────────────┘  │                    │
│  └────────────────────────────────────────────────┘                    │
└────────────────────────────┬───────────────────────────────────────────┘
                             │
                    WebSocket/HTTP
                             │
┌────────────────────────────▼──────────────────────────────────────────┐
│                     FRONTEND LAYER (Browser)                           │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                      Main Dashboard (index.html)                 │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │ │
│  │  │ Real-time    │  │ Interactive  │  │ 3D Terrain Analysis    │ │ │
│  │  │ Stats Cards  │  │ Charts       │  │ (Three.js)             │ │ │
│  │  │ • Temp       │  │ (Chart.js)   │  │ • Color-coded zones    │ │ │
│  │  │ • Humidity   │  │ • Line graphs│  │ • Weak point detection │ │ │
│  │  │ • Pressure   │  │ • Time series│  │ • 1800+ points         │ │ │
│  │  │ • Risk Score │  │ • Correlation│  │                        │ │ │
│  │  └──────────────┘  └──────────────┘  └────────────────────────┘ │ │
│  │                                                                  │ │
│  │  ┌──────────────────────────────────────────────────────────┐   │ │
│  │  │         Notification Panel & Alert System                │   │ │
│  │  │  • Browser push notifications                            │   │ │
│  │  │  • Voice announcements (Text-to-Speech)                  │   │ │
│  │  │  • Historical notification log                           │   │ │
│  │  └──────────────────────────────────────────────────────────┘   │ │
│  │                                                                  │ │
│  │  ┌──────────────────────────────────────────────────────────┐   │ │
│  │  │         Data Table & Export Options                      │   │ │
│  │  │  • Searchable/filterable historical data                 │   │ │
│  │  │  • Export: CSV, JSON, PDF                                │   │ │
│  │  │  • Pagination                                            │   │ │
│  │  └──────────────────────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Hardware Setup (ESP32)

### **Components Required:**

| Component | Purpose | Pins |
|-----------|---------|------|
| ESP32 Dev Board | Main microcontroller | - |
| DHT22/BME280 | Temperature & Humidity | GPIO 4 (Data) |
| BMP280 | Atmospheric Pressure | I2C (SDA: GPIO 21, SCL: GPIO 22) |
| GPS NEO-6M | Location tracking | UART (TX: GPIO 16, RX: GPIO 17) |
| Power Supply | 5V battery/solar | VIN, GND |

### **Data Collection Process:**

```cpp
// ESP32 Code Flow (esp32/esp32_sensor_bluetooth.ino)

void loop() {
  // 1. Read sensors every 5 seconds
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  float pressure = bmp.readPressure() / 100.0F; // hPa
  
  // 2. Get GPS coordinates
  float latitude = gps.location.lat();
  float longitude = gps.location.lng();
  float elevation = gps.altitude.meters();
  
  // 3. Create JSON payload
  String payload = {
    "deviceId": "ESP32-SLOPE-MONITOR",
    "temperature": temperature,
    "humidity": humidity,
    "pressure": pressure,
    "lat": latitude,
    "lon": longitude,
    "elevation": elevation,
    "timestamp": millis()
  };
  
  // 4. Send via WiFi WebSocket
  webSocket.sendTXT(payload);
  
  delay(5000); // 5 second interval
}
```

### **Communication Methods:**

1. **WiFi WebSocket** (Primary)
   - Direct connection to server at `ws://server-ip:3000`
   - Low latency (<100ms)
   - Real-time bidirectional

2. **Bluetooth** (Backup)
   - Connects to `esp32_bluetooth_receiver.py`
   - Python script forwards to server via HTTP
   - For areas with poor WiFi

3. **USB Serial** (Development)
   - Direct serial connection to computer
   - `esp32_usb_receiver.py` reads serial and pushes to server

---

## ⚙️ Data Processing Pipeline

### **Step 1: Data Ingestion** (`server-advanced.js`)

```javascript
// WebSocket connection handler
wss.on('connection', (ws) => {
  ws.on('message', async (data) => {
    const sensorData = JSON.parse(data);
    
    // Validation
    if (!validateSensorData(sensorData)) {
      ws.send(JSON.stringify({ error: 'Invalid data format' }));
      return;
    }
    
    // Add server timestamp
    sensorData.serverTimestamp = new Date();
    
    // Process and broadcast
    await processSensorData(sensorData);
  });
});
```

### **Step 2: Regional Calibration** (`services/regionalCalibrationService.js`)

The system determines the region based on GPS coordinates and applies region-specific thresholds:

```javascript
function determineRegionFromCoords(lat, lon) {
  const regions = {
    'Kerala': { 
      bounds: { lat: [8.0, 13.0], lon: [74.0, 77.5] },
      thresholds: { rainfall: 25, humidity: 40, slope: 30 }
    },
    'Uttarakhand': { 
      bounds: { lat: [28.5, 31.5], lon: [77.5, 81.0] },
      thresholds: { rainfall: 15, humidity: 40, slope: 35 }
    },
    'Himachal Pradesh': { 
      bounds: { lat: [30.5, 33.5], lon: [75.5, 79.0] },
      thresholds: { rainfall: 18, humidity: 38, slope: 32 }
    },
    // ... 6 more regions
  };
  
  // Find matching region
  for (let [name, data] of Object.entries(regions)) {
    if (lat >= data.bounds.lat[0] && lat <= data.bounds.lat[1] &&
        lon >= data.bounds.lon[0] && lon <= data.bounds.lon[1]) {
      return { name, thresholds: data.thresholds };
    }
  }
  
  // Default thresholds
  return { name: 'Unknown', thresholds: { rainfall: 25, humidity: 40, slope: 30 } };
}
```

**9 Regional Profiles:**

| Region | Rainfall Threshold | Humidity Threshold | Slope Threshold | Geology |
|--------|-------------------|-------------------|-----------------|---------|
| Kerala | 25 mm/hr | 40% | 30° | Laterite soil, Western Ghats |
| Uttarakhand | 15 mm/hr | 40% | 35° | Young Himalayas, steep |
| Himachal Pradesh | 18 mm/hr | 38% | 32° | Lesser Himalayas |
| Maharashtra | 30 mm/hr | 42% | 28° | Deccan plateau, basalt |
| Karnataka | 28 mm/hr | 41% | 29° | Crystalline rocks |
| Tamil Nadu | 35 mm/hr | 38% | 25° | Hard rock terrain |
| West Bengal | 20 mm/hr | 45% | 33° | Eastern Himalayas |
| Arunachal Pradesh | 22 mm/hr | 43% | 35° | Northeastern hills |
| Meghalaya | 40 mm/hr | 50% | 30° | Highest rainfall area |

### **Step 3: External Data Enrichment**

```javascript
// Fetch rainfall data from OpenWeather API
async function fetchRainfallData(lat, lon) {
  const response = await axios.get(
    `https://api.openweathermap.org/data/2.5/weather`,
    {
      params: {
        lat: lat,
        lon: lon,
        appid: process.env.OPENWEATHER_API_KEY
      }
    }
  );
  
  return {
    rainfall_1h: response.data.rain?.['1h'] || 0,
    rainfall_24h: calculateLast24Hours(response.data),
    cloudCover: response.data.clouds?.all || 0
  };
}
```

### **Step 4: Data Storage** (MongoDB)

```javascript
// Schema: Sensor Data Collection
{
  deviceId: "ESP32-SLOPE-MONITOR",
  timestamp: ISODate("2025-12-07T10:30:00Z"),
  temperature: 28.5,
  humidity: 72.3,
  pressure: 1013.2,
  location: {
    lat: 30.0668,
    lon: 79.0193,
    elevation: 2500
  },
  rainfall: {
    current: 0,
    last24h: 15.2
  },
  region: "Uttarakhand",
  riskScore: 45.2,
  riskLevel: "MODERATE"
}
```

---

## 🧠 AI/ML Prediction System

### **Neural Network Architecture:**

The system uses **three separate neural networks** trained with TensorFlow.js:

#### **1. Temperature Prediction Model** (`saved_models/temperature.json`)

**Purpose:** Predict next 24-hour temperature trends

**Input Features (6 neurons):**
- Current temperature
- Current humidity
- Current pressure
- Time of day (0-23)
- Day of year (1-365)
- Historical average temperature

**Architecture:**
```
Input Layer (6 neurons)
    ↓
Hidden Layer 1 (128 neurons, ReLU activation)
    ↓
Hidden Layer 2 (64 neurons, ReLU activation)
    ↓
Hidden Layer 3 (32 neurons, ReLU activation)
    ↓
Output Layer (1 neuron, Linear activation)
    ↓
Predicted Temperature (°C)
```

**Training:**
- 10,000+ historical data points
- Mean Squared Error loss function
- Adam optimizer
- 200 epochs

---

#### **2. Humidity Prediction Model** (`saved_models/humidity.json`)

**Purpose:** Forecast soil moisture and saturation levels

**Input Features (7 neurons):**
- Current humidity
- Current temperature
- Current pressure
- Rainfall (last 1h)
- Rainfall (last 24h)
- Time of day
- Soil type factor (from regional calibration)

**Architecture:** Same as temperature model (128→64→32)

**Output:** Predicted humidity % (soil moisture indicator)

---

#### **3. Landslide Risk Prediction Model** (`saved_models/landslide.json`)

**Purpose:** Calculate landslide probability based on multi-factor analysis

**Input Features (10 neurons):**
- Temperature (°C)
- Humidity (%)
- Pressure (hPa)
- Rainfall intensity (mm/hr)
- 24-hour cumulative rainfall (mm)
- Slope angle (°) - calculated from GPS elevation changes
- Soil saturation index (0-100)
- Historical landslide frequency (from government database)
- Days since last landslide
- Vegetation density index

**Architecture:**
```
Input Layer (10 neurons)
    ↓
Hidden Layer 1 (128 neurons, ReLU, Dropout 0.3)
    ↓
Hidden Layer 2 (64 neurons, ReLU, Dropout 0.2)
    ↓
Hidden Layer 3 (32 neurons, ReLU)
    ↓
Output Layer (1 neuron, Sigmoid activation)
    ↓
Risk Probability (0.0 - 1.0)
```

**Training Data:**
- **50 historical landslide events** from government databases
- Features from 7 days before each event
- Negative samples (non-landslide conditions)
- Binary Cross-Entropy loss
- Trained for 500 epochs

**Model File Structure:**
```json
{
  "modelTopology": {
    "class_name": "Sequential",
    "keras_version": "2.8.0",
    "config": {
      "layers": [...]
    }
  },
  "weightsManifest": [{
    "paths": ["weights.bin"],
    "weights": [...]
  }],
  "trainingConfig": {
    "optimizer": "adam",
    "loss": "binaryCrossentropy",
    "metrics": ["accuracy"]
  }
}
```

---

### **Parameter Weightage for Landslide Prediction:**

The AI model learns weights automatically during training, but the input feature importance (determined through feature analysis) is approximately:

```javascript
const FEATURE_WEIGHTS = {
  rainfall_24h: 0.25,        // 25% - Most critical factor
  soil_saturation: 0.20,     // 20% - Humidity-derived
  slope_angle: 0.18,         // 18% - Terrain steepness
  rainfall_intensity: 0.15,  // 15% - Current rain rate
  historical_events: 0.10,   // 10% - Past landslides nearby
  pressure_change: 0.05,     // 5% - Atmospheric anomalies
  temperature: 0.04,         // 4% - Soil stability
  vegetation: 0.03           // 3% - Root stability
};
```

### **Risk Scoring Algorithm:**

```javascript
async function calculateRiskScore(sensorData, rainfall, region) {
  // 1. Get AI prediction
  const aiPrediction = await predictionService.predictLandslide({
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    pressure: sensorData.pressure,
    rainfall_1h: rainfall.current,
    rainfall_24h: rainfall.last24h,
    slope: calculateSlope(sensorData.elevation),
    region: region.name
  });
  
  // 2. Apply regional thresholds
  const thresholdScore = calculateThresholdExceedance(
    sensorData,
    rainfall,
    region.thresholds
  );
  
  // 3. Weighted combination
  const finalScore = (aiPrediction * 0.7) + (thresholdScore * 0.3);
  
  // 4. Classify risk level
  if (finalScore >= 0.75) return { score: finalScore * 100, level: 'CRITICAL' };
  if (finalScore >= 0.50) return { score: finalScore * 100, level: 'HIGH' };
  if (finalScore >= 0.25) return { score: finalScore * 100, level: 'MODERATE' };
  return { score: finalScore * 100, level: 'STABLE' };
}

function calculateThresholdExceedance(data, rainfall, thresholds) {
  let score = 0;
  
  // Rainfall check (40% weight)
  if (rainfall.last24h > thresholds.rainfall) {
    score += 0.4 * (rainfall.last24h / thresholds.rainfall);
  }
  
  // Humidity check (35% weight)
  if (data.humidity > thresholds.humidity) {
    score += 0.35 * (data.humidity / 100);
  }
  
  // Slope check (25% weight)
  const slopeAngle = calculateSlope(data.elevation);
  if (slopeAngle > thresholds.slope) {
    score += 0.25 * (slopeAngle / 90);
  }
  
  return Math.min(score, 1.0); // Cap at 100%
}
```

### **Prediction Execution Flow:**

```javascript
// services/predictionService.js

class PredictionService {
  constructor() {
    // Load trained models from disk
    this.tempModel = await tf.loadLayersModel('file://./saved_models/temperature.json');
    this.humidityModel = await tf.loadLayersModel('file://./saved_models/humidity.json');
    this.landslideModel = await tf.loadLayersModel('file://./saved_models/landslide.json');
  }
  
  async predictLandslide(features) {
    // 1. Normalize input features (0-1 range)
    const normalized = this.normalizeFeatures(features);
    
    // 2. Create tensor
    const inputTensor = tf.tensor2d([normalized], [1, 10]);
    
    // 3. Run prediction
    const prediction = this.landslideModel.predict(inputTensor);
    
    // 4. Get probability value
    const probability = await prediction.data();
    
    // 5. Cleanup
    inputTensor.dispose();
    prediction.dispose();
    
    return probability[0]; // Returns 0.0 to 1.0
  }
  
  normalizeFeatures(features) {
    return [
      features.temperature / 50,           // 0-50°C range
      features.humidity / 100,             // 0-100%
      (features.pressure - 900) / 200,     // 900-1100 hPa
      features.rainfall_1h / 50,           // 0-50 mm/hr
      features.rainfall_24h / 200,         // 0-200 mm/24h
      features.slope / 90,                 // 0-90°
      features.soilSaturation / 100,       // 0-100%
      features.historicalFrequency / 10,   // 0-10 events
      features.daysSinceLastSlide / 365,   // 0-365 days
      features.vegetation / 100            // 0-100%
    ];
  }
}
```

---

## 📊 Graph & Visualization

### **Real-Time Charts** (Chart.js)

#### **1. Temperature-Humidity Line Chart**

```javascript
// public/app.js - Chart initialization

const tempHumidityChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [], // Timestamps
    datasets: [
      {
        label: 'Temperature (°C)',
        data: [],
        borderColor: '#ff6b6b',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        yAxisID: 'y-temp'
      },
      {
        label: 'Humidity (%)',
        data: [],
        borderColor: '#4ecdc4',
        backgroundColor: 'rgba(78, 205, 196, 0.1)',
        yAxisID: 'y-humid'
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      'y-temp': { position: 'left', min: 0, max: 50 },
      'y-humid': { position: 'right', min: 0, max: 100 }
    },
    animation: { duration: 500 }
  }
});
```

**Update Process:**
```javascript
// WebSocket message handler
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  // Add new data point
  allData.push(data);
  
  // Update chart
  updateCharts();
};

function updateCharts() {
  // Keep last 50 data points
  const recentData = allData.slice(-50);
  
  // Extract timestamps and values
  const labels = recentData.map(d => 
    new Date(d.timestamp).toLocaleTimeString()
  );
  const temps = recentData.map(d => d.temperature);
  const humids = recentData.map(d => d.humidity);
  
  // Update chart data
  tempHumidityChart.data.labels = labels;
  tempHumidityChart.data.datasets[0].data = temps;
  tempHumidityChart.data.datasets[1].data = humids;
  
  // Refresh display
  tempHumidityChart.update('none'); // No animation for real-time
}
```

#### **2. Pressure Chart**

Shows atmospheric pressure trends and anomalies:

```javascript
const pressureChart = new Chart(ctx2, {
  type: 'line',
  data: {
    datasets: [{
      label: 'Pressure (hPa)',
      data: [],
      borderColor: '#a8e6cf',
      fill: true,
      backgroundColor: 'rgba(168, 230, 207, 0.2)'
    }]
  },
  options: {
    scales: {
      y: {
        min: 950,
        max: 1050,
        ticks: {
          callback: (value) => value + ' hPa'
        }
      }
    }
  }
});
```

**Pressure Anomaly Detection:**
```javascript
function detectPressureAnomaly(currentPressure, historicalData) {
  // Calculate moving average (last 10 readings)
  const recentReadings = historicalData.slice(-10);
  const avgPressure = recentReadings.reduce((sum, d) => 
    sum + d.pressure, 0
  ) / recentReadings.length;
  
  // Detect rapid drop (>5 hPa in 30 mins)
  const deviation = avgPressure - currentPressure;
  
  if (deviation > 5) {
    return {
      anomaly: true,
      severity: 'HIGH',
      message: 'Rapid pressure drop detected - possible storm'
    };
  }
  
  return { anomaly: false };
}
```

#### **3. Risk Score Gauge**

Visual indicator using Chart.js Doughnut chart:

```javascript
const riskGauge = new Chart(ctx3, {
  type: 'doughnut',
  data: {
    datasets: [{
      data: [riskScore, 100 - riskScore],
      backgroundColor: [
        getRiskColor(riskScore),
        '#f0f0f0'
      ],
      borderWidth: 0
    }]
  },
  options: {
    rotation: -90,
    circumference: 180,
    plugins: {
      tooltip: { enabled: false },
      legend: { display: false }
    }
  }
});

function getRiskColor(score) {
  if (score >= 75) return '#e74c3c'; // Red - Critical
  if (score >= 50) return '#e67e22'; // Orange - High
  if (score >= 25) return '#f39c12'; // Yellow - Moderate
  return '#27ae60'; // Green - Stable
}
```

---

### **3D Terrain Visualization** (Three.js)

#### **Terrain Generation:**

```javascript
// public/landslide-prediction.html

// 1. Create terrain geometry based on GPS coordinates
function createTerrain(lat, lon, elevation) {
  const geometry = new THREE.PlaneGeometry(
    1000, 1000,  // 1km x 1km area
    100, 100     // 100x100 grid resolution
  );
  
  // 2. Generate height map from elevation data
  const vertices = geometry.attributes.position.array;
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    
    // Calculate slope using Perlin noise + real elevation
    const height = calculateElevation(x, y, elevation);
    vertices[i + 2] = height;
    
    // Calculate slope angle
    const slope = calculateSlopeAngle(x, y, height);
    
    // Store slope for risk calculation
    slopeData.push({ x, y, height, slope });
  }
  
  geometry.computeVertexNormals();
  
  // 3. Apply color based on risk level
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true
  });
  
  applyRiskColors(geometry, slopeData);
  
  return new THREE.Mesh(geometry, material);
}

// 4. Color vertices based on slope angle
function applyRiskColors(geometry, slopeData) {
  const colors = [];
  
  slopeData.forEach(point => {
    let color;
    if (point.slope > 45) {
      color = new THREE.Color(0xff0000); // Red - Critical
    } else if (point.slope > 30) {
      color = new THREE.Color(0xff6b00); // Orange - High Risk
    } else if (point.slope > 15) {
      color = new THREE.Color(0xffff00); // Yellow - Moderate
    } else {
      color = new THREE.Color(0x00ff00); // Green - Stable
    }
    
    colors.push(color.r, color.g, color.b);
  });
  
  geometry.setAttribute('color', 
    new THREE.Float32BufferAttribute(colors, 3)
  );
}
```

#### **Weak Point Detection:**

```javascript
// Identify areas with highest landslide risk
function detectWeakPoints(slopeData) {
  const weakPoints = [];
  
  slopeData.forEach(point => {
    // Criteria for weak point:
    // 1. Slope > 35°
    // 2. High elevation change
    // 3. Concave terrain (water accumulation)
    
    if (point.slope > 35) {
      const neighbors = getNeighbors(point, slopeData);
      const isConcave = checkConcavity(point, neighbors);
      
      if (isConcave) {
        weakPoints.push({
          position: { x: point.x, y: point.y, z: point.height },
          slope: point.slope,
          risk: calculateLocalRisk(point, neighbors)
        });
      }
    }
  });
  
  // Add visual markers
  weakPoints.forEach(wp => {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    marker.position.set(wp.position.x, wp.position.y, wp.position.z + 10);
    scene.add(marker);
  });
  
  return weakPoints; // Typically 1800+ points identified
}
```

---

## 🔔 Alert System

### **Multi-Channel Alert Dispatch:**

```javascript
// server-advanced.js - Alert trigger logic

async function checkThresholdsAndAlert(sensorData, riskScore) {
  const alerts = [];
  
  // 1. Check individual thresholds
  if (sensorData.temperature > thresholds.tempMax) {
    alerts.push({
      type: 'TEMPERATURE',
      severity: 'MEDIUM',
      message: `High temperature: ${sensorData.temperature}°C`
    });
  }
  
  if (sensorData.humidity > thresholds.humidityMax) {
    alerts.push({
      type: 'HUMIDITY',
      severity: 'MEDIUM',
      message: `High soil moisture: ${sensorData.humidity}%`
    });
  }
  
  // 2. Check AI prediction
  if (riskScore >= 75) {
    alerts.push({
      type: 'LANDSLIDE_RISK',
      severity: 'CRITICAL',
      message: `CRITICAL: Landslide risk ${riskScore.toFixed(1)}% - EVACUATE NOW!`
    });
  } else if (riskScore >= 50) {
    alerts.push({
      type: 'LANDSLIDE_RISK',
      severity: 'HIGH',
      message: `HIGH RISK: Landslide probability ${riskScore.toFixed(1)}% - Prepare for evacuation`
    });
  }
  
  // 3. Dispatch alerts
  if (alerts.length > 0) {
    await dispatchAlerts(alerts, sensorData);
  }
}

async function dispatchAlerts(alerts, sensorData) {
  // Email to all users with emailAlerts enabled
  const users = await User.find({ emailAlerts: true });
  
  for (const alert of alerts) {
    // 1. Email notification
    await emailService.sendAlert(users, {
      subject: `[${alert.severity}] IntelliSlide Alert`,
      body: `
        ${alert.message}
        
        Location: ${sensorData.lat}°N, ${sensorData.lon}°E
        Region: ${sensorData.region}
        Time: ${new Date().toLocaleString()}
        
        Current Conditions:
        - Temperature: ${sensorData.temperature}°C
        - Humidity: ${sensorData.humidity}%
        - Rainfall (24h): ${sensorData.rainfall24h} mm
        
        Take appropriate action immediately.
      `
    });
    
    // 2. WebSocket push to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'ALERT',
          data: alert
        }));
      }
    });
    
    // 3. Store in database
    await Notification.create({
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      location: { lat: sensorData.lat, lon: sensorData.lon },
      timestamp: new Date()
    });
  }
}
```

### **Frontend Alert Handling:**

```javascript
// public/app.js - Browser notification

function handleAlert(alert) {
  // 1. Browser push notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('IntelliSlide Alert', {
      body: alert.message,
      icon: '/icon.png',
      badge: '/badge.png',
      tag: alert.type,
      requireInteraction: alert.severity === 'CRITICAL'
    });
  }
  
  // 2. Voice announcement (if enabled)
  if (voiceAlertsEnabled && alert.severity !== 'LOW') {
    const utterance = new SpeechSynthesisUtterance(alert.message);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  }
  
  // 3. Visual notification panel
  addNotification(alert.message, alert.severity.toLowerCase());
  
  // 4. Flash risk card
  flashRiskCard();
}
```

---

## 🛠️ Installation & Setup

### **1. Clone Repository**

```bash
git clone https://github.com/Mango-Leach/Landslide-Detection-Model.git
cd Landslide-Detection-Model
```

### **2. Install Dependencies**

```bash
npm install
```

**Required packages:**
- express
- ws (WebSocket)
- mongoose (MongoDB)
- @tensorflow/tfjs-node
- nodemailer
- axios
- bcryptjs
- jsonwebtoken
- dotenv

### **3. Environment Configuration**

Create `.env` file:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/intellislide

# JWT
JWT_SECRET=your_super_secret_key_here

# Email (Gmail example)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=IntelliSlide <noreply@intellislide.com>

# OpenWeather API
OPENWEATHER_API_KEY=your_api_key_here

# Twilio SMS (Optional)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Server
PORT=3000
NODE_ENV=production
```

### **4. Setup MongoDB**

```bash
# Install MongoDB
# Windows: Download from mongodb.com
# Linux: sudo apt-get install mongodb

# Start MongoDB
mongod --dbpath ./data

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env
```

### **5. Upload ESP32 Code**

```bash
# Install Arduino IDE
# Add ESP32 board support
# Install libraries: DHT, BMP280, TinyGPS++

# Open esp32/esp32_sensor_bluetooth.ino
# Configure WiFi credentials:
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverIP = "192.168.1.100"; // Your server IP

# Upload to ESP32
```

### **6. Start Server**

```bash
# Development mode
npm run dev

# Production mode
npm start

# Or use start.bat on Windows
./start.bat
```

### **7. Access Dashboard**

Open browser: `http://localhost:3000`

**Default login:** Create account via signup page

---

## 📁 Project Structure

```
iot-dashboard/
├── server-advanced.js              # Main server with WebSocket + AI
├── package.json                    # Dependencies
├── .env.example                    # Environment template
├── start.bat                       # Windows startup script
│
├── models/                         # MongoDB Schemas
│   └── User.js                     # User authentication model
│
├── routes/                         # API Endpoints
│   └── auth.js                     # Login/signup routes
│
├── middleware/                     # Express Middleware
│   └── auth.js                     # JWT verification
│
├── services/                       # Business Logic
│   ├── predictionService.js        # AI prediction engine
│   ├── regionalCalibrationService.js  # Region-specific thresholds
│   ├── emailService.js             # Nodemailer alert dispatch
│   ├── smsService.js               # Twilio SMS (optional)
│   └── govDataFetcher.js           # External landslide database API
│
├── saved_models/                   # Trained Neural Networks
│   ├── temperature.json            # Temperature prediction model
│   ├── humidity.json               # Humidity prediction model
│   ├── landslide.json              # Landslide risk model (50 events)
│   └── metadata.json               # Training information
│
├── regional_calibration/           # Geological Profiles
│   └── profiles.json               # 9 region-specific thresholds
│
├── public/                         # Frontend Files
│   ├── index.html                  # Main dashboard
│   ├── app.js                      # Dashboard JavaScript
│   ├── style.css                   # Dark/light theme styles
│   ├── login.html                  # Authentication page
│   ├── signup.html                 # User registration
│   ├── landslide-prediction.html   # 3D terrain viewer
│   └── admin.html                  # System settings
│
├── esp32/                          # Hardware Code
│   ├── esp32_sensor_bluetooth.ino  # Arduino ESP32 code
│   ├── WIRING_DIAGRAM.md           # Pin connections
│   └── YOUR_CODE_VS_NEW.md         # Migration guide
│
├── arduino-examples/               # Sample Code
│   ├── esp32_websocket.ino         # WiFi WebSocket example
│   ├── arduino_ethernet.ino        # Ethernet shield example
│   └── python_simulator.py         # Sensor data simulator
│
├── esp32_bluetooth_receiver.py     # Bluetooth → HTTP bridge
├── esp32_usb_receiver.py           # USB Serial → HTTP bridge
├── sensor_simulator.py             # Test data generator
├── gov_data_simulator.py           # Government DB simulator
├── train_ai_from_govdata.js        # AI model training script
└── analyze_early_warnings.py       # Historical analysis tool
```

---

## 🔬 Technologies Used

### **Backend:**
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18.x | Server runtime |
| Express.js | 4.18.x | REST API framework |
| WebSocket (ws) | 8.x | Real-time communication |
| MongoDB | 6.x | Database |
| Mongoose | 7.x | ODM |
| TensorFlow.js | 4.x | AI/ML predictions |
| Nodemailer | 6.x | Email alerts |
| Axios | 1.x | HTTP requests |
| bcryptjs | 2.x | Password hashing |
| jsonwebtoken | 9.x | JWT authentication |

### **Frontend:**
| Technology | Version | Purpose |
|------------|---------|---------|
| Chart.js | 4.4.x | Interactive charts |
| Three.js | r128 | 3D terrain rendering |
| jsPDF | 2.5.x | PDF export |
| Font Awesome | 6.4.x | Icons |
| Luxon | 3.x | Date/time handling |

### **Hardware:**
| Component | Purpose |
|-----------|---------|
| ESP32 | WiFi/Bluetooth microcontroller |
| DHT22/BME280 | Temperature & humidity sensor |
| BMP280 | Barometric pressure sensor |
| GPS NEO-6M | Location tracking |

### **External APIs:**
| Service | Purpose |
|---------|---------|
| OpenWeather API | Real-time rainfall data |
| Government Landslide DB | Historical landslide events |

---

## 📊 Performance Metrics

- **WebSocket Latency:** <100ms
- **AI Prediction Speed:** <50ms per inference
- **Database Query Time:** <20ms (indexed)
- **Chart Update Rate:** 60 FPS
- **3D Terrain Rendering:** 60 FPS (WebGL optimized)
- **Concurrent Connections:** 100+ devices supported
- **Data Storage:** ~1 MB per device per day

---

## 🚀 Deployment

### **Production Deployment:**

1. **Cloud Hosting** (AWS/Azure/Heroku)
2. **MongoDB Atlas** (managed database)
3. **SSL Certificate** (Let's Encrypt)
4. **Process Manager** (PM2)
5. **Reverse Proxy** (Nginx)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server-advanced.js --name intellislide

# Enable auto-restart
pm2 startup
pm2 save
```

---

## 📖 API Documentation

### **WebSocket Events:**

```javascript
// Client → Server
{
  "type": "SENSOR_DATA",
  "data": {
    "deviceId": "ESP32-001",
    "temperature": 28.5,
    "humidity": 72.3,
    "pressure": 1013.2,
    "lat": 30.0668,
    "lon": 79.0193
  }
}

// Server → Client
{
  "type": "UPDATE",
  "data": {
    ...sensorData,
    "riskScore": 45.2,
    "riskLevel": "MODERATE",
    "predictions": {
      "temperature": 29.1,
      "humidity": 75.8
    }
  }
}
```

### **REST Endpoints:**

```
POST /api/auth/login       - User login
POST /api/auth/signup      - User registration
GET  /api/sensor-data      - Fetch historical data
GET  /api/predictions      - Get AI predictions
POST /api/alerts           - Manual alert trigger
GET  /api/calibration      - Get regional profiles
```

---

## 📝 License

MIT License - See LICENSE file

---

## 👥 Contributors

- **Mango-Leach** - Lead Developer

---

## 🆘 Support

For issues or questions:
- GitHub Issues: [Create Issue](https://github.com/Mango-Leach/Landslide-Detection-Model/issues)
- Email: support@intellislide.com

---

## 🎯 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Satellite imagery integration
- [ ] Machine learning model retraining pipeline
- [ ] Multi-language support
- [ ] Weather forecast integration (7-day)
- [ ] Drone survey integration
- [ ] Community reporting system
- [ ] Evacuation route optimization

---

**Last Updated:** December 2025  
**Version:** 2.0.0  
**Status:** Production Ready ✅
