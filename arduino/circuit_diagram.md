# Arduino Health Monitor Circuit Diagram

## Hardware Components Required

### Essential Components
- **Arduino Uno/Nano** - Main microcontroller
- **IR Sensor (GP2Y0A21YK0F)** - Proximity detection (5-80cm range)
- **WS2812B LED Strip** - Hue light indicator (12 LEDs)
- **Metal Tin Plate** - Conductive surface for circuit completion
- **Breadboard** - For component connections
- **Jumper Wires** - For electrical connections
- **Resistors** - 220Ω (for LED strip), 10kΩ (pull-up)

### Optional Components
- **Pulse Sensor** - Heart rate detection
- **Temperature Sensor (LM35)** - Body temperature monitoring
- **Status LED** - System status indicator

## Circuit Connections

### Arduino Pin Assignments
```
Arduino Uno/Nano Pinout:
┌─────────────────────────────────┐
│  [USB]    [POWER]    [ANALOG]   │
│                                 │
│  D13  D12  D11  D10  D9   D8    │
│  D7   D6   D5   D4   D3   D2    │
│  D1   D0   GND  AREF A0   A1    │
│  A2   A3   A4   A5   GND  VIN   │
│                                 │
│  [DIGITAL]    [POWER]    [USB]  │
└─────────────────────────────────┘
```

### Wiring Diagram
```
                    Arduino Uno
                    ┌─────────┐
                    │         │
IR Sensor           │    A0   │ ←── Signal (Yellow)
├─ VCC (Red)    ────│   5V    │
├─ GND (Black)  ────│   GND   │
└─ Signal (Yellow)  │         │
                    │         │
Pulse Sensor        │    A1   │ ←── Signal (Yellow)
├─ VCC (Red)    ────│   5V    │
├─ GND (Black)  ────│   GND   │
└─ Signal (Yellow)  │         │
                    │         │
Temp Sensor         │    A2   │ ←── Signal (Yellow)
├─ VCC (Red)    ────│   5V    │
├─ GND (Black)  ────│   GND   │
└─ Signal (Yellow)  │         │
                    │         │
Circuit Sensor      │    D2   │ ←── Signal (Yellow)
├─ Signal (Yellow)  │         │
└─ GND (Black)  ────│   GND   │
                    │         │
Hue Light Strip     │    D9   │ ←── Data (Green)
├─ Data (Green)     │         │
├─ VCC (Red)    ────│   5V    │
└─ GND (Black)  ────│   GND   │
                    │         │
Status LED          │   D13   │ ←── Anode (+)
├─ Anode (+)        │         │
└─ Cathode (-)  ────│   GND   │
                    │         │
                    └─────────┘
```

## Detailed Connection Guide

### 1. IR Sensor (GP2Y0A21YK0F)
```
IR Sensor    Arduino
─────────    ───────
VCC (Red)    → 5V
GND (Black)  → GND
Signal       → A0
```

### 2. Hue Light Strip (WS2812B)
```
LED Strip    Arduino
─────────    ───────
Data (Green) → D9
VCC (Red)    → 5V
GND (Black)  → GND
```

### 3. Circuit Detection
```
Metal Plate  Arduino
───────────  ───────
Signal Wire  → D2
Ground Wire  → GND
```

### 4. Pulse Sensor (Optional)
```
Pulse Sensor Arduino
──────────── ───────
VCC (Red)    → 5V
GND (Black)  → GND
Signal       → A1
```

### 5. Temperature Sensor (Optional)
```
Temp Sensor  Arduino
───────────  ───────
VCC (Red)    → 5V
GND (Black)  → GND
Signal       → A2
```

## Circuit Operation

### 1. IR Sensor Circuit
- **Purpose**: Detects proximity and movement
- **Range**: 5-80cm (optimized for 5-20cm)
- **Output**: Analog voltage (0-5V)
- **Processing**: Arduino converts to distance in cm

### 2. Hue Light Circuit
- **Purpose**: Visual feedback system
- **Control**: Digital PWM signal on pin D9
- **Colors**: 
  - Green: Circuit closed, normal operation
  - Red: Circuit open, needs attention
  - Blue: System initializing
  - Yellow: Calibrating sensors

### 3. Circuit Detection
- **Purpose**: Detects when Hue light is on metal surface
- **Method**: Digital input with pull-up resistor
- **Logic**: LOW = circuit closed, HIGH = circuit open
- **Debouncing**: 100ms to prevent false triggers

### 4. Power Distribution
- **Arduino**: Powered via USB or external 7-12V supply
- **Sensors**: 5V from Arduino (max 200mA total)
- **LED Strip**: 5V from Arduino (12 LEDs × 20mA = 240mA)
- **Total Current**: ~500mA (within Arduino limits)

## Safety Considerations

### Electrical Safety
- **Voltage Levels**: All components operate at 5V (safe)
- **Current Limits**: Arduino can supply up to 500mA
- **Short Circuit Protection**: Built into Arduino
- **Grounding**: All components share common ground

### Component Protection
- **Reverse Polarity**: Check connections before powering
- **ESD Protection**: Handle components carefully
- **Heat Dissipation**: LED strip may get warm during operation
- **Moisture**: Keep circuit dry, avoid water contact

## Troubleshooting

### Common Issues

#### 1. IR Sensor Not Working
- **Check**: Power connections (5V, GND)
- **Check**: Signal wire to A0
- **Test**: Use Serial Monitor to read raw values
- **Range**: Ensure object is within 5-80cm

#### 2. Hue Lights Not Working
- **Check**: Data wire to D9
- **Check**: Power connections (5V, GND)
- **Check**: LED strip orientation (arrow points to data)
- **Test**: Run testHueLights() function

#### 3. Circuit Detection Issues
- **Check**: Wire connections to D2 and GND
- **Check**: Metal plate contact
- **Test**: Use digitalRead(D2) to check state
- **Debounce**: Circuit changes may take 100ms to register

#### 4. Serial Communication Problems
- **Check**: USB cable connection
- **Check**: Baud rate (115200)
- **Check**: Serial Monitor settings
- **Test**: Look for "Enhanced Arduino Health Monitor v2.0" message

### Testing Procedures

#### 1. Basic System Test
```cpp
void testAllSensors() {
  Serial.println("=== SENSOR TEST ===");
  Serial.print("IR Sensor: ");
  Serial.println(analogRead(A0));
  Serial.print("Pulse Sensor: ");
  Serial.println(analogRead(A1));
  Serial.print("Temp Sensor: ");
  Serial.println(analogRead(A2));
  Serial.print("Circuit State: ");
  Serial.println(digitalRead(2) ? "OPEN" : "CLOSED");
  Serial.println("==================");
}
```

#### 2. Hue Light Test
```cpp
void testHueLights() {
  // Test all colors
  setHueColor(255, 0, 0);    // Red
  delay(500);
  setHueColor(0, 255, 0);    // Green
  delay(500);
  setHueColor(0, 0, 255);    // Blue
  delay(500);
  setHueColor(0, 0, 0);      // Off
}
```

#### 3. Circuit Test
```cpp
void testCircuit() {
  bool circuitState = digitalRead(2);
  Serial.print("Circuit: ");
  Serial.println(circuitState ? "OPEN" : "CLOSED");
  
  if (!circuitState) {
    setHueColor(0, 255, 0);  // Green
  } else {
    setHueColor(255, 0, 0);  // Red
  }
}
```

## Performance Optimization

### 1. Sensor Reading Frequency
- **IR Sensor**: 20Hz (50ms intervals)
- **Pulse Sensor**: 100Hz (10ms intervals)
- **Temperature**: 1Hz (1 second intervals)
- **Circuit**: Event-driven with debouncing

### 2. Data Transmission
- **JSON Format**: Structured data for web integration
- **Update Rate**: 2 seconds (configurable)
- **Buffer Size**: 512 bytes (sufficient for all data)
- **Error Handling**: Automatic retry and recovery

### 3. Power Management
- **Sleep Mode**: Not implemented (always active)
- **LED Brightness**: 50% to reduce power consumption
- **Sensor Calibration**: Periodic to maintain accuracy
- **Status LED**: Blinks during operation

## Future Enhancements

### Hardware Upgrades
- **Bluetooth Module**: Wireless data transmission
- **Battery Pack**: Portable operation
- **Display**: Local data visualization
- **SD Card**: Data logging capability
- **WiFi Module**: Internet connectivity

### Software Features
- **Machine Learning**: Pattern recognition
- **Data Compression**: Efficient transmission
- **Remote Calibration**: Web-based adjustment
- **Multi-sensor Fusion**: Advanced algorithms
- **Real-time Alerts**: Health monitoring

This circuit provides a solid foundation for affordable health monitoring with room for expansion and customization based on specific needs and budget constraints.
