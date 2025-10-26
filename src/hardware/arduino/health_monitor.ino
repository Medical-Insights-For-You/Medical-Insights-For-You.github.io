/*
 * Arduino Health Monitoring System
 * 
 * Hardware Setup:
 * - Arduino Uno/Nano
 * - IR Sensor (GP2Y0A21YK0F) connected to A0
 * - Hue Light Indicator (LED strip) connected to pin 9
 * - Metal tin plate for circuit completion
 * - Breadboard for connections
 * 
 * This code collects health data and sends it via Serial/USB
 * to be processed by the web application.
 */

// Pin definitions
const int IR_SENSOR_PIN = A0;
const int HUE_LIGHT_PIN = 9;
const int CIRCUIT_SENSOR_PIN = 2;

// Variables for data collection
int heartRate = 0;
int movementLevel = 0;
float proximity = 0.0;
bool circuitActive = false;
unsigned long lastHeartBeat = 0;
int heartBeatCount = 0;
unsigned long lastDataSend = 0;
const unsigned long DATA_INTERVAL = 5000; // Send data every 5 seconds

// IR Sensor calibration
const float IR_MIN_DISTANCE = 5.0;  // cm
const float IR_MAX_DISTANCE = 20.0; // cm
const int IR_MIN_RAW = 100;
const int IR_MAX_RAW = 800;

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  
  // Initialize pins
  pinMode(IR_SENSOR_PIN, INPUT);
  pinMode(HUE_LIGHT_PIN, OUTPUT);
  pinMode(CIRCUIT_SENSOR_PIN, INPUT_PULLUP);
  
  // Initialize Hue light (off)
  digitalWrite(HUE_LIGHT_PIN, LOW);
  
  // Wait for serial connection
  while (!Serial) {
    delay(10);
  }
  
  Serial.println("Arduino Health Monitor Initialized");
  Serial.println("Ready to collect health data...");
}

void loop() {
  // Read sensor data
  readSensors();
  
  // Process heart rate detection
  processHeartRate();
  
  // Check circuit status
  checkCircuitStatus();
  
  // Send data to web application
  if (millis() - lastDataSend >= DATA_INTERVAL) {
    sendHealthData();
    lastDataSend = millis();
  }
  
  // Small delay to prevent overwhelming the system
  delay(100);
}

void readSensors() {
  // Read IR sensor for proximity and movement
  int irRaw = analogRead(IR_SENSOR_PIN);
  
  // Convert IR reading to distance (cm)
  proximity = map(irRaw, IR_MIN_RAW, IR_MAX_RAW, IR_MAX_DISTANCE, IR_MIN_DISTANCE);
  proximity = constrain(proximity, IR_MIN_DISTANCE, IR_MAX_DISTANCE);
  
  // Calculate movement level based on IR sensor variation
  static int lastIrReading = irRaw;
  int movement = abs(irRaw - lastIrReading);
  movementLevel = map(movement, 0, 100, 0, 100);
  movementLevel = constrain(movementLevel, 0, 100);
  lastIrReading = irRaw;
}

void processHeartRate() {
  // Simulate heart rate detection based on proximity changes
  // In a real implementation, you would use a pulse sensor or ECG module
  
  static unsigned long lastHeartRateUpdate = 0;
  static int heartRateVariation = 0;
  
  if (millis() - lastHeartRateUpdate >= 1000) {
    // Simulate heart rate based on movement and proximity
    int baseRate = 70;
    int variation = map(movementLevel, 0, 100, -10, 20);
    heartRateVariation += random(-2, 3);
    heartRateVariation = constrain(heartRateVariation, -15, 15);
    
    heartRate = baseRate + variation + heartRateVariation;
    heartRate = constrain(heartRate, 50, 120);
    
    lastHeartRateUpdate = millis();
  }
}

void checkCircuitStatus() {
  // Check if the circuit is completed (Hue light on metal surface)
  // This would typically involve checking if the metal plate completes a circuit
  // For simulation, we'll use a simple digital read
  
  circuitActive = digitalRead(CIRCUIT_SENSOR_PIN) == LOW;
  
  // Control Hue light based on circuit status
  if (circuitActive) {
    // Circuit is complete - light should be on
    analogWrite(HUE_LIGHT_PIN, 255); // Full brightness
  } else {
    // Circuit is open - light should be off
    analogWrite(HUE_LIGHT_PIN, 0);
  }
}

void sendHealthData() {
  // Create JSON-like data structure
  Serial.print("HEALTH_DATA:");
  Serial.print("{");
  Serial.print("\"timestamp\":");
  Serial.print(millis());
  Serial.print(",\"heartRate\":");
  Serial.print(heartRate);
  Serial.print(",\"movement\":");
  Serial.print(movementLevel);
  Serial.print(",\"proximity\":");
  Serial.print(proximity, 1);
  Serial.print(",\"circuitActive\":");
  Serial.print(circuitActive ? "true" : "false");
  Serial.print(",\"irSensor\":{");
  Serial.print("\"raw\":");
  Serial.print(analogRead(IR_SENSOR_PIN));
  Serial.print(",\"filtered\":");
  Serial.print(analogRead(IR_SENSOR_PIN));
  Serial.print("}");
  Serial.print("}");
  Serial.println();
  
  // Debug output
  Serial.print("DEBUG: HR=");
  Serial.print(heartRate);
  Serial.print(" BPM, Movement=");
  Serial.print(movementLevel);
  Serial.print("%, Proximity=");
  Serial.print(proximity, 1);
  Serial.print("cm, Circuit=");
  Serial.println(circuitActive ? "CLOSED" : "OPEN");
}

// Additional utility functions
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
  
  Serial.print("IR Sensor Range: ");
  Serial.print(minReading);
  Serial.print(" - ");
  Serial.println(maxReading);
}

void testHueLight() {
  Serial.println("Testing Hue Light...");
  
  for (int brightness = 0; brightness <= 255; brightness += 10) {
    analogWrite(HUE_LIGHT_PIN, brightness);
    delay(50);
  }
  
  for (int brightness = 255; brightness >= 0; brightness -= 10) {
    analogWrite(HUE_LIGHT_PIN, brightness);
    delay(50);
  }
  
  digitalWrite(HUE_LIGHT_PIN, LOW);
  Serial.println("Hue Light test complete");
}
