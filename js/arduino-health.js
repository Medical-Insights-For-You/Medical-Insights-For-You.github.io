/**
 * Arduino Health Monitoring System
 * Real-time health data collection and AI analysis
 */

class ArduinoHealthMonitor {
    constructor() {
        this.isConnected = false;
        this.dataInterval = 5000; // Default 5 seconds
        this.websocket = null;
        this.dataHistory = [];
        this.aiAgent = new AIHealthAgent();
        
        this.initializeElements();
        this.setupEventListeners();
        this.startSimulation(); // For demo purposes
        
        // Make Arduino monitor globally accessible for AI chat
        window.arduinoMonitor = this;
    }

    initializeElements() {
        this.elements = {
            statusIndicator: document.getElementById('arduino-status'),
            connectButton: document.getElementById('connect-arduino'),
            dataIntervalSelect: document.getElementById('data-interval'),
            heartRate: document.getElementById('heart-rate'),
            heartRateTrend: document.getElementById('heart-rate-trend'),
            movementLevel: document.getElementById('movement-level'),
            movementTrend: document.getElementById('movement-trend'),
            proximityLevel: document.getElementById('proximity-level'),
            proximityTrend: document.getElementById('proximity-trend'),
            circuitStatus: document.getElementById('circuit-status'),
            circuitIndicator: document.getElementById('circuit-indicator'),
            aiInsights: document.getElementById('ai-insights'),
            dataLog: document.getElementById('data-log')
        };
    }

    setupEventListeners() {
        this.elements.connectButton.addEventListener('click', () => {
            this.toggleConnection();
        });

        this.elements.dataIntervalSelect.addEventListener('change', (e) => {
            this.dataInterval = Number.parseInt(e.target.value);
            this.updateDataInterval();
        });
    }

    toggleConnection() {
        if (this.isConnected) {
            this.disconnect();
        } else {
            this.connect();
        }
    }

    connect() {
        // Simulate Arduino connection
        this.isConnected = true;
        this.updateConnectionStatus();
        this.logMessage('Arduino connected successfully');
        
        // Start data collection
        this.startDataCollection();
        
        // Update AI insights
        this.updateAIInsights();
    }

    disconnect() {
        this.isConnected = false;
        this.updateConnectionStatus();
        this.logMessage('Arduino disconnected');
        
        // Stop data collection
        this.stopDataCollection();
        
        // Clear data
        this.clearData();
    }

    updateConnectionStatus() {
        if (this.isConnected) {
            this.elements.statusIndicator.className = 'status-indicator connected';
            this.elements.statusIndicator.innerHTML = '<ion-icon name="radio-outline"></ion-icon><span>Connected</span>';
            this.elements.connectButton.innerHTML = '<ion-icon name="link-outline"></ion-icon>Disconnect';
        } else {
            this.elements.statusIndicator.className = 'status-indicator disconnected';
            this.elements.statusIndicator.innerHTML = '<ion-icon name="radio-outline"></ion-icon><span>Disconnected</span>';
            this.elements.connectButton.innerHTML = '<ion-icon name="link-outline"></ion-icon>Connect Arduino';
        }
    }

    startDataCollection() {
        if (this.dataCollectionInterval) {
            clearInterval(this.dataCollectionInterval);
        }

        this.dataCollectionInterval = setInterval(() => {
            this.collectData();
        }, this.dataInterval);
    }

    stopDataCollection() {
        if (this.dataCollectionInterval) {
            clearInterval(this.dataCollectionInterval);
            this.dataCollectionInterval = null;
        }
    }

    updateDataInterval() {
        if (this.isConnected) {
            this.startDataCollection();
        }
    }

    collectData() {
        // Simulate Arduino data collection
        const data = this.generateSimulatedData();
        this.processData(data);
        this.updateDisplay(data);
        this.aiAgent.analyzeData(data);
    }

    generateSimulatedData() {
        // Simulate realistic health data
        const baseHeartRate = 70 + Math.random() * 20; // 70-90 BPM
        const movement = Math.random() * 100; // 0-100%
        const proximity = 5 + Math.random() * 15; // 5-20 cm
        const circuitActive = Math.random() > 0.3; // 70% chance active

        return {
            timestamp: new Date(),
            heartRate: Math.round(baseHeartRate),
            movement: Math.round(movement),
            proximity: Math.round(proximity * 10) / 10,
            circuitActive: circuitActive,
            irSensor: {
                raw: Math.random() * 1024,
                filtered: Math.random() * 1024
            }
        };
    }

    processData(data) {
        // Store data in history
        this.dataHistory.push(data);
        
        // Keep only last 100 readings
        if (this.dataHistory.length > 100) {
            this.dataHistory.shift();
        }

        // Log the data
        this.logMessage(`Data collected: HR=${data.heartRate} BPM, Movement=${data.movement}%, Proximity=${data.proximity}cm`);
    }

    updateDisplay(data) {
        // Update heart rate
        this.elements.heartRate.textContent = `${data.heartRate} BPM`;
        this.updateTrend('heartRate', data.heartRate);

        // Update movement
        this.elements.movementLevel.textContent = `${data.movement}%`;
        this.updateTrend('movement', data.movement);

        // Update proximity
        this.elements.proximityLevel.textContent = `${data.proximity} cm`;
        this.updateTrend('proximity', data.proximity);

        // Update circuit status
        if (data.circuitActive) {
            this.elements.circuitStatus.textContent = 'Closed';
            this.elements.circuitIndicator.className = 'circuit-indicator active';
        } else {
            this.elements.circuitStatus.textContent = 'Open';
            this.elements.circuitIndicator.className = 'circuit-indicator';
        }
    }

    updateTrend(type, currentValue) {
        if (this.dataHistory.length < 2) return;

        const previousValue = this.dataHistory[this.dataHistory.length - 2][type];
        const trend = currentValue > previousValue ? 'up' : 
                     currentValue < previousValue ? 'down' : 'stable';
        
        const trendElement = this.elements[`${type}Trend`];
        trendElement.className = `trend-indicator ${trend}`;
        trendElement.textContent = trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→';
    }

    updateAIInsights() {
        if (!this.isConnected) {
            this.elements.aiInsights.innerHTML = `
                <div class="insight-card">
                    <div class="insight-icon">
                        <ion-icon name="analytics-outline"></ion-icon>
                    </div>
                    <div class="insight-content">
                        <h4>System Status</h4>
                        <p>Waiting for Arduino connection to begin health analysis...</p>
                    </div>
                </div>
            `;
            return;
        }

        const insights = this.aiAgent.getInsights();
        this.elements.aiInsights.innerHTML = insights.map(insight => `
            <div class="insight-card">
                <div class="insight-icon">
                    <ion-icon name="${insight.icon}"></ion-icon>
                </div>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.description}</p>
                </div>
            </div>
        `).join('');
    }

    logMessage(message) {
        const time = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-message">${message}</span>
        `;
        
        this.elements.dataLog.appendChild(logEntry);
        
        // Keep only last 20 log entries
        const entries = this.elements.dataLog.querySelectorAll('.log-entry');
        if (entries.length > 20) {
            entries[0].remove();
        }
        
        // Scroll to bottom
        this.elements.dataLog.scrollTop = this.elements.dataLog.scrollHeight;
    }

    clearData() {
        this.elements.heartRate.textContent = '-- BPM';
        this.elements.movementLevel.textContent = '--';
        this.elements.proximityLevel.textContent = '-- cm';
        this.elements.circuitStatus.textContent = 'Open';
        this.elements.circuitIndicator.className = 'circuit-indicator';
        
        // Clear trends
        ['heartRate', 'movement', 'proximity'].forEach(type => {
            this.elements[`${type}Trend`].className = 'trend-indicator';
            this.elements[`${type}Trend`].textContent = '--';
        });
    }

    startSimulation() {
        // For demo purposes, simulate connection after 2 seconds
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect();
            }
        }, 2000);
    }
}

class AIHealthAgent {
    constructor() {
        this.healthBaselines = {
            heartRate: { min: 60, max: 100, optimal: 70 },
            movement: { min: 0, max: 100, optimal: 50 },
            proximity: { min: 5, max: 20, optimal: 10 }
        };
        
        // Initialize the advanced AI agent
        this.advancedAgent = new AdvancedAIHealthAgent();
    }

    analyzeData(data) {
        // Use the advanced AI agent for comprehensive analysis
        const analysis = this.advancedAgent.processData(data);
        
        if (analysis) {
            return analysis.insights;
        } else {
            // Fallback to simple analysis
            return this.generateInsights(data);
        }
    }

    generateInsights(data) {
        const insights = [];

        // Heart rate analysis
        if (data.heartRate < this.healthBaselines.heartRate.min) {
            insights.push({
                icon: 'heart-outline',
                title: 'Low Heart Rate',
                description: 'Your heart rate is below normal range. Consider consulting a healthcare provider if this persists.'
            });
        } else if (data.heartRate > this.healthBaselines.heartRate.max) {
            insights.push({
                icon: 'heart-outline',
                title: 'Elevated Heart Rate',
                description: 'Your heart rate is elevated. This could indicate stress, exercise, or other factors.'
            });
        } else {
            insights.push({
                icon: 'heart-outline',
                title: 'Normal Heart Rate',
                description: 'Your heart rate is within normal range. Keep up the good work!'
            });
        }

        // Movement analysis
        if (data.movement < 20) {
            insights.push({
                icon: 'walk-outline',
                title: 'Low Activity',
                description: 'Consider increasing your daily activity level for better health outcomes.'
            });
        } else if (data.movement > 80) {
            insights.push({
                icon: 'walk-outline',
                title: 'High Activity',
                description: 'Great activity level! Make sure to rest adequately between sessions.'
            });
        } else {
            insights.push({
                icon: 'walk-outline',
                title: 'Moderate Activity',
                description: 'Good activity level. Consider adding some light exercise to your routine.'
            });
        }

        // Circuit status analysis
        if (data.circuitActive) {
            insights.push({
                icon: 'flash-outline',
                title: 'Circuit Active',
                description: 'The conductive surface is properly completing the circuit. System functioning normally.'
            });
        } else {
            insights.push({
                icon: 'flash-outline',
                title: 'Circuit Open',
                description: 'Ensure the Hue light is properly placed on the metal surface for accurate readings.'
            });
        }

        return insights;
    }

    getInsights() {
        // Return current insights based on latest data
        return [
            {
                icon: 'analytics-outline',
                title: 'System Monitoring',
                description: 'Arduino health monitoring system is actively collecting and analyzing your health data in real-time.'
            },
            {
                icon: 'shield-checkmark-outline',
                title: 'Data Privacy',
                description: 'All health data is processed locally and securely. No personal information is transmitted to external servers.'
            },
            {
                icon: 'trending-up-outline',
                title: 'Health Trends',
                description: 'AI analysis provides personalized insights based on your unique health patterns and baseline measurements.'
            }
        ];
    }
}

// Initialize the Arduino Health Monitor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ArduinoHealthMonitor();
});
