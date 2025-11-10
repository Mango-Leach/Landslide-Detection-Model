/*
 * ESP32 / ESP8266 IoT Dashboard Example
 * 
 * This example sends sensor data to the IoT Dashboard via WebSocket
 * Supports: DHT11/DHT22 (Temperature & Humidity), LDR (Light sensor)
 * 
 * Hardware Connections:
 * - DHT Sensor: Connect to GPIO 4 (or change DHT_PIN)
 * - LDR: Connect to GPIO 34 (ESP32) or A0 (ESP8266)
 * 
 * Install required libraries:
 * - DHT sensor library by Adafruit
 * - Adafruit Unified Sensor
 * - ArduinoJson
 * - WebSockets by Markus Sattler (for ESP32/ESP8266)
 */

#include <WiFi.h>  // Use <ESP8266WiFi.h> for ESP8266
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server settings (change to your server's IP address)
const char* serverIP = "192.168.1.100";  // Your computer's IP address
const int serverPort = 3000;

// Sensor pins
#define DHT_PIN 4          // DHT sensor pin
#define DHT_TYPE DHT22     // DHT22 or DHT11
#define LDR_PIN 34         // Light sensor pin (ESP32: 34, ESP8266: A0)

// Initialize sensors
DHT dht(DHT_PIN, DHT_TYPE);
WebSocketsClient webSocket;

// Timing
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 2000; // Send data every 2 seconds

void setup() {
  Serial.begin(115200);
  Serial.println("\n\nStarting IoT Dashboard Client...");
  
  // Initialize DHT sensor
  dht.begin();
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  // Initialize WebSocket
  webSocket.begin(serverIP, serverPort, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  
  Serial.println("WebSocket client initialized");
}

void loop() {
  webSocket.loop();
  
  // Send sensor data at regular intervals
  if (millis() - lastSendTime >= sendInterval) {
    sendSensorData();
    lastSendTime = millis();
  }
}

void sendSensorData() {
  // Read sensors
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int lightRaw = analogRead(LDR_PIN);
  
  // Convert light sensor reading to lux (approximate)
  // ESP32: 0-4095 range, ESP8266: 0-1023 range
  #ifdef ESP32
    float light = map(lightRaw, 0, 4095, 0, 1000);
  #else
    float light = map(lightRaw, 0, 1023, 0, 1000);
  #endif
  
  // Check if sensor readings are valid
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
  
  // Create JSON document
  StaticJsonDocument<200> doc;
  doc["temperature"] = round(temperature * 100) / 100.0;  // Round to 2 decimals
  doc["humidity"] = round(humidity * 100) / 100.0;
  doc["light"] = (int)light;
  doc["timestamp"] = "";  // Server will add timestamp
  
  // Serialize JSON to string
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send via WebSocket
  webSocket.sendTXT(jsonString);
  
  // Debug output
  Serial.println("Sent: " + jsonString);
  Serial.printf("Temperature: %.2f°C, Humidity: %.2f%%, Light: %.0f lux\n", 
                temperature, humidity, light);
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("WebSocket Disconnected");
      break;
      
    case WStype_CONNECTED:
      Serial.println("WebSocket Connected!");
      Serial.printf("Connected to server: %s\n", payload);
      break;
      
    case WStype_TEXT:
      Serial.printf("Received: %s\n", payload);
      break;
      
    case WStype_ERROR:
      Serial.println("WebSocket Error!");
      break;
      
    default:
      break;
  }
}
