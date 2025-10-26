/**
 * AI Chat Interface
 * 
 * This module handles the AI chat interface, allowing users to interact
 * with the AI health agent through a conversational interface.
 */

class AIChatInterface {
    constructor() {
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendButton = document.getElementById('send-message');
        this.aiStatus = document.getElementById('ai-status');
        this.aiAnalysis = document.getElementById('ai-analysis');
        
        this.isTyping = false;
        this.messageHistory = [];
        this.aiAgent = null;
        this.arduinoMonitor = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeAI();
        this.updateStatus('ready');
    }

    setupEventListeners() {
        // Send message on button click
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Send message on Enter key
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Quick action buttons
        document.querySelectorAll('.quick-action').forEach(button => {
            button.addEventListener('click', (e) => {
                const prompt = e.currentTarget.getAttribute('data-prompt');
                this.chatInput.value = prompt;
                this.sendMessage();
            });
        });

        // Auto-resize input
        this.chatInput.addEventListener('input', () => {
            this.chatInput.style.height = 'auto';
            this.chatInput.style.height = this.chatInput.scrollHeight + 'px';
        });
    }

    initializeAI() {
        // Initialize AI agent if available
        if (typeof AIHealthAgent !== 'undefined') {
            this.aiAgent = new AIHealthAgent();
        }

        // Get reference to Arduino monitor if available
        if (window.arduinoMonitor) {
            this.arduinoMonitor = window.arduinoMonitor;
        }
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isTyping) return;

        // Add user message to chat
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        this.chatInput.style.height = 'auto';

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Process message with AI
            const response = await this.processUserMessage(message);
            
            // Remove typing indicator
            this.hideTypingIndicator();
            
            // Add AI response
            this.addMessage(response.text, 'ai', response.type);
            
            // Update AI analysis panel
            if (response.analysis) {
                this.updateAnalysisPanel(response.analysis);
            }

        } catch (error) {
            console.error('Error processing message:', error);
            this.hideTypingIndicator();
            this.addMessage('I apologize, but I encountered an error processing your request. Please try again.', 'ai', 'error');
        }
    }

    async processUserMessage(message) {
        const lowerMessage = message.toLowerCase();
        
        // Categorize the user's intent
        const intent = this.categorizeIntent(lowerMessage);
        
        switch (intent) {
            case 'health_data':
                return await this.handleHealthDataQuery(message);
            case 'arduino_help':
                return await this.handleArduinoHelpQuery(message);
            case 'recommendations':
                return await this.handleRecommendationsQuery(message);
            case 'health_concerns':
                return await this.handleHealthConcernsQuery(message);
            case 'general_health':
                return await this.handleGeneralHealthQuery(message);
            case 'device_troubleshooting':
                return await this.handleDeviceTroubleshootingQuery(message);
            default:
                return await this.handleGeneralQuery(message);
        }
    }

    categorizeIntent(message) {
        const healthDataKeywords = ['readings', 'data', 'heart rate', 'movement', 'proximity', 'current', 'latest'];
        const arduinoKeywords = ['arduino', 'device', 'sensor', 'setup', 'connection', 'hardware'];
        const recommendationKeywords = ['recommend', 'suggest', 'improve', 'better', 'advice', 'tips'];
        const concernKeywords = ['concern', 'problem', 'issue', 'wrong', 'abnormal', 'warning', 'alert'];
        const generalHealthKeywords = ['health', 'medical', 'doctor', 'symptoms', 'condition', 'treatment'];
        const troubleshootingKeywords = ['not working', 'broken', 'error', 'fix', 'troubleshoot', 'help'];

        if (healthDataKeywords.some(keyword => message.includes(keyword))) {
            return 'health_data';
        } else if (arduinoKeywords.some(keyword => message.includes(keyword))) {
            return 'arduino_help';
        } else if (recommendationKeywords.some(keyword => message.includes(keyword))) {
            return 'recommendations';
        } else if (concernKeywords.some(keyword => message.includes(keyword))) {
            return 'health_concerns';
        } else if (troubleshootingKeywords.some(keyword => message.includes(keyword))) {
            return 'device_troubleshooting';
        } else if (generalHealthKeywords.some(keyword => message.includes(keyword))) {
            return 'general_health';
        } else {
            return 'general';
        }
    }

    async handleHealthDataQuery(message) {
        let response = {
            text: '',
            type: 'info',
            analysis: null
        };

        if (this.arduinoMonitor && this.arduinoMonitor.isConnected) {
            // Get current Arduino data
            const currentData = {
                heartRate: this.arduinoMonitor.heartRate,
                movement: this.arduinoMonitor.movementLevel,
                proximity: this.arduinoMonitor.proximityLevel,
                circuit: this.arduinoMonitor.circuitStatus,
                timestamp: Date.now()
            };

            // Process with AI agent
            if (this.aiAgent) {
                const analysis = this.aiAgent.processData(currentData);
                response.analysis = analysis;
                
                response.text = this.formatHealthDataResponse(currentData, analysis);
            } else {
                response.text = this.formatBasicHealthDataResponse(currentData);
            }
        } else {
            response.text = "I don't have access to your current health data because the Arduino device isn't connected. Please connect your Arduino device first to get real-time health insights.";
            response.type = 'warning';
        }

        return response;
    }

    async handleArduinoHelpQuery(message) {
        const helpTopics = {
            'setup': 'To set up your Arduino health monitoring device:\n\n1. Connect the IR sensor to analog pin A0\n2. Connect the Hue light indicator to digital pin 13\n3. Connect the metal plate detector to digital pin 12\n4. Upload the health monitoring code to your Arduino\n5. Connect the Arduino to your computer via USB\n6. Click "Connect Arduino" in the Arduino Health section',
            
            'connection': 'To connect your Arduino device:\n\n1. Make sure your Arduino is connected via USB\n2. Go to the Arduino Health section\n3. Click the "Connect Arduino" button\n4. Select your Arduino device from the list\n5. The device should show as "Connected" with a green indicator',
            
            'troubleshooting': 'Common Arduino connection issues:\n\n• Make sure the Arduino is connected via USB\n• Check that the correct drivers are installed\n• Try a different USB cable or port\n• Restart your browser and try again\n• Make sure no other applications are using the serial port',
            
            'sensors': 'Your Arduino health monitoring setup includes:\n\n• IR Sensor (A0): Detects proximity and movement\n• Hue Light Indicator (Pin 13): Visual feedback LED\n• Metal Plate Detector (Pin 12): Circuit completion sensor\n• Breadboard: For easy connections\n• Jumper wires: For connecting components'
        };

        let responseText = "I can help you with Arduino device setup and troubleshooting. ";
        
        if (message.includes('setup') || message.includes('install')) {
            responseText += helpTopics.setup;
        } else if (message.includes('connect') || message.includes('connection')) {
            responseText += helpTopics.connection;
        } else if (message.includes('trouble') || message.includes('problem') || message.includes('not working')) {
            responseText += helpTopics.troubleshooting;
        } else if (message.includes('sensor') || message.includes('hardware')) {
            responseText += helpTopics.sensors;
        } else {
            responseText += "What specific aspect of your Arduino device would you like help with? I can assist with setup, connection, troubleshooting, or sensor information.";
        }

        return {
            text: responseText,
            type: 'info'
        };
    }

    async handleRecommendationsQuery(message) {
        let recommendations = [];

        if (this.arduinoMonitor && this.arduinoMonitor.isConnected) {
            const currentData = {
                heartRate: this.arduinoMonitor.heartRate,
                movement: this.arduinoMonitor.movementLevel,
                proximity: this.arduinoMonitor.proximityLevel,
                circuit: this.arduinoMonitor.circuitStatus,
                timestamp: Date.now()
            };

            if (this.aiAgent) {
                const analysis = this.aiAgent.processData(currentData);
                recommendations = analysis.recommendations || [];
            }
        }

        if (recommendations.length > 0) {
            let responseText = "Based on your current health data, here are my recommendations:\n\n";
            recommendations.forEach((rec, index) => {
                responseText += `${index + 1}. **${rec.title}**\n   ${rec.description}\n   Action: ${rec.action}\n\n`;
            });
            
            return {
                text: responseText,
                type: 'recommendation',
                analysis: { recommendations: recommendations }
            };
        } else {
            return {
                text: "I'd be happy to provide personalized recommendations! However, I need access to your current health data from the Arduino device. Please connect your Arduino device first, and then I can analyze your readings and provide specific recommendations for improving your health.",
                type: 'info'
            };
        }
    }

    async handleHealthConcernsQuery(message) {
        if (this.arduinoMonitor && this.arduinoMonitor.isConnected) {
            const currentData = {
                heartRate: this.arduinoMonitor.heartRate,
                movement: this.arduinoMonitor.movementLevel,
                proximity: this.arduinoMonitor.proximityLevel,
                circuit: this.arduinoMonitor.circuitStatus,
                timestamp: Date.now()
            };

            if (this.aiAgent) {
                const analysis = this.aiAgent.processData(currentData);
                
                if (analysis.anomalies && analysis.anomalies.length > 0) {
                    let responseText = "I've detected some health concerns in your current readings:\n\n";
                    analysis.anomalies.forEach(anomaly => {
                        responseText += `⚠️ **${anomaly.type.replace('_', ' ').toUpperCase()}**: ${anomaly.message}\n`;
                    });
                    
                    responseText += "\n**Important**: These are preliminary readings from a basic monitoring device. For any health concerns, please consult with a healthcare professional.";
                    
                    return {
                        text: responseText,
                        type: 'warning',
                        analysis: analysis
                    };
                } else {
                    return {
                        text: "Good news! I don't see any immediate health concerns in your current readings. Your vital signs appear to be within normal ranges. However, remember that this is a basic monitoring device and should not replace professional medical advice.",
                        type: 'success',
                        analysis: analysis
                    };
                }
            }
        }

        return {
            text: "I'd be happy to check for health concerns, but I need access to your current health data. Please connect your Arduino device first so I can analyze your readings and identify any potential issues.",
            type: 'info'
        };
    }

    async handleGeneralHealthQuery(message) {
        const healthResponses = {
            'heart rate': 'A normal resting heart rate for adults is typically between 60-100 beats per minute. Your Arduino device can help monitor this, but remember it's a basic sensor and may not be as accurate as medical-grade equipment.',
            
            'exercise': 'Regular physical activity is important for maintaining good health. The World Health Organization recommends at least 150 minutes of moderate-intensity activity per week. Your Arduino device can help track your movement levels.',
            
            'sleep': 'Quality sleep is crucial for health. Adults should aim for 7-9 hours of sleep per night. While your Arduino device doesn't directly monitor sleep, consistent movement patterns can indicate sleep quality.',
            
            'stress': 'Chronic stress can affect your health. Your Arduino device can help identify stress patterns through heart rate and movement changes. Consider relaxation techniques, regular exercise, and adequate sleep.',
            
            'diet': 'A balanced diet is essential for good health. While your Arduino device doesn't monitor nutrition, maintaining healthy eating habits supports overall wellness and can improve your vital signs.'
        };

        let responseText = "I can provide general health information, but remember that I'm not a substitute for professional medical advice. ";
        
        for (const [topic, response] of Object.entries(healthResponses)) {
            if (message.includes(topic)) {
                responseText += response;
                break;
            }
        }

        if (responseText === "I can provide general health information, but remember that I'm not a substitute for professional medical advice. ") {
            responseText += "What specific health topic would you like to know more about? I can discuss heart rate, exercise, sleep, stress management, or general wellness.";
        }

        return {
            text: responseText,
            type: 'info'
        };
    }

    async handleDeviceTroubleshootingQuery(message) {
        const troubleshootingSteps = [
            "1. Check USB connection between Arduino and computer",
            "2. Verify Arduino is powered on (LED should be lit)",
            "3. Try a different USB cable or port",
            "4. Restart your browser and refresh the page",
            "5. Make sure no other applications are using the serial port",
            "6. Check that the Arduino code is properly uploaded",
            "7. Verify sensor connections on the breadboard"
        ];

        return {
            text: "Let me help you troubleshoot your Arduino device. Here are the steps to try:\n\n" + 
                  troubleshootingSteps.join('\n') + 
                  "\n\nIf these steps don't resolve the issue, please check the Arduino serial monitor for any error messages and ensure all components are properly connected.",
            type: 'info'
        };
    }

    async handleGeneralQuery(message) {
        const responses = [
            "I'm here to help with your health monitoring and Arduino device questions. What would you like to know?",
            "I can assist you with health data analysis, device setup, troubleshooting, and general health information. How can I help?",
            "Feel free to ask me about your health readings, Arduino device, or any health-related questions you might have.",
            "I'm your AI health assistant, ready to help with monitoring, analysis, and health guidance. What's on your mind?"
        ];

        return {
            text: responses[Math.floor(Math.random() * responses.length)],
            type: 'info'
        };
    }

    formatHealthDataResponse(data, analysis) {
        let response = `Here are your current health readings:\n\n`;
        response += `📊 **Heart Rate**: ${data.heartRate} BPM\n`;
        response += `🏃 **Movement Level**: ${data.movement}\n`;
        response += `📏 **Proximity**: ${data.proximity} cm\n`;
        response += `💡 **Circuit Status**: ${data.circuit}\n\n`;

        if (analysis.insights && analysis.insights.length > 0) {
            response += `**AI Analysis:**\n`;
            analysis.insights.forEach(insight => {
                const icon = insight.type === 'positive' ? '✅' : insight.type === 'warning' ? '⚠️' : 'ℹ️';
                response += `${icon} ${insight.message}\n`;
            });
        }

        if (analysis.recommendations && analysis.recommendations.length > 0) {
            response += `\n**Recommendations:**\n`;
            analysis.recommendations.forEach((rec, index) => {
                response += `${index + 1}. ${rec.description}\n`;
            });
        }

        return response;
    }

    formatBasicHealthDataResponse(data) {
        return `Here are your current health readings:\n\n` +
               `📊 **Heart Rate**: ${data.heartRate} BPM\n` +
               `🏃 **Movement Level**: ${data.movement}\n` +
               `📏 **Proximity**: ${data.proximity} cm\n` +
               `💡 **Circuit Status**: ${data.circuit}\n\n` +
               `*Note: For detailed AI analysis, please ensure the AI agent is properly initialized.*`;
    }

    addMessage(text, sender, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        const icon = document.createElement('ion-icon');
        if (sender === 'user') {
            icon.name = 'person-outline';
        } else {
            icon.name = type === 'error' ? 'alert-circle-outline' : 
                       type === 'warning' ? 'warning-outline' : 
                       type === 'success' ? 'checkmark-circle-outline' : 
                       'medical-outline';
        }
        avatar.appendChild(icon);
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.innerHTML = this.formatMessageText(text);
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString();
        
        content.appendChild(messageText);
        content.appendChild(messageTime);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Store in history
        this.messageHistory.push({
            text: text,
            sender: sender,
            type: type,
            timestamp: Date.now()
        });
    }

    formatMessageText(text) {
        // Convert markdown-like formatting to HTML
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/•/g, '&bull;');
    }

    showTypingIndicator() {
        this.isTyping = true;
        this.sendButton.disabled = true;
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message typing-message';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <ion-icon name="medical-outline"></ion-icon>
            </div>
            <div class="message-content">
                <div class="message-text typing-indicator">
                    AI is thinking
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.isTyping = false;
        this.sendButton.disabled = false;
        
        const typingMessage = this.chatMessages.querySelector('.typing-message');
        if (typingMessage) {
            typingMessage.remove();
        }
    }

    updateStatus(status) {
        const statusElement = this.aiStatus.querySelector('span');
        const statusIcon = this.aiStatus.querySelector('ion-icon');
        
        switch (status) {
            case 'ready':
                statusElement.textContent = 'Ready';
                statusIcon.name = 'checkmark-circle-outline';
                this.aiStatus.className = 'status-indicator';
                break;
            case 'processing':
                statusElement.textContent = 'Processing';
                statusIcon.name = 'time-outline';
                this.aiStatus.className = 'status-indicator processing';
                break;
            case 'error':
                statusElement.textContent = 'Error';
                statusIcon.name = 'alert-circle-outline';
                this.aiStatus.className = 'status-indicator error';
                break;
        }
    }

    updateAnalysisPanel(analysis) {
        if (!analysis) return;
        
        const analysisContent = this.aiAnalysis;
        analysisContent.innerHTML = '';
        
        // Data Quality
        const dataQuality = analysisContent.appendChild(document.createElement('div'));
        dataQuality.className = 'analysis-item';
        dataQuality.innerHTML = `
            <div class="analysis-icon">
                <ion-icon name="trending-up-outline"></ion-icon>
            </div>
            <div class="analysis-text">
                <h4>Data Quality</h4>
                <p>${analysis.confidence ? `Confidence: ${Math.round(analysis.confidence * 100)}%` : 'Monitoring in real-time'}</p>
            </div>
        `;
        
        // Health Status
        const healthStatus = analysisContent.appendChild(document.createElement('div'));
        healthStatus.className = 'analysis-item';
        const statusIcon = analysis.anomalies && analysis.anomalies.length > 0 ? 'warning-outline' : 'shield-checkmark-outline';
        const statusText = analysis.anomalies && analysis.anomalies.length > 0 ? 'Issues detected' : 'All systems normal';
        healthStatus.innerHTML = `
            <div class="analysis-icon">
                <ion-icon name="${statusIcon}"></ion-icon>
            </div>
            <div class="analysis-text">
                <h4>Health Status</h4>
                <p>${statusText}</p>
            </div>
        `;
        
        // Insights
        const insights = analysisContent.appendChild(document.createElement('div'));
        insights.className = 'analysis-item';
        const insightCount = analysis.insights ? analysis.insights.length : 0;
        insights.innerHTML = `
            <div class="analysis-icon">
                <ion-icon name="bulb-outline"></ion-icon>
            </div>
            <div class="analysis-text">
                <h4>Insights</h4>
                <p>${insightCount} insights generated</p>
            </div>
        `;
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    // Public methods for external integration
    addSystemMessage(text, type = 'info') {
        this.addMessage(text, 'ai', type);
    }

    clearChat() {
        this.chatMessages.innerHTML = '';
        this.messageHistory = [];
        this.addMessage(
            "Chat cleared. How can I help you today?",
            'ai',
            'info'
        );
    }

    exportChatHistory() {
        return {
            messages: this.messageHistory,
            exportedAt: Date.now()
        };
    }
}

// Initialize chat interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other components to initialize
    setTimeout(() => {
        window.aiChat = new AIChatInterface();
    }, 1000);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIChatInterface;
}
