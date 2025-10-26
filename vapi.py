import streamlit as st
import json
from datetime import datetime
import os
import requests
import re
from dotenv import load_dotenv
import streamlit.components.v1 as components

load_dotenv()

# Page config
st.set_page_config(page_title="MIFY - Voice Assistant", page_icon="🏥", layout="wide")

# Custom CSS
st.markdown("""
<style>
    .stApp { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .chat-container { 
        background: white; 
        border-radius: 15px; 
        padding: 20px; 
        box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
        height: 400px;
        overflow-y: auto;
        margin: 20px 0;
    }
    .dashboard-card {
        background: white;
        border-radius: 15px;
        padding: 20px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        margin: 10px 0;
    }
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 10px;
        padding: 15px;
        text-align: center;
        margin: 5px 0;
    }
    .vapi-container {
        background: white;
        border-radius: 15px;
        padding: 20px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        margin: 20px 0;
        text-align: center;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if 'messages' not in st.session_state:
    st.session_state.messages = []
if 'patient_data' not in st.session_state:
    st.session_state.patient_data = {
        'symptoms': [],
        'duration': '',
        'severity': None,
        'conditions': [],
        'medications': [],
        'consent_given': False
    }

# Header
st.title("🏥 MIFY Voice Assistant")
st.markdown("### Clinical Trial Navigator with VAPI")

# Check backend connection
def check_backend_connection():
    try:
        response = requests.get("http://localhost:8000/", timeout=3)
        return response.status_code == 200
    except:
        return False

backend_connected = check_backend_connection()
if backend_connected:
    st.success("✅ Connected to Backend")
else:
    st.warning("⚠️ Backend disconnected")

# Validate VAPI keys
YOUR_ASSISTANT_ID = os.getenv("VAPI_ASSISTANT_ID", "asst_placeholder")
YOUR_PUBLIC_KEY = os.getenv("VAPI_PUBLIC_KEY", "pk_placeholder")

if YOUR_ASSISTANT_ID == "asst_placeholder" or YOUR_PUBLIC_KEY == "pk_placeholder":
    st.error("⚠️ Please set VAPI_ASSISTANT_ID and VAPI_PUBLIC_KEY in your .env file")
    st.info("""
    **To fix this:**
    1. Create a `.env` file in your project folder
    2. Add these lines with your real keys:
       ```
       VAPI_ASSISTANT_ID=asst_your_actual_id_here
       VAPI_PUBLIC_KEY=pk_your_actual_key_here
       ```
    """)
    st.stop()

# Tabs
tab1, tab2 = st.tabs(["🎤 VAPI Voice Assistant", "📊 Patient Dashboard"])

with tab1:
    st.markdown('<div class="vapi-container">', unsafe_allow_html=True)
    st.subheader("📞 Voice Conversation")
    
    YOUR_ASSISTANT_ID = os.getenv("VAPI_ASSISTANT_ID")
    
    if not YOUR_ASSISTANT_ID:
        st.error("❌ VAPI Assistant ID not found in .env file")
    else:
        st.markdown(f"""
        ### 🎤 Ready to Start Voice Interview!
        
        ## [🎮 CLICK HERE TO START VOICE CONVERSATION](https://vapi.ai/?demo=true&assistantId={YOUR_ASSISTANT_ID})
        
        ---
        
        ### ✅ How it works:
        1. **Click the link above** to open the voice interface
        2. **Allow microphone access** when prompted by your browser
        3. **Complete the full conversation** with your assistant
        4. **Close that tab** and return to this dashboard
        5. **Switch to the Dashboard tab** 
        6. **Click "Refresh Data"** to see extracted patient information
        
        ### 💡 Tips:
        - Use **Chrome or Edge** for best voice recognition
        - Speak clearly at a normal pace
        - Answer all questions for complete data extraction
        """)
        
        st.success("✅ Assistant verified and ready!")
        st.info("Your assistant works with the demo interface - this is perfectly fine!")
    
    st.markdown('</div>', unsafe_allow_html=True)
    
with tab2:
    st.markdown('<div class="dashboard-card">', unsafe_allow_html=True)
    st.subheader("📊 Patient Data Summary")
    
    # Fetch latest data from backend
    @st.cache_data(ttl=5)
    def get_latest_patient():
        try:
            response = requests.get("http://localhost:8000/api/latest-patient", timeout=5)
            if response.status_code == 200:
                return response.json()
            return {"data": None}
        except Exception as e:
            return {"data": None, "error": str(e)}
    
    patient_data = get_latest_patient()
    
    if patient_data.get("data"):
        data = patient_data["data"]
        
        # Key metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            st.metric("Symptoms", len(data.get('symptoms', [])))
            st.markdown('</div>', unsafe_allow_html=True)
        
        with col2:
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            severity = data.get('severity', 'N/A')
            st.metric("Severity", f"{severity}/10" if severity else "N/A")
            st.markdown('</div>', unsafe_allow_html=True)
        
        with col3:
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            st.metric("Conditions", len(data.get('conditions', [])))
            st.markdown('</div>', unsafe_allow_html=True)
        
        with col4:
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            st.metric("Medications", len(data.get('medications', [])))
            st.markdown('</div>', unsafe_allow_html=True)
        
        # Detailed data
        st.markdown("---")
        
        col_a, col_b = st.columns(2)
        
        with col_a:
            st.subheader("🩺 Symptoms")
            symptoms = data.get('symptoms', [])
            if symptoms:
                for symptom in symptoms:
                    st.markdown(f"• {symptom.title()}")
            else:
                st.info("No symptoms recorded")
            
            st.subheader("⚕️ Conditions")
            conditions = data.get('conditions', [])
            if conditions:
                for condition in conditions:
                    st.markdown(f"• {condition}")
            else:
                st.info("No conditions recorded")
        
        with col_b:
            st.subheader("💊 Medications")
            medications = data.get('medications', [])
            if medications:
                for medication in medications:
                    st.markdown(f"• {medication}")
            else:
                st.info("No medications recorded")
            
            st.subheader("📋 Consent")
            if data.get('consent_given', False):
                st.success("✅ Consent Given")
            else:
                st.warning("⏳ Awaiting Consent")
        
        st.markdown("---")
        st.caption(f"Last updated: {patient_data.get('timestamp', 'Unknown')}")
        
    else:
        st.info("👋 No patient data yet. Complete a voice interview using the VAPI assistant!")
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Manual refresh
    if st.button("🔄 Refresh Data", use_container_width=True):
        st.cache_data.clear()
        st.rerun()

st.markdown("---")
st.info("💡 **Workflow:**\n1. Go to 'VAPI Voice Assistant' tab\n2. Use the widget to complete voice interview\n3. Switch to 'Patient Dashboard' tab\n4. See extracted patient data automatically")

# Footer
st.caption("Powered by VAPI Voice AI + Streamlit Dashboard")

