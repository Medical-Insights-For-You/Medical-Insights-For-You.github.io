/*
 * Enhanced Arduino Health Monitoring System
 * 
 * Hardware Components:
 * - Arduino Uno/Nano
 * - IR Sensor (GP2Y0A21YK0F) - Proximity detection
 * - Hue Light Strip (WS2812B) - Visual feedback
 * - Metal Tin Plate - Circuit completion
 * - Breadboard and jumper wires
 * - Optional: Pulse sensor, temperature sensor
 * 
 * Features:
 * - Real-time health data collection
 * - Circuit completion detection
 * - Hue light visual feedback
 * - JSON data transmission
 * - Calibration and testing modes
 */

#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>  // For Hue light strip

// Pin definitions
const int IR_SENSOR_PIN = A0;
const int HUE_LIGHT_PIN = 9;
const int CIRCUIT_SENSOR_PIN = 2;
const int PULSE_SENSOR_PIN = A1;  // Optional pulse sensor
const int TEMP_SENSOR_PIN = A2;   // Optional temperature sensor
const int STATUS_LED_PIN = 13;    // Built-in LED for status

// Hue light configuration
#define HUE_LED_COUNT 12
#define HUE_LED_PIN 9
Adafruit_NeoPixel hueStrip(HUE_LED_COUNT, HUE_LED_PIN, NEO_GRB + NEO_KHZ800);

// Data collection variables
struct HealthData {
  unsigned long timestamp;
  int heartRate;
  int movementLevel;
  float proximity;
  bool circuitActive;
  float temperature;
  int pulseRaw;
  int irRaw;
  int irFiltered;
};

HealthData currentData;
unsigned long lastDataSend = 0;
unsigned long lastHeartBeat = 0;
unsigned long lastCalibration = 0;
const unsigned long DATA_INTERVAL = 2000;  // Send data every 2 seconds
const unsigned long CALIBRATION_INTERVAL = 30000;  // Recalibrate every 30 seconds

// Sensor calibration
struct SensorCalibration {
  int irMin;
  int irMax;
  int pulseMin;
  int pulseMax;
  float tempOffset;
};

SensorCalibration calibration;

// Heart rate detection
int heartRateBuffer[10];
int heartRateIndex = 0;
bool heartRateDetected = false;
unsigned long lastPulseTime = 0;
int pulseCount = 0;
unsigned long pulseStartTime = 0;

// Circuit detection
bool lastCircuitState = false;
unsigned long circuitChangeTime = 0;
const unsigned long CIRCUIT_DEBOUNCE = 100;  // 100ms debounce

// System states
enum SystemState {
  STATE_INIT,
  STATE_CALIBRATING,
  STATE_MONITORING,
  STATE_ERROR
};

SystemState currentState = STATE_INIT;

void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(IR_SENSOR_PIN, INPUT);
  pinMode(HUE_LIGHT_PIN, OUTPUT);
  pinMode(CIRCUIT_SENSOR_PIN, INPUT_PULLUP);
  pinMode(PULSE_SENSOR_PIN, INPUT);
  pinMode(TEMP_SENSOR_PIN, INPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  
  // Initialize Hue light strip
  hueStrip.begin();
  hueStrip.setBrightness(50);
  hueStrip.show();
  
  // Initialize data structure
  memset(&currentData, 0, sizeof(currentData));
  memset(&calibration, 0, sizeof(calibration));
  
  // Wait for serial connection
  while (!Serial) {
    delay(10);
  }
  
  Serial.println("Enhanced Arduino Health Monitor v2.0");
  Serial.println("Initializing system...");
  
  // Start calibration
  currentState = STATE_CALIBRATING;
  calibrateSensors();
  
  // Initialize heart rate buffer
  for (int i = 0; i < 10; i++) {
    heartRateBuffer[i] = 70;  // Default heart rate
  }
  
  Serial.println("System ready. Starting health monitoring...");
  currentState = STATE_MONITORING;
  
  // Show startup sequence on Hue lights
  startupSequence();
}

void loop() {
  switch (currentState) {
    case STATE_INIT:
      handleInit();
      break;
    case STATE_CALIBRATING:
      handleCalibration();
      break;
    case STATE_MONITORING:
      handleMonitoring();
      break;
    case STATE_ERROR:
      handleError();
      break;
  }
  
  // Update Hue lights based on system state
  updateHueLights();
  
  // Small delay to prevent overwhelming the system
  delay(50);
}

void handleInit() {
  // Initialization complete, move to calibration
  currentState = STATE_CALIBRATING;
}

void handleCalibration() {
  // Perform sensor calibration
  calibrateSensors();
  currentState = STATE_MONITORING;
}

void handleMonitoring() {
  // Collect sensor data
  collectSensorData();
  
  // Process heart rate
  processHeartRate();
  
  // Check circuit status
  checkCircuitStatus();
  
  // Send data if interval has passed
  if (millis() - lastDataSend >= DATA_INTERVAL) {
    sendHealthData();
    lastDataSend = millis();
  }
  
  // Recalibrate periodically
  if (millis() - lastCalibration >= CALIBRATION_INTERVAL) {
    currentState = STATE_CALIBRATING;
  }
}

void handleError() {
  // Error state - blink status LED and show error on Hue lights
  digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
  
  // Try to recover after 5 seconds
  if (millis() - lastCalibration > 5000) {
    currentState = STATE_CALIBRATING;
  }
}

void collectSensorData() {
  // Read IR sensor
  currentData.irRaw = analogRead(IR_SENSOR_PIN);
  currentData.irFiltered = filterIRReading(currentData.irRaw);
  
  // Convert to proximity (cm)
  currentData.proximity = mapFloat(currentData.irFiltered, 
                                  calibration.irMin, calibration.irMax, 
                                  20.0, 5.0);
  currentData.proximity = constrain(currentData.proximity, 5.0, 20.0);
  
  // Read pulse sensor (if connected)
  currentData.pulseRaw = analogRead(PULSE_SENSOR_PIN);
  
  // Read temperature sensor (if connected)
  int tempRaw = analogRead(TEMP_SENSOR_PIN);
  currentData.temperature = (tempRaw * 5.0 / 1024.0 - 0.5) * 100.0 + calibration.tempOffset;
  
  // Calculate movement level based on IR sensor variation
  static int lastIrReading = currentData.irRaw;
  int movement = abs(currentData.irRaw - lastIrReading);
  currentData.movementLevel = map(movement, 0, 50, 0, 100);
  currentData.movementLevel = constrain(currentData.movementLevel, 0, 100);
  lastIrReading = currentData.irRaw;
  
  // Update timestamp
  currentData.timestamp = millis();
}

void processHeartRate() {
  // Enhanced heart rate detection using pulse sensor
  int pulseValue = currentData.pulseRaw;
  static int lastPulseValue = pulseValue;
  static unsigned long lastPulseTime = 0;
  
  // Detect pulse peak (simple threshold method)
  if (pulseValue > 600 && lastPulseValue <= 600) {
    unsigned long currentTime = millis();
    
    if (currentTime - lastPulseTime > 300) {  // Minimum 200ms between pulses
      pulseCount++;
      
      if (pulseStartTime == 0) {
        pulseStartTime = currentTime;
      }
      
      // Calculate heart rate every 10 seconds
      if (currentTime - pulseStartTime >= 10000) {
        currentData.heartRate = (pulseCount * 60000) / (currentTime - pulseStartTime);
        currentData.heartRate = constrain(currentData.heartRate, 40, 200);
        
        // Update heart rate buffer
        heartRateBuffer[heartRateIndex] = currentData.heartRate;
        heartRateIndex = (heartRateIndex + 1) % 10;
        
        // Reset for next measurement
        pulseCount = 0;
        pulseStartTime = currentTime;
      }
      
      lastPulseTime = currentTime;
    }
  }
  
  lastPulseValue = pulseValue;
  
  // If no pulse detected, use average of buffer
  if (currentData.heartRate == 0) {
    int sum = 0;
    for (int i = 0; i < 10; i++) {
      sum += heartRateBuffer[i];
    }
    currentData.heartRate = sum / 10;
  }
}

void checkCircuitStatus() {
  bool currentCircuitState = digitalRead(CIRCUIT_SENSOR_PIN) == LOW;
  
  // Debounce circuit changes
  if (currentCircuitState != lastCircuitState) {
    if (millis() - circuitChangeTime > CIRCUIT_DEBOUNCE) {
      currentData.circuitActive = currentCircuitState;
      lastCircuitState = currentCircuitState;
      circuitChangeTime = millis();
      
      // Log circuit state change
      Serial.print("Circuit state changed: ");
      Serial.println(currentData.circuitActive ? "CLOSED" : "OPEN");
    }
  }
}

void calibrateSensors() {
  Serial.println("Calibrating sensors...");
  
  // Calibrate IR sensor
  int minReading = 1024;
  int maxReading = 0;
  
  for (int i = 0; i < 100; i++) {
    int reading = analogRead(IR_SENSOR_PIN);
    if (reading < minReading) minReading = reading;
    if (reading > maxReading) maxReading = reading;
    delay(10);
  }
  
  calibration.irMin = minReading;
  calibration.irMax = maxReading;
  
  // Calibrate pulse sensor
  int pulseMin = 1024;
  int pulseMax = 0;
  
  for (int i = 0; i < 50; i++) {
    int reading = analogRead(PULSE_SENSOR_PIN);
    if (reading < pulseMin) pulseMin = reading;
    if (reading > pulseMax) pulseMax = reading;
    delay(20);
  }
  
  calibration.pulseMin = pulseMin;
  calibration.pulseMax = pulseMax;
  
  // Temperature sensor offset (room temperature calibration)
  calibration.tempOffset = 0.0;  // Adjust based on actual room temperature
  
  Serial.print("IR Sensor Range: ");
  Serial.print(calibration.irMin);
  Serial.print(" - ");
  Serial.println(calibration.irMax);
  
  Serial.print("Pulse Sensor Range: ");
  Serial.print(calibration.pulseMin);
  Serial.print(" - ");
  Serial.println(calibration.pulseMax);
  
  lastCalibration = millis();
}

void sendHealthData() {
  // Create JSON document
  StaticJsonDocument<512> doc;
  
  doc["timestamp"] = currentData.timestamp;
  doc["heartRate"] = currentData.heartRate;
  doc["movement"] = currentData.movementLevel;
  doc["proximity"] = currentData.proximity;
  doc["circuitActive"] = currentData.circuitActive;
  doc["temperature"] = currentData.temperature;
  doc["pulseRaw"] = currentData.pulseRaw;
  doc["irSensor"]["raw"] = currentData.irRaw;
  doc["irSensor"]["filtered"] = currentData.irFiltered;
  doc["systemState"] = currentState;
  
  // Send JSON data
  Serial.print("HEALTH_DATA:");
  serializeJson(doc, Serial);
  Serial.println();
  
  // Debug output
  Serial.print("DEBUG: HR=");
  Serial.print(currentData.heartRate);
  Serial.print(" BPM, Movement=");
  Serial.print(currentData.movementLevel);
  Serial.print("%, Proximity=");
  Serial.print(currentData.proximity, 1);
  Serial.print("cm, Circuit=");
  Serial.print(currentData.circuitActive ? "CLOSED" : "OPEN");
  Serial.print(", Temp=");
  Serial.print(currentData.temperature, 1);
  Serial.println("°C");
}

void updateHueLights() {
  // Update Hue lights based on system state and health data
  switch (currentState) {
    case STATE_INIT:
      // Blue during initialization
      setHueColor(0, 0, 255);
      break;
      
    case STATE_CALIBRATING:
      // Yellow during calibration
      setHueColor(255, 255, 0);
      break;
      
    case STATE_MONITORING:
      // Green for normal operation, red for circuit open
      if (currentData.circuitActive) {
        // Circuit closed - green
        setHueColor(0, 255, 0);
      } else {
        // Circuit open - red
        setHueColor(255, 0, 0);
      }
      break;
      
    case STATE_ERROR:
      // Red blinking for error
      static bool errorBlink = false;
      errorBlink = !errorBlink;
      if (errorBlink) {
        setHueColor(255, 0, 0);
      } else {
        setHueColor(0, 0, 0);
      }
      break;
  }
}

void setHueColor(int red, int green, int blue) {
  for (int i = 0; i < HUE_LED_COUNT; i++) {
    hueStrip.setPixelColor(i, red, green, blue);
  }
  hueStrip.show();
}

void startupSequence() {
  // Show startup sequence on Hue lights
  for (int i = 0; i < HUE_LED_COUNT; i++) {
    hueStrip.setPixelColor(i, 0, 0, 255);  // Blue
    hueStrip.show();
    delay(100);
  }
  
  delay(500);
  
  for (int i = 0; i < HUE_LED_COUNT; i++) {
    hueStrip.setPixelColor(i, 0, 255, 0);  // Green
    hueStrip.show();
    delay(50);
  }
  
  delay(500);
  
  // Turn off all lights
  hueStrip.clear();
  hueStrip.show();
}

int filterIRReading(int rawValue) {
  // Simple moving average filter
  static int filterBuffer[5];
  static int filterIndex = 0;
  
  filterBuffer[filterIndex] = rawValue;
  filterIndex = (filterIndex + 1) % 5;
  
  int sum = 0;
  for (int i = 0; i < 5; i++) {
    sum += filterBuffer[i];
  }
  
  return sum / 5;
}

float mapFloat(float value, float inMin, float inMax, float outMin, float outMax) {
  return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

// Test functions
void testHueLights() {
  Serial.println("Testing Hue Lights...");
  
  // Test all colors
  setHueColor(255, 0, 0);    // Red
  delay(500);
  setHueColor(0, 255, 0);    // Green
  delay(500);
  setHueColor(0, 0, 255);    // Blue
  delay(500);
  setHueColor(255, 255, 0);  // Yellow
  delay(500);
  setHueColor(255, 0, 255);  // Magenta
  delay(500);
  setHueColor(0, 255, 255);  // Cyan
  delay(500);
  
  // Turn off
  hueStrip.clear();
  hueStrip.show();
  
  Serial.println("Hue Light test complete");
}

void testSensors() {
  Serial.println("Testing sensors...");
  
  for (int i = 0; i < 10; i++) {
    Serial.print("IR: ");
    Serial.print(analogRead(IR_SENSOR_PIN));
    Serial.print(", Pulse: ");
    Serial.print(analogRead(PULSE_SENSOR_PIN));
    Serial.print(", Temp: ");
    Serial.print(analogRead(TEMP_SENSOR_PIN));
    Serial.print(", Circuit: ");
    Serial.println(digitalRead(CIRCUIT_SENSOR_PIN) ? "OPEN" : "CLOSED");
    delay(1000);
  }
}
