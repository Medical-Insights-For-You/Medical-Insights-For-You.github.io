/*
 * Arduino UNO R4 WiFi - Ultrasonic Health Monitor
 * ABX00087 - ESP32-S3 + RA4M1 with 12x8 LED Matrix, Qwiic, WiFi/Bluetooth
 * 
 * This sketch uses an ultrasonic sensor (HC-SR04) to monitor health parameters
 * and provides visual feedback through LEDs and the built-in LED matrix.
 * 
 * Hardware Setup:
 * - HC-SR04 Ultrasonic Sensor:
 *   - VCC → 5V
 *   - TRIG → Digital Pin 2
 *   - ECHO → Digital Pin 3
 *   - GND → GND
 * - LED (Hue Light Indicator):
 *   - Positive leg → Digital Pin 13
 *   - Negative leg → GND
 * - Metal Plate Detector:
 *   - One wire → Digital Pin 12
 *   - Other wire → GND
 * 
 * Health Monitoring Applications:
 * 1. Distance measurement for posture monitoring
 * 2. Movement detection for activity tracking
 * 3. Proximity sensing for fall detection
 * 4. Breathing pattern detection (chest movement)
 * 5. Heart rate estimation through micro-movements
 */

#include "Arduino_LED_Matrix.h"  // For 12x8 LED Matrix on R4 WiFi

// Pin definitions
const int TRIG_PIN = 2;          // Ultrasonic sensor trigger pin
const int ECHO_PIN = 3;          // Ultrasonic sensor echo pin
const int LED_PIN = 13;          // LED indicator pin
const int METAL_PLATE_PIN = 12;  // Metal plate detector pin

// Variables for health data
float distance = 0;
int heartRate = 0;
String movementLevel = "Low";
String circuitStatus = "Open";
int proximityLevel = 0;

// Ultrasonic sensor variables
unsigned long duration;
float previousDistance = 0;
float distanceChange = 0;

// Timing variables
unsigned long previousMillis = 0;
const long interval = 1000; // Update interval (1 second)

// LED Matrix for status display
ArduinoLEDMatrix matrix;

// LED Matrix patterns for different statuses
byte heartPattern[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,1,1,0,0,0,1,1,0,0,0},
  {0,1,1,1,1,0,1,1,1,1,0,0},
  {0,1,1,1,1,1,1,1,1,1,0,0},
  {0,0,1,1,1,1,1,1,1,0,0,0},
  {0,0,0,1,1,1,1,1,0,0,0,0},
  {0,0,0,0,1,1,1,0,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0}
};

byte movementPattern[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,1,0,0,0,0,1,0,0,0},
  {0,0,1,1,1,0,0,1,1,1,0,0},
  {0,1,1,1,1,1,1,1,1,1,1,0},
  {0,1,1,1,1,1,1,1,1,1,1,0},
  {0,0,1,1,1,1,1,1,1,1,0,0},
  {0,0,0,1,1,1,1,1,1,0,0,0},
  {0,0,0,0,1,1,1,1,0,0,0,0}
};

byte warningPattern[8][12] = {
  {0,0,0,1,1,1,1,1,0,0,0,0},
  {0,0,1,1,1,1,1,1,1,0,0,0},
  {0,1,1,0,0,1,0,0,1,1,0,0},
  {0,1,0,0,0,1,0,0,0,1,0,0},
  {0,1,0,0,0,1,0,0,0,1,0,0},
  {0,1,1,0,0,1,0,0,1,1,0,0},
  {0,0,1,1,1,1,1,1,1,0,0,0},
  {0,0,0,1,1,1,1,1,0,0,0,0}
};

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  
  // Initialize LED Matrix
  matrix.begin();
  
  // Set pin modes
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(METAL_PLATE_PIN, INPUT_PULLUP);
  
  // Initialize LED Matrix with startup pattern
  matrix.renderBitmap(heartPattern);
  
  Serial.println("Arduino UNO R4 WiFi - Ultrasonic Health Monitor Initialized");
  Serial.println("Hardware: HC-SR04 Ultrasonic Sensor + LED + Metal Plate Detector");
  Serial.println("Features: Distance measurement, movement detection, health monitoring");
}

void loop() {
  unsigned long currentMillis = millis();
  
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    
    // Read ultrasonic sensor
    readUltrasonicSensor();
    
    // Analyze health data
    analyzeHealthData();
    
    // Update LED Matrix display
    updateLEDMatrix();
    
    // Check metal plate circuit
    checkMetalPlateCircuit();
    
    // Output JSON data
    outputHealthData();
  }
}

void readUltrasonicSensor() {
  // Clear the trigger pin
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  
  // Send 10 microsecond pulse to trigger pin
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Read the echo pin and calculate distance
  duration = pulseIn(ECHO_PIN, HIGH);
  distance = duration * 0.034 / 2; // Speed of sound = 343 m/s = 0.034 cm/μs
  
  // Calculate distance change for movement detection
  distanceChange = abs(distance - previousDistance);
  previousDistance = distance;
  
  // Convert distance to proximity level (0-100)
  proximityLevel = map(constrain(distance, 2, 50), 2, 50, 100, 0);
}

void analyzeHealthData() {
  // Movement detection based on distance changes
  if (distanceChange > 5) {
    movementLevel = "High";
  } else if (distanceChange > 2) {
    movementLevel = "Medium";
  } else {
    movementLevel = "Low";
  }
  
  // Simulate heart rate based on micro-movements
  // In a real application, this would use more sophisticated algorithms
  if (distanceChange > 0.5 && distanceChange < 2) {
    heartRate = map(distanceChange * 100, 50, 200, 60, 120);
  } else {
    heartRate = random(70, 85); // Baseline heart rate
  }
  
  // Health status based on distance (posture monitoring)
  if (distance < 10) {
    // Too close - potential posture issue
    movementLevel = "Warning";
  } else if (distance > 40) {
    // Too far - user may have moved away
    movementLevel = "Away";
  }
}

void updateLEDMatrix() {
  // Display different patterns based on health status
  if (movementLevel == "High") {
    matrix.renderBitmap(movementPattern);
  } else if (movementLevel == "Warning" || movementLevel == "Away") {
    matrix.renderBitmap(warningPattern);
  } else {
    matrix.renderBitmap(heartPattern);
  }
  
  // Blink LED based on heart rate
  if (heartRate > 0) {
    int blinkDelay = map(heartRate, 60, 120, 1000, 500); // Slower for lower HR
    digitalWrite(LED_PIN, HIGH);
    delay(50);
    digitalWrite(LED_PIN, LOW);
  }
}

void checkMetalPlateCircuit() {
  // Check if metal plate circuit is closed
  if (digitalRead(METAL_PLATE_PIN) == LOW) {
    circuitStatus = "Closed";
    // Turn on LED when circuit is closed
    digitalWrite(LED_PIN, HIGH);
  } else {
    circuitStatus = "Open";
    // LED will be controlled by heart rate blinking
  }
}

void outputHealthData() {
  // Output data as JSON for web platform
  Serial.print("{");
  Serial.print("\"distance\":");
  Serial.print(distance, 2);
  Serial.print(",\"heartRate\":");
  Serial.print(heartRate);
  Serial.print(",\"movement\":\"");
  Serial.print(movementLevel);
  Serial.print("\",\"proximity\":");
  Serial.print(proximityLevel);
  Serial.print(",\"circuit\":\"");
  Serial.print(circuitStatus);
  Serial.print("\",\"timestamp\":");
  Serial.print(millis());
  Serial.println("}");
}

// Additional functions for advanced health monitoring

void detectBreathingPattern() {
  // Analyze distance changes over time to detect breathing
  static float breathingBuffer[10];
  static int bufferIndex = 0;
  
  breathingBuffer[bufferIndex] = distance;
  bufferIndex = (bufferIndex + 1) % 10;
  
  // Calculate breathing rate (simplified)
  float breathingVariation = 0;
  for (int i = 1; i < 10; i++) {
    breathingVariation += abs(breathingBuffer[i] - breathingBuffer[i-1]);
  }
  
  if (breathingVariation > 1.0) {
    // Breathing detected
    Serial.println("Breathing pattern detected");
  }
}

void fallDetection() {
  // Detect sudden distance changes that might indicate a fall
  static float lastDistance = 0;
  static unsigned long lastTime = 0;
  
  if (millis() - lastTime > 100) { // Check every 100ms
    float distanceChange = abs(distance - lastDistance);
    
    if (distanceChange > 20) { // Sudden large change
      Serial.println("ALERT: Potential fall detected!");
      // Flash LED rapidly
      for (int i = 0; i < 10; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(100);
        digitalWrite(LED_PIN, LOW);
        delay(100);
      }
    }
    
    lastDistance = distance;
    lastTime = millis();
  }
}

// WiFi functionality (for future implementation)
void setupWiFi() {
  // TODO: Implement WiFi connectivity for wireless data transmission
  // This would allow the Arduino to send data directly to the web platform
  Serial.println("WiFi setup - To be implemented");
}

void sendDataToWeb() {
  // TODO: Send health data to web platform via WiFi
  Serial.println("Sending data to web platform - To be implemented");
}
