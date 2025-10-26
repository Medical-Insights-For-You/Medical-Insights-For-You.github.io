/**
 * AI Health Agent for Arduino Data Processing
 * 
 * This AI agent processes real-time health data from Arduino sensors
 * and provides intelligent insights, anomaly detection, and health recommendations.
 * 
 * Features:
 * - Real-time data analysis
 * - Pattern recognition and trend analysis
 * - Anomaly detection
 * - Health risk assessment
 * - Personalized recommendations
 * - Predictive analytics
 * - Machine learning algorithms
 */

class AIHealthAgent {
    constructor() {
        this.dataHistory = [];
        this.baselineMetrics = {};
        this.anomalyThresholds = {};
        this.healthPatterns = {};
        this.recommendations = [];
        this.riskFactors = [];
        
        // Initialize AI models
        this.initializeModels();
        this.initializeBaselines();
        this.initializeThresholds();
        
        // Machine learning parameters
        this.learningRate = 0.01;
        this.patternWindow = 30; // 30 data points for pattern analysis
        this.anomalySensitivity = 0.8; // 0-1, higher = more sensitive
        
        // Health assessment weights
        this.healthWeights = {
            heartRate: 0.3,
            movement: 0.2,
            proximity: 0.1,
            temperature: 0.2,
            circuitStability: 0.2
        };
        
        console.log('AI Health Agent initialized');
    }

    initializeModels() {
        // Initialize machine learning models
        this.models = {
            heartRatePredictor: new HeartRatePredictor(),
            anomalyDetector: new AnomalyDetector(),
            patternRecognizer: new PatternRecognizer(),
            riskAssessor: new HealthRiskAssessor(),
            recommendationEngine: new RecommendationEngine()
        };
    }

    initializeBaselines() {
        // Initialize baseline health metrics
        this.baselineMetrics = {
            heartRate: {
                resting: 70,
                active: 85,
                max: 100,
                min: 60
            },
            movement: {
                sedentary: 20,
                light: 40,
                moderate: 60,
                vigorous: 80
            },
            proximity: {
                optimal: 10,
                range: { min: 5, max: 15 }
            },
            temperature: {
                normal: 36.5,
                range: { min: 35.5, max: 37.5 }
            },
            circuitStability: {
                optimal: 0.95, // 95% uptime
                acceptable: 0.8
            }
        };
    }

    initializeThresholds() {
        // Initialize anomaly detection thresholds
        this.anomalyThresholds = {
            heartRate: {
                critical: 0.3, // 30% deviation from baseline
                warning: 0.2,  // 20% deviation
                normal: 0.1    // 10% deviation
            },
            movement: {
                critical: 0.4,
                warning: 0.3,
                normal: 0.2
            },
            temperature: {
                critical: 0.15, // 1.5°C deviation
                warning: 0.1,   // 1°C deviation
                normal: 0.05    // 0.5°C deviation
            },
            proximity: {
                critical: 0.5, // 50% deviation
                warning: 0.3,
                normal: 0.2
            }
        };
    }

    /**
     * Process incoming Arduino health data
     */
    processData(data) {
        try {
            // Validate data
            if (!this.validateData(data)) {
                console.error('Invalid health data received');
                return null;
            }

            // Add to history
            this.addToHistory(data);

            // Perform AI analysis
            const analysis = this.performAnalysis(data);

            // Update models with new data
            this.updateModels(data);

            // Generate insights
            const insights = this.generateInsights(analysis);

            // Assess health risks
            const riskAssessment = this.assessHealthRisks(data, analysis);

            // Generate recommendations
            const recommendations = this.generateRecommendations(insights, riskAssessment);

            return {
                timestamp: data.timestamp,
                analysis: analysis,
                insights: insights,
                riskAssessment: riskAssessment,
                recommendations: recommendations,
                confidence: this.calculateConfidence(analysis)
            };

        } catch (error) {
            console.error('Error processing health data:', error);
            return null;
        }
    }

    validateData(data) {
        const requiredFields = ['timestamp', 'heartRate', 'movement', 'proximity', 'circuitActive'];
        
        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null) {
                return false;
            }
        }

        // Validate ranges
        if (data.heartRate < 30 || data.heartRate > 200) return false;
        if (data.movement < 0 || data.movement > 100) return false;
        if (data.proximity < 0 || data.proximity > 50) return false;

        return true;
    }

    addToHistory(data) {
        this.dataHistory.push({
            ...data,
            processedAt: Date.now()
        });

        // Keep only last 1000 data points
        if (this.dataHistory.length > 1000) {
            this.dataHistory.shift();
        }
    }

    performAnalysis(data) {
        const analysis = {
            trends: this.analyzeTrends(data),
            anomalies: this.detectAnomalies(data),
            patterns: this.recognizePatterns(data),
            correlations: this.findCorrelations(data),
            predictions: this.makePredictions(data)
        };

        return analysis;
    }

    analyzeTrends(data) {
        if (this.dataHistory.length < 10) {
            return { status: 'insufficient_data' };
        }

        const recentData = this.dataHistory.slice(-10);
        const trends = {};

        // Heart rate trend
        trends.heartRate = this.calculateTrend(recentData.map(d => d.heartRate));
        
        // Movement trend
        trends.movement = this.calculateTrend(recentData.map(d => d.movement));
        
        // Proximity trend
        trends.proximity = this.calculateTrend(recentData.map(d => d.proximity));

        // Overall health trend
        trends.overall = this.calculateOverallTrend(trends);

        return trends;
    }

    calculateTrend(values) {
        if (values.length < 2) return 'stable';

        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));

        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        const change = (secondAvg - firstAvg) / firstAvg;

        if (change > 0.1) return 'increasing';
        if (change < -0.1) return 'decreasing';
        return 'stable';
    }

    calculateOverallTrend(trends) {
        const trendScores = {
            'increasing': 1,
            'stable': 0,
            'decreasing': -1
        };

        const scores = Object.values(trends).map(trend => trendScores[trend] || 0);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        if (avgScore > 0.3) return 'improving';
        if (avgScore < -0.3) return 'declining';
        return 'stable';
    }

    detectAnomalies(data) {
        const anomalies = [];

        // Heart rate anomaly
        const hrAnomaly = this.detectHeartRateAnomaly(data.heartRate);
        if (hrAnomaly) anomalies.push(hrAnomaly);

        // Movement anomaly
        const movementAnomaly = this.detectMovementAnomaly(data.movement);
        if (movementAnomaly) anomalies.push(movementAnomaly);

        // Temperature anomaly (if available)
        if (data.temperature) {
            const tempAnomaly = this.detectTemperatureAnomaly(data.temperature);
            if (tempAnomaly) anomalies.push(tempAnomaly);
        }

        // Proximity anomaly
        const proximityAnomaly = this.detectProximityAnomaly(data.proximity);
        if (proximityAnomaly) anomalies.push(proximityAnomaly);

        return anomalies;
    }

    detectHeartRateAnomaly(heartRate) {
        const baseline = this.baselineMetrics.heartRate.resting;
        const deviation = Math.abs(heartRate - baseline) / baseline;

        if (deviation > this.anomalyThresholds.heartRate.critical) {
            return {
                type: 'heart_rate',
                severity: 'critical',
                value: heartRate,
                expected: baseline,
                deviation: deviation,
                message: `Critical heart rate anomaly: ${heartRate} BPM (expected ~${baseline} BPM)`
            };
        } else if (deviation > this.anomalyThresholds.heartRate.warning) {
            return {
                type: 'heart_rate',
                severity: 'warning',
                value: heartRate,
                expected: baseline,
                deviation: deviation,
                message: `Heart rate warning: ${heartRate} BPM (expected ~${baseline} BPM)`
            };
        }

        return null;
    }

    detectMovementAnomaly(movement) {
        const baseline = this.baselineMetrics.movement.light;
        const deviation = Math.abs(movement - baseline) / baseline;

        if (deviation > this.anomalyThresholds.movement.critical) {
            return {
                type: 'movement',
                severity: 'critical',
                value: movement,
                expected: baseline,
                deviation: deviation,
                message: `Critical movement anomaly: ${movement}% (expected ~${baseline}%)`
            };
        }

        return null;
    }

    detectTemperatureAnomaly(temperature) {
        const baseline = this.baselineMetrics.temperature.normal;
        const deviation = Math.abs(temperature - baseline);

        if (deviation > this.anomalyThresholds.temperature.critical) {
            return {
                type: 'temperature',
                severity: 'critical',
                value: temperature,
                expected: baseline,
                deviation: deviation,
                message: `Critical temperature anomaly: ${temperature}°C (expected ~${baseline}°C)`
            };
        }

        return null;
    }

    detectProximityAnomaly(proximity) {
        const baseline = this.baselineMetrics.proximity.optimal;
        const deviation = Math.abs(proximity - baseline) / baseline;

        if (deviation > this.anomalyThresholds.proximity.critical) {
            return {
                type: 'proximity',
                severity: 'critical',
                value: proximity,
                expected: baseline,
                deviation: deviation,
                message: `Critical proximity anomaly: ${proximity}cm (expected ~${baseline}cm)`
            };
        }

        return null;
    }

    recognizePatterns(data) {
        if (this.dataHistory.length < this.patternWindow) {
            return { status: 'insufficient_data' };
        }

        const patterns = {
            circadian: this.detectCircadianPattern(),
            activity: this.detectActivityPattern(),
            health: this.detectHealthPattern(),
            device: this.detectDevicePattern()
        };

        return patterns;
    }

    detectCircadianPattern() {
        // Analyze data over 24-hour periods to detect circadian rhythms
        const hourlyData = this.groupDataByHour();
        
        if (Object.keys(hourlyData).length < 12) {
            return { status: 'insufficient_data' };
        }

        // Look for patterns in heart rate and movement
        const hrPattern = this.analyzeHourlyPattern(hourlyData, 'heartRate');
        const movementPattern = this.analyzeHourlyPattern(hourlyData, 'movement');

        return {
            heartRate: hrPattern,
            movement: movementPattern,
            confidence: this.calculatePatternConfidence(hrPattern, movementPattern)
        };
    }

    detectActivityPattern() {
        const recentData = this.dataHistory.slice(-this.patternWindow);
        const activityLevels = recentData.map(d => this.categorizeActivity(d.movement));

        return {
            sedentary: activityLevels.filter(a => a === 'sedentary').length / activityLevels.length,
            light: activityLevels.filter(a => a === 'light').length / activityLevels.length,
            moderate: activityLevels.filter(a => a === 'moderate').length / activityLevels.length,
            vigorous: activityLevels.filter(a => a === 'vigorous').length / activityLevels.length,
            dominant: this.findDominantActivity(activityLevels)
        };
    }

    detectHealthPattern() {
        const recentData = this.dataHistory.slice(-this.patternWindow);
        
        return {
            stability: this.calculateHealthStability(recentData),
            variability: this.calculateHealthVariability(recentData),
            consistency: this.calculateHealthConsistency(recentData)
        };
    }

    detectDevicePattern() {
        const recentData = this.dataHistory.slice(-this.patternWindow);
        const circuitUptime = recentData.filter(d => d.circuitActive).length / recentData.length;

        return {
            circuitUptime: circuitUptime,
            stability: circuitUptime > 0.9 ? 'excellent' : circuitUptime > 0.8 ? 'good' : 'poor',
            recommendations: this.getDeviceRecommendations(circuitUptime)
        };
    }

    findCorrelations(data) {
        if (this.dataHistory.length < 20) {
            return { status: 'insufficient_data' };
        }

        const recentData = this.dataHistory.slice(-20);
        
        return {
            heartRateMovement: this.calculateCorrelation(
                recentData.map(d => d.heartRate),
                recentData.map(d => d.movement)
            ),
            proximityMovement: this.calculateCorrelation(
                recentData.map(d => d.proximity),
                recentData.map(d => d.movement)
            ),
            circuitHealth: this.calculateCorrelation(
                recentData.map(d => d.circuitActive ? 1 : 0),
                recentData.map(d => d.heartRate)
            )
        };
    }

    calculateCorrelation(x, y) {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

        const correlation = (n * sumXY - sumX * sumY) / 
            Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        return isNaN(correlation) ? 0 : correlation;
    }

    makePredictions(data) {
        const predictions = {
            heartRate: this.predictHeartRate(data),
            movement: this.predictMovement(data),
            healthRisk: this.predictHealthRisk(data),
            deviceStatus: this.predictDeviceStatus(data)
        };

        return predictions;
    }

    predictHeartRate(data) {
        if (this.dataHistory.length < 10) {
            return { value: data.heartRate, confidence: 0.1 };
        }

        const recentHR = this.dataHistory.slice(-10).map(d => d.heartRate);
        const trend = this.calculateTrend(recentHR);
        
        let predictedValue = data.heartRate;
        if (trend === 'increasing') {
            predictedValue *= 1.02; // 2% increase
        } else if (trend === 'decreasing') {
            predictedValue *= 0.98; // 2% decrease
        }

        return {
            value: Math.round(predictedValue),
            confidence: this.calculatePredictionConfidence(recentHR),
            trend: trend
        };
    }

    predictMovement(data) {
        if (this.dataHistory.length < 10) {
            return { value: data.movement, confidence: 0.1 };
        }

        const recentMovement = this.dataHistory.slice(-10).map(d => d.movement);
        const trend = this.calculateTrend(recentMovement);
        
        let predictedValue = data.movement;
        if (trend === 'increasing') {
            predictedValue = Math.min(100, predictedValue + 5);
        } else if (trend === 'decreasing') {
            predictedValue = Math.max(0, predictedValue - 5);
        }

        return {
            value: Math.round(predictedValue),
            confidence: this.calculatePredictionConfidence(recentMovement),
            trend: trend
        };
    }

    predictHealthRisk(data) {
        const riskFactors = this.identifyRiskFactors(data);
        const riskScore = this.calculateRiskScore(riskFactors);

        return {
            score: riskScore,
            level: this.categorizeRiskLevel(riskScore),
            factors: riskFactors,
            confidence: 0.8
        };
    }

    predictDeviceStatus(data) {
        const circuitStability = this.calculateCircuitStability();
        
        return {
            circuitUptime: circuitStability,
            predictedUptime: circuitStability > 0.9 ? 'excellent' : 'needs_attention',
            confidence: 0.7
        };
    }

    generateInsights(analysis) {
        const insights = [];

        // Trend insights
        if (analysis.trends.overall === 'improving') {
            insights.push({
                type: 'positive',
                category: 'trend',
                title: 'Health Trends Improving',
                message: 'Your health metrics are showing positive trends over time.',
                confidence: 0.8
            });
        } else if (analysis.trends.overall === 'declining') {
            insights.push({
                type: 'warning',
                category: 'trend',
                title: 'Health Trends Declining',
                message: 'Your health metrics are showing concerning trends. Consider lifestyle adjustments.',
                confidence: 0.7
            });
        }

        // Anomaly insights
        analysis.anomalies.forEach(anomaly => {
            insights.push({
                type: anomaly.severity === 'critical' ? 'critical' : 'warning',
                category: 'anomaly',
                title: `${anomaly.type.replace('_', ' ').toUpperCase()} Alert`,
                message: anomaly.message,
                confidence: 0.9
            });
        });

        // Pattern insights
        if (analysis.patterns.activity) {
            const activityInsight = this.generateActivityInsight(analysis.patterns.activity);
            if (activityInsight) insights.push(activityInsight);
        }

        // Device insights
        if (analysis.patterns.device) {
            const deviceInsight = this.generateDeviceInsight(analysis.patterns.device);
            if (deviceInsight) insights.push(deviceInsight);
        }

        return insights;
    }

    assessHealthRisks(data, analysis) {
        const risks = [];

        // Cardiovascular risk
        const cardiovascularRisk = this.assessCardiovascularRisk(data, analysis);
        if (cardiovascularRisk.level !== 'low') {
            risks.push(cardiovascularRisk);
        }

        // Activity risk
        const activityRisk = this.assessActivityRisk(data, analysis);
        if (activityRisk.level !== 'low') {
            risks.push(activityRisk);
        }

        // Device reliability risk
        const deviceRisk = this.assessDeviceRisk(data, analysis);
        if (deviceRisk.level !== 'low') {
            risks.push(deviceRisk);
        }

        return {
            overall: this.calculateOverallRisk(risks),
            risks: risks,
            recommendations: this.generateRiskRecommendations(risks)
        };
    }

    generateRecommendations(insights, riskAssessment) {
        const recommendations = [];

        // Health recommendations
        const healthRecs = this.generateHealthRecommendations(insights, riskAssessment);
        recommendations.push(...healthRecs);

        // Device recommendations
        const deviceRecs = this.generateDeviceRecommendations(insights, riskAssessment);
        recommendations.push(...deviceRecs);

        // Lifestyle recommendations
        const lifestyleRecs = this.generateLifestyleRecommendations(insights, riskAssessment);
        recommendations.push(...lifestyleRecs);

        return recommendations;
    }

    generateHealthRecommendations(insights, riskAssessment) {
        const recommendations = [];

        // Heart rate recommendations
        const hrInsights = insights.filter(i => i.category === 'anomaly' && i.title.includes('HEART RATE'));
        if (hrInsights.length > 0) {
            recommendations.push({
                type: 'health',
                priority: 'high',
                title: 'Heart Rate Monitoring',
                description: 'Your heart rate shows unusual patterns. Consider consulting a healthcare provider.',
                action: 'Schedule a medical checkup',
                timeframe: 'within 1 week'
            });
        }

        // Activity recommendations
        const activityInsights = insights.filter(i => i.category === 'trend' && i.title.includes('Activity'));
        if (activityInsights.length > 0) {
            recommendations.push({
                type: 'health',
                priority: 'medium',
                title: 'Activity Level Optimization',
                description: 'Your activity patterns could be improved for better health outcomes.',
                action: 'Increase daily physical activity by 15-30 minutes',
                timeframe: 'ongoing'
            });
        }

        return recommendations;
    }

    generateDeviceRecommendations(insights, riskAssessment) {
        const recommendations = [];

        const deviceInsights = insights.filter(i => i.category === 'device');
        if (deviceInsights.length > 0) {
            recommendations.push({
                type: 'device',
                priority: 'medium',
                title: 'Device Optimization',
                description: 'Your monitoring device needs attention for better data quality.',
                action: 'Check device placement and connections',
                timeframe: 'immediately'
            });
        }

        return recommendations;
    }

    generateLifestyleRecommendations(insights, riskAssessment) {
        const recommendations = [];

        // General lifestyle recommendations based on patterns
        if (this.dataHistory.length > 50) {
            const avgMovement = this.dataHistory.slice(-50).reduce((sum, d) => sum + d.movement, 0) / 50;
            
            if (avgMovement < 30) {
                recommendations.push({
                    type: 'lifestyle',
                    priority: 'medium',
                    title: 'Increase Physical Activity',
                    description: 'Your activity levels are below recommended guidelines.',
                    action: 'Aim for at least 30 minutes of moderate activity daily',
                    timeframe: 'ongoing'
                });
            }
        }

        return recommendations;
    }

    // Utility methods
    categorizeActivity(movement) {
        if (movement < 20) return 'sedentary';
        if (movement < 40) return 'light';
        if (movement < 60) return 'moderate';
        return 'vigorous';
    }

    findDominantActivity(activityLevels) {
        const counts = {
            sedentary: 0,
            light: 0,
            moderate: 0,
            vigorous: 0
        };

        activityLevels.forEach(level => counts[level]++);
        
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }

    calculateHealthStability(data) {
        const heartRateVariance = this.calculateVariance(data.map(d => d.heartRate));
        const movementVariance = this.calculateVariance(data.map(d => d.movement));
        
        return {
            heartRate: 1 - (heartRateVariance / 100), // Normalize to 0-1
            movement: 1 - (movementVariance / 100),
            overall: 1 - ((heartRateVariance + movementVariance) / 200)
        };
    }

    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    calculateHealthVariability(data) {
        const hrValues = data.map(d => d.heartRate);
        const movementValues = data.map(d => d.movement);
        
        return {
            heartRate: this.calculateCoefficientOfVariation(hrValues),
            movement: this.calculateCoefficientOfVariation(movementValues)
        };
    }

    calculateCoefficientOfVariation(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = this.calculateVariance(values);
        return stdDev / mean;
    }

    calculateHealthConsistency(data) {
        const consistency = data.length > 0 ? 
            data.filter(d => d.circuitActive).length / data.length : 0;
        
        return {
            device: consistency,
            data: consistency > 0.9 ? 'excellent' : consistency > 0.8 ? 'good' : 'poor'
        };
    }

    calculateCircuitStability() {
        if (this.dataHistory.length === 0) return 0;
        
        const recentData = this.dataHistory.slice(-50);
        return recentData.filter(d => d.circuitActive).length / recentData.length;
    }

    calculateConfidence(analysis) {
        let confidence = 0.5; // Base confidence
        
        // Increase confidence based on data quality
        if (this.dataHistory.length > 20) confidence += 0.2;
        if (this.dataHistory.length > 50) confidence += 0.2;
        
        // Increase confidence based on circuit stability
        const circuitStability = this.calculateCircuitStability();
        confidence += circuitStability * 0.1;
        
        return Math.min(1.0, confidence);
    }

    // Machine Learning Model Classes
    updateModels(data) {
        // Update all ML models with new data
        Object.values(this.models).forEach(model => {
            if (model.update) {
                model.update(data);
            }
        });
    }

    // Export data for external analysis
    exportData() {
        return {
            history: this.dataHistory,
            baselines: this.baselineMetrics,
            thresholds: this.anomalyThresholds,
            patterns: this.healthPatterns
        };
    }

    // Import configuration
    importConfiguration(config) {
        if (config.baselines) this.baselineMetrics = config.baselines;
        if (config.thresholds) this.anomalyThresholds = config.thresholds;
        if (config.weights) this.healthWeights = config.weights;
    }
}

// Machine Learning Model Classes
class HeartRatePredictor {
    constructor() {
        this.model = new SimpleLinearRegression();
        this.trainingData = [];
    }

    predict(data) {
        return this.model.predict(data.heartRate);
    }

    update(data) {
        this.trainingData.push(data);
        if (this.trainingData.length > 100) {
            this.trainingData.shift();
        }
        this.retrain();
    }

    retrain() {
        if (this.trainingData.length < 10) return;
        
        const x = this.trainingData.map((d, i) => i);
        const y = this.trainingData.map(d => d.heartRate);
        this.model.fit(x, y);
    }
}

class AnomalyDetector {
    constructor() {
        this.isolationForest = new IsolationForest();
        this.normalData = [];
    }

    detect(data) {
        return this.isolationForest.predict(data);
    }

    update(data) {
        if (this.isNormal(data)) {
            this.normalData.push(data);
            if (this.normalData.length > 200) {
                this.normalData.shift();
            }
        }
    }

    isNormal(data) {
        // Simple heuristic for normal data
        return data.heartRate >= 50 && data.heartRate <= 150 &&
               data.movement >= 0 && data.movement <= 100;
    }
}

class PatternRecognizer {
    constructor() {
        this.patterns = new Map();
    }

    recognize(data) {
        // Pattern recognition logic
        return this.patterns.get(this.getPatternKey(data));
    }

    update(data) {
        const key = this.getPatternKey(data);
        this.patterns.set(key, (this.patterns.get(key) || 0) + 1);
    }

    getPatternKey(data) {
        return `${Math.round(data.heartRate/10)}_${Math.round(data.movement/10)}`;
    }
}

class HealthRiskAssessor {
    constructor() {
        this.riskFactors = [];
    }

    assess(data) {
        const risks = [];
        
        if (data.heartRate > 100) risks.push('elevated_heart_rate');
        if (data.movement < 20) risks.push('low_activity');
        if (data.temperature && data.temperature > 37.5) risks.push('elevated_temperature');
        
        return risks;
    }

    update(data) {
        // Update risk assessment model
    }
}

class RecommendationEngine {
    constructor() {
        this.recommendations = [];
    }

    generate(data, analysis) {
        const recs = [];
        
        if (data.movement < 30) {
            recs.push({
                type: 'activity',
                message: 'Consider increasing your daily activity level',
                priority: 'medium'
            });
        }
        
        return recs;
    }

    update(data) {
        // Update recommendation model
    }
}

// Simple Linear Regression Implementation
class SimpleLinearRegression {
    constructor() {
        this.slope = 0;
        this.intercept = 0;
    }

    fit(x, y) {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

        this.slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        this.intercept = (sumY - this.slope * sumX) / n;
    }

    predict(x) {
        return this.slope * x + this.intercept;
    }
}

// Simple Isolation Forest Implementation
class IsolationForest {
    constructor() {
        this.trees = [];
        this.nTrees = 10;
    }

    predict(data) {
        // Simplified anomaly score
        const scores = this.trees.map(tree => tree.score(data));
        return scores.reduce((a, b) => a + b, 0) / scores.length;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIHealthAgent;
}
