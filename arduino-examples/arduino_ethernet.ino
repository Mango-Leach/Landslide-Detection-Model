/*
 * Arduino with Ethernet Shield / WiFi Shield - HTTP POST Example
 * 
 * This example sends sensor data to the IntelliSlide dashboard via HTTP POST requests
 * Works with: Arduino Uno + Ethernet Shield, Arduino MKR WiFi 1010, etc.
 * 
 * Hardware Connections:
 * - DHT Sensor: Connect to Digital Pin 2
 * - LDR: Connect to Analog Pin A0
 * 
 * Install required libraries:
 * - DHT sensor library by Adafruit
 * - Adafruit Unified Sensor
 * - ArduinoJson
 */

#include <SPI.h>
#include <Ethernet.h>  // Use <WiFi.h> for WiFi shields
#include <ArduinoJson.h>
#include <DHT.h>

// Network settings
byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };
IPAddress serverIP(192, 168, 1, 100);  // Your server's IP address
int serverPort = 3000;

// Sensor pins
#define DHT_PIN 2
#define DHT_TYPE DHT22
#define LDR_PIN A0

// Initialize
DHT dht(DHT_PIN, DHT_TYPE);
EthernetClient client;

// Timing
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 5000; // Send every 5 seconds

void setup() {
  Serial.begin(9600);
  while (!Serial) { ; }
  
  Serial.println("Starting IntelliSlide Client...");
  
  // Initialize DHT sensor
  dht.begin();
  
  // Start Ethernet connection
  if (Ethernet.begin(mac) == 0) {
    Serial.println("Failed to configure Ethernet using DHCP");
    // Try to configure using IP instead of DHCP:
    // Ethernet.begin(mac, ip);
    return;
  }
  
  Serial.print("IP address: ");
  Serial.println(Ethernet.localIP());
  
  delay(1000);
}

void loop() {
  // Maintain DHCP lease
  Ethernet.maintain();
  
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
  float light = map(lightRaw, 0, 1023, 0, 1000);
  
  // Check if sensor readings are valid
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
  
  // Create JSON document
  StaticJsonDocument<200> doc;
  doc["temperature"] = round(temperature * 100) / 100.0;
  doc["humidity"] = round(humidity * 100) / 100.0;
  doc["light"] = (int)light;
  
  // Serialize JSON to string
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Make HTTP POST request
  if (client.connect(serverIP, serverPort)) {
    Serial.println("Connected to server");
    
    // Send HTTP POST request
    client.println("POST /api/data HTTP/1.1");
    client.print("Host: ");
    client.println(serverIP);
    client.println("Content-Type: application/json");
    client.print("Content-Length: ");
    client.println(jsonString.length());
    client.println("Connection: close");
    client.println();
    client.println(jsonString);
    
    Serial.println("Sent: " + jsonString);
    
    // Wait for response
    delay(100);
    
    // Read response
    while (client.available()) {
      char c = client.read();
      Serial.write(c);
    }
    
    client.stop();
    Serial.println("\nDisconnected");
  } else {
    Serial.println("Connection failed");
  }
  
  Serial.printf("Temperature: %.2f°C, Humidity: %.2f%%, Light: %.0f lux\n\n", 
                temperature, humidity, light);
}
