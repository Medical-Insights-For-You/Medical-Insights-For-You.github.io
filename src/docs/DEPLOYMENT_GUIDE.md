# Mify Health Monitoring - ASI:One Integration Deployment Guide

## Overview

This guide covers deploying the Mify Health Monitoring system with Fetch.ai's ASI:One integration for intelligent agent discovery and processing.

## Prerequisites

### 1. Python Environment
```bash
# Create virtual environment
python -m venv mify-env
source mify-env/bin/activate  # On Windows: mify-env\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. ASI:One API Key
- API Key: `sk_8517f5128130429bb06a779ab5502ca0bc7ece1f61be45c6bae5a8c726c06f0e`
- Base URL: `https://api.asi1.ai/v1`
- Model: `asi1-mini`

### 3. Arduino Setup
- Arduino UNO R4 WiFi
- Ultrasonic Sensor (HC-SR04)
- Breadboard and jumper wires
- LED indicators

## Deployment Steps

### 1. Backend Agent Deployment

#### Option A: Local Development
```bash
# Run the basic health agent
cd agents
python mify_health_agent.py

# Run the ASI:One integrated agent
python mify_health_agent_asi_one.py

# Run the adapter-enabled agent
python mify_health_agent_adapters.py
```

#### Option B: Agentverse Deployment
```bash
# Install uAgents CLI
pip install uagents-cli

# Deploy to Agentverse
uagents deploy agents/mify_health_agent_asi_one.py --name mify-health-asi-one

# Deploy with adapters
uagents deploy agents/mify_health_agent_adapters.py --name mify-health-adapters
```

### 2. Frontend Deployment

#### GitHub Pages (Current)
```bash
# Commit and push changes
git add .
git commit -m "Add ASI:One integration for intelligent health monitoring"
git push origin main

# The site will be available at:
# https://medical-insights-for-you.github.io/
```

#### Local Development Server
```bash
# Serve the frontend locally
python -m http.server 8000

# Access at: http://localhost:8000
```

### 3. Arduino Code Upload

1. Open Arduino IDE
2. Load `arduino/ultrasonic_health_monitor.ino`
3. Select Arduino UNO R4 WiFi board
4. Upload to device
5. Open Serial Monitor (9600 baud)

## Configuration

### Environment Variables
```bash
# ASI:One API Configuration
export ASI_ONE_API_KEY="sk_8517f5128130429bb06a779ab5502ca0bc7ece1f61be45c6bae5a8c726c06f0e"
export ASI_ONE_BASE_URL="https://api.asi1.ai/v1"
export ASI_ONE_MODEL="asi1-mini"

# Agent Configuration
export AGENT_PORT=8002
export AGENT_SEED="mify-health-agent-asi-one-seed-phrase"
```

### Frontend Configuration
The ASI:One API key is configured in `js/ai-chat-asi-one.js`:
```javascript
this.asiOneApiKey = 'sk_8517f5128130429bb06a779ab5502ca0bc7ece1f61be45c6bae5a8c726c06f0e';
```

## Testing

### 1. Test ASI:One Integration
```bash
cd agents
python asi_one_integration.py
```

### 2. Test Health Agent
```bash
cd agents
python mify_health_agent_asi_one.py
```

### 3. Test Frontend
1. Open browser to deployed site
2. Navigate to "AI Assistant" section
3. Try sample queries:
   - "Analyze my current health data"
   - "Generate a health report"
   - "Find specialized health agents"

## Features

### ASI:One Integration
- **Intelligent Query Processing**: Natural language health queries
- **Agent Discovery**: Find specialized health monitoring agents
- **Real-time Analysis**: Process Arduino sensor data with AI
- **Health Reports**: Generate comprehensive health insights
- **Emergency Detection**: Critical health anomaly detection

### Health Monitoring
- **Real-time Data**: Arduino sensor data processing
- **Trend Analysis**: Historical health data analysis
- **Recommendations**: AI-powered health recommendations
- **Alerts**: Critical health condition alerts

### Multi-Agent Support
- **LangChain Integration**: Advanced LLM workflows
- **CrewAI Teams**: Multi-agent collaboration
- **MCP Tools**: Real-world action capabilities
- **Agentverse Deployment**: Discoverable agents

## API Endpoints

### ASI:One API
```
POST https://api.asi1.ai/v1/chat/completions
Headers:
  Content-Type: application/json
  Authorization: Bearer sk_8517f5128130429bb06a779ab5502ca0bc7ece1f61be45c6bae5a8c726c06f0e

Body:
{
  "model": "asi1-mini",
  "messages": [
    {"role": "user", "content": "Your health query here"}
  ],
  "temperature": 0.7,
  "max_tokens": 1500
}
```

### Health Agent API
```
POST http://localhost:8002/submit
Content-Type: application/json

Body:
{
  "type": "health_data",
  "data": {
    "heart_rate": 75,
    "movement_level": "Medium",
    "proximity": 15.5,
    "circuit_status": "Closed",
    "timestamp": "2024-01-01T12:00:00Z",
    "device_id": "arduino_001"
  },
  "user_id": "user_123",
  "session_id": "session_456"
}
```

## Troubleshooting

### Common Issues

1. **ASI:One API Errors**
   - Check API key validity
   - Verify network connectivity
   - Check rate limits

2. **Arduino Connection Issues**
   - Verify USB connection
   - Check serial port permissions
   - Ensure correct baud rate (9600)

3. **Agent Deployment Issues**
   - Check Python dependencies
   - Verify port availability
   - Check firewall settings

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
python mify_health_agent_asi_one.py
```

## Security Considerations

1. **API Key Protection**
   - Store API keys securely
   - Use environment variables
   - Rotate keys regularly

2. **Health Data Privacy**
   - Encrypt sensitive data
   - Implement access controls
   - Follow HIPAA guidelines

3. **Network Security**
   - Use HTTPS for production
   - Implement CORS policies
   - Validate input data

## Monitoring and Maintenance

### Health Checks
```bash
# Check agent status
curl http://localhost:8002/health

# Check ASI:One connectivity
curl -H "Authorization: Bearer $ASI_ONE_API_KEY" \
     https://api.asi1.ai/v1/models
```

### Logs
- Agent logs: `logs/agent.log`
- Frontend logs: Browser console
- Arduino logs: Serial monitor

### Updates
```bash
# Update dependencies
pip install -r requirements.txt --upgrade

# Update frontend
git pull origin main
```

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error messages
3. Test individual components
4. Contact the development team

## License

This project is licensed under the MIT License. See LICENSE file for details.
