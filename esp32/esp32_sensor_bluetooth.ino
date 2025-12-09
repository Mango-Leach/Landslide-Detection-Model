/*
 * ESP32 Landslide Detection - Bluetooth Sensor Module
 * Based on your working code + Bluetooth transmission
 * 
 * Sensors Connected:
 * - BME280 (Temperature, Humidity & Pressure) - I2C (SDA=21, SCL=22)
 * - Capacitive Soil Moisture - Pin 34 (ADC)
 * - MPU6050 (Motion/Vibration) - I2C (SDA=21, SCL=22)
 * - RTC DS3231 (Real-Time Clock) - I2C (SDA=21, SCL=22)
 * - LED - Pin 2 (Alert indicator)
 * - Buzzer - Pin 15 (Alert sound)
 * 
 * Sends JSON data via Bluetooth Serial to Dashboard
 */

#include <BluetoothSerial.h>
#include <Wire.h>
#include "RTClib.h"
#include <Adafruit_BME280.h>
#include <ArduinoJson.h>

// ----- BME280 -----
#define BME280_ADDRESS 0x76  // Default I2C address (try 0x77 if this doesn't work)
Adafruit_BME280 bme;

// ----- Soil Moisture -----
#define SOIL_PIN 34
const int dryValue = 2800;  // Your dry air calibration
const int wetValue = 1100;  // Your wet soil calibration

// ----- MPU6050 -----
#define MPU_ADDR 0x68

// ----- LED & Buzzer -----
#define RED_LED_PIN 2       // Red LED for landslide detection
#define YELLOW_LED_PIN 4    // Yellow LED for abnormal parameters
#define BUZZER_PIN 15

// ----- RTC -----
RTC_DS3231 rtc;
bool rtcOK = false;

// ----- Bluetooth -----
BluetoothSerial SerialBT;
const char* DEVICE_NAME = "ESP32-LANDSLIDE-001";
const unsigned long SEND_INTERVAL = 3000; // Send data every 3 seconds (same as your loop delay)
unsigned long lastSendTime = 0;

void enableRTCoscillator() {
  Wire.beginTransmission(0x68);
  Wire.write(0x0E);   // Control register
  Wire.write(0x00);   // Enable oscillator, disable SQW
  Wire.endTransmission();
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  delay(500);

  Serial.println("\n=== Initializing System ===");

  // Initialize Bluetooth
  SerialBT.begin(DEVICE_NAME);
  Serial.print("📡 Bluetooth Device: ");
  Serial.println(DEVICE_NAME);
  Serial.println("Waiting for connection...");

  // Initialize BME280
  if (!bme.begin(BME280_ADDRESS)) {
    Serial.println("❌ BME280 not found! Check wiring or try address 0x77");
  } else {
    Serial.println("✅ BME280 initialized");
  }

  // Initialize MPU6050
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1
  Wire.write(0);    // Wake up
  Wire.endTransmission(true);
  Serial.println("✅ MPU6050 initialized");

  // Initialize RTC
  if (!rtc.begin()) {
    Serial.println("❌ RTC not found!");
  } else {
    enableRTCoscillator();
    rtcOK = true;
    Serial.println("✅ RTC initialized");
  }

  // Uncomment ONCE to sync time to system compile time
  // rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));

  // Initialize LEDs & Buzzer
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(YELLOW_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(YELLOW_LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  Serial.println("✅ Red LED, Yellow LED & Buzzer initialized");

  Serial.println("\n🚀 System Ready! Sending data...\n");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Send data at specified interval (3 seconds, same as your delay)
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    readAndSendSensorData();
    lastSendTime = currentTime;
  }
  
  delay(10);
}

void readAndSendSensorData() {
  Serial.println("\n--- Sensor Readings ---");

  // --- RTC ---
  DateTime now;
  char timestamp[32] = "2025-01-01T00:00:00";  // Default if RTC fails
  
  if (rtcOK) {
    now = rtc.now();
    if (now.year() < 2020) {
      enableRTCoscillator();
      Serial.println("⚠️ RTC time invalid, re-enabling oscillator...");
    } else {
      Serial.print("⏰ Time: ");
      Serial.print(now.year()); Serial.print("-");
      Serial.print(now.month()); Serial.print("-");
      Serial.print(now.day()); Serial.print(" ");
      Serial.print(now.hour()); Serial.print(":");
      Serial.print(now.minute()); Serial.print(":");
      Serial.println(now.second());
      
      // Format timestamp for JSON
      sprintf(timestamp, "%04d-%02d-%02dT%02d:%02d:%02d",
              now.year(), now.month(), now.day(),
              now.hour(), now.minute(), now.second());
    }
  }

  // --- BME280 ---
  float temp = bme.readTemperature();
  float hum = bme.readHumidity();
  float pressure = bme.readPressure() / 100.0F;  // Convert Pa to hPa (millibars)
  
  if (isnan(temp) || isnan(hum) || isnan(pressure)) {
    Serial.println("❌ Failed to read BME280!");
    temp = 25.0;       // Default value
    hum = 50.0;        // Default value
    pressure = 1013.25; // Default sea-level pressure
  } else {
    Serial.print("🌡️ Temperature: "); Serial.print(temp); Serial.print(" °C, ");
    Serial.print("Humidity: "); Serial.print(hum); Serial.print(" %, ");
    Serial.print("Pressure: "); Serial.print(pressure); Serial.println(" hPa");
  }

  // --- Soil Moisture ---
  int soilRaw = analogRead(SOIL_PIN);
  int soilPercent = map(soilRaw, dryValue, wetValue, 0, 100);
  soilPercent = constrain(soilPercent, 0, 100);
  Serial.print("💧 Soil Raw: "); Serial.print(soilRaw);
  Serial.print(" -> Moisture: "); Serial.print(soilPercent);
  Serial.println(" %");

  // --- MPU6050 ---
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B); // ACCEL_XOUT_H
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 6, true);

  int16_t ax = 0, ay = 0, az = 0;
  if (Wire.available() == 6) {
    ax = Wire.read() << 8 | Wire.read();
    ay = Wire.read() << 8 | Wire.read();
    az = Wire.read() << 8 | Wire.read();
    Serial.print("📈 Accel X: "); Serial.print(ax);
    Serial.print(" | Y: "); Serial.print(ay);
    Serial.print(" | Z: "); Serial.println(az);
  } else {
    Serial.println("❌ MPU6050 read error!");
  }

  // --- Detection Logic ---
  bool landslideAlert = false;     // Critical landslide detection
  bool abnormalWarning = false;    // Any parameter abnormal
  String alertReason = "";

  // Check individual parameters for abnormal values (Yellow LED)
  if (temp > 45 || temp < 0) {
    abnormalWarning = true;
    alertReason += "Abnormal temperature! ";
    Serial.println("⚠️ Abnormal temperature detected!");
  }

  if (hum > 95) {
    abnormalWarning = true;
    alertReason += "Extreme humidity! ";
    Serial.println("⚠️ Extreme humidity detected!");
  }

  if (pressure < 950 || pressure > 1050) {
    abnormalWarning = true;
    alertReason += "Abnormal pressure! ";
    Serial.println("⚠️ Abnormal pressure detected!");
  }

  if (soilPercent > 80) {  // Critical soil moisture
    abnormalWarning = true;
    alertReason += "High soil moisture! ";
    Serial.println("⚠️ High soil moisture detected!");
  }

  // Motion detection - Properly calibrated threshold
  // At rest: ax ≈ 0, ay ≈ 0, az ≈ 16384 (1g gravity)
  // Using 8000 threshold (~0.5g) to detect significant movement/shaking
  bool motionDetected = false;
  if (abs(ax) > 8000 || abs(ay) > 8000 || abs(az - 16384) > 8000) {
    motionDetected = true;
    abnormalWarning = true;
    alertReason += "Sudden tilt/vibration! ";
    Serial.println("⚠️ Sudden tilt/vibration detected!");
    Serial.print("   Motion values: X="); Serial.print(ax);
    Serial.print(" Y="); Serial.print(ay);
    Serial.print(" Z="); Serial.println(az);
  }

  // LANDSLIDE DETECTION: High soil moisture + Motion detected
  if (soilPercent > 80 && motionDetected) {
    landslideAlert = true;
    alertReason = "LANDSLIDE RISK: High moisture + Ground movement! ";
    Serial.println("🚨🚨🚨 CRITICAL: LANDSLIDE RISK DETECTED! 🚨🚨🚨");
  }

  // Control LEDs and Buzzer based on detection level
  if (landslideAlert) {
    // CRITICAL: Red LED + Buzzer
    digitalWrite(RED_LED_PIN, HIGH);
    digitalWrite(YELLOW_LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, HIGH);
    Serial.println("🚨 RED ALERT: Landslide Risk - Buzzer Active!");
  } else if (abnormalWarning) {
    // WARNING: Yellow LED only (no buzzer)
    digitalWrite(RED_LED_PIN, LOW);
    digitalWrite(YELLOW_LED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, LOW);
    Serial.println("⚠️ YELLOW WARNING: Abnormal Parameter Detected!");
  } else {
    // NORMAL: All off
    digitalWrite(RED_LED_PIN, LOW);
    digitalWrite(YELLOW_LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    Serial.println("✅ Normal Conditions");
  }

  // --- Build JSON for Dashboard ---
  StaticJsonDocument<512> doc;
  
  doc["deviceId"] = DEVICE_NAME;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["pressure"] = pressure;         // Real pressure from BME280
  doc["co2"] = 400;                   // Default (no sensor)
  doc["light"] = 500;                 // Default (no sensor)
  doc["soilMoisture"] = soilPercent;      // Your working sensor!
  doc["motion"] = motionDetected;         // Boolean true/false
  // Don't send bad RTC timestamp - let dashboard use system time
  // doc["timestamp"] = timestamp;
  doc["alert"] = landslideAlert;          // Critical landslide alert
  doc["warning"] = abnormalWarning;       // Abnormal parameter warning
  doc["alertReason"] = alertReason;       // Why alert/warning triggered
  
  // Add raw accelerometer data
  JsonObject accel = doc.createNestedObject("accelerometer");
  accel["x"] = ax;
  accel["y"] = ay;
  accel["z"] = az;
  
  // Serialize and send via Bluetooth AND USB Serial
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send to Bluetooth
  SerialBT.println(jsonString);
  
  // Send to USB Serial (for USB connection)
  Serial.println(jsonString);
  
  Serial.println("------------------------");
}
