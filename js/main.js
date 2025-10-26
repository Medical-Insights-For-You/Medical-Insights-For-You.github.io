// ============================================
// MIFY - SIMPLIFIED MAIN JAVASCRIPT
// ============================================

class MifyApp {
    constructor() {
        this.arduinoConnected = false;
        this.dataInterval = null;
        this.charts = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeCharts();
        this.setupArduinoSimulation();
    }

    setupEventListeners() {
        // Arduino connection
        const connectBtn = document.getElementById('connect-arduino');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.toggleArduinoConnection());
        }

        // AI Chat
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-message');
        
        if (chatInput && sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }

        // ICF Generator
        const icfBtn = document.getElementById('try-icf-generator');
        if (icfBtn) {
            icfBtn.addEventListener('click', () => this.showICFGenerator());
        }

        // Smooth scrolling for navigation links
        for (const anchor of document.querySelectorAll('a[href^="#"]')) {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }

    toggleArduinoConnection() {
        const connectBtn = document.getElementById('connect-arduino');
        const statusEl = document.getElementById('connection-status');
        
        if (!this.arduinoConnected) {
            this.arduinoConnected = true;
            connectBtn.innerHTML = '<ion-icon name="close-outline"></ion-icon> Disconnect';
            statusEl.textContent = 'Connected';
            statusEl.className = 'status connected';
            
            // Start data simulation
            this.startDataSimulation();
            
            // Show diagnosis after 5 seconds
            setTimeout(() => {
                this.showDiagnosis();
            }, 5000);
        } else {
            this.arduinoConnected = false;
            connectBtn.innerHTML = '<ion-icon name="link-outline"></ion-icon> Connect Arduino';
            statusEl.textContent = 'Disconnected';
            statusEl.className = 'status';
            
            // Stop data simulation
            this.stopDataSimulation();
            
            // Hide diagnosis
            this.hideDiagnosis();
        }
    }

    startDataSimulation() {
        this.dataInterval = setInterval(() => {
            this.updateArduinoData();
        }, 2000);
    }

    stopDataSimulation() {
        if (this.dataInterval) {
            clearInterval(this.dataInterval);
            this.dataInterval = null;
        }
    }

    updateArduinoData() {
        // Simulate Arduino data
        const heartRate = Math.floor(Math.random() * 40) + 60; // 60-100 BPM
        const movement = Math.random() > 0.5 ? 'Active' : 'Resting';
        const proximity = (Math.random() * 50 + 10).toFixed(1); // 10-60 cm
        
        // Generate health warnings based on data
        const warnings = this.generateHealthWarnings(heartRate, movement, proximity);

        // Update UI
        this.updateDataDisplay('heart-rate', `${heartRate} BPM`);
        this.updateDataDisplay('movement-level', movement);
        this.updateDataDisplay('proximity-level', `${proximity} cm`);
        this.updateDataDisplay('health-warnings', warnings);

        // Update charts
        this.updateCharts(heartRate, movement, proximity);
    }

    generateHealthWarnings(heartRate, movement, proximity) {
        const warnings = [];
        
        if (heartRate > 90) {
            warnings.push('High Heart Rate');
        } else if (heartRate < 65) {
            warnings.push('Low Heart Rate');
        }
        
        if (movement === 'Resting' && Math.random() > 0.7) {
            warnings.push('Low Activity');
        }
        
        if (parseFloat(proximity) < 15) {
            warnings.push('Close Proximity');
        }
        
        return warnings.length > 0 ? warnings.join(', ') : 'None';
    }

    updateDataDisplay(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    initializeCharts() {
        // Heart Rate Chart
        const heartRateCtx = document.getElementById('heartRateChart');
        if (heartRateCtx) {
            // Generate initial demo data
            const now = new Date();
            const labels = [];
            const data = [];
            
            for (let i = 9; i >= 0; i--) {
                const time = new Date(now.getTime() - i * 60000); // Every minute
                labels.push(time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
                data.push(Math.floor(Math.random() * 20) + 70); // 70-90 BPM
            }
            
            this.charts.heartRate = new Chart(heartRateCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Heart Rate (BPM)',
                        data: data,
                        borderColor: '#000000',
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#000000',
                                font: {
                                    size: 12
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { 
                                color: '#333333',
                                font: {
                                    size: 10
                                }
                            },
                            grid: { color: 'rgba(0, 0, 0, 0.1)' }
                        },
                        y: {
                            ticks: { 
                                color: '#333333',
                                font: {
                                    size: 10
                                }
                            },
                            grid: { color: 'rgba(0, 0, 0, 0.1)' },
                            min: 60,
                            max: 100
                        }
                    }
                }
            });
        }

        // Movement Chart
        const movementCtx = document.getElementById('movementChart');
        if (movementCtx) {
            // Generate initial demo data
            const activityData = [
                Math.floor(Math.random() * 80) + 20, // Active
                Math.floor(Math.random() * 60) + 10, // Resting
                Math.floor(Math.random() * 40) + 5,  // Walking
                Math.floor(Math.random() * 30) + 2   // Running
            ];
            
            this.charts.movement = new Chart(movementCtx, {
                type: 'bar',
                data: {
                    labels: ['Active', 'Resting', 'Walking', 'Running'],
                    datasets: [{
                        label: 'Activity Level',
                        data: activityData,
                        backgroundColor: [
                            'rgba(0, 0, 0, 0.8)',
                            'rgba(51, 51, 51, 0.8)',
                            'rgba(102, 102, 102, 0.8)',
                            'rgba(153, 153, 153, 0.8)'
                        ],
                        borderColor: [
                            '#000000',
                            '#333333',
                            '#666666',
                            '#999999'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#000000',
                                font: {
                                    size: 12
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { 
                                color: '#333333',
                                font: {
                                    size: 10
                                }
                            },
                            grid: { color: 'rgba(0, 0, 0, 0.1)' }
                        },
                        y: {
                            ticks: { 
                                color: '#333333',
                                font: {
                                    size: 10
                                }
                            },
                            grid: { color: 'rgba(0, 0, 0, 0.1)' },
                            min: 0,
                            max: 100
                        }
                    }
                }
            });
        }
    }

    updateCharts(heartRate, movement, proximity) {
        const now = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Update Heart Rate Chart
        if (this.charts.heartRate) {
            const chart = this.charts.heartRate;
            chart.data.labels.push(now);
            chart.data.datasets[0].data.push(heartRate);
            
            // Keep only last 10 data points
            if (chart.data.labels.length > 10) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }
            
            chart.update('none');
        }

        // Update Movement Chart
        if (this.charts.movement) {
            const chart = this.charts.movement;
            const activityData = [
                Math.floor(Math.random() * 80) + 20, // Active
                Math.floor(Math.random() * 60) + 10, // Resting
                Math.floor(Math.random() * 40) + 5,  // Walking
                Math.floor(Math.random() * 30) + 2   // Running
            ];
            
            chart.data.datasets[0].data = activityData;
            chart.update('none');
        }
    }

    setupArduinoSimulation() {
        // Initialize with demo values to show the system working
        this.updateDataDisplay('heart-rate', '72 BPM');
        this.updateDataDisplay('movement-level', 'Active');
        this.updateDataDisplay('proximity-level', '15.3 cm');
        this.updateDataDisplay('health-warnings', 'None');
    }

    // AI Chat functionality
    sendMessage() {
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');
        
        if (!chatInput || !chatMessages) return;
        
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message
        this.addMessage('user', message);
        chatInput.value = '';

        // Simulate AI response
        setTimeout(() => {
            const response = this.generateAIResponse(message);
            this.addMessage('ai', response);
        }, 1000);
    }

    addMessage(type, content) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (type === 'user') {
            avatar.innerHTML = '<ion-icon name="person-outline"></ion-icon>';
            messageContent.innerHTML = `<p>${content}</p>`;
    } else {
            avatar.innerHTML = '<ion-icon name="medical-outline"></ion-icon>';
            messageContent.innerHTML = `<p>${content}</p>`;
        }
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    generateAIResponse(userMessage) {
        const responses = {
            'health': "Based on your current readings, your health metrics appear to be within normal ranges. Continue monitoring and maintain your current lifestyle habits.",
            'arduino': "Your Arduino setup looks good! Make sure the ultrasonic sensor is properly connected to pins 9 and 10, and the device is powered correctly.",
            'data': "I'm analyzing your health data in real-time. Your heart rate shows good variability, and your movement patterns indicate healthy activity levels.",
            'recommendation': "I recommend taking regular breaks every hour, staying hydrated, and maintaining consistent sleep patterns for optimal health.",
            'default': "I'm here to help with your health monitoring! I can analyze your Arduino data, provide health insights, and answer questions about your setup. What would you like to know?"
        };

        const message = userMessage.toLowerCase();
        
        if (message.includes('health') || message.includes('reading')) {
            return responses.health;
        }
        if (message.includes('arduino') || message.includes('sensor') || message.includes('setup')) {
            return responses.arduino;
        }
        if (message.includes('data') || message.includes('analysis')) {
            return responses.data;
        }
        if (message.includes('recommend') || message.includes('advice')) {
            return responses.recommendation;
        }
        return responses.default;
    }

    // ICF Generator functionality
    showICFGenerator() {
        alert('ICF Generator is currently in development. This feature will allow you to generate FDA-compliant Informed Consent Forms for clinical research studies. Stay tuned for the full integration!');
    }

    // Diagnosis functionality
    showDiagnosis() {
        // Create diagnosis modal if it doesn't exist
        let diagnosisModal = document.getElementById('diagnosis-modal');
        if (!diagnosisModal) {
            diagnosisModal = this.createDiagnosisModal();
            document.body.appendChild(diagnosisModal);
        }
        
        // Generate diagnosis data
        const diagnosis = this.generateDiagnosis();
        this.populateDiagnosis(diagnosis);
        
        // Show modal
        diagnosisModal.style.display = 'flex';
        setTimeout(() => {
            diagnosisModal.classList.add('show');
        }, 100);
    }

    hideDiagnosis() {
        const diagnosisModal = document.getElementById('diagnosis-modal');
        if (diagnosisModal) {
            diagnosisModal.classList.remove('show');
            setTimeout(() => {
                diagnosisModal.style.display = 'none';
            }, 300);
        }
    }

    createDiagnosisModal() {
        const modal = document.createElement('div');
        modal.id = 'diagnosis-modal';
        modal.className = 'diagnosis-modal';
        modal.innerHTML = `
            <div class="diagnosis-content">
                <div class="diagnosis-header">
                    <h3>AI Health Diagnosis</h3>
                    <button class="close-diagnosis" onclick="window.mifyApp.hideDiagnosis()">
                        <ion-icon name="close-outline"></ion-icon>
                    </button>
                </div>
                <div class="diagnosis-body">
                    <div class="diagnosis-summary">
                        <div class="diagnosis-icon">
                            <ion-icon name="medical-outline"></ion-icon>
                        </div>
                        <div class="diagnosis-text">
                            <h4 id="diagnosis-title">Health Assessment Complete</h4>
                            <p id="diagnosis-description">Based on biometric analysis</p>
                        </div>
                    </div>
                    
                    <div class="biometrics-grid">
                        <div class="biometric-item">
                            <div class="biometric-label">Heart Rate</div>
                            <div class="biometric-value" id="diag-heart-rate">-- BPM</div>
                            <div class="biometric-status" id="diag-heart-status">--</div>
                        </div>
                        <div class="biometric-item">
                            <div class="biometric-label">Blood Pressure</div>
                            <div class="biometric-value" id="diag-bp">--/-- mmHg</div>
                            <div class="biometric-status" id="diag-bp-status">--</div>
                        </div>
                        <div class="biometric-item">
                            <div class="biometric-label">Oxygen Saturation</div>
                            <div class="biometric-value" id="diag-oxygen">--%</div>
                            <div class="biometric-status" id="diag-oxygen-status">--</div>
                        </div>
                        <div class="biometric-item">
                            <div class="biometric-label">Body Temperature</div>
                            <div class="biometric-value" id="diag-temp">--°F</div>
                            <div class="biometric-status" id="diag-temp-status">--</div>
                        </div>
                    </div>
                    
                    <div class="diagnosis-recommendations">
                        <h4>Clinical Trial Eligibility</h4>
                        <div class="recommendation-item">
                            <ion-icon name="checkmark-circle-outline"></ion-icon>
                            <span id="eligibility-status">Assessing eligibility...</span>
                        </div>
                        <div class="recommendation-item">
                            <ion-icon name="bulb-outline"></ion-icon>
                            <span id="recommendations">Generating recommendations...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    generateDiagnosis() {
        const heartRate = Math.floor(Math.random() * 30) + 70; // 70-100 BPM
        const systolic = Math.floor(Math.random() * 20) + 110; // 110-130
        const diastolic = Math.floor(Math.random() * 10) + 70; // 70-80
        const oxygen = Math.floor(Math.random() * 5) + 95; // 95-100%
        const temperature = (Math.random() * 2 + 97.5).toFixed(1); // 97.5-99.5°F

        // Determine status for each metric
        const heartStatus = heartRate > 90 ? 'High' : heartRate < 70 ? 'Low' : 'Normal';
        const bpStatus = systolic > 120 ? 'Elevated' : 'Normal';
        const oxygenStatus = oxygen < 97 ? 'Low' : 'Normal';
        const tempStatus = parseFloat(temperature) > 99 ? 'Elevated' : 'Normal';

        // Overall assessment
        const isEligible = heartStatus === 'Normal' && bpStatus === 'Normal' && oxygenStatus === 'Normal' && tempStatus === 'Normal';
        
        return {
            heartRate,
            systolic,
            diastolic,
            oxygen,
            temperature,
            heartStatus,
            bpStatus,
            oxygenStatus,
            tempStatus,
            isEligible
        };
    }

    populateDiagnosis(diagnosis) {
        // Update biometric values
        document.getElementById('diag-heart-rate').textContent = `${diagnosis.heartRate} BPM`;
        document.getElementById('diag-bp').textContent = `${diagnosis.systolic}/${diagnosis.diastolic} mmHg`;
        document.getElementById('diag-oxygen').textContent = `${diagnosis.oxygen}%`;
        document.getElementById('diag-temp').textContent = `${diagnosis.temperature}°F`;

        // Update status indicators
        this.updateBiometricStatus('diag-heart-status', diagnosis.heartStatus);
        this.updateBiometricStatus('diag-bp-status', diagnosis.bpStatus);
        this.updateBiometricStatus('diag-oxygen-status', diagnosis.oxygenStatus);
        this.updateBiometricStatus('diag-temp-status', diagnosis.tempStatus);

        // Update eligibility and recommendations
        const eligibilityText = diagnosis.isEligible ? 
            'Patient meets basic eligibility criteria for most clinical trials' : 
            'Patient may require additional screening before trial participation';
        
        const recommendations = diagnosis.isEligible ?
            'Consider for cardiovascular, general health, and wellness studies' :
            'Recommend consultation with healthcare provider before trial enrollment';

        document.getElementById('eligibility-status').textContent = eligibilityText;
        document.getElementById('recommendations').textContent = recommendations;

        // Update diagnosis title and description
        document.getElementById('diagnosis-title').textContent = 
            diagnosis.isEligible ? 'Healthy - Trial Eligible' : 'Requires Review';
        document.getElementById('diagnosis-description').textContent = 
            diagnosis.isEligible ? 
            'All biometric parameters within normal ranges' : 
            'Some parameters require medical review';
    }

    updateBiometricStatus(elementId, status) {
        const element = document.getElementById(elementId);
        element.textContent = status;
        element.className = `biometric-status ${status.toLowerCase()}`;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mifyApp = new MifyApp();
});

// Add some utility functions
window.MifyUtils = {
    // Format time
    formatTime: (date) => {
        return date.toLocaleTimeString();
    },
    
    // Generate random health data
    generateHealthData: () => {
        return {
            heartRate: Math.floor(Math.random() * 40) + 60,
            movement: Math.random() > 0.5 ? 'Active' : 'Resting',
            proximity: (Math.random() * 50 + 10).toFixed(1)
        };
    },
    
    // Validate Arduino connection
    validateArduinoConnection: () => {
        // This would normally check actual Arduino connection
        return Math.random() > 0.1; // 90% success rate for demo
    }
};