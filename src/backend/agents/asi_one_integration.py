#!/usr/bin/env python3
"""
ASI:One Integration for Mify Health Monitoring
Real-time integration with Fetch.ai's ASI:One for intelligent agent discovery
"""

import asyncio
import aiohttp
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class ASIOneClient:
    """Client for ASI:One API integration"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.asi1.ai/v1"
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def chat_completion(self, 
                            messages: List[Dict[str, str]], 
                            model: str = "asi1-mini",
                            temperature: float = 0.7,
                            max_tokens: int = 1000) -> Dict[str, Any]:
        """Make a chat completion request to ASI:One"""
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    logger.info(f"ASI:One API call successful: {result.get('usage', {})}")
                    return result
                else:
                    error_text = await response.text()
                    logger.error(f"ASI:One API error {response.status}: {error_text}")
                    return {"error": f"API error {response.status}: {error_text}"}
        
        except Exception as e:
            logger.error(f"ASI:One API request failed: {e}")
            return {"error": f"Request failed: {str(e)}"}
    
    async def discover_agents(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Discover relevant agents using ASI:One"""
        
        discovery_prompt = f"""
        I need to discover agents that can help with health monitoring and analysis.
        
        Query: {query}
        Context: {json.dumps(context or {}, indent=2)}
        
        Please help me find agents that can:
        1. Analyze health data from Arduino sensors
        2. Provide health recommendations
        3. Process fitness tracking data
        4. Generate health reports
        5. Send health alerts
        
        What agents are available for these tasks?
        """
        
        messages = [
            {"role": "user", "content": discovery_prompt}
        ]
        
        return await self.chat_completion(messages, model="asi1-mini")
    
    async def process_health_query(self, query: str, health_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process health-related queries using ASI:One"""
        
        health_context = ""
        if health_data:
            health_context = f"""
            Current Health Data:
            - Heart Rate: {health_data.get('heart_rate', 'N/A')} BPM
            - Movement Level: {health_data.get('movement_level', 'N/A')}
            - Proximity: {health_data.get('proximity', 'N/A')} cm
            - Circuit Status: {health_data.get('circuit_status', 'N/A')}
            - Timestamp: {health_data.get('timestamp', 'N/A')}
            """
        
        health_prompt = f"""
        You are a specialized health monitoring AI assistant. Please analyze the following health query and provide helpful insights.
        
        User Query: {query}
        
        {health_context}
        
        Please provide:
        1. Analysis of the health data (if available)
        2. Recommendations based on the query
        3. Any health alerts or concerns
        4. Next steps for the user
        
        Be specific, helpful, and prioritize user safety.
        """
        
        messages = [
            {"role": "user", "content": health_prompt}
        ]
        
        return await self.chat_completion(messages, model="asi1-mini", max_tokens=1500)
    
    async def generate_health_report(self, user_id: str, health_data_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate comprehensive health report using ASI:One"""
        
        # Summarize health data history
        if health_data_history:
            recent_data = health_data_history[-10:]  # Last 10 readings
            avg_heart_rate = sum(d.get('heart_rate', 0) for d in recent_data) / len(recent_data)
            movement_levels = [d.get('movement_level', 'Low') for d in recent_data]
            high_movement_count = movement_levels.count('High')
            activity_score = high_movement_count / len(movement_levels)
        else:
            avg_heart_rate = 0
            activity_score = 0
        
        report_prompt = f"""
        Generate a comprehensive health report for user {user_id} based on the following data:
        
        Health Data Summary:
        - Average Heart Rate: {avg_heart_rate:.1f} BPM
        - Activity Score: {activity_score:.2f} (0-1 scale)
        - Data Points: {len(health_data_history)}
        - Monitoring Period: Last {len(health_data_history)} readings
        
        Please provide:
        1. Overall Health Assessment
        2. Key Metrics Analysis
        3. Trend Analysis
        4. Health Recommendations
        5. Risk Factors (if any)
        6. Action Items
        
        Format the report in a clear, professional manner suitable for both the user and healthcare providers.
        """
        
        messages = [
            {"role": "user", "content": report_prompt}
        ]
        
        return await self.chat_completion(messages, model="asi1-mini", max_tokens=2000)
    
    async def analyze_health_anomalies(self, health_data: Dict[str, Any], baseline_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Analyze health data for anomalies using ASI:One"""
        
        baseline_context = ""
        if baseline_data:
            baseline_context = f"""
            Baseline Data:
            - Normal Heart Rate Range: {baseline_data.get('heart_rate_min', 60)}-{baseline_data.get('heart_rate_max', 100)} BPM
            - Typical Movement Level: {baseline_data.get('typical_movement', 'Medium')}
            - Optimal Proximity Range: {baseline_data.get('proximity_min', 10)}-{baseline_data.get('proximity_max', 30)} cm
            """
        
        anomaly_prompt = f"""
        Analyze the following health data for anomalies and potential health concerns:
        
        Current Health Data:
        - Heart Rate: {health_data.get('heart_rate', 'N/A')} BPM
        - Movement Level: {health_data.get('movement_level', 'N/A')}
        - Proximity: {health_data.get('proximity', 'N/A')} cm
        - Circuit Status: {health_data.get('circuit_status', 'N/A')}
        - Timestamp: {health_data.get('timestamp', 'N/A')}
        
        {baseline_context}
        
        Please identify:
        1. Any anomalies in the data
        2. Potential health concerns
        3. Severity level (low, medium, high, critical)
        4. Recommended actions
        5. Whether medical attention is needed
        
        Be thorough but concise in your analysis.
        """
        
        messages = [
            {"role": "user", "content": anomaly_prompt}
        ]
        
        return await self.chat_completion(messages, model="asi1-mini", max_tokens=1500)

class HealthASIOneIntegration:
    """Integration class for health monitoring with ASI:One"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.asi_one_client = ASIOneClient(api_key)
        self.health_baselines = {
            "heart_rate_min": 60,
            "heart_rate_max": 100,
            "typical_movement": "Medium",
            "proximity_min": 10,
            "proximity_max": 30
        }
    
    async def process_health_data_with_asi_one(self, health_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Process health data using ASI:One for intelligent analysis"""
        
        async with self.asi_one_client as client:
            # Analyze for anomalies
            anomaly_analysis = await client.analyze_health_anomalies(health_data, self.health_baselines)
            
            # Process health query
            health_query = f"Analyze my current health data: heart rate {health_data.get('heart_rate')} BPM, movement {health_data.get('movement_level')}, proximity {health_data.get('proximity')} cm"
            query_response = await client.process_health_query(health_query, health_data)
            
            # Discover relevant agents
            agent_discovery = await client.discover_agents(
                "health monitoring and analysis",
                {"user_id": user_id, "health_data": health_data}
            )
            
            return {
                "anomaly_analysis": anomaly_analysis,
                "query_response": query_response,
                "agent_discovery": agent_discovery,
                "timestamp": datetime.now().isoformat(),
                "user_id": user_id
            }
    
    async def generate_comprehensive_health_insights(self, user_id: str, health_data_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate comprehensive health insights using ASI:One"""
        
        async with self.asi_one_client as client:
            # Generate health report
            health_report = await client.generate_health_report(user_id, health_data_history)
            
            # Discover specialized agents
            agent_discovery = await client.discover_agents(
                "comprehensive health analysis and reporting",
                {"user_id": user_id, "data_points": len(health_data_history)}
            )
            
            return {
                "health_report": health_report,
                "agent_discovery": agent_discovery,
                "timestamp": datetime.now().isoformat(),
                "user_id": user_id
            }
    
    async def handle_health_emergency(self, health_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Handle health emergencies using ASI:One for immediate analysis"""
        
        emergency_prompt = f"""
        URGENT HEALTH ANALYSIS REQUEST
        
        User ID: {user_id}
        Health Data: {json.dumps(health_data, indent=2)}
        
        Please immediately analyze this health data for any critical health concerns that require immediate attention.
        
        Provide:
        1. Critical health assessment
        2. Immediate action required (yes/no)
        3. Emergency level (low/medium/high/critical)
        4. Specific recommendations
        5. Whether to contact emergency services
        
        This is a time-sensitive health monitoring request.
        """
        
        async with self.asi_one_client as client:
            messages = [{"role": "user", "content": emergency_prompt}]
            emergency_response = await client.chat_completion(messages, model="asi1-mini", max_tokens=1000)
            
            return {
                "emergency_analysis": emergency_response,
                "timestamp": datetime.now().isoformat(),
                "user_id": user_id,
                "urgent": True
            }

# Example usage and testing
async def test_asi_one_integration():
    """Test the ASI:One integration"""
    
    # Use the provided API key
    api_key = "sk_8517f5128130429bb06a779ab5502ca0bc7ece1f61be45c6bae5a8c726c06f0e"
    
    # Create integration instance
    health_integration = HealthASIOneIntegration(api_key)
    
    # Test health data
    test_health_data = {
        "heart_rate": 85,
        "movement_level": "Medium",
        "proximity": 15.5,
        "circuit_status": "Closed",
        "timestamp": datetime.now().isoformat()
    }
    
    print("Testing ASI:One Integration...")
    
    try:
        # Test health data processing
        result = await health_integration.process_health_data_with_asi_one(test_health_data, "test_user_123")
        print("Health Data Processing Result:")
        print(json.dumps(result, indent=2))
        
        # Test comprehensive insights
        health_history = [test_health_data] * 5  # Simulate 5 data points
        insights = await health_integration.generate_comprehensive_health_insights("test_user_123", health_history)
        print("\nComprehensive Health Insights:")
        print(json.dumps(insights, indent=2))
        
    except Exception as e:
        print(f"Error testing ASI:One integration: {e}")

if __name__ == "__main__":
    # Run the test
    asyncio.run(test_asi_one_integration())
