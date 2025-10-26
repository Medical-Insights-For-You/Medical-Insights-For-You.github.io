/**
 * Arduino Real-Time Interface
 * 
 * This module handles the connection to Arduino UNO R4 WiFi
 * and processes real-time health data from ultrasonic sensors.
 */

class ArduinoInterface {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.isConnected = false;
        this.isReading = false;
        this.updateInterval = 500; // Default 500ms
        this.dataHistory = [];
        this.maxHistoryLength = 1000;
        
        // DOM elements
        this.elements = {
            connectBtn: document.getElementById('connect-btn'),
            connectionIndicator: document.getElementById('connection-indicator'),
            connectionText: document.getElementById('connection-text'),
            portInfo: document.getElementById('port-info'),
            lastUpdate: document.getElementById('last-update'),
            heartRateValue: document.getElementById('heart-rate-value'),
            heartRateTrend: document.getElementById('heart-rate-trend'),
            heartRateBar: document.getElementById('heart-rate-bar'),
            movementValue: document.getElementById('movement-value'),
            movementTrend: document.getElementById('movement-trend'),
            proximityValue: document.getElementById('proximity-value'),
            proximityTrend: document.getElementById('proximity-trend'),
            proximityBar: document.getElementById('proximity-bar'),
            circuitValue: document.getElementById('circuit-value'),
            circuitIndicator: document.getElementById('circuit-indicator'),
            dataLog: document.getElementById('data-log'),
            updateIntervalSelect: document.getElementById('update-interval'),
            dataRetentionSelect: document.getElementById('data-retention')
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkWebSerialSupport();
        this.logMessage('system', 'Arduino Interface initialized. Ready to connect.');
    }
    
    setupEventListeners() {
        // Connection button
        this.elements.connectBtn.addEventListener('click', () => {
            if (this.isConnected) {
                this.disconnect();
            } else {
                this.connect();
            }
        });
        
        // Settings
        this.elements.updateIntervalSelect.addEventListener('change', (e) => {
            this.updateInterval = parseInt(e.target.value);
            this.logMessage('system', `Update interval changed to ${this.updateInterval}ms`);
        });
        
        this.elements.dataRetentionSelect.addEventListener('change', (e) => {
            this.maxHistoryLength = parseInt(e.target.value);
            this.trimHistory();
            this.logMessage('system', `Data retention set to ${this.maxHistoryLength} entries`);
        });
        
        // Chart controls
        document.getElementById('pause-chart')?.addEventListener('click', () => {
            this.toggleChartPause();
        });
        
        document.getElementById('clear-chart')?.addEventListener('click', () => {
            this.clearChart();
        });
        
        // Log controls
        document.getElementById('export-log')?.addEventListener('click', () => {
            this.exportLog();
        });
        
        document.getElementById('clear-log')?.addEventListener('click', () => {
            this.clearLog();
        });
    }
    
    checkWebSerialSupport() {
        if (!('serial' in navigator)) {
            this.logMessage('error', 'Web Serial API not supported in this browser. Please use Chrome or Edge.');
            this.elements.connectBtn.disabled = true;
            this.elements.connectBtn.textContent = 'Not Supported';
        }
    }
    
    async connect() {
        try {
            this.updateConnectionStatus('connecting', 'Connecting...');
            this.logMessage('system', 'Initiating connection to Arduino...');
            
            // Request port access
            this.port = await navigator.serial.requestPort();
            
            // Open the port
            await this.port.open({ baudRate: 9600 });
            this.logMessage('success', `Connected to port: ${this.port.getInfo().usbProductId || 'Unknown'}`);
            
            // Set up reader and writer
            this.reader = this.port.readable.getReader();
            this.writer = this.port.writable.getWriter();
            
            this.isConnected = true;
            this.updateConnectionStatus('connected', 'Connected');
            this.elements.connectBtn.innerHTML = '<ion-icon name="close-outline"></ion-icon>Disconnect';
            this.elements.portInfo.textContent = this.port.getInfo().usbProductId || 'Connected';
            
            // Start reading data
            this.startReading();
            
        } catch (error) {
            this.logMessage('error', `Connection failed: ${error.message}`);
            this.updateConnectionStatus('disconnected', 'Connection Failed');
            this.isConnected = false;
        }
    }
    
    async disconnect() {
        try {
            this.isReading = false;
            
            if (this.reader) {
                await this.reader.cancel();
                await this.reader.releaseLock();
                this.reader = null;
            }
            
            if (this.writer) {
                await this.writer.releaseLock();
                this.writer = null;
            }
            
            if (this.port) {
                await this.port.close();
                this.port = null;
            }
            
            this.isConnected = false;
            this.updateConnectionStatus('disconnected', 'Disconnected');
            this.elements.connectBtn.innerHTML = '<ion-icon name="link-outline"></ion-icon>Connect Arduino';
            this.elements.portInfo.textContent = 'Not selected';
            
            this.logMessage('system', 'Disconnected from Arduino');
            
        } catch (error) {
            this.logMessage('error', `Disconnect error: ${error.message}`);
        }
    }
    
    async startReading() {
        if (!this.isConnected || this.isReading) return;
        
        this.isReading = true;
        this.logMessage('system', 'Started reading data from Arduino');
        
        try {
            while (this.isReading && this.reader) {
                const { value, done } = await this.reader.read();
                
                if (done) {
                    this.logMessage('system', 'Reader stream ended');
                    break;
                }
                
                // Convert Uint8Array to string
                const dataString = new TextDecoder().decode(value);
                
                // Process each line of data
                const lines = dataString.split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        this.processData(line.trim());
                    }
                }
            }
        } catch (error) {
            if (this.isReading) {
                this.logMessage('error', `Reading error: ${error.message}`);
            }
        }
    }
    
    processData(dataString) {
        try {
            // Try to parse as JSON
            const data = JSON.parse(dataString);
            
            // Validate data structure
            if (this.validateData(data)) {
                this.updateDisplay(data);
                this.addToHistory(data);
                this.updateLastUpdateTime();
                this.logMessage('data', `Received: HR=${data.heartRate}, Movement=${data.movement}, Proximity=${data.proximity}, Circuit=${data.circuit}`);
            } else {
                this.logMessage('error', `Invalid data format: ${dataString}`);
            }
            
        } catch (error) {
            // If not JSON, try to parse as simple format
            this.parseSimpleFormat(dataString);
        }
    }
    
    validateData(data) {
        return data &&
               typeof data.heartRate === 'number' &&
               typeof data.movement === 'string' &&
               typeof data.proximity === 'number' &&
               typeof data.circuit === 'string';
    }
    
    parseSimpleFormat(dataString) {
        // Try to parse simple format like: "75,Medium,15.3,Closed"
        const parts = dataString.split(',');
        if (parts.length >= 4) {
            const data = {
                heartRate: parseInt(parts[0]) || 0,
                movement: parts[1] || 'Unknown',
                proximity: parseFloat(parts[2]) || 0,
                circuit: parts[3] || 'Open',
                timestamp: Date.now()
            };
            
            this.updateDisplay(data);
            this.addToHistory(data);
            this.updateLastUpdateTime();
            this.logMessage('data', `Parsed: ${dataString}`);
        } else {
            this.logMessage('error', `Unparseable data: ${dataString}`);
        }
    }
    
    updateDisplay(data) {
        // Update heart rate
        this.elements.heartRateValue.textContent = data.heartRate;
        this.updateTrend('heart-rate-trend', data.heartRate, 'heartRate');
        this.updateRangeBar('heart-rate-bar', data.heartRate, 50, 120);
        
        // Update movement
        this.elements.movementValue.textContent = data.movement;
        this.updateMovementTrend(data.movement);
        
        // Update proximity
        this.elements.proximityValue.textContent = data.proximity.toFixed(1);
        this.updateTrend('proximity-trend', data.proximity, 'proximity');
        this.updateRangeBar('proximity-bar', data.proximity, 5, 30);
        
        // Update circuit status
        this.elements.circuitValue.textContent = data.circuit;
        this.updateCircuitIndicator(data.circuit);
    }
    
    updateTrend(elementId, currentValue, dataType) {
        const trendElement = document.getElementById(elementId);
        if (!trendElement) return;
        
        const history = this.dataHistory.filter(d => d[dataType] !== undefined);
        if (history.length < 2) {
            trendElement.className = 'trend-indicator stable';
            trendElement.innerHTML = '<ion-icon name="remove-outline"></ion-icon>';
            return;
        }
        
        const previousValue = history[history.length - 2][dataType];
        const difference = currentValue - previousValue;
        const threshold = dataType === 'heartRate' ? 5 : (dataType === 'proximity' ? 2 : 0);
        
        if (Math.abs(difference) < threshold) {
            trendElement.className = 'trend-indicator stable';
            trendElement.innerHTML = '<ion-icon name="remove-outline"></ion-icon>';
        } else if (difference > 0) {
            trendElement.className = 'trend-indicator up';
            trendElement.innerHTML = '<ion-icon name="trending-up-outline"></ion-icon>';
        } else {
            trendElement.className = 'trend-indicator down';
            trendElement.innerHTML = '<ion-icon name="trending-down-outline"></ion-icon>';
        }
    }
    
    updateMovementTrend(movement) {
        const trendElement = this.elements.movementTrend;
        const movementLevels = { 'Low': 1, 'Medium': 2, 'High': 3 };
        
        if (this.dataHistory.length < 2) {
            trendElement.className = 'trend-indicator stable';
            trendElement.innerHTML = '<ion-icon name="remove-outline"></ion-icon>';
            return;
        }
        
        const currentLevel = movementLevels[movement] || 0;
        const previousMovement = this.dataHistory[this.dataHistory.length - 2].movement;
        const previousLevel = movementLevels[previousMovement] || 0;
        
        if (currentLevel > previousLevel) {
            trendElement.className = 'trend-indicator up';
            trendElement.innerHTML = '<ion-icon name="trending-up-outline"></ion-icon>';
        } else if (currentLevel < previousLevel) {
            trendElement.className = 'trend-indicator down';
            trendElement.innerHTML = '<ion-icon name="trending-down-outline"></ion-icon>';
        } else {
            trendElement.className = 'trend-indicator stable';
            trendElement.innerHTML = '<ion-icon name="remove-outline"></ion-icon>';
        }
    }
    
    updateRangeBar(elementId, value, min, max) {
        const barElement = document.getElementById(elementId);
        if (!barElement) return;
        
        const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
        barElement.style.width = `${percentage}%`;
    }
    
    updateCircuitIndicator(circuit) {
        const lightBulb = this.elements.circuitIndicator.querySelector('.light-bulb');
        if (lightBulb) {
            if (circuit === 'Closed') {
                lightBulb.classList.add('active');
            } else {
                lightBulb.classList.remove('active');
            }
        }
    }
    
    addToHistory(data) {
        data.timestamp = Date.now();
        this.dataHistory.push(data);
        this.trimHistory();
        
        // Update chart if available
        if (window.chartRenderer) {
            window.chartRenderer.updateChart(data);
        }
    }
    
    trimHistory() {
        if (this.dataHistory.length > this.maxHistoryLength) {
            this.dataHistory = this.dataHistory.slice(-this.maxHistoryLength);
        }
    }
    
    updateLastUpdateTime() {
        const now = new Date();
        this.elements.lastUpdate.textContent = now.toLocaleTimeString();
    }
    
    updateConnectionStatus(status, text) {
        this.elements.connectionIndicator.className = `status-indicator ${status}`;
        this.elements.connectionText.textContent = text;
    }
    
    logMessage(type, message) {
        const logContainer = this.elements.dataLog;
        const timestamp = new Date().toLocaleTimeString();
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="timestamp">${timestamp}</span>
            <span class="message">${message}</span>
        `;
        
        logContainer.appendChild(logEntry);
        
        // Keep only last 100 log entries
        const entries = logContainer.querySelectorAll('.log-entry');
        if (entries.length > 100) {
            entries[0].remove();
        }
        
        // Scroll to bottom
        logContainer.scrollTop = logContainer.scrollHeight;
    }
    
    toggleChartPause() {
        if (window.chartRenderer) {
            window.chartRenderer.togglePause();
        }
    }
    
    clearChart() {
        if (window.chartRenderer) {
            window.chartRenderer.clearChart();
        }
        this.dataHistory = [];
        this.logMessage('system', 'Chart cleared');
    }
    
    exportLog() {
        const logEntries = Array.from(this.elements.dataLog.querySelectorAll('.log-entry'))
            .map(entry => {
                const timestamp = entry.querySelector('.timestamp').textContent;
                const message = entry.querySelector('.message').textContent;
                return `${timestamp} - ${message}`;
            })
            .join('\n');
        
        const blob = new Blob([logEntries], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `arduino-log-${new Date().toISOString().slice(0, 19)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.logMessage('system', 'Log exported');
    }
    
    clearLog() {
        this.elements.dataLog.innerHTML = `
            <div class="log-entry system">
                <span class="timestamp">--:--:--</span>
                <span class="message">Log cleared.</span>
            </div>
        `;
        this.logMessage('system', 'Log cleared');
    }
    
    // Public methods for external access
    getDataHistory() {
        return this.dataHistory;
    }
    
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            isReading: this.isReading,
            port: this.port ? this.port.getInfo() : null
        };
    }
}

// Initialize the Arduino interface when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.arduinoInterface = new ArduinoInterface();
});
