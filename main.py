from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import json
from datetime import datetime

load_dotenv()

VAPI_PRIVATE_KEY = os.getenv("VAPI_PRIVATE_KEY")

if not VAPI_PRIVATE_KEY:
    print("ERROR: VAPI_PRIVATE_KEY not found!")
    exit(1)
else:
    print("Vapi key loaded successfully")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create data directory
os.makedirs("patient_data", exist_ok=True)

@app.get("/")
async def root():
    return {"message": "MIFY Backend is running", "vapi_key_loaded": True}

@app.post("/api/vapi-webhook")
async def handle_vapi_webhook(request: Request):
    """Receives ALL data from Vapi and saves it"""
    
    print("\n" + "="*60)
    print("📞 WEBHOOK RECEIVED FROM VAPI")
    print("="*60)
    
    data = await request.json()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # ALWAYS save the raw webhook data
    raw_filename = f"patient_data/raw_webhook_{timestamp}.json"
    with open(raw_filename, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"\n✅ Raw webhook saved to: {raw_filename}")
    
    # Print the full payload
    print("\nFull payload:")
    print(json.dumps(data, indent=2))
    
    # Try to extract transcript
    transcript_text = ""
    
    # Check for transcript in various places
    if "transcript" in data:
        transcript_text = data["transcript"]
    elif "message" in data and "transcript" in data["message"]:
        transcript_text = data["message"]["transcript"]
    elif "messages" in data:
        # Build transcript from messages array
        for msg in data["messages"]:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            transcript_text += f"{role}: {content}\n\n"
    
    # Save transcript if we found any
    if transcript_text:
        transcript_filename = f"patient_data/transcript_{timestamp}.txt"
        with open(transcript_filename, 'w') as f:
            f.write(f"MIFY Call Transcript\n")
            f.write(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("="*60 + "\n\n")
            f.write(transcript_text)
        print(f"✅ Transcript saved to: {transcript_filename}")
    
    # Try to extract structured patient data (if function was called)
    patient_data = None
    
    if "message" in data:
        message = data["message"]
        
        if message.get("type") == "function-call":
            function_call = message.get("functionCall", {})
            patient_data = function_call.get("parameters", {})
            
            print("\n" + "="*60)
            print("👤 STRUCTURED PATIENT DATA EXTRACTED:")
            print("="*60)
            print(f"Symptoms: {patient_data.get('symptoms', [])}")
            print(f"Duration: {patient_data.get('duration', 'N/A')}")
            print(f"Severity: {patient_data.get('severity', 'N/A')}/10")
            print(f"Conditions: {patient_data.get('conditions', [])}")
            print(f"Medications: {patient_data.get('medications', [])}")
            print(f"Consent: {patient_data.get('consent_given', False)}")
            print("="*60)
            
            # Save structured data
            structured_filename = f"patient_data/patient_structured_{timestamp}.json"
            with open(structured_filename, 'w') as f:
                json.dump(patient_data, f, indent=2)
            print(f"✅ Structured data saved to: {structured_filename}")
            
            # Also save as readable text
            patient_text = f"""MIFY Patient Intake Data
{'='*60}
Timestamp: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

SYMPTOMS:
{chr(10).join(f"  - {s}" for s in patient_data.get('symptoms', []))}

DURATION: {patient_data.get('duration', 'Not specified')}

SEVERITY: {patient_data.get('severity', 'N/A')}/10

EXISTING CONDITIONS:
{chr(10).join(f"  - {c}" for c in patient_data.get('conditions', [])) if patient_data.get('conditions') else '  None reported'}

CURRENT MEDICATIONS:
{chr(10).join(f"  - {m}" for m in patient_data.get('medications', [])) if patient_data.get('medications') else '  None reported'}

CONSENT GIVEN: {'Yes' if patient_data.get('consent_given') else 'No'}
{'='*60}
"""
            readable_filename = f"patient_data/patient_readable_{timestamp}.txt"
            with open(readable_filename, 'w') as f:
                f.write(patient_text)
            print(f"✅ Readable patient data saved to: {readable_filename}")
    
    print("\n" + "="*60)
    return {
        "status": "success",
        "saved_raw": True,
        "saved_transcript": bool(transcript_text),
        "saved_structured": patient_data is not None
    }

@app.get("/api/patients")
async def list_patients():
    """List all saved patient files"""
    try:
        files = os.listdir("patient_data")
        json_files = [f for f in files if f.endswith('.json')]
        
        patients = []
        for file in sorted(json_files, reverse=True):
            filepath = os.path.join("patient_data", file)
            with open(filepath, 'r') as f:
                data = json.load(f)
                patients.append({
                    "filename": file,
                    "data": data
                })
        
        return {"count": len(patients), "patients": patients}
    except Exception as e:
        return {"error": str(e), "patients": []}

# ✅ ADD THE FUNCTION HERE - BEFORE the if __name__ block
@app.get("/api/latest-patient")
async def get_latest_patient():
    """Get the most recent patient data for dashboard display"""
    try:
        import glob
        import os
        
        # Find the most recent structured data file
        structured_files = glob.glob("patient_data/patient_structured_*.json")
        if not structured_files:
            return {"data": None, "message": "No patient data found"}
        
        # Sort by timestamp and get latest
        latest_file = sorted(structured_files, reverse=True)[0]
        
        with open(latest_file, 'r') as f:
            patient_data = json.load(f)
        
        # Also get transcript
        transcript_file = latest_file.replace('patient_structured_', 'transcript_')
        transcript_content = ""
        if os.path.exists(transcript_file):
            with open(transcript_file, 'r') as f:
                transcript_content = f.read()
        
        return {
            "data": patient_data,
            "transcript": transcript_content,
            "timestamp": os.path.basename(latest_file)
        }
    except Exception as e:
        return {"error": str(e), "data": None}

# ✅ This should be the LAST thing in your file
if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Starting MIFY Backend Server...")
    print(f"📡 Webhook: http://localhost:8000/api/vapi-webhook")
    print(f"📡 Latest patient API: http://localhost:8000/api/latest-patient")  # Added this line
    print(f"📁 Patient data will be saved to: ./patient_data/")
    print(f"💾 Now saving: Raw webhooks, Transcripts, AND Structured data")
    uvicorn.run(app, host="0.0.0.0", port=8000)