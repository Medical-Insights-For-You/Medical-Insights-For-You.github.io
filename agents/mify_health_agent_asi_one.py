#!/usr/bin/env python3
"""
Mify Health Monitoring uAgent with ASI:One Integration
Real-time health monitoring with Fetch.ai's ASI:One for intelligent agent discovery
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

from uagents import Agent, Context, Model
from uagents.setup import fund_agent_if_low

# Import our ASI:One integration
from asi_one_integration import HealthASIOneIntegration

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
    asi_one_insights: Optional[Dict[str, Any]] = None

class HealthEmergencyMessage(Model):
    """Message for health emergencies"""
    health_data: HealthData
    user_id: str
    emergency_level: str
    timestamp: datetime

# Create the Mify Health Agent with ASI:One
MIFY_HEALTH_AGENT_ASI_ONE = Agent(
    name="mify_health_monitor_asi_one",
    seed="mify-health-agent-asi-one-seed-phrase",
    port=8002,
    endpoint=["http://localhost:8002/submit"],
)

# Fund the agent if needed
fund_agent_if_low(MIFY_HEALTH_AGENT_ASI_ONE.wallet.address())

class MifyHealthAgentASIOne:
    """Enhanced health monitoring agent with ASI:One integration"""
    
    def __init__(self, asi_one_api_key: str):
        self.agent = MIFY_HEALTH_AGENT_ASI_ONE
        self.asi_one_integration = HealthASIOneIntegration(asi_one_api_key)
        
        # Health data storage
        self.health_data_history: Dict[str, List[HealthData]] = {}
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.user_baselines: Dict[str, Dict[str, float]] = {}
        
        # Health monitoring thresholds
        self.thresholds = {
            "heart_rate": {"min": 60, "max": 100, "critical_min": 50, "critical_max": 120},
            "proximity": {"min": 10, "max": 30, "critical_min": 5, "critical_max": 50}
        }
        
        self.setup_handlers()
    
    def setup_handlers(self):
        """Setup message handlers for the agent"""
        
        @self.agent.on_message(HealthDataMessage)
        async def handle_health_data(ctx: Context, sender: str, msg: HealthDataMessage):
            """Handle incoming health data with ASI:One integration"""
            logger.info(f"Received health data from {sender} for user {msg.user_id}")
            
            try:
                # Store health data
                await self.store_health_data(msg.user_id, msg.data)
                
                # Convert to dict for ASI:One processing
                health_data_dict = {
                    "heart_rate": msg.data.heart_rate,
                    "movement_level": msg.data.movement_level,
                    "proximity": msg.data.proximity,
                    "circuit_status": msg.data.circuit_status,
                    "timestamp": msg.data.timestamp.isoformat(),
                    "device_id": msg.data.device_id
                }
                
                # Process with ASI:One for intelligent analysis
                asi_one_results = await self.asi_one_integration.process_health_data_with_asi_one(
                    health_data_dict, msg.user_id
                )
                
                # Generate recommendations based on ASI:One insights
                recommendations = await self.generate_recommendations_from_asi_one(
                    msg.user_id, msg.data, asi_one_results
                )
                
                # Check for alerts
                alerts = await self.check_health_alerts(msg.user_id, msg.data, asi_one_results)
                
                # Send comprehensive response with ASI:One insights
                response = HealthResponseMessage(
                    response_type="asi_one_health_analysis",
                    message=f"Health data analyzed using ASI:One for {msg.user_id}",
                    recommendations=recommendations,
                    alerts=alerts,
                    confidence=0.95,  # High confidence with ASI:One
                    agent_id=self.agent.address,
                    timestamp=datetime.now(),
                    asi_one_insights=asi_one_results
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
            """Handle health queries with ASI:One integration"""
            logger.info(f"Received health query from {sender}: {msg.query}")
            
            try:
                # Get latest health data for context
                latest_health_data = None
                if msg.user_id in self.health_data_history and self.health_data_history[msg.user_id]:
                    latest_data = self.health_data_history[msg.user_id][-1]
                    latest_health_data = {
                        "heart_rate": latest_data.heart_rate,
                        "movement_level": latest_data.movement_level,
                        "proximity": latest_data.proximity,
                        "circuit_status": latest_data.circuit_status,
                        "timestamp": latest_data.timestamp.isoformat()
                    }
                
                # Process query with ASI:One
                from asi_one_integration import ASIOneClient
                async with ASIOneClient(self.asi_one_integration.api_key) as client:
                    query_response = await client.process_health_query(msg.query, latest_health_data)
                
                # Extract response content
                response_content = ""
                if "choices" in query_response and query_response["choices"]:
                    response_content = query_response["choices"][0]["message"]["content"]
                else:
                    response_content = "I'm processing your health query. Please try again in a moment."
                
                response = HealthResponseMessage(
                    response_type="asi_one_query_response",
                    message=response_content,
                    recommendations=[],
                    alerts=[],
                    confidence=0.9,
                    agent_id=self.agent.address,
                    timestamp=datetime.now(),
                    asi_one_insights=query_response
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
        
        @self.agent.on_message(HealthEmergencyMessage)
        async def handle_health_emergency(ctx: Context, sender: str, msg: HealthEmergencyMessage):
            """Handle health emergencies with ASI:One for immediate analysis"""
            logger.info(f"Received health emergency from {sender} for user {msg.user_id}")
            
            try:
                # Convert to dict for ASI:One processing
                health_data_dict = {
                    "heart_rate": msg.health_data.heart_rate,
                    "movement_level": msg.health_data.movement_level,
                    "proximity": msg.health_data.proximity,
                    "circuit_status": msg.health_data.circuit_status,
                    "timestamp": msg.health_data.timestamp.isoformat(),
                    "device_id": msg.health_data.device_id
                }
                
                # Process emergency with ASI:One
                emergency_results = await self.asi_one_integration.handle_health_emergency(
                    health_data_dict, msg.user_id
                )
                
                # Generate critical recommendations
                recommendations = []
                if emergency_results.get("urgent"):
                    recommendations.append(HealthRecommendation(
                        recommendation_type="emergency",
                        message="URGENT: Health emergency detected. Seek immediate medical attention.",
                        action_required=True,
                        urgency="critical",
                        estimated_impact="Critical - immediate medical intervention needed",
                        resources_needed=["emergency_services", "medical_professional"]
                    ))
                
                # Create critical alert
                alerts = [HealthAlert(
                    alert_type="health_emergency",
                    severity="critical",
                    message=f"Health emergency detected for user {msg.user_id}",
                    action_required=True,
                    timestamp=msg.timestamp,
                    data=health_data_dict
                )]
                
                response = HealthResponseMessage(
                    response_type="emergency_response",
                    message=f"URGENT: Health emergency processed for {msg.user_id}",
                    recommendations=recommendations,
                    alerts=alerts,
                    confidence=1.0,
                    agent_id=self.agent.address,
                    timestamp=datetime.now(),
                    asi_one_insights=emergency_results
                )
                
                await ctx.send(sender, response)
                
            except Exception as e:
                logger.error(f"Error processing health emergency: {e}")
                # Even in error, send critical alert
                critical_alert = HealthAlert(
                    alert_type="system_error",
                    severity="critical",
                    message=f"System error during emergency processing: {str(e)}",
                    action_required=True,
                    timestamp=datetime.now(),
                    data={"error": str(e), "user_id": msg.user_id}
                )
                
                error_response = HealthResponseMessage(
                    response_type="emergency_error",
                    message=f"CRITICAL: System error during emergency processing for {msg.user_id}",
                    recommendations=[],
                    alerts=[critical_alert],
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
        
        # Update user baselines
        await self.update_user_baselines(user_id, data)
    
    async def update_user_baselines(self, user_id: str, data: HealthData):
        """Update user health baselines for personalized analysis"""
        if user_id not in self.user_baselines:
            self.user_baselines[user_id] = {
                "heart_rate_history": [],
                "movement_history": [],
                "proximity_history": []
            }
        
        # Add to history
        self.user_baselines[user_id]["heart_rate_history"].append(data.heart_rate)
        self.user_baselines[user_id]["movement_history"].append(data.movement_level)
        self.user_baselines[user_id]["proximity_history"].append(data.proximity)
        
        # Keep only last 100 readings for baseline calculation
        for key in self.user_baselines[user_id]:
            if len(self.user_baselines[user_id][key]) > 100:
                self.user_baselines[user_id][key] = self.user_baselines[user_id][key][-100:]
    
    async def generate_recommendations_from_asi_one(self, user_id: str, data: HealthData, asi_one_results: Dict[str, Any]) -> List[HealthRecommendation]:
        """Generate recommendations based on ASI:One insights"""
        recommendations = []
        
        # Extract insights from ASI:One response
        query_response = asi_one_results.get("query_response", {})
        anomaly_analysis = asi_one_results.get("anomaly_analysis", {})
        
        # Parse ASI:One response content
        response_content = ""
        if "choices" in query_response and query_response["choices"]:
            response_content = query_response["choices"][0]["message"]["content"]
        
        # Generate recommendations based on ASI:One analysis
        if "critical" in response_content.lower() or "urgent" in response_content.lower():
            recommendations.append(HealthRecommendation(
                recommendation_type="medical_alert",
                message="ASI:One detected critical health concerns. Seek immediate medical attention.",
                action_required=True,
                urgency="critical",
                estimated_impact="Critical - immediate medical intervention needed",
                resources_needed=["emergency_services", "medical_professional"]
            ))
        elif "warning" in response_content.lower() or "concern" in response_content.lower():
            recommendations.append(HealthRecommendation(
                recommendation_type="health_monitoring",
                message="ASI:One identified health concerns. Monitor closely and consider medical consultation.",
                action_required=False,
                urgency="high",
                estimated_impact="High - proactive health management needed",
                resources_needed=["health_monitoring", "medical_consultation"]
            ))
        else:
            recommendations.append(HealthRecommendation(
                recommendation_type="general_health",
                message="ASI:One analysis shows stable health metrics. Continue monitoring.",
                action_required=False,
                urgency="low",
                estimated_impact="Medium - maintain current health practices",
                resources_needed=["health_monitoring", "lifestyle_maintenance"]
            ))
        
        return recommendations
    
    async def check_health_alerts(self, user_id: str, data: HealthData, asi_one_results: Dict[str, Any]) -> List[HealthAlert]:
        """Check for health alerts using ASI:One analysis"""
        alerts = []
        
        # Check for critical heart rate
        if data.heart_rate < self.thresholds["heart_rate"]["critical_min"] or data.heart_rate > self.thresholds["heart_rate"]["critical_max"]:
            alerts.append(HealthAlert(
                alert_type="critical_heart_rate",
                severity="critical",
                message=f"Critical heart rate detected: {data.heart_rate} BPM",
                action_required=True,
                timestamp=data.timestamp,
                data={"heart_rate": data.heart_rate, "thresholds": self.thresholds["heart_rate"]}
            ))
        
        # Check for device positioning issues
        if data.proximity < self.thresholds["proximity"]["critical_min"] or data.proximity > self.thresholds["proximity"]["critical_max"]:
            alerts.append(HealthAlert(
                alert_type="device_positioning",
                severity="high",
                message=f"Device positioning critical: {data.proximity}cm",
                action_required=True,
                timestamp=data.timestamp,
                data={"proximity": data.proximity, "thresholds": self.thresholds["proximity"]}
            ))
        
        # Check ASI:One anomaly analysis for additional alerts
        anomaly_analysis = asi_one_results.get("anomaly_analysis", {})
        if "choices" in anomaly_analysis and anomaly_analysis["choices"]:
            anomaly_content = anomaly_analysis["choices"][0]["message"]["content"]
            if "critical" in anomaly_content.lower() or "emergency" in anomaly_content.lower():
                alerts.append(HealthAlert(
                    alert_type="asi_one_anomaly",
                    severity="critical",
                    message="ASI:One detected critical health anomalies",
                    action_required=True,
                    timestamp=data.timestamp,
                    data={"asi_one_analysis": anomaly_content}
                ))
        
        return alerts
    
    async def generate_comprehensive_health_report(self, user_id: str) -> Dict[str, Any]:
        """Generate comprehensive health report using ASI:One"""
        if user_id not in self.health_data_history or not self.health_data_history[user_id]:
            return {"error": "No health data available for user"}
        
        # Convert health data history to dict format
        health_data_history = []
        for data in self.health_data_history[user_id]:
            health_data_history.append({
                "heart_rate": data.heart_rate,
                "movement_level": data.movement_level,
                "proximity": data.proximity,
                "circuit_status": data.circuit_status,
                "timestamp": data.timestamp.isoformat(),
                "device_id": data.device_id
            })
        
        # Generate report using ASI:One
        report_results = await self.asi_one_integration.generate_comprehensive_health_insights(
            user_id, health_data_history
        )
        
        return report_results

# Create and run the ASI:One integrated agent
if __name__ == "__main__":
    # Use the provided ASI:One API key
    ASI_ONE_API_KEY = "sk_8517f5128130429bb06a779ab5502ca0bc7ece1f61be45c6bae5a8c726c06f0e"
    
    # Create the enhanced agent
    health_agent = MifyHealthAgentASIOne(ASI_ONE_API_KEY)
    
    print(f"Mify Health Agent with ASI:One address: {health_agent.agent.address}")
    print("Starting Enhanced Mify Health Agent with ASI:One Integration...")
    print("Agent is ready to receive health data and queries!")
    print("Features:")
    print("- Real-time ASI:One integration for intelligent health analysis")
    print("- Emergency health monitoring with immediate AI response")
    print("- Comprehensive health reporting using ASI:One")
    print("- Agent discovery for specialized health services")
    
    try:
        health_agent.agent.run()
    except KeyboardInterrupt:
        print("Shutting down agent...")
        print("Agent stopped.")
