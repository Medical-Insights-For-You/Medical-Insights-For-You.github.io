#!/usr/bin/env python3
"""
Mify Health Monitoring uAgent
Built with Fetch.ai uAgents framework for Agentverse deployment

This agent specializes in:
- Health data analysis from Arduino sensors
- Fitness tracking and recommendations
- Medical guidance and wellness coaching
- Real-time health monitoring and alerts
- Integration with external health APIs

Based on Fetch.ai Innovation Lab: https://innovationlab.fetch.ai/resources/docs/intro
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

from uagents import Agent, Context, Model
from uagents.setup import fund_agent_if_low
from uagents.network import Network

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Health data models
@dataclass
class HealthData:
    """Health data structure from Arduino sensors"""
    heart_rate: int
    movement_level: str
    proximity: float
    circuit_status: str
    timestamp: datetime
    device_id: str

@dataclass
class HealthGoal:
    """User health goals and targets"""
    goal_type: str  # "fitness", "weight_loss", "health_monitoring", "medical"
    target_value: float
    current_value: float
    deadline: Optional[datetime]
    priority: int  # 1-5 scale

@dataclass
class HealthRecommendation:
    """AI-generated health recommendations"""
    recommendation_type: str
    message: str
    action_required: bool
    urgency: str  # "low", "medium", "high", "critical"
    estimated_impact: str
    resources_needed: List[str]

@dataclass
class HealthAlert:
    """Health alerts and notifications"""
    alert_type: str
    severity: str
    message: str
    action_required: bool
    timestamp: datetime
    data: Dict[str, Any]

# Message models for agent communication
class HealthDataMessage(Model):
    """Message for receiving health data"""
    data: HealthData
    user_id: str
    session_id: str

class HealthGoalMessage(Model):
    """Message for setting health goals"""
    goal: HealthGoal
    user_id: str

class HealthQueryMessage(Model):
    """Message for health-related queries"""
    query: str
    context: Dict[str, Any]
    user_id: str
    session_id: str

class HealthResponseMessage(Model):
    """Response message with health insights"""
    response_type: str
    message: str
    recommendations: List[HealthRecommendation]
    alerts: List[HealthAlert]
    confidence: float
    agent_id: str
    timestamp: datetime

class HealthActionMessage(Model):
    """Message for taking health-related actions"""
    action_type: str
    parameters: Dict[str, Any]
    user_id: str
    priority: int

# Create the Mify Health Agent
MIFY_HEALTH_AGENT = Agent(
    name="mify_health_monitor",
    seed="mify-health-agent-seed-phrase-for-deterministic-address",
    port=8000,
    endpoint=["http://localhost:8000/submit"],
)

# Fund the agent if needed
fund_agent_if_low(MIFY_HEALTH_AGENT.wallet.address())

class MifyHealthAgent:
    """Main health monitoring agent class"""
    
    def __init__(self):
        self.agent = MIFY_HEALTH_AGENT
        self.health_data_history: Dict[str, List[HealthData]] = {}
        self.user_goals: Dict[str, List[HealthGoal]] = {}
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.health_baselines: Dict[str, Dict[str, float]] = {}
        
        # Health monitoring thresholds
        self.thresholds = {
            "heart_rate": {"min": 60, "max": 100, "critical_min": 50, "critical_max": 120},
            "proximity": {"min": 10, "max": 30, "critical_min": 5, "critical_max": 50},
            "movement": {"low_threshold": 0.5, "high_threshold": 2.0}
        }
        
        self.setup_handlers()
    
    def setup_handlers(self):
        """Setup message handlers for the agent"""
        
        @self.agent.on_message(HealthDataMessage)
        async def handle_health_data(ctx: Context, sender: str, msg: HealthDataMessage):
            """Handle incoming health data from Arduino sensors"""
            logger.info(f"Received health data from {sender} for user {msg.user_id}")
            
            try:
                # Store health data
                await self.store_health_data(msg.user_id, msg.data)
                
                # Analyze health data
                analysis = await self.analyze_health_data(msg.user_id, msg.data)
                
                # Generate recommendations
                recommendations = await self.generate_recommendations(msg.user_id, msg.data, analysis)
                
                # Check for alerts
                alerts = await self.check_health_alerts(msg.user_id, msg.data, analysis)
                
                # Send response
                response = HealthResponseMessage(
                    response_type="health_analysis",
                    message=f"Health data analyzed for {msg.user_id}",
                    recommendations=recommendations,
                    alerts=alerts,
                    confidence=analysis.get("confidence", 0.8),
                    agent_id=self.agent.address,
                    timestamp=datetime.now()
                )
                
                await ctx.send(sender, response)
                
            except Exception as e:
                logger.error(f"Error processing health data: {e}")
                error_response = HealthResponseMessage(
                    response_type="error",
                    message=f"Error processing health data: {str(e)}",
                    recommendations=[],
                    alerts=[],
                    confidence=0.0,
                    agent_id=self.agent.address,
                    timestamp=datetime.now()
                )
                await ctx.send(sender, error_response)
        
        @self.agent.on_message(HealthQueryMessage)
        async def handle_health_query(ctx: Context, sender: str, msg: HealthQueryMessage):
            """Handle health-related queries"""
            logger.info(f"Received health query from {sender}: {msg.query}")
            
            try:
                # Process the query using ASI:One integration
                response_data = await self.process_health_query(msg.query, msg.context, msg.user_id)
                
                response = HealthResponseMessage(
                    response_type="query_response",
                    message=response_data["message"],
                    recommendations=response_data.get("recommendations", []),
                    alerts=response_data.get("alerts", []),
                    confidence=response_data.get("confidence", 0.7),
                    agent_id=self.agent.address,
                    timestamp=datetime.now()
                )
                
                await ctx.send(sender, response)
                
            except Exception as e:
                logger.error(f"Error processing health query: {e}")
                error_response = HealthResponseMessage(
                    response_type="error",
                    message=f"Error processing query: {str(e)}",
                    recommendations=[],
                    alerts=[],
                    confidence=0.0,
                    agent_id=self.agent.address,
                    timestamp=datetime.now()
                )
                await ctx.send(sender, error_response)
        
        @self.agent.on_message(HealthGoalMessage)
        async def handle_health_goal(ctx: Context, sender: str, msg: HealthGoalMessage):
            """Handle health goal setting"""
            logger.info(f"Received health goal from {sender} for user {msg.user_id}")
            
            try:
                # Store and process health goal
                await self.set_health_goal(msg.user_id, msg.goal)
                
                # Generate action plan
                action_plan = await self.generate_action_plan(msg.user_id, msg.goal)
                
                response = HealthResponseMessage(
                    response_type="goal_set",
                    message=f"Health goal set successfully: {msg.goal.goal_type}",
                    recommendations=action_plan,
                    alerts=[],
                    confidence=0.9,
                    agent_id=self.agent.address,
                    timestamp=datetime.now()
                )
                
                await ctx.send(sender, response)
                
            except Exception as e:
                logger.error(f"Error setting health goal: {e}")
                error_response = HealthResponseMessage(
                    response_type="error",
                    message=f"Error setting goal: {str(e)}",
                    recommendations=[],
                    alerts=[],
                    confidence=0.0,
                    agent_id=self.agent.address,
                    timestamp=datetime.now()
                )
                await ctx.send(sender, error_response)
    
    async def store_health_data(self, user_id: str, data: HealthData):
        """Store health data in agent's memory"""
        if user_id not in self.health_data_history:
            self.health_data_history[user_id] = []
        
        self.health_data_history[user_id].append(data)
        
        # Keep only last 1000 data points per user
        if len(self.health_data_history[user_id]) > 1000:
            self.health_data_history[user_id] = self.health_data_history[user_id][-1000:]
    
    async def analyze_health_data(self, user_id: str, data: HealthData) -> Dict[str, Any]:
        """Analyze health data and provide insights"""
        analysis = {
            "timestamp": data.timestamp,
            "heart_rate_status": self.analyze_heart_rate(data.heart_rate),
            "movement_status": self.analyze_movement(data.movement_level),
            "proximity_status": self.analyze_proximity(data.proximity),
            "circuit_status": data.circuit_status,
            "trends": await self.analyze_trends(user_id, data),
            "confidence": 0.8
        }
        
        return analysis
    
    def analyze_heart_rate(self, heart_rate: int) -> Dict[str, Any]:
        """Analyze heart rate data"""
        thresholds = self.thresholds["heart_rate"]
        
        if heart_rate < thresholds["critical_min"] or heart_rate > thresholds["critical_max"]:
            return {
                "status": "critical",
                "message": f"Heart rate {heart_rate} BPM is outside critical range",
                "action_required": True
            }
        elif heart_rate < thresholds["min"] or heart_rate > thresholds["max"]:
            return {
                "status": "warning",
                "message": f"Heart rate {heart_rate} BPM is outside normal range",
                "action_required": False
            }
        else:
            return {
                "status": "normal",
                "message": f"Heart rate {heart_rate} BPM is within normal range",
                "action_required": False
            }
    
    def analyze_movement(self, movement: str) -> Dict[str, Any]:
        """Analyze movement data"""
        movement_levels = {"Low": 1, "Medium": 2, "High": 3, "Warning": 0, "Away": 0}
        level = movement_levels.get(movement, 1)
        
        if level == 0:
            return {
                "status": "warning",
                "message": f"Movement level '{movement}' detected - check device positioning",
                "action_required": True
            }
        elif level == 1:
            return {
                "status": "low_activity",
                "message": "Low movement detected - consider increasing activity",
                "action_required": False
            }
        elif level == 3:
            return {
                "status": "high_activity",
                "message": "High movement detected - good activity level",
                "action_required": False
            }
        else:
            return {
                "status": "normal",
                "message": "Normal movement level detected",
                "action_required": False
            }
    
    def analyze_proximity(self, proximity: float) -> Dict[str, Any]:
        """Analyze proximity data"""
        thresholds = self.thresholds["proximity"]
        
        if proximity < thresholds["critical_min"] or proximity > thresholds["critical_max"]:
            return {
                "status": "critical",
                "message": f"Proximity {proximity}cm is outside critical range",
                "action_required": True
            }
        elif proximity < thresholds["min"] or proximity > thresholds["max"]:
            return {
                "status": "warning",
                "message": f"Proximity {proximity}cm is outside optimal range",
                "action_required": False
            }
        else:
            return {
                "status": "normal",
                "message": f"Proximity {proximity}cm is within optimal range",
                "action_required": False
            }
    
    async def analyze_trends(self, user_id: str, current_data: HealthData) -> Dict[str, Any]:
        """Analyze health trends over time"""
        if user_id not in self.health_data_history or len(self.health_data_history[user_id]) < 5:
            return {"status": "insufficient_data", "message": "Need more data for trend analysis"}
        
        recent_data = self.health_data_history[user_id][-10:]  # Last 10 readings
        
        # Calculate heart rate trend
        heart_rates = [d.heart_rate for d in recent_data]
        hr_trend = "stable"
        if len(heart_rates) >= 3:
            if heart_rates[-1] > heart_rates[-3] + 5:
                hr_trend = "increasing"
            elif heart_rates[-1] < heart_rates[-3] - 5:
                hr_trend = "decreasing"
        
        # Calculate movement trend
        movements = [d.movement_level for d in recent_data]
        movement_trend = "stable"
        if movements.count("High") > len(movements) * 0.6:
            movement_trend = "increasing"
        elif movements.count("Low") > len(movements) * 0.6:
            movement_trend = "decreasing"
        
        return {
            "heart_rate_trend": hr_trend,
            "movement_trend": movement_trend,
            "data_points": len(recent_data),
            "time_span": (recent_data[-1].timestamp - recent_data[0].timestamp).total_seconds() / 60
        }
    
    async def generate_recommendations(self, user_id: str, data: HealthData, analysis: Dict[str, Any]) -> List[HealthRecommendation]:
        """Generate health recommendations based on analysis"""
        recommendations = []
        
        # Heart rate recommendations
        hr_analysis = analysis["heart_rate_status"]
        if hr_analysis["status"] == "critical":
            recommendations.append(HealthRecommendation(
                recommendation_type="medical_alert",
                message="Critical heart rate detected - seek immediate medical attention",
                action_required=True,
                urgency="critical",
                estimated_impact="High - immediate medical intervention needed",
                resources_needed=["emergency_services", "medical_professional"]
            ))
        elif hr_analysis["status"] == "warning":
            recommendations.append(HealthRecommendation(
                recommendation_type="lifestyle",
                message="Heart rate outside normal range - consider stress management techniques",
                action_required=False,
                urgency="medium",
                estimated_impact="Medium - lifestyle adjustments recommended",
                resources_needed=["stress_management", "relaxation_techniques"]
            ))
        
        # Movement recommendations
        movement_analysis = analysis["movement_status"]
        if movement_analysis["status"] == "low_activity":
            recommendations.append(HealthRecommendation(
                recommendation_type="fitness",
                message="Low activity detected - try to incorporate more movement into your day",
                action_required=False,
                urgency="low",
                estimated_impact="Medium - improved fitness and health",
                resources_needed=["exercise_plan", "activity_tracker"]
            ))
        
        # Proximity recommendations
        proximity_analysis = analysis["proximity_status"]
        if proximity_analysis["status"] == "warning":
            recommendations.append(HealthRecommendation(
                recommendation_type="device_setup",
                message="Device positioning may need adjustment for optimal monitoring",
                action_required=False,
                urgency="low",
                estimated_impact="Low - improved data quality",
                resources_needed=["device_manual", "setup_guide"]
            ))
        
        return recommendations
    
    async def check_health_alerts(self, user_id: str, data: HealthData, analysis: Dict[str, Any]) -> List[HealthAlert]:
        """Check for health alerts that require immediate attention"""
        alerts = []
        
        # Critical heart rate alert
        if analysis["heart_rate_status"]["status"] == "critical":
            alerts.append(HealthAlert(
                alert_type="critical_heart_rate",
                severity="critical",
                message=f"Critical heart rate detected: {data.heart_rate} BPM",
                action_required=True,
                timestamp=data.timestamp,
                data={"heart_rate": data.heart_rate, "thresholds": self.thresholds["heart_rate"]}
            ))
        
        # Device positioning alert
        if analysis["proximity_status"]["status"] == "critical":
            alerts.append(HealthAlert(
                alert_type="device_positioning",
                severity="high",
                message=f"Device positioning critical: {data.proximity}cm",
                action_required=True,
                timestamp=data.timestamp,
                data={"proximity": data.proximity, "thresholds": self.thresholds["proximity"]}
            ))
        
        return alerts
    
    async def process_health_query(self, query: str, context: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Process health-related queries using ASI:One integration"""
        # This would integrate with ASI:One for advanced query processing
        # For now, we'll provide a basic implementation
        
        query_lower = query.lower()
        
        if "heart rate" in query_lower or "heartrate" in query_lower:
            return await self.handle_heart_rate_query(user_id, context)
        elif "movement" in query_lower or "activity" in query_lower:
            return await self.handle_movement_query(user_id, context)
        elif "arduino" in query_lower or "device" in query_lower:
            return await self.handle_device_query(user_id, context)
        elif "recommendation" in query_lower or "advice" in query_lower:
            return await self.handle_recommendation_query(user_id, context)
        else:
            return {
                "message": "I can help you with heart rate analysis, movement tracking, device troubleshooting, and health recommendations. What would you like to know?",
                "recommendations": [],
                "alerts": [],
                "confidence": 0.7
            }
    
    async def handle_heart_rate_query(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle heart rate specific queries"""
        if user_id in self.health_data_history and self.health_data_history[user_id]:
            latest_data = self.health_data_history[user_id][-1]
            analysis = self.analyze_heart_rate(latest_data.heart_rate)
            
            return {
                "message": f"Your current heart rate is {latest_data.heart_rate} BPM. {analysis['message']}",
                "recommendations": await self.generate_recommendations(user_id, latest_data, {"heart_rate_status": analysis}),
                "alerts": [],
                "confidence": 0.9
            }
        else:
            return {
                "message": "I don't have recent heart rate data. Please connect your Arduino device to get real-time heart rate monitoring.",
                "recommendations": [],
                "alerts": [],
                "confidence": 0.5
            }
    
    async def handle_movement_query(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle movement specific queries"""
        if user_id in self.health_data_history and self.health_data_history[user_id]:
            latest_data = self.health_data_history[user_id][-1]
            analysis = self.analyze_movement(latest_data.movement_level)
            
            return {
                "message": f"Your current movement level is {latest_data.movement_level}. {analysis['message']}",
                "recommendations": await self.generate_recommendations(user_id, latest_data, {"movement_status": analysis}),
                "alerts": [],
                "confidence": 0.9
            }
        else:
            return {
                "message": "I don't have recent movement data. Please connect your Arduino device to get real-time movement monitoring.",
                "recommendations": [],
                "alerts": [],
                "confidence": 0.5
            }
    
    async def handle_device_query(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle device troubleshooting queries"""
        recommendations = [
            HealthRecommendation(
                recommendation_type="troubleshooting",
                message="Check USB connection between Arduino and computer",
                action_required=True,
                urgency="medium",
                estimated_impact="High - device connectivity",
                resources_needed=["usb_cable", "computer"]
            ),
            HealthRecommendation(
                recommendation_type="troubleshooting",
                message="Verify sensor wiring according to the wiring guide",
                action_required=True,
                urgency="medium",
                estimated_impact="High - sensor functionality",
                resources_needed=["wiring_guide", "multimeter"]
            ),
            HealthRecommendation(
                recommendation_type="troubleshooting",
                message="Ensure Arduino code is properly uploaded",
                action_required=True,
                urgency="medium",
                estimated_impact="High - device operation",
                resources_needed=["arduino_ide", "usb_cable"]
            )
        ]
        
        return {
            "message": "I can help you troubleshoot your Arduino health monitoring device. Here are the most common solutions:",
            "recommendations": recommendations,
            "alerts": [],
            "confidence": 0.8
        }
    
    async def handle_recommendation_query(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle general recommendation queries"""
        recommendations = [
            HealthRecommendation(
                recommendation_type="general_health",
                message="Maintain regular exercise routine - aim for 150 minutes of moderate activity per week",
                action_required=False,
                urgency="low",
                estimated_impact="High - overall health improvement",
                resources_needed=["exercise_plan", "activity_tracker"]
            ),
            HealthRecommendation(
                recommendation_type="general_health",
                message="Monitor your vital signs consistently using your Arduino device",
                action_required=False,
                urgency="low",
                estimated_impact="Medium - early health issue detection",
                resources_needed=["arduino_device", "monitoring_app"]
            ),
            HealthRecommendation(
                recommendation_type="general_health",
                message="Stay hydrated and maintain a balanced diet",
                action_required=False,
                urgency="low",
                estimated_impact="High - overall wellness",
                resources_needed=["water_tracker", "nutrition_guide"]
            )
        ]
        
        return {
            "message": "Here are some general health recommendations based on best practices:",
            "recommendations": recommendations,
            "alerts": [],
            "confidence": 0.8
        }
    
    async def set_health_goal(self, user_id: str, goal: HealthGoal):
        """Set a health goal for the user"""
        if user_id not in self.user_goals:
            self.user_goals[user_id] = []
        
        self.user_goals[user_id].append(goal)
        logger.info(f"Set health goal for user {user_id}: {goal.goal_type}")
    
    async def generate_action_plan(self, user_id: str, goal: HealthGoal) -> List[HealthRecommendation]:
        """Generate an action plan for achieving a health goal"""
        recommendations = []
        
        if goal.goal_type == "fitness":
            recommendations.append(HealthRecommendation(
                recommendation_type="fitness_plan",
                message=f"Create a fitness plan to achieve your goal of {goal.target_value}",
                action_required=True,
                urgency="medium",
                estimated_impact="High - goal achievement",
                resources_needed=["fitness_plan", "progress_tracker"]
            ))
        elif goal.goal_type == "health_monitoring":
            recommendations.append(HealthRecommendation(
                recommendation_type="monitoring_plan",
                message="Set up regular health monitoring schedule",
                action_required=True,
                urgency="medium",
                estimated_impact="High - health awareness",
                resources_needed=["monitoring_schedule", "health_tracker"]
            ))
        
        return recommendations

# Create and run the agent
if __name__ == "__main__":
    health_agent = MifyHealthAgent()
    
    print(f"Mify Health Agent address: {MIFY_HEALTH_AGENT.address}")
    print("Starting Mify Health Agent...")
    print("Agent is ready to receive health data and queries!")
    
    MIFY_HEALTH_AGENT.run()
