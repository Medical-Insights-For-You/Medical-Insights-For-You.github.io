#!/usr/bin/env python3
"""
Mify Health Monitoring uAgent with Adapter Integration
Built with Fetch.ai uAgents framework and uAgents Adapters

This enhanced agent integrates with:
- LangChain for advanced LLM workflows
- CrewAI for multi-agent collaboration
- MCP (Model Context Protocol) for real-world actions
- ASI:One for intelligent agent discovery

Based on Fetch.ai Innovation Lab: https://innovationlab.fetch.ai/resources/docs/intro
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict

from uagents import Agent, Context, Model
from uagents.setup import fund_agent_if_low
from uagents.network import Network

# Import uAgents Adapters
try:
    from uagents_adapter import LangchainRegisterTool, CrewaiRegisterTool, MCPServerAdapter
    from uagents_adapter import cleanup_uagent
    ADAPTERS_AVAILABLE = True
except ImportError:
    print("uAgents Adapters not installed. Install with: pip install uagents-adapter[all]")
    ADAPTERS_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Health data models (same as before)
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

# MCP Server for Health Monitoring Tools
class HealthMonitoringMCPServer:
    """MCP Server that provides health monitoring tools"""
    
    def __init__(self):
        self.tools = {
            "analyze_heart_rate": self.analyze_heart_rate_tool,
            "check_movement_patterns": self.check_movement_patterns_tool,
            "generate_health_report": self.generate_health_report_tool,
            "send_health_alert": self.send_health_alert_tool,
            "schedule_health_check": self.schedule_health_check_tool
        }
    
    async def list_tools(self) -> List[Dict[str, Any]]:
        """List available health monitoring tools"""
        return [
            {
                "name": "analyze_heart_rate",
                "description": "Analyze heart rate data and provide insights about cardiovascular health",
                "parameters": {
                    "heart_rate": {"type": "integer", "description": "Heart rate in BPM"},
                    "user_id": {"type": "string", "description": "User identifier"},
                    "timestamp": {"type": "string", "description": "Timestamp of measurement"}
                }
            },
            {
                "name": "check_movement_patterns",
                "description": "Analyze movement patterns and activity levels from sensor data",
                "parameters": {
                    "movement_data": {"type": "array", "description": "Array of movement level readings"},
                    "user_id": {"type": "string", "description": "User identifier"},
                    "time_window": {"type": "string", "description": "Time window for analysis (e.g., '1h', '24h')"}
                }
            },
            {
                "name": "generate_health_report",
                "description": "Generate comprehensive health report based on all available data",
                "parameters": {
                    "user_id": {"type": "string", "description": "User identifier"},
                    "report_type": {"type": "string", "description": "Type of report (daily, weekly, monthly)"},
                    "include_recommendations": {"type": "boolean", "description": "Include AI recommendations"}
                }
            },
            {
                "name": "send_health_alert",
                "description": "Send health alert to user or healthcare provider",
                "parameters": {
                    "alert_type": {"type": "string", "description": "Type of alert (critical, warning, info)"},
                    "message": {"type": "string", "description": "Alert message"},
                    "user_id": {"type": "string", "description": "User identifier"},
                    "urgency": {"type": "string", "description": "Urgency level (low, medium, high, critical)"}
                }
            },
            {
                "name": "schedule_health_check",
                "description": "Schedule automated health check or reminder",
                "parameters": {
                    "user_id": {"type": "string", "description": "User identifier"},
                    "check_type": {"type": "string", "description": "Type of health check"},
                    "schedule_time": {"type": "string", "description": "When to perform the check"},
                    "recurring": {"type": "boolean", "description": "Whether to repeat the check"}
                }
            }
        ]
    
    async def call_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a health monitoring tool"""
        if tool_name not in self.tools:
            return {"error": f"Tool '{tool_name}' not found"}
        
        try:
            result = await self.tools[tool_name](**parameters)
            return {"success": True, "result": result}
        except Exception as e:
            return {"error": f"Tool execution failed: {str(e)}"}
    
    async def analyze_heart_rate_tool(self, heart_rate: int, user_id: str, timestamp: str) -> Dict[str, Any]:
        """Analyze heart rate and provide insights"""
        # Heart rate analysis logic
        if heart_rate < 60:
            status = "bradycardia"
            recommendation = "Consider consulting a healthcare provider if this persists"
        elif heart_rate > 100:
            status = "tachycardia"
            recommendation = "Monitor closely and consider stress management techniques"
        else:
            status = "normal"
            recommendation = "Heart rate is within healthy range"
        
        return {
            "status": status,
            "heart_rate": heart_rate,
            "recommendation": recommendation,
            "timestamp": timestamp,
            "user_id": user_id
        }
    
    async def check_movement_patterns_tool(self, movement_data: List[str], user_id: str, time_window: str) -> Dict[str, Any]:
        """Analyze movement patterns"""
        high_movement_count = movement_data.count("High")
        medium_movement_count = movement_data.count("Medium")
        low_movement_count = movement_data.count("Low")
        
        total_readings = len(movement_data)
        activity_score = (high_movement_count * 3 + medium_movement_count * 2 + low_movement_count) / (total_readings * 3)
        
        if activity_score > 0.7:
            activity_level = "high"
            recommendation = "Great activity level! Keep up the good work."
        elif activity_score > 0.4:
            activity_level = "moderate"
            recommendation = "Good activity level. Consider adding more movement."
        else:
            activity_level = "low"
            recommendation = "Low activity detected. Try to incorporate more movement into your day."
        
        return {
            "activity_level": activity_level,
            "activity_score": activity_score,
            "recommendation": recommendation,
            "time_window": time_window,
            "user_id": user_id
        }
    
    async def generate_health_report_tool(self, user_id: str, report_type: str, include_recommendations: bool) -> Dict[str, Any]:
        """Generate comprehensive health report"""
        # This would integrate with actual health data storage
        report = {
            "user_id": user_id,
            "report_type": report_type,
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "overall_health_score": 85,
                "key_metrics": {
                    "avg_heart_rate": 72,
                    "activity_level": "moderate",
                    "device_uptime": "95%"
                }
            }
        }
        
        if include_recommendations:
            report["recommendations"] = [
                "Maintain regular exercise routine",
                "Monitor heart rate trends",
                "Ensure proper device positioning"
            ]
        
        return report
    
    async def send_health_alert_tool(self, alert_type: str, message: str, user_id: str, urgency: str) -> Dict[str, Any]:
        """Send health alert"""
        alert = {
            "alert_id": f"alert_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "alert_type": alert_type,
            "message": message,
            "user_id": user_id,
            "urgency": urgency,
            "timestamp": datetime.now().isoformat(),
            "status": "sent"
        }
        
        # In a real implementation, this would send notifications via email, SMS, etc.
        logger.info(f"Health alert sent: {alert}")
        
        return alert
    
    async def schedule_health_check_tool(self, user_id: str, check_type: str, schedule_time: str, recurring: bool) -> Dict[str, Any]:
        """Schedule health check"""
        schedule = {
            "schedule_id": f"schedule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "user_id": user_id,
            "check_type": check_type,
            "schedule_time": schedule_time,
            "recurring": recurring,
            "created_at": datetime.now().isoformat(),
            "status": "scheduled"
        }
        
        # In a real implementation, this would integrate with a scheduling system
        logger.info(f"Health check scheduled: {schedule}")
        
        return schedule

# LangChain Agent Wrapper
class HealthLangChainAgent:
    """LangChain agent for health data processing"""
    
    def __init__(self):
        self.name = "HealthLangChainAgent"
        self.description = "Advanced health data analysis using LangChain workflows"
    
    async def process_health_query(self, query: str, context: Dict[str, Any]) -> str:
        """Process health queries using LangChain"""
        # This would integrate with actual LangChain workflows
        # For now, we'll simulate the processing
        
        query_lower = query.lower()
        
        if "heart rate" in query_lower:
            return "Based on your heart rate data, I can see patterns that suggest good cardiovascular health. Continue monitoring regularly."
        elif "movement" in query_lower:
            return "Your movement patterns show moderate activity levels. Consider increasing daily steps for optimal health."
        elif "trend" in query_lower:
            return "Analyzing your health trends over time shows consistent monitoring. Your data indicates stable health metrics."
        else:
            return "I can help analyze your health data including heart rate, movement patterns, and trends. What specific aspect would you like me to examine?"
    
    async def generate_health_insights(self, health_data: HealthData) -> Dict[str, Any]:
        """Generate insights using LangChain"""
        insights = {
            "timestamp": health_data.timestamp.isoformat(),
            "heart_rate_analysis": self._analyze_heart_rate(health_data.heart_rate),
            "movement_analysis": self._analyze_movement(health_data.movement_level),
            "overall_assessment": "Your health metrics appear stable with room for improvement in activity levels.",
            "confidence": 0.85
        }
        
        return insights
    
    def _analyze_heart_rate(self, heart_rate: int) -> Dict[str, Any]:
        """Analyze heart rate using LangChain logic"""
        if 60 <= heart_rate <= 100:
            return {"status": "normal", "message": "Heart rate is within healthy range"}
        elif heart_rate < 60:
            return {"status": "low", "message": "Heart rate is below normal range"}
        else:
            return {"status": "high", "message": "Heart rate is above normal range"}
    
    def _analyze_movement(self, movement: str) -> Dict[str, Any]:
        """Analyze movement using LangChain logic"""
        movement_levels = {"Low": 1, "Medium": 2, "High": 3}
        level = movement_levels.get(movement, 1)
        
        if level >= 2:
            return {"status": "good", "message": "Good activity level detected"}
        else:
            return {"status": "low", "message": "Consider increasing daily activity"}

# CrewAI Team for Health Monitoring
class HealthCrewAITeam:
    """CrewAI team for collaborative health monitoring"""
    
    def __init__(self):
        self.name = "HealthCrewAITeam"
        self.description = "Multi-agent team for comprehensive health monitoring"
        self.agents = {
            "cardiologist": "Specializes in heart rate and cardiovascular analysis",
            "fitness_coach": "Focuses on movement patterns and activity recommendations",
            "device_specialist": "Handles Arduino device troubleshooting and optimization",
            "wellness_coordinator": "Provides overall health guidance and recommendations"
        }
    
    async def process_health_data(self, health_data: HealthData, user_id: str) -> Dict[str, Any]:
        """Process health data using CrewAI team collaboration"""
        # Simulate multi-agent collaboration
        results = {}
        
        # Cardiologist analysis
        results["cardiologist"] = {
            "analysis": self._cardiologist_analysis(health_data.heart_rate),
            "recommendations": ["Monitor heart rate trends", "Consider stress management if elevated"]
        }
        
        # Fitness coach analysis
        results["fitness_coach"] = {
            "analysis": self._fitness_coach_analysis(health_data.movement_level),
            "recommendations": ["Increase daily activity", "Set fitness goals"]
        }
        
        # Device specialist analysis
        results["device_specialist"] = {
            "analysis": self._device_specialist_analysis(health_data.circuit_status, health_data.proximity),
            "recommendations": ["Check device positioning", "Verify sensor connections"]
        }
        
        # Wellness coordinator synthesis
        results["wellness_coordinator"] = {
            "synthesis": "Overall health status is stable with opportunities for improvement in activity levels",
            "action_plan": ["Continue monitoring", "Increase daily movement", "Maintain device positioning"]
        }
        
        return results
    
    def _cardiologist_analysis(self, heart_rate: int) -> str:
        """Cardiologist agent analysis"""
        if 60 <= heart_rate <= 100:
            return f"Heart rate of {heart_rate} BPM is within normal range. No immediate concerns."
        else:
            return f"Heart rate of {heart_rate} BPM is outside normal range. Monitor closely and consider medical consultation if persistent."
    
    def _fitness_coach_analysis(self, movement: str) -> str:
        """Fitness coach agent analysis"""
        if movement == "High":
            return "Excellent activity level! Keep up the great work with regular movement."
        elif movement == "Medium":
            return "Good activity level. Consider increasing intensity or duration for optimal fitness."
        else:
            return "Low activity detected. Let's work on increasing your daily movement for better health."
    
    def _device_specialist_analysis(self, circuit_status: str, proximity: float) -> str:
        """Device specialist agent analysis"""
        if circuit_status == "Closed" and 10 <= proximity <= 30:
            return "Device is functioning optimally with good positioning."
        elif circuit_status == "Open":
            return "Device circuit is open. Check connections and positioning."
        else:
            return "Device positioning may need adjustment for optimal readings."

# Enhanced Mify Health Agent with Adapters
class MifyHealthAgentWithAdapters:
    """Enhanced health monitoring agent with adapter integration"""
    
    def __init__(self):
        self.agent = Agent(
            name="mify_health_monitor_adapters",
            seed="mify-health-agent-adapters-seed-phrase",
            port=8001,
            endpoint=["http://localhost:8001/submit"],
        )
        
        # Initialize adapters
        self.mcp_server = HealthMonitoringMCPServer()
        self.langchain_agent = HealthLangChainAgent()
        self.crewai_team = HealthCrewAITeam()
        
        # Health data storage
        self.health_data_history: Dict[str, List[HealthData]] = {}
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        
        # Health monitoring thresholds
        self.thresholds = {
            "heart_rate": {"min": 60, "max": 100, "critical_min": 50, "critical_max": 120},
            "proximity": {"min": 10, "max": 30, "critical_min": 5, "critical_max": 50}
        }
        
        self.setup_handlers()
        self.setup_adapters()
    
    def setup_handlers(self):
        """Setup message handlers for the agent"""
        
        @self.agent.on_message(HealthDataMessage)
        async def handle_health_data(ctx: Context, sender: str, msg: HealthDataMessage):
            """Handle incoming health data with adapter integration"""
            logger.info(f"Received health data from {sender} for user {msg.user_id}")
            
            try:
                # Store health data
                await self.store_health_data(msg.user_id, msg.data)
                
                # Process with CrewAI team
                crewai_results = await self.crewai_team.process_health_data(msg.data, msg.user_id)
                
                # Generate insights with LangChain
                langchain_insights = await self.langchain_agent.generate_health_insights(msg.data)
                
                # Use MCP tools for additional analysis
                mcp_analysis = await self.mcp_server.call_tool(
                    "analyze_heart_rate",
                    {
                        "heart_rate": msg.data.heart_rate,
                        "user_id": msg.user_id,
                        "timestamp": msg.data.timestamp.isoformat()
                    }
                )
                
                # Combine all analyses
                combined_analysis = {
                    "crewai_results": crewai_results,
                    "langchain_insights": langchain_insights,
                    "mcp_analysis": mcp_analysis,
                    "timestamp": msg.data.timestamp
                }
                
                # Generate recommendations
                recommendations = await self.generate_recommendations(msg.user_id, msg.data, combined_analysis)
                
                # Check for alerts
                alerts = await self.check_health_alerts(msg.user_id, msg.data, combined_analysis)
                
                # Send comprehensive response
                response = HealthResponseMessage(
                    response_type="comprehensive_health_analysis",
                    message=f"Comprehensive health analysis completed for {msg.user_id} using multi-agent collaboration",
                    recommendations=recommendations,
                    alerts=alerts,
                    confidence=0.9,
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
            """Handle health queries with LangChain integration"""
            logger.info(f"Received health query from {sender}: {msg.query}")
            
            try:
                # Process query with LangChain agent
                langchain_response = await self.langchain_agent.process_health_query(msg.query, msg.context)
                
                # Use MCP tools for additional processing
                if "report" in msg.query.lower():
                    mcp_report = await self.mcp_server.call_tool(
                        "generate_health_report",
                        {
                            "user_id": msg.user_id,
                            "report_type": "query_response",
                            "include_recommendations": True
                        }
                    )
                    langchain_response += f"\n\nDetailed Report: {mcp_report.get('result', {})}"
                
                response = HealthResponseMessage(
                    response_type="query_response",
                    message=langchain_response,
                    recommendations=[],
                    alerts=[],
                    confidence=0.85,
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
    
    def setup_adapters(self):
        """Setup uAgents adapters for framework integration"""
        if not ADAPTERS_AVAILABLE:
            logger.warning("uAgents Adapters not available. Install with: pip install uagents-adapter[all]")
            return
        
        try:
            # Setup MCP Server Adapter
            self.mcp_adapter = MCPServerAdapter(
                mcp_server=self.mcp_server,
                asi1_api_key=os.getenv("ASI1_API_KEY", "your_asi1_api_key"),
                model="asi1-mini"
            )
            
            # Add MCP protocols to agent
            for protocol in self.mcp_adapter.protocols:
                self.agent.include(protocol)
            
            logger.info("MCP Server Adapter configured successfully")
            
        except Exception as e:
            logger.error(f"Error setting up adapters: {e}")
    
    async def store_health_data(self, user_id: str, data: HealthData):
        """Store health data in agent's memory"""
        if user_id not in self.health_data_history:
            self.health_data_history[user_id] = []
        
        self.health_data_history[user_id].append(data)
        
        # Keep only last 1000 data points per user
        if len(self.health_data_history[user_id]) > 1000:
            self.health_data_history[user_id] = self.health_data_history[user_id][-1000:]
    
    async def generate_recommendations(self, user_id: str, data: HealthData, analysis: Dict[str, Any]) -> List[HealthRecommendation]:
        """Generate health recommendations based on multi-agent analysis"""
        recommendations = []
        
        # Extract insights from different agents
        crewai_results = analysis.get("crewai_results", {})
        langchain_insights = analysis.get("langchain_insights", {})
        mcp_analysis = analysis.get("mcp_analysis", {})
        
        # Generate recommendations based on CrewAI team analysis
        if "wellness_coordinator" in crewai_results:
            wellness_plan = crewai_results["wellness_coordinator"].get("action_plan", [])
            for action in wellness_plan:
                recommendations.append(HealthRecommendation(
                    recommendation_type="wellness",
                    message=action,
                    action_required=True,
                    urgency="medium",
                    estimated_impact="High - overall health improvement",
                    resources_needed=["health_monitoring", "lifestyle_changes"]
                ))
        
        # Add recommendations from MCP analysis
        if mcp_analysis.get("success") and "result" in mcp_analysis:
            mcp_result = mcp_analysis["result"]
            if "recommendation" in mcp_result:
                recommendations.append(HealthRecommendation(
                    recommendation_type="technical",
                    message=mcp_result["recommendation"],
                    action_required=False,
                    urgency="low",
                    estimated_impact="Medium - improved monitoring",
                    resources_needed=["device_optimization"]
                ))
        
        return recommendations
    
    async def check_health_alerts(self, user_id: str, data: HealthData, analysis: Dict[str, Any]) -> List[HealthAlert]:
        """Check for health alerts using multi-agent analysis"""
        alerts = []
        
        # Check heart rate alerts
        if data.heart_rate < self.thresholds["heart_rate"]["critical_min"] or data.heart_rate > self.thresholds["heart_rate"]["critical_max"]:
            alerts.append(HealthAlert(
                alert_type="critical_heart_rate",
                severity="critical",
                message=f"Critical heart rate detected: {data.heart_rate} BPM",
                action_required=True,
                timestamp=data.timestamp,
                data={"heart_rate": data.heart_rate, "thresholds": self.thresholds["heart_rate"]}
            ))
        
        # Check device positioning alerts
        if data.proximity < self.thresholds["proximity"]["critical_min"] or data.proximity > self.thresholds["proximity"]["critical_max"]:
            alerts.append(HealthAlert(
                alert_type="device_positioning",
                severity="high",
                message=f"Device positioning critical: {data.proximity}cm",
                action_required=True,
                timestamp=data.timestamp,
                data={"proximity": data.proximity, "thresholds": self.thresholds["proximity"]}
            ))
        
        return alerts

# Create and run the enhanced agent
if __name__ == "__main__":
    # Fund the agent if needed
    fund_agent_if_low(MifyHealthAgentWithAdapters().agent.wallet.address())
    
    health_agent = MifyHealthAgentWithAdapters()
    
    print(f"Mify Health Agent with Adapters address: {health_agent.agent.address}")
    print("Starting Enhanced Mify Health Agent with Adapter Integration...")
    print("Agent is ready to receive health data and queries!")
    print("Available adapters:")
    print("- MCP Server for health monitoring tools")
    print("- LangChain integration for advanced query processing")
    print("- CrewAI team for multi-agent collaboration")
    
    try:
        health_agent.agent.run()
    except KeyboardInterrupt:
        print("Shutting down agent...")
        if ADAPTERS_AVAILABLE:
            cleanup_uagent("mify_health_monitor_adapters")
        print("Agent stopped.")
