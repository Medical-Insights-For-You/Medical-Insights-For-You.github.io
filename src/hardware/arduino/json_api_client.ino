/*
 * Arduino JSON API Client for Health Data Transmission
 * 
 * This code handles JSON data formatting and transmission
 * to a web API endpoint for real-time health monitoring.
 * 
 * Features:
 * - JSON data serialization
 * - HTTP POST requests
 * - Error handling and retry logic
 * - Data buffering for offline operation
 * - Authentication and security
 */

#include <ArduinoJson.h>
#include <WiFi.h>  // For ESP32, use WiFiClient for Arduino Uno
#include <HTTPClient.h>  // For ESP32
// For Arduino Uno, use Ethernet library or SoftwareSerial for WiFi module

// Configuration
const char* WIFI_SSID = "YourWiFiNetwork";
const char* WIFI_PASSWORD = "YourWiFiPassword";
const char* API_ENDPOINT = "https://medical-insights-for-you.github.io/api/arduino-data";
const char* API_KEY = "your-api-key-here";
const int MAX_RETRIES = 3;
const int RETRY_DELAY = 2000;  // 2 seconds

// Data structure for health metrics
struct HealthMetrics {
  unsigned long timestamp;
  int heartRate;
  int movementLevel;
  float proximity;
  bool circuitActive;
  float temperature;
  int pulseRaw;
  int irRaw;
  int irFiltered;
  String deviceId;
  String sessionId;
  int batteryLevel;
  int signalStrength;
};

HealthMetrics currentMetrics;
String deviceId = "ARDUINO_001";
String sessionId = "";

// Data buffer for offline operation
const int BUFFER_SIZE = 50;
HealthMetrics dataBuffer[BUFFER_SIZE];
int bufferIndex = 0;
int bufferCount = 0;

// Connection status
bool wifiConnected = false;
bool apiConnected = false;
unsigned long lastTransmission = 0;
const unsigned long TRANSMISSION_INTERVAL = 5000;  // 5 seconds

void setup() {
  Serial.begin(115200);
  
  // Initialize device ID and session
  generateSessionId();
  
  // Initialize WiFi
  initializeWiFi();
  
  // Initialize data buffer
  initializeBuffer();
  
  Serial.println("Arduino JSON API Client initialized");
  Serial.println("Device ID: " + deviceId);
  Serial.println("Session ID: " + sessionId);
}

void loop() {
  // Collect sensor data
  collectHealthData();
  
  // Add to buffer
  addToBuffer(currentMetrics);
  
  // Attempt to transmit data
  if (wifiConnected && (millis() - lastTransmission >= TRANSMISSION_INTERVAL)) {
    if (transmitData()) {
      lastTransmission = millis();
      clearBuffer();  // Clear buffer on successful transmission
    }
  }
  
  // Handle offline data when connection is restored
  if (wifiConnected && bufferCount > 0) {
    transmitBufferedData();
  }
  
  delay(1000);
}

void initializeWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    wifiConnected = false;
    Serial.println();
    Serial.println("WiFi connection failed");
  }
}

void generateSessionId() {
  // Generate unique session ID
  sessionId = "SESS_" + String(millis()) + "_" + String(random(1000, 9999));
}

void initializeBuffer() {
  bufferIndex = 0;
  bufferCount = 0;
  memset(dataBuffer, 0, sizeof(dataBuffer));
}

void collectHealthData() {
  // Simulate sensor data collection
  // In real implementation, read from actual sensors
  
  currentMetrics.timestamp = millis();
  currentMetrics.heartRate = 70 + random(-10, 20);  // 60-90 BPM
  currentMetrics.movementLevel = random(0, 100);
  currentMetrics.proximity = 5.0 + random(0, 150) / 10.0;  // 5.0-20.0 cm
  currentMetrics.circuitActive = random(0, 2) == 1;
  currentMetrics.temperature = 36.5 + random(-10, 20) / 10.0;  // 35.5-38.5°C
  currentMetrics.pulseRaw = random(400, 800);
  currentMetrics.irRaw = random(100, 900);
  currentMetrics.irFiltered = currentMetrics.irRaw + random(-10, 10);
  currentMetrics.deviceId = deviceId;
  currentMetrics.sessionId = sessionId;
  currentMetrics.batteryLevel = random(80, 100);
  currentMetrics.signalStrength = WiFi.RSSI();
}

void addToBuffer(HealthMetrics data) {
  if (bufferCount < BUFFER_SIZE) {
    dataBuffer[bufferCount] = data;
    bufferCount++;
  } else {
    // Buffer full, overwrite oldest data
    dataBuffer[bufferIndex] = data;
    bufferIndex = (bufferIndex + 1) % BUFFER_SIZE;
  }
}

bool transmitData() {
  // Create JSON document
  StaticJsonDocument<1024> doc;
  
  // Add health data
  doc["timestamp"] = currentMetrics.timestamp;
  doc["deviceId"] = currentMetrics.deviceId;
  doc["sessionId"] = currentMetrics.sessionId;
  doc["heartRate"] = currentMetrics.heartRate;
  doc["movement"] = currentMetrics.movementLevel;
  doc["proximity"] = currentMetrics.proximity;
  doc["circuitActive"] = currentMetrics.circuitActive;
  doc["temperature"] = currentMetrics.temperature;
  doc["pulseRaw"] = currentMetrics.pulseRaw;
  doc["irSensor"]["raw"] = currentMetrics.irRaw;
  doc["irSensor"]["filtered"] = currentMetrics.irFiltered;
  doc["batteryLevel"] = currentMetrics.batteryLevel;
  doc["signalStrength"] = currentMetrics.signalStrength;
  
  // Add metadata
  doc["apiVersion"] = "1.0";
  doc["dataType"] = "health_metrics";
  doc["transmissionTime"] = millis();
  
  // Serialize JSON
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send HTTP POST request
  return sendHttpPost(jsonString);
}

bool sendHttpPost(String jsonData) {
  HTTPClient http;
  
  // Configure HTTP client
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + String(API_KEY));
  http.addHeader("User-Agent", "Arduino-Health-Monitor/1.0");
  http.addHeader("X-Device-ID", deviceId);
  http.addHeader("X-Session-ID", sessionId);
  
  // Set timeout
  http.setTimeout(10000);  // 10 seconds
  
  // Send POST request
  int httpResponseCode = http.POST(jsonData);
  
  // Check response
  if (httpResponseCode > 0) {
    String response = http.getString();
    
    if (httpResponseCode == 200) {
      Serial.println("Data transmitted successfully");
      Serial.println("Response: " + response);
      apiConnected = true;
      http.end();
      return true;
    } else {
      Serial.print("HTTP Error: ");
      Serial.println(httpResponseCode);
      Serial.println("Response: " + response);
      apiConnected = false;
    }
  } else {
    Serial.print("HTTP Request failed: ");
    Serial.println(httpResponseCode);
    apiConnected = false;
  }
  
  http.end();
  return false;
}

void transmitBufferedData() {
  Serial.println("Transmitting buffered data...");
  
  for (int i = 0; i < bufferCount; i++) {
    // Create JSON for buffered data
    StaticJsonDocument<1024> doc;
    
    doc["timestamp"] = dataBuffer[i].timestamp;
    doc["deviceId"] = dataBuffer[i].deviceId;
    doc["sessionId"] = dataBuffer[i].sessionId;
    doc["heartRate"] = dataBuffer[i].heartRate;
    doc["movement"] = dataBuffer[i].movementLevel;
    doc["proximity"] = dataBuffer[i].proximity;
    doc["circuitActive"] = dataBuffer[i].circuitActive;
    doc["temperature"] = dataBuffer[i].temperature;
    doc["pulseRaw"] = dataBuffer[i].pulseRaw;
    doc["irSensor"]["raw"] = dataBuffer[i].irRaw;
    doc["irSensor"]["filtered"] = dataBuffer[i].irFiltered;
    doc["batteryLevel"] = dataBuffer[i].batteryLevel;
    doc["signalStrength"] = dataBuffer[i].signalStrength;
    doc["apiVersion"] = "1.0";
    doc["dataType"] = "health_metrics";
    doc["transmissionTime"] = millis();
    doc["buffered"] = true;  // Mark as buffered data
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    if (sendHttpPost(jsonString)) {
      Serial.println("Buffered data transmitted: " + String(i + 1) + "/" + String(bufferCount));
      delay(100);  // Small delay between transmissions
    } else {
      Serial.println("Failed to transmit buffered data");
      break;
    }
  }
  
  clearBuffer();
}

void clearBuffer() {
  bufferIndex = 0;
  bufferCount = 0;
  Serial.println("Data buffer cleared");
}

// Utility functions
void printJsonData(HealthMetrics data) {
  Serial.println("=== HEALTH DATA ===");
  Serial.print("Timestamp: ");
  Serial.println(data.timestamp);
  Serial.print("Device ID: ");
  Serial.println(data.deviceId);
  Serial.print("Session ID: ");
  Serial.println(data.sessionId);
  Serial.print("Heart Rate: ");
  Serial.print(data.heartRate);
  Serial.println(" BPM");
  Serial.print("Movement: ");
  Serial.print(data.movementLevel);
  Serial.println("%");
  Serial.print("Proximity: ");
  Serial.print(data.proximity, 1);
  Serial.println(" cm");
  Serial.print("Circuit: ");
  Serial.println(data.circuitActive ? "CLOSED" : "OPEN");
  Serial.print("Temperature: ");
  Serial.print(data.temperature, 1);
  Serial.println("°C");
  Serial.print("Battery: ");
  Serial.print(data.batteryLevel);
  Serial.println("%");
  Serial.print("Signal: ");
  Serial.print(data.signalStrength);
  Serial.println(" dBm");
  Serial.println("==================");
}

void checkConnectionStatus() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiConnected) {
      wifiConnected = true;
      Serial.println("WiFi reconnected!");
    }
  } else {
    if (wifiConnected) {
      wifiConnected = false;
      Serial.println("WiFi disconnected!");
    }
  }
}

// Error handling
void handleTransmissionError(int errorCode) {
  Serial.print("Transmission error: ");
  Serial.println(errorCode);
  
  switch (errorCode) {
    case -1:
      Serial.println("Connection refused");
      break;
    case -2:
      Serial.println("Send header failed");
      break;
    case -3:
      Serial.println("Send payload failed");
      break;
    case -4:
      Serial.println("Not connected");
      break;
    case -5:
      Serial.println("Connection lost");
      break;
    case -6:
      Serial.println("No stream");
      break;
    case -7:
      Serial.println("No HTTP server");
      break;
    case -8:
      Serial.println("Too many redirects");
      break;
    case -9:
      Serial.println("Connection refused");
      break;
    case -10:
      Serial.println("Connection refused");
      break;
    case -11:
      Serial.println("Connection refused");
      break;
    case -12:
      Serial.println("Connection refused");
      break;
    default:
      Serial.println("Unknown error");
      break;
  }
}

// Configuration management
void updateConfiguration(String configJson) {
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, configJson);
  
  if (error) {
    Serial.print("Config parsing failed: ");
    Serial.println(error.c_str());
    return;
  }
  
  // Update configuration parameters
  if (doc.containsKey("transmissionInterval")) {
    TRANSMISSION_INTERVAL = doc["transmissionInterval"];
    Serial.println("Updated transmission interval: " + String(TRANSMISSION_INTERVAL));
  }
  
  if (doc.containsKey("apiEndpoint")) {
    API_ENDPOINT = doc["apiEndpoint"].as<String>().c_str();
    Serial.println("Updated API endpoint: " + String(API_ENDPOINT));
  }
  
  if (doc.containsKey("deviceId")) {
    deviceId = doc["deviceId"].as<String>();
    Serial.println("Updated device ID: " + deviceId);
  }
}

// Health check endpoint
void sendHealthCheck() {
  StaticJsonDocument<256> doc;
  
  doc["deviceId"] = deviceId;
  doc["sessionId"] = sessionId;
  doc["status"] = "healthy";
  doc["uptime"] = millis();
  doc["wifiConnected"] = wifiConnected;
  doc["apiConnected"] = apiConnected;
  doc["bufferCount"] = bufferCount;
  doc["batteryLevel"] = currentMetrics.batteryLevel;
  doc["signalStrength"] = currentMetrics.signalStrength;
  doc["timestamp"] = millis();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send to health check endpoint
  String healthEndpoint = String(API_ENDPOINT) + "/health";
  HTTPClient http;
  http.begin(healthEndpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + String(API_KEY));
  
  int responseCode = http.POST(jsonString);
  http.end();
  
  Serial.println("Health check sent: " + String(responseCode));
}
