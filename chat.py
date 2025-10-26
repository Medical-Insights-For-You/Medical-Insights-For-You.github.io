import streamlit as st
import os
import json
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

st.set_page_config(page_title="MIFY Voice Assistant", page_icon="🎤", layout="wide")

# Function to extract patient data from webhook
def extract_patient_data_from_webhook(webhook_data):
    """Extract patient data from raw webhook data"""
    patient_data = {
        'symptoms': [],
        'duration': 'N/A',
        'severity': None,
        'conditions': [],
        'medications': [],
        'consent_given': False
    }
    
    try:
        if 'message' in webhook_data:
            message = webhook_data['message']
            if message.get('type') == 'function-call':
                if 'functionCall' in message:
                    function_call = message['functionCall']
                    if 'parameters' in function_call:
                        params = function_call['parameters']
                        for key in patient_data:
                            if key in params:
                                patient_data[key] = params[key]
    except Exception as e:
        print(f"Error extracting patient data: {e}")
    
    return patient_data

st.markdown("""
<style>
    .stApp { 
        background: #000000;
        color: #ffffff;
    }
    .call-card {
        background: #1a1a1a;
        padding: 40px;
        border-radius: 20px;
        box-shadow: 0 15px 50px rgba(0,200,200,0.15);
        margin: 30px auto;
        max-width: 800px;
        border: 1px solid #00cccc;
    }
    .phone-display {
        font-size: 3em;
        font-weight: bold;
        color: #00cccc;
        margin: 30px 0;
        letter-spacing: 2px;
        text-shadow: 0 0 10px rgba(0,204,204,0.3);
    }
    .transcript-box {
        background: #2a2a2a;
        border-radius: 15px;
        padding: 20px;
        margin: 20px 0;
        max-height: 400px;
        overflow-y: auto;
        border: 1px solid #444444;
    }
    .message {
        margin: 15px 0;
        padding: 12px 16px;
        border-radius: 12px;
    }
    .assistant-msg {
        background: #2a4d4d;
        margin-right: 20%;
        border-radius: 15px 15px 15px 5px;
        border-left: 3px solid #00cccc;
    }
    .user-msg {
        background: #2a3a3a;
        margin-left: 20%;
        border-radius: 15px 15px 5px 15px;
        border-right: 3px solid #00aaaa;
    }
    .latest-call-card {
        background: #1a1a1a;
        border-radius: 20px;
        padding: 30px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        margin: 20px 0;
        border: 1px solid #00cccc;
    }
    .summary-box {
        background: #2a2a2a;
        border-radius: 15px;
        padding: 20px;
        border: 1px solid #444444;
    }
    .teal-text {
        color: #00cccc !important;
    }
    .white-text {
        color: #ffffff !important;
    }
    .section-header {
        color: #00cccc;
        border-bottom: 2px solid #00cccc;
        padding-bottom: 10px;
        margin-bottom: 20px;
    }
    .info-tag {
        background: #2a4d4d;
        color: #00cccc;
        padding: 4px 12px;
        border-radius: 20px;
        margin: 4px;
        display: inline-block;
        font-size: 0.9em;
        border: 1px solid #00aaaa;
    }
    .consent-yes {
        background: #2a4d4d;
        color: #00ffcc;
        padding: 8px 16px;
        border-radius: 15px;
        font-weight: bold;
        border: 1px solid #00ffcc;
    }
    .consent-no {
        background: #3a2a2a;
        color: #ff6666;
        padding: 8px 16px;
        border-radius: 15px;
        font-weight: bold;
        border: 1px solid #ff6666;
    }
    .stCheckbox label {
        color: #ffffff !important;
    }
    .stButton button {
        background: #00cccc;
        color: #000000;
        border: none;
    }
    .stButton button:hover {
        background: #00aaaa;
        color: #000000;
    }
    hr {
        border: none;
        border-top: 1px solid #333333;
    }
</style>
""", unsafe_allow_html=True)

# Get phone number
VAPI_PHONE_NUMBER = os.getenv("VAPI_PHONE_NUMBER", "+1-XXX-XXX-XXXX")

# Header
st.markdown("""
<div class="call-card">
    <h1 style="color: #00cccc; text-align: center;">🎤 MIFY Voice Patient Intake</h1>
    <p style="text-align: center; color: #aaaaaa; font-size: 1.2em;">AI-Powered Clinical Trial Navigator</p>
    <hr>
    <p style="text-align: center; font-size: 1.2em; color: #ffffff;">
        Call this number to speak with our AI assistant:
    </p>
    <div class="phone-display" style="text-align: center;">📞 {}</div>
    <p style="text-align: center; color: #888888;">Available 24/7 • Average call time: 1-2 minutes</p>
</div>
""".format(VAPI_PHONE_NUMBER), unsafe_allow_html=True)

# Auto-refresh toggle
col1, col2, col3 = st.columns([1, 2, 1])
with col2:
    auto_refresh = st.checkbox("🔄 Auto-refresh (every 3 seconds)", value=True)

if auto_refresh:
    st.markdown("""
    <script>
        setTimeout(function() {
            window.location.reload();
        }, 3000);
    </script>
    """, unsafe_allow_html=True)

# Display latest patient call
st.markdown("---")
st.markdown("<h2 style='text-align: center; color: #00cccc;'>📋 Your Patient Call</h2>", unsafe_allow_html=True)

if os.path.exists("patient_data"):
    raw_files = [f for f in os.listdir("patient_data") if f.startswith("raw_webhook_") and f.endswith(".json")]
    
    if raw_files:
        latest_file = sorted(raw_files, reverse=True)[0]
        timestamp = latest_file.replace("raw_webhook_", "").replace(".json", "")
        
        with open(f"patient_data/{latest_file}") as f:
            raw_data = json.load(f)
        
        patient_data = extract_patient_data_from_webhook(raw_data)
        
        st.markdown('<div class="latest-call-card">', unsafe_allow_html=True)
        
        col1, col2 = st.columns([1, 1])
        
        with col1:
            st.markdown("<h3 class='section-header'>📝 Patient Summary</h3>", unsafe_allow_html=True)
            st.markdown('<div class="summary-box">', unsafe_allow_html=True)
            
            st.markdown("**Symptoms:**")
            symptoms = patient_data.get('symptoms', [])
            if symptoms:
                for symptom in symptoms:
                    st.markdown(f"<span class='info-tag'>{symptom}</span>", unsafe_allow_html=True)
            else:
                st.write("None reported")
            
            st.markdown(f"**Duration:** {patient_data.get('duration', 'N/A')}")
            st.markdown(f"**Severity:** {patient_data.get('severity', 'N/A')}/10")
            
            st.markdown("**Existing Conditions:**")
            conditions = patient_data.get('conditions', [])
            if conditions:
                for condition in conditions:
                    st.markdown(f"<span class='info-tag'>{condition}</span>", unsafe_allow_html=True)
            else:
                st.write("None reported")
            
            st.markdown("**Medications:**")
            meds = patient_data.get('medications', [])
            if meds:
                for med in meds:
                    st.markdown(f"<span class='info-tag'>{med}</span>", unsafe_allow_html=True)
            else:
                st.write("None reported")
            
            consent = "<span class='consent-yes'>✅ YES</span>" if patient_data.get('consent_given') else "<span class='consent-no'>❌ NO</span>"
            st.markdown(f"**Consent Given:** {consent}", unsafe_allow_html=True)
            
            st.markdown('</div>', unsafe_allow_html=True)
        
        with col2:
            st.markdown("<h3 class='section-header'>💬 Call Transcript</h3>", unsafe_allow_html=True)
            
            transcript_file = f"patient_data/transcript_{timestamp}.txt"
            
            if os.path.exists(transcript_file):
                try:
                    with open(transcript_file, 'r') as f:
                        transcript_content = f.read()
                    
                    if transcript_content:
                        st.markdown('<div class="transcript-box">', unsafe_allow_html=True)
                        
                        lines = transcript_content.split('\n')
                        for line in lines:
                            line = line.strip()
                            if line and not line.startswith('=') and not line.startswith('MIFY Call Transcript') and not line.startswith('Timestamp:'):
                                if any(word in line.lower() for word in ['assistant:', 'bot:', 'ai:']):
                                    css_class = 'assistant-msg'
                                    icon = '🤖'
                                elif any(word in line.lower() for word in ['patient:', 'user:', 'caller:']):
                                    css_class = 'user-msg'
                                    icon = '👤'
                                else:
                                    css_class = 'assistant-msg'
                                    icon = '📝'
                                
                                display_text = line
                                if ':' in line:
                                    parts = line.split(':', 1)
                                    if len(parts) > 1:
                                        display_text = parts[1].strip()
                                
                                st.markdown(f"""
                                <div class="message {css_class}">
                                    <strong>{icon}:</strong> {display_text}
                                </div>
                                """, unsafe_allow_html=True)
                        
                        st.markdown('</div>', unsafe_allow_html=True)
                    else:
                        st.info("📝 Transcript file is empty")
                except Exception as e:
                    st.error(f"❌ Error reading transcript: {str(e)}")
            else:
                st.info("📝 Transcript will appear here after the call completes.")
        
        st.markdown('</div>', unsafe_allow_html=True)
        
        with st.expander("🔍 View Raw Call Data"):
            st.json(raw_data)
            
    else:
        st.info("💡 No patient calls yet. Make a test call to see data appear here!")
        st.markdown("""
        <div class="call-card">
            <h3 style="color: #00cccc;">How to Get Started:</h3>
            <ol style="text-align: left; font-size: 1.1em; line-height: 2; color: #aaaaaa;">
                <li>📞 Call the number above from your phone</li>
                <li>🗣️ Talk to the AI assistant</li>
                <li>📋 Complete the intake process</li>
                <li>📊 Watch your call data appear here!</li>
            </ol>
        </div>
        """, unsafe_allow_html=True)
else:
    st.info("💡 Patient data directory not found. Make sure your backend is running!")

# Manual refresh button
st.markdown("---")
col1, col2, col3 = st.columns([1, 1, 1])
with col2:
    if st.button("🔄 Refresh Now", use_container_width=True):
        st.rerun()

# Footer
st.markdown("---")
st.markdown("""
<div style='text-align: center; color: #888888; padding: 20px;'>
    <p style='color: #00cccc;'>MIFY - AI-Powered Clinical Trial Navigator</p>
    <p style='font-size: 0.85em; opacity: 0.8;'>Voice intake powered by Vapi | Data processing with Claude AI</p>
</div>
""", unsafe_allow_html=True)