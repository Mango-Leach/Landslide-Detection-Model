/*
 * ESP32 Landslide Detection - Bluetooth Sensor Module
 * Based on your working code + Bluetooth transmission
 * 
 * Sensors Connected:
 * - DHT22 (Temperature & Humidity) - Pin 4
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
#include "DHT.h"
#include <ArduinoJson.h>

// ----- DHT22 -----
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// ----- Soil Moisture -----
#define SOIL_PIN 34
const int dryValue = 2800;  // Your dry air calibration
const int wetValue = 1100;  // Your wet soil calibration

// ----- MPU6050 -----
#define MPU_ADDR 0x68

// ----- LED & Buzzer -----
#define LED_PIN 2
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

  // Initialize DHT22
  dht.begin();
  Serial.println("✅ DHT22 initialized");

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

  // Initialize LED & Buzzer
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  Serial.println("✅ LED & Buzzer initialized");

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

  // --- DHT22 ---
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();
  if (isnan(temp) || isnan(hum)) {
    Serial.println("❌ Failed to read DHT22!");
    temp = 25.0;  // Default value
    hum = 50.0;   // Default value
  } else {
    Serial.print("🌡️ Temperature: "); Serial.print(temp); Serial.print(" °C, ");
    Serial.print("Humidity: "); Serial.print(hum); Serial.println(" %");
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

  // --- Landslide Detection Logic ---
  bool alert = false;
  String alertReason = "";

  if (soilPercent > 70) {  // High soil moisture
    alert = true;
    alertReason += "High soil moisture! ";
    Serial.println("⚠️ High soil moisture detected!");
  }

  // Motion detection - Lower threshold for easier testing (5000 instead of 15000)
  if (abs(ax) > 5000 || abs(ay) > 5000 || abs(az - 16384) > 5000) {
    alert = true;
    alertReason += "Sudden tilt/vibration! ";
    Serial.println("⚠️ Sudden tilt/vibration detected!");
    Serial.print("   Motion values: X="); Serial.print(ax);
    Serial.print(" Y="); Serial.print(ay);
    Serial.print(" Z="); Serial.println(az);
  }

  if (alert) {
    digitalWrite(LED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
    Serial.println("🚨 ALERT: Possible Landslide Risk Detected!");
  } else {
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    Serial.println("✅ Normal Conditions");
  }

  // --- Build JSON for Dashboard ---
  StaticJsonDocument<512> doc;
  
  doc["deviceId"] = DEVICE_NAME;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["pressure"] = 1013.25;          // Default (no sensor)
  doc["co2"] = 400;                   // Default (no sensor)
  doc["light"] = 500;                 // Default (no sensor)
  doc["soilMoisture"] = soilPercent;  // Your working sensor!
  doc["motion"] = alert;              // Boolean true/false (not "Y"/"N")
  // Don't send bad RTC timestamp - let dashboard use system time
  // doc["timestamp"] = timestamp;
  doc["alert"] = alert;               // Alert status
  doc["alertReason"] = alertReason;   // Why alert triggered
  
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
