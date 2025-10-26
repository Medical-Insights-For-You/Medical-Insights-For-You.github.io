/**
 * AI Chat Interface with ASI:One Integration
 * 
 * This module handles the AI chat interface with real-time integration
 * to Fetch.ai's ASI:One for intelligent agent discovery and processing.
 */

class AIChatInterfaceASIOne {
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
        
        // ASI:One API configuration
        this.asiOneApiKey = 'sk_8517f5128130429bb06a779ab5502ca0bc7ece1f61be45c6bae5a8c726c06f0e';
        this.asiOneBaseUrl = 'https://api.asi1.ai/v1';
        this.currentSessionId = this.generateSessionId();
        this.userId = this.getOrCreateUserId();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeAI();
        this.updateStatus('ready');
        this.addWelcomeMessage();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getOrCreateUserId() {
        let userId = localStorage.getItem('mify_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('mify_user_id', userId);
        }
        return userId;
    }

    addWelcomeMessage() {
        this.addMessage(
            "👋 Welcome to Mify Health AI Assistant! I'm powered by Fetch.ai's ASI:One for intelligent health monitoring and analysis. I can help you with:\n\n" +
            "• Real-time health data analysis from your Arduino device\n" +
            "• Health recommendations and insights\n" +
            "• Device troubleshooting and setup\n" +
            "• General health information and guidance\n\n" +
            "How can I assist you today?",
            'ai',
            'welcome'
        );
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
        this.updateStatus('processing');

        try {
            // Process message with ASI:One
            const response = await this.processUserMessageWithASIOne(message);
            
            // Remove typing indicator
            this.hideTypingIndicator();
            this.updateStatus('ready');
            
            // Add AI response
            this.addMessage(response.text, 'ai', response.type);
            
            // Update AI analysis panel
            if (response.analysis) {
                this.updateAnalysisPanel(response.analysis);
            }

        } catch (error) {
            console.error('Error processing message:', error);
            this.hideTypingIndicator();
            this.updateStatus('error');
            this.addMessage('I apologize, but I encountered an error processing your request. Please try again.', 'ai', 'error');
        }
    }

    async processUserMessageWithASIOne(message) {
        // Get current health data if available
        const healthData = this.getCurrentHealthData();
        
        // Prepare context for ASI:One
        const context = {
            user_id: this.userId,
            session_id: this.currentSessionId,
            timestamp: new Date().toISOString(),
            health_data: healthData,
            device_connected: this.arduinoMonitor ? this.arduinoMonitor.isConnected : false
        };

        // Call ASI:One API
        const asiOneResponse = await this.callASIOneAPI(message, context);
        
        // Process the response
        return this.processASIOneResponse(asiOneResponse, message, healthData);
    }

    async callASIOneAPI(message, context) {
        const payload = {
            model: "asi1-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a specialized health monitoring AI assistant integrated with Mify's Arduino-based health monitoring system. You have access to real-time health data and can provide intelligent analysis, recommendations, and troubleshooting assistance.`
                },
                {
                    role: "user",
                    content: this.buildHealthPrompt(message, context)
                }
            ],
            temperature: 0.7,
            max_tokens: 1500
        };

        try {
            const response = await fetch(`${this.asiOneBaseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.asiOneApiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`ASI:One API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('ASI:One API Response:', data);
            return data;

        } catch (error) {
            console.error('ASI:One API call failed:', error);
            throw error;
        }
    }

    buildHealthPrompt(message, context) {
        let prompt = `User Query: ${message}\n\n`;
        
        if (context.health_data) {
            prompt += `Current Health Data:\n`;
            prompt += `- Heart Rate: ${context.health_data.heartRate} BPM\n`;
            prompt += `- Movement Level: ${context.health_data.movement}\n`;
            prompt += `- Proximity: ${context.health_data.proximity} cm\n`;
            prompt += `- Circuit Status: ${context.health_data.circuit}\n`;
            prompt += `- Device Connected: ${context.device_connected}\n\n`;
        } else {
            prompt += `No current health data available (Arduino device not connected)\n\n`;
        }

        prompt += `Please provide:\n`;
        prompt += `1. Analysis of the user's query in the context of health monitoring\n`;
        prompt += `2. Specific recommendations based on available data\n`;
        prompt += `3. Any health concerns or alerts\n`;
        prompt += `4. Next steps for the user\n\n`;
        prompt += `Be helpful, accurate, and prioritize user safety. If health data is not available, guide the user on how to connect their Arduino device.`;

        return prompt;
    }

    processASIOneResponse(asiOneResponse, originalMessage, healthData) {
        let responseText = '';
        let responseType = 'info';
        let analysis = null;

        if (asiOneResponse.choices && asiOneResponse.choices.length > 0) {
            responseText = asiOneResponse.choices[0].message.content;
            
            // Determine response type based on content
            if (responseText.toLowerCase().includes('critical') || responseText.toLowerCase().includes('urgent')) {
                responseType = 'warning';
            } else if (responseText.toLowerCase().includes('good') || responseText.toLowerCase().includes('normal')) {
                responseType = 'success';
            } else if (responseText.toLowerCase().includes('error') || responseText.toLowerCase().includes('problem')) {
                responseType = 'error';
            }

            // Create analysis object
            analysis = {
                confidence: 0.9, // High confidence with ASI:One
                asi_one_response: asiOneResponse,
                health_data: healthData,
                timestamp: new Date().toISOString()
            };

        } else {
            responseText = "I'm having trouble processing your request right now. Please try again in a moment.";
            responseType = 'error';
        }

        return {
            text: responseText,
            type: responseType,
            analysis: analysis
        };
    }

    getCurrentHealthData() {
        if (this.arduinoMonitor && this.arduinoMonitor.isConnected) {
            return {
                heartRate: this.arduinoMonitor.heartRate || 0,
                movement: this.arduinoMonitor.movementLevel || 'Unknown',
                proximity: this.arduinoMonitor.proximityLevel || 0,
                circuit: this.arduinoMonitor.circuitStatus || 'Unknown',
                timestamp: new Date().toISOString()
            };
        }
        return null;
    }

    async generateHealthReport() {
        if (!this.arduinoMonitor || !this.arduinoMonitor.isConnected) {
            this.addMessage("I can't generate a health report because your Arduino device isn't connected. Please connect your device first.", 'ai', 'warning');
            return;
        }

        this.showTypingIndicator();
        this.updateStatus('processing');

        try {
            const healthData = this.getCurrentHealthData();
            const reportPrompt = `Generate a comprehensive health report for user ${this.userId} based on the current health data. Include analysis, trends, recommendations, and any concerns.`;
            
            const context = {
                user_id: this.userId,
                session_id: this.currentSessionId,
                timestamp: new Date().toISOString(),
                health_data: healthData,
                report_type: 'comprehensive'
            };

            const asiOneResponse = await this.callASIOneAPI(reportPrompt, context);
            const response = this.processASIOneResponse(asiOneResponse, reportPrompt, healthData);
            
            this.hideTypingIndicator();
            this.updateStatus('ready');
            this.addMessage(response.text, 'ai', response.type);

        } catch (error) {
            console.error('Error generating health report:', error);
            this.hideTypingIndicator();
            this.updateStatus('error');
            this.addMessage('I encountered an error generating your health report. Please try again.', 'ai', 'error');
        }
    }

    async discoverHealthAgents() {
        this.showTypingIndicator();
        this.updateStatus('processing');

        try {
            const discoveryPrompt = `Discover and recommend specialized health monitoring agents that could help with Arduino-based health monitoring, fitness tracking, and medical analysis.`;
            
            const context = {
                user_id: this.userId,
                session_id: this.currentSessionId,
                timestamp: new Date().toISOString(),
                discovery_type: 'health_agents'
            };

            const asiOneResponse = await this.callASIOneAPI(discoveryPrompt, context);
            const response = this.processASIOneResponse(asiOneResponse, discoveryPrompt, null);
            
            this.hideTypingIndicator();
            this.updateStatus('ready');
            this.addMessage(response.text, 'ai', response.type);

        } catch (error) {
            console.error('Error discovering health agents:', error);
            this.hideTypingIndicator();
            this.updateStatus('error');
            this.addMessage('I encountered an error discovering health agents. Please try again.', 'ai', 'error');
        }
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
                       type === 'welcome' ? 'sparkles-outline' :
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
            .replace(/•/g, '&bull;')
            .replace(/👋/g, '👋')
            .replace(/📊/g, '📊')
            .replace(/🏃/g, '🏃')
            .replace(/📏/g, '📏')
            .replace(/💡/g, '💡');
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
                    ASI:One is analyzing
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
                statusElement.textContent = 'ASI:One Ready';
                statusIcon.name = 'checkmark-circle-outline';
                this.aiStatus.className = 'status-indicator';
                break;
            case 'processing':
                statusElement.textContent = 'ASI:One Processing';
                statusIcon.name = 'time-outline';
                this.aiStatus.className = 'status-indicator processing';
                break;
            case 'error':
                statusElement.textContent = 'ASI:One Error';
                statusIcon.name = 'alert-circle-outline';
                this.aiStatus.className = 'status-indicator error';
                break;
        }
    }

    updateAnalysisPanel(analysis) {
        if (!analysis) return;
        
        const analysisContent = this.aiAnalysis;
        analysisContent.innerHTML = '';
        
        // ASI:One Status
        const asiOneStatus = analysisContent.appendChild(document.createElement('div'));
        asiOneStatus.className = 'analysis-item';
        asiOneStatus.innerHTML = `
            <div class="analysis-icon">
                <ion-icon name="sparkles-outline"></ion-icon>
            </div>
            <div class="analysis-text">
                <h4>ASI:One Status</h4>
                <p>Intelligent agent analysis active</p>
            </div>
        `;
        
        // Health Data Status
        const healthStatus = analysisContent.appendChild(document.createElement('div'));
        healthStatus.className = 'analysis-item';
        const hasHealthData = analysis.health_data !== null;
        const statusIcon = hasHealthData ? 'pulse-outline' : 'warning-outline';
        const statusText = hasHealthData ? 'Real-time data available' : 'No health data';
        healthStatus.innerHTML = `
            <div class="analysis-icon">
                <ion-icon name="${statusIcon}"></ion-icon>
            </div>
            <div class="analysis-text">
                <h4>Health Data</h4>
                <p>${statusText}</p>
            </div>
        `;
        
        // Confidence Level
        const confidence = analysisContent.appendChild(document.createElement('div'));
        confidence.className = 'analysis-item';
        const confidenceLevel = Math.round((analysis.confidence || 0.9) * 100);
        confidence.innerHTML = `
            <div class="analysis-icon">
                <ion-icon name="trending-up-outline"></ion-icon>
            </div>
            <div class="analysis-text">
                <h4>Analysis Confidence</h4>
                <p>${confidenceLevel}%</p>
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
        this.addWelcomeMessage();
    }

    exportChatHistory() {
        return {
            messages: this.messageHistory,
            user_id: this.userId,
            session_id: this.currentSessionId,
            exportedAt: Date.now()
        };
    }

    // Quick action methods
    async quickHealthCheck() {
        this.chatInput.value = "Can you analyze my current health data and provide insights?";
        await this.sendMessage();
    }

    async quickDeviceHelp() {
        this.chatInput.value = "I need help with my Arduino device setup and troubleshooting";
        await this.sendMessage();
    }

    async quickRecommendations() {
        this.chatInput.value = "What health recommendations do you have based on my current data?";
        await this.sendMessage();
    }
}

// Initialize ASI:One chat interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other components to initialize
    setTimeout(() => {
        window.aiChatASIOne = new AIChatInterfaceASIOne();
        
        // Add quick action buttons for ASI:One features
        const quickActionsContainer = document.querySelector('.input-actions');
        if (quickActionsContainer) {
            const asiOneActions = document.createElement('div');
            asiOneActions.className = 'asi-one-actions';
            asiOneActions.innerHTML = `
                <button class="quick-action" data-prompt="Generate a comprehensive health report">📊 Health Report</button>
                <button class="quick-action" data-prompt="Discover specialized health monitoring agents">🔍 Find Agents</button>
                <button class="quick-action" data-prompt="Analyze my health data for anomalies">⚠️ Check Anomalies</button>
            `;
            quickActionsContainer.appendChild(asiOneActions);
        }
    }, 1000);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIChatInterfaceASIOne;
}
