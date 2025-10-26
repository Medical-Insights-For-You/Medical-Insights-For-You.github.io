/**
 * Arduino Data API Endpoint
 * 
 * This file provides API endpoints for receiving and processing
 * Arduino health data. It can be deployed as a serverless function
 * or integrated into a web server.
 * 
 * Endpoints:
 * - POST /api/arduino-data - Receive health data
 * - GET /api/arduino-data/health - Health check
 * - GET /api/arduino-data/status - System status
 * - POST /api/arduino-data/configure - Update configuration
 */

// For Node.js/Express server
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// For serverless functions (Vercel, Netlify, etc.)
// This code can be adapted for serverless deployment

class ArduinoDataAPI {
    constructor() {
        this.app = express();
        this.dataStore = new Map();
        this.aiAgent = new AIHealthAgent();
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // CORS configuration
        this.app.use(cors({
            origin: ['https://medical-insights-for-you.github.io', 'http://localhost:3000'],
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-ID', 'X-Session-ID']
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later.'
        });
        this.app.use('/api/', limiter);

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Health data endpoint
        this.app.post('/api/arduino-data', this.handleHealthData.bind(this));
        
        // Health check endpoint
        this.app.get('/api/arduino-data/health', this.handleHealthCheck.bind(this));
        
        // System status endpoint
        this.app.get('/api/arduino-data/status', this.handleSystemStatus.bind(this));
        
        // Configuration endpoint
        this.app.post('/api/arduino-data/configure', this.handleConfiguration.bind(this));
        
        // Data retrieval endpoints
        this.app.get('/api/arduino-data/history/:deviceId', this.handleDataHistory.bind(this));
        this.app.get('/api/arduino-data/insights/:deviceId', this.handleInsights.bind(this));
        
        // Error handling
        this.app.use(this.handleError.bind(this));
    }

    async handleHealthData(req, res) {
        try {
            // Validate request
            const validation = this.validateHealthDataRequest(req);
            if (!validation.valid) {
                return res.status(400).json({
                    error: 'Invalid request',
                    details: validation.errors
                });
            }

            const data = req.body;
            const deviceId = req.headers['x-device-id'] || data.deviceId;
            const sessionId = req.headers['x-session-id'] || data.sessionId;

            // Process data with AI agent
            const analysis = this.aiAgent.processData(data);
            
            // Store data
            this.storeData(deviceId, sessionId, data, analysis);

            // Generate response
            const response = {
                success: true,
                timestamp: Date.now(),
                deviceId: deviceId,
                sessionId: sessionId,
                analysis: analysis,
                recommendations: this.generateRecommendations(analysis),
                nextTransmission: this.calculateNextTransmission(data)
            };

            res.status(200).json(response);

        } catch (error) {
            console.error('Error processing health data:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    async handleHealthCheck(req, res) {
        try {
            const deviceId = req.query.deviceId;
            const sessionId = req.query.sessionId;

            const healthStatus = {
                status: 'healthy',
                timestamp: Date.now(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                dataStore: {
                    totalDevices: this.dataStore.size,
                    totalSessions: this.getTotalSessions()
                },
                aiAgent: {
                    status: 'active',
                    dataPoints: this.aiAgent.dataHistory.length,
                    confidence: this.aiAgent.calculateConfidence({})
                }
            };

            if (deviceId) {
                const deviceData = this.dataStore.get(deviceId);
                if (deviceData) {
                    healthStatus.device = {
                        lastSeen: deviceData.lastSeen,
                        sessionCount: deviceData.sessions.size,
                        dataPoints: deviceData.totalDataPoints
                    };
                }
            }

            res.status(200).json(healthStatus);

        } catch (error) {
            console.error('Error in health check:', error);
            res.status(500).json({
                error: 'Health check failed',
                message: error.message
            });
        }
    }

    async handleSystemStatus(req, res) {
        try {
            const status = {
                system: 'operational',
                timestamp: Date.now(),
                version: '1.0.0',
                endpoints: {
                    healthData: '/api/arduino-data',
                    healthCheck: '/api/arduino-data/health',
                    systemStatus: '/api/arduino-data/status',
                    configuration: '/api/arduino-data/configure'
                },
                statistics: {
                    totalDevices: this.dataStore.size,
                    totalSessions: this.getTotalSessions(),
                    totalDataPoints: this.getTotalDataPoints(),
                    averageDataPointsPerDevice: this.getAverageDataPointsPerDevice()
                },
                aiAgent: {
                    status: 'active',
                    dataHistorySize: this.aiAgent.dataHistory.length,
                    baselineMetrics: this.aiAgent.baselineMetrics,
                    anomalyThresholds: this.aiAgent.anomalyThresholds
                }
            };

            res.status(200).json(status);

        } catch (error) {
            console.error('Error getting system status:', error);
            res.status(500).json({
                error: 'Failed to get system status',
                message: error.message
            });
        }
    }

    async handleConfiguration(req, res) {
        try {
            const config = req.body;
            const deviceId = req.headers['x-device-id'];

            // Validate configuration
            if (!this.validateConfiguration(config)) {
                return res.status(400).json({
                    error: 'Invalid configuration',
                    message: 'Configuration data is invalid'
                });
            }

            // Update AI agent configuration
            this.aiAgent.importConfiguration(config);

            // Store device-specific configuration
            if (deviceId) {
                const deviceData = this.dataStore.get(deviceId);
                if (deviceData) {
                    deviceData.configuration = config;
                }
            }

            res.status(200).json({
                success: true,
                message: 'Configuration updated successfully',
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Error updating configuration:', error);
            res.status(500).json({
                error: 'Failed to update configuration',
                message: error.message
            });
        }
    }

    async handleDataHistory(req, res) {
        try {
            const deviceId = req.params.deviceId;
            const limit = parseInt(req.query.limit) || 100;
            const offset = parseInt(req.query.offset) || 0;

            const deviceData = this.dataStore.get(deviceId);
            if (!deviceData) {
                return res.status(404).json({
                    error: 'Device not found',
                    deviceId: deviceId
                });
            }

            const history = deviceData.history.slice(offset, offset + limit);
            
            res.status(200).json({
                deviceId: deviceId,
                totalDataPoints: deviceData.history.length,
                returnedDataPoints: history.length,
                offset: offset,
                limit: limit,
                data: history
            });

        } catch (error) {
            console.error('Error retrieving data history:', error);
            res.status(500).json({
                error: 'Failed to retrieve data history',
                message: error.message
            });
        }
    }

    async handleInsights(req, res) {
        try {
            const deviceId = req.params.deviceId;
            const deviceData = this.dataStore.get(deviceId);
            
            if (!deviceData) {
                return res.status(404).json({
                    error: 'Device not found',
                    deviceId: deviceId
                });
            }

            // Get latest analysis
            const latestData = deviceData.history[deviceData.history.length - 1];
            const analysis = this.aiAgent.processData(latestData);

            res.status(200).json({
                deviceId: deviceId,
                timestamp: Date.now(),
                insights: analysis.insights,
                riskAssessment: analysis.riskAssessment,
                recommendations: analysis.recommendations,
                confidence: analysis.confidence
            });

        } catch (error) {
            console.error('Error generating insights:', error);
            res.status(500).json({
                error: 'Failed to generate insights',
                message: error.message
            });
        }
    }

    validateHealthDataRequest(req) {
        const errors = [];
        const data = req.body;

        // Required fields
        const requiredFields = ['timestamp', 'heartRate', 'movement', 'proximity', 'circuitActive'];
        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null) {
                errors.push(`Missing required field: ${field}`);
            }
        }

        // Validate data ranges
        if (data.heartRate && (data.heartRate < 30 || data.heartRate > 200)) {
            errors.push('Heart rate out of valid range (30-200 BPM)');
        }

        if (data.movement && (data.movement < 0 || data.movement > 100)) {
            errors.push('Movement level out of valid range (0-100%)');
        }

        if (data.proximity && (data.proximity < 0 || data.proximity > 50)) {
            errors.push('Proximity out of valid range (0-50 cm)');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    validateConfiguration(config) {
        // Basic configuration validation
        if (!config || typeof config !== 'object') {
            return false;
        }

        // Validate specific configuration fields
        if (config.baselines && typeof config.baselines !== 'object') {
            return false;
        }

        if (config.thresholds && typeof config.thresholds !== 'object') {
            return false;
        }

        return true;
    }

    storeData(deviceId, sessionId, data, analysis) {
        if (!this.dataStore.has(deviceId)) {
            this.dataStore.set(deviceId, {
                deviceId: deviceId,
                sessions: new Map(),
                history: [],
                totalDataPoints: 0,
                lastSeen: Date.now(),
                configuration: {}
            });
        }

        const deviceData = this.dataStore.get(deviceId);
        
        // Update session data
        if (!deviceData.sessions.has(sessionId)) {
            deviceData.sessions.set(sessionId, {
                sessionId: sessionId,
                startTime: Date.now(),
                dataPoints: 0,
                lastData: null
            });
        }

        const sessionData = deviceData.sessions.get(sessionId);
        sessionData.dataPoints++;
        sessionData.lastData = data;

        // Add to history
        deviceData.history.push({
            ...data,
            analysis: analysis,
            receivedAt: Date.now()
        });

        // Keep only last 1000 data points per device
        if (deviceData.history.length > 1000) {
            deviceData.history.shift();
        }

        deviceData.totalDataPoints++;
        deviceData.lastSeen = Date.now();
    }

    generateRecommendations(analysis) {
        const recommendations = [];

        if (analysis.anomalies && analysis.anomalies.length > 0) {
            analysis.anomalies.forEach(anomaly => {
                if (anomaly.severity === 'critical') {
                    recommendations.push({
                        type: 'urgent',
                        message: `Critical ${anomaly.type} detected: ${anomaly.message}`,
                        action: 'Seek immediate medical attention'
                    });
                } else if (anomaly.severity === 'warning') {
                    recommendations.push({
                        type: 'warning',
                        message: `Warning: ${anomaly.message}`,
                        action: 'Monitor closely and consider consulting healthcare provider'
                    });
                }
            });
        }

        if (analysis.trends && analysis.trends.overall === 'declining') {
            recommendations.push({
                type: 'lifestyle',
                message: 'Health trends are declining',
                action: 'Consider lifestyle modifications and consult healthcare provider'
            });
        }

        return recommendations;
    }

    calculateNextTransmission(data) {
        // Calculate optimal next transmission time based on data patterns
        const baseInterval = 5000; // 5 seconds base
        
        // Adjust based on anomalies
        if (data.heartRate > 100 || data.heartRate < 50) {
            return baseInterval / 2; // More frequent for anomalies
        }
        
        return baseInterval;
    }

    getTotalSessions() {
        let total = 0;
        for (const deviceData of this.dataStore.values()) {
            total += deviceData.sessions.size;
        }
        return total;
    }

    getTotalDataPoints() {
        let total = 0;
        for (const deviceData of this.dataStore.values()) {
            total += deviceData.totalDataPoints;
        }
        return total;
    }

    getAverageDataPointsPerDevice() {
        if (this.dataStore.size === 0) return 0;
        return this.getTotalDataPoints() / this.dataStore.size;
    }

    handleError(err, req, res, next) {
        console.error('API Error:', err);
        
        res.status(500).json({
            error: 'Internal server error',
            message: err.message,
            timestamp: Date.now()
        });
    }

    // Server startup
    start(port = 3000) {
        this.app.listen(port, () => {
            console.log(`Arduino Data API server running on port ${port}`);
            console.log(`Health data endpoint: http://localhost:${port}/api/arduino-data`);
            console.log(`Health check endpoint: http://localhost:${port}/api/arduino-data/health`);
        });
    }
}

// Export for use
module.exports = ArduinoDataAPI;

// For direct execution
if (require.main === module) {
    const api = new ArduinoDataAPI();
    api.start(process.env.PORT || 3000);
}

// Serverless function wrapper (for Vercel, Netlify, etc.)
exports.handler = async (event, context) => {
    const api = new ArduinoDataAPI();
    
    // Convert serverless event to Express request/response
    const req = {
        method: event.httpMethod,
        path: event.path,
        headers: event.headers,
        body: event.body ? JSON.parse(event.body) : {},
        query: event.queryStringParameters || {},
        params: event.pathParameters || {}
    };

    const res = {
        status: (code) => ({
            json: (data) => ({
                statusCode: code,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Device-ID, X-Session-ID'
                },
                body: JSON.stringify(data)
            })
        })
    };

    try {
        // Route the request
        if (req.path === '/api/arduino-data' && req.method === 'POST') {
            await api.handleHealthData(req, res);
        } else if (req.path === '/api/arduino-data/health' && req.method === 'GET') {
            await api.handleHealthCheck(req, res);
        } else if (req.path === '/api/arduino-data/status' && req.method === 'GET') {
            await api.handleSystemStatus(req, res);
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Endpoint not found' })
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
