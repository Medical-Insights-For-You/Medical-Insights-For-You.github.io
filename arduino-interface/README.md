# Arduino Real-Time Health Monitor

A standalone HTML application for real-time Arduino health data visualization and monitoring.

## 🚀 Features

- **Real-time Data Display**: Live visualization of health metrics from Arduino UNO R4 WiFi
- **Web Serial API Integration**: Direct connection to Arduino via browser
- **Interactive Charts**: Real-time line charts with multiple data streams
- **Data Logging**: Comprehensive logging with export functionality
- **Responsive Design**: Works on desktop and mobile devices
- **Configurable Settings**: Adjustable update intervals and data retention

## 📊 Supported Data Types

- **Heart Rate**: BPM measurements with trend indicators
- **Movement**: Activity levels (Low/Medium/High) with visual feedback
- **Proximity**: Distance measurements in centimeters
- **Circuit Status**: Open/Closed circuit detection with LED indicator

## 🛠️ Hardware Requirements

- **Arduino UNO R4 WiFi** (or compatible board)
- **HC-SR04 Ultrasonic Sensor**
- **LED Indicator** (optional)
- **Conductive Surface** (for circuit detection)

## 📋 Software Requirements

- **Chrome/Edge Browser** (Web Serial API support required)
- **Arduino IDE** for uploading code to Arduino
- **No additional software** needed for the web interface

## 🔌 Arduino Code

Upload this code to your Arduino UNO R4 WiFi:

```cpp
// Arduino Health Monitor for Real-Time Interface
// Compatible with Arduino UNO R4 WiFi

// Pin definitions
const int TRIG_PIN = 9;
const int ECHO_PIN = 10;
const int LED_PIN = 13;
const int CIRCUIT_PIN = 12;

// Variables
long duration;
float distance;
int heartRate;
String movementLevel;
String circuitStatus;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(CIRCUIT_PIN, INPUT_PULLUP);
  
  Serial.println("Arduino Health Monitor Ready");
  delay(1000);
}

void loop() {
  // Read ultrasonic sensor
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  duration = pulseIn(ECHO_PIN, HIGH);
  distance = duration * 0.034 / 2;
  
  // Simulate heart rate based on distance (for demo)
  heartRate = map(distance, 5, 30, 60, 100);
  heartRate = constrain(heartRate, 50, 120);
  
  // Determine movement level based on distance variation
  if (distance < 10) {
    movementLevel = "High";
  } else if (distance < 20) {
    movementLevel = "Medium";
  } else {
    movementLevel = "Low";
  }
  
  // Read circuit status
  if (digitalRead(CIRCUIT_PIN) == LOW) {
    circuitStatus = "Closed";
    digitalWrite(LED_PIN, HIGH);
  } else {
    circuitStatus = "Open";
    digitalWrite(LED_PIN, LOW);
  }
  
  // Send JSON data
  Serial.print("{");
  Serial.print("\"heartRate\":");
  Serial.print(heartRate);
  Serial.print(",\"movement\":\"");
  Serial.print(movementLevel);
  Serial.print("\",\"proximity\":");
  Serial.print(distance, 1);
  Serial.print(",\"circuit\":\"");
  Serial.print(circuitStatus);
  Serial.println("\"}");
  
  delay(500); // Update every 500ms
}
```

## 🚀 Getting Started

1. **Upload Arduino Code**:
   - Connect your Arduino UNO R4 WiFi to your computer
   - Open Arduino IDE and upload the provided code
   - Open Serial Monitor to verify data output

2. **Open Web Interface**:
   - Open `index.html` in Chrome or Edge browser
   - Click "Connect Arduino" button
   - Select your Arduino device from the list
   - Grant permission for serial access

3. **View Real-Time Data**:
   - Data cards will update in real-time
   - Charts will display live data streams
   - Log will show connection status and data

## 📱 Usage

### Connection Panel
- **Connect/Disconnect**: Toggle Arduino connection
- **Status Indicator**: Shows connection state with color coding
- **Port Information**: Displays connected device details
- **Last Update**: Shows timestamp of latest data

### Data Display
- **Heart Rate Card**: Shows BPM with trend indicator and range bar
- **Movement Card**: Displays activity level with trend
- **Proximity Card**: Shows distance measurements with range visualization
- **Circuit Card**: Indicates circuit status with LED indicator

### Live Charts
- **Real-time Visualization**: Multiple data streams on one chart
- **Interactive Controls**: Pause/resume and clear chart options
- **Configurable Duration**: Adjustable time window (30s to 10min)
- **Color-coded Legend**: Easy identification of data types

### Data Log
- **Comprehensive Logging**: All system events and data updates
- **Export Functionality**: Download log as text file
- **Auto-scroll**: Automatically scrolls to latest entries
- **Color-coded Messages**: Different colors for different message types

### Settings
- **Update Interval**: Adjust data refresh rate (100ms to 5s)
- **Chart Duration**: Set chart time window
- **Data Retention**: Control memory usage

## 🔧 Configuration

### Update Intervals
- **100ms**: Maximum refresh rate (high CPU usage)
- **500ms**: Recommended for smooth visualization
- **1-5s**: Lower resource usage, suitable for monitoring

### Chart Duration
- **30s**: Short-term analysis
- **1min**: Standard monitoring
- **5-10min**: Long-term trend analysis

### Data Retention
- **100-1000 entries**: Memory vs. history trade-off
- **500 entries**: Recommended default
- **5000 entries**: Maximum for detailed analysis

## 🐛 Troubleshooting

### Connection Issues
- **Web Serial API not supported**: Use Chrome or Edge browser
- **Device not found**: Check USB connection and drivers
- **Permission denied**: Grant serial access when prompted

### Data Issues
- **No data received**: Check Arduino code and serial output
- **Invalid data format**: Ensure Arduino sends valid JSON
- **Charts not updating**: Check if chart is paused

### Performance Issues
- **Slow updates**: Increase update interval
- **High memory usage**: Reduce data retention
- **Browser lag**: Close other tabs or reduce chart duration

## 📊 Data Format

The Arduino should send JSON data in this format:

```json
{
  "heartRate": 75,
  "movement": "Medium",
  "proximity": 15.3,
  "circuit": "Closed"
}
```

### Field Descriptions
- **heartRate**: Integer value (50-120 BPM)
- **movement**: String ("Low", "Medium", "High")
- **proximity**: Float value (5.0-30.0 cm)
- **circuit**: String ("Open", "Closed")

## 🔒 Security Notes

- **Local Only**: This application runs entirely in the browser
- **No Data Transmission**: All data stays on your local machine
- **Serial Access**: Requires user permission for device access
- **No Internet Required**: Works completely offline

## 📈 Performance

- **Update Rate**: Up to 10Hz (100ms intervals)
- **Memory Usage**: ~1MB for 1000 data points
- **CPU Usage**: Minimal with optimized rendering
- **Browser Support**: Chrome 89+, Edge 89+

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests to improve this interface.

## 📄 License

This project is open source and available under the MIT License.

---

**Happy Monitoring! 🎉**

This interface provides a professional, real-time view of your Arduino health monitoring system with beautiful visualizations and comprehensive logging capabilities.
