from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
import re

app = FastAPI(title="Smart Hospital AI/ML Service")

# Startup: Auto-generate synthetic models so the app works instantly
# Real training pipelines would load pickle files from datasets.
models: Dict[str, RandomForestClassifier] = {}

def train_fallback_models():
    print("Training fallback medical models on startup...")
    # Heart Model (13 features: age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal)
    X_heart = np.random.randint(0, 100, size=(100, 13))
    y_heart = np.random.randint(0, 2, size=(100,))
    heart_clf = RandomForestClassifier(n_estimators=10)
    heart_clf.fit(X_heart, y_heart)
    models['heart'] = heart_clf

    # Diabetes Model (8 features: Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin, BMI, DiabetesPedigreeFunction, Age)
    X_diab = np.random.randint(0, 100, size=(100, 8))
    y_diab = np.random.randint(0, 2, size=(100,))
    diab_clf = RandomForestClassifier(n_estimators=10)
    diab_clf.fit(X_diab, y_diab)
    models['diabetes'] = diab_clf

    # Kidney Model (10 features)
    X_kidney = np.random.randint(0, 100, size=(100, 10))
    y_kidney = np.random.randint(0, 2, size=(100,))
    kidney_clf = RandomForestClassifier(n_estimators=10)
    kidney_clf.fit(X_kidney, y_kidney)
    models['kidney'] = kidney_clf

    # Liver Model (10 features)
    X_liver = np.random.randint(0, 100, size=(100, 10))
    y_liver = np.random.randint(0, 2, size=(100,))
    liver_clf = RandomForestClassifier(n_estimators=10)
    liver_clf.fit(X_liver, y_liver)
    models['liver'] = liver_clf
    print("Fallback medical models trained successfully.")

@app.on_event("startup")
def startup_event():
    train_fallback_models()

# Pydantic Schemas
class FeatureInput(BaseModel):
    features: List[float]

class ChatInput(BaseModel):
    message: str
    chatHistory: Optional[List[Dict[str, str]]] = []

class ReportInput(BaseModel):
    reportUrl: str

class SymptomInput(BaseModel):
    symptoms: str
    medicalHistory: Optional[List[str]] = []

@app.post("/predict/{disease}")
def predict_disease(disease: str, input_data: FeatureInput):
    if disease not in models:
        raise HTTPException(status_code=404, detail=f"Model for '{disease}' not found.")
    
    try:
        clf = models[disease]
        features_arr = np.array([input_data.features])
        
        prediction = clf.predict(features_arr)[0]
        probabilities = clf.predict_proba(features_arr)[0]
        risk_probability = float(probabilities[1]) if len(probabilities) > 1 else float(probabilities[0])
        
        risk_level = "Low"
        if risk_probability > 0.6:
            risk_level = "High"
        elif risk_probability > 0.3:
            risk_level = "Medium"

        return {
            "disease": disease,
            "prediction": int(prediction),
            "probability": risk_probability,
            "risk_level": risk_level,
            "disclaimer": "AI suggestion only. Please consult a qualified doctor."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/symptoms")
def predict_symptoms_ai(input_data: SymptomInput):
    symptoms = input_data.symptoms.lower()
    history = [c.lower() for c in input_data.medicalHistory or []]
    
    # 1. Try Gemini API first if whitelisted key exists
    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            system_instruction = (
                "You are an AI Clinical Diagnostic Engine for Q9 Hospital. "
                "Analyze the patient's symptoms and their past medical history to provide a prediction. "
                "Output exactly a JSON object (no markdown, no markdown backticks, just raw json string) containing keys: "
                "\"predictedDisease\": string (specific medical condition likely), "
                "\"probability\": float (between 0.0 and 1.0), "
                "\"riskLevel\": string (one of 'Low', 'Medium', 'High'), "
                "\"recommendations\": string (clear, practical medical advice and recommended specialist referral). "
                "Take the medical history into account as possible risk factors."
            )
            
            payload = {
                "contents": [{"role": "user", "parts": [{"text": f"Symptoms: {input_data.symptoms}. Medical History: {input_data.medicalHistory}."}]}],
                "systemInstruction": {"parts": [{"text": system_instruction}]},
                "generationConfig": {"responseMimeType": "application/json"}
            }
            
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            
            with urllib.request.urlopen(req, timeout=5) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                reply = res_data["candidates"][0]["content"]["parts"][0]["text"]
                pred = json.loads(reply)
                return {
                    "predictedDisease": pred.get("predictedDisease", "General Consultation"),
                    "probability": float(pred.get("probability", 0.5)),
                    "riskLevel": pred.get("riskLevel", "Low"),
                    "recommendations": pred.get("recommendations", "Please consult a doctor.")
                }
        except Exception as e:
            print(f"Gemini API request failed for symptoms: {e}. Falling back to rule-based logic...")

    # 2. Local rule-based symptom patterns fallback
    predictedDisease = "General Consultation"
    probability = 0.5
    riskLevel = "Low"
    recommendations = "Rest, hydrate, and monitor your symptoms. Consider consulting a general practitioner if discomfort persists."

    has_history = lambda cond: any(cond in c for c in history)

    if any(x in symptoms for x in ["chest", "heart", "cardiac", "angina"]):
        predictedDisease = "Potential Cardiovascular Stress"
        probability = 0.85 if (has_history("heart") or has_history("hypertension")) else 0.65
        riskLevel = "High"
        recommendations = "🚨 CRITICAL: Seek immediate medical attention or go to the ER if you experience chest tightness, left arm pain, or shortness of breath. Suggested: cardiology consultation."
    elif any(x in symptoms for x in ["breath", "wheez", "asthma", "cough", "choking"]):
        predictedDisease = "Respiratory Hyper-responsiveness / Asthma Exacerbation"
        probability = 0.80 if (has_history("asthma") or has_history("copd") or has_history("bronchitis")) else 0.60
        riskLevel = "Medium"
        recommendations = "Ensure use of quick-relief inhaler if active. Keep oxygen levels checked. Avoid sudden temperature changes or allergens, and book a pulmonology consultation."
    elif any(x in symptoms for x in ["sugar", "thirsty", "fatigue", "urination", "polyuria"]):
        predictedDisease = "Blood Glucose Instability / Hyperglycemia"
        probability = 0.90 if has_history("diabet") else 0.70
        riskLevel = "Medium"
        recommendations = "Check blood sugar levels immediately. Follow a low glycemic diet, avoid processed sugars, stay hydrated, and consult an endocrinologist."
    elif any(x in symptoms for x in ["stomach", "vomit", "acid", "nausea", "abdominal"]):
        predictedDisease = "Gastrointestinal Dyspepsia / Gastroenteritis"
        probability = 0.60
        riskLevel = "Low"
        recommendations = "Eat light meals (e.g. BRAT diet). Avoid spicy/greasy food, maintain fluid and electrolyte intake, and consult a gastroenterologist if symptoms persist."
    elif any(x in symptoms for x in ["kidney", "urine", "renal", "back pain"]):
        predictedDisease = "Renal Function Stress"
        probability = 0.82 if (has_history("kidney") or has_history("renal")) else 0.55
        riskLevel = "High"
        recommendations = "Drink plenty of water. Avoid NSAID painkillers (e.g. ibuprofen), keep sodium intake low, and consult a nephrologist for clinical evaluation."

    return {
        "predictedDisease": predictedDisease,
        "probability": probability,
        "riskLevel": riskLevel,
        "recommendations": recommendations
    }

import os
import json
import urllib.request

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

@app.post("/chatbot")
def clinical_chatbot(input_data: ChatInput):
    msg = input_data.message.lower()
    
    # 1. Try Gemini API first if whitelisted key exists
    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            system_instruction = (
                "You are a helpful, professional AI Medical Assistant for Q9 Multi-speciality Hospital. "
                "Help answer patient queries about symptoms, basic health precautions, and hospital scheduling. "
                "Keep answers concise (under 3 sentences), highly professional, and always add a disclaimer "
                "stating that you are an AI assistant, not a doctor. If the patient describes emergency symptoms like severe "
                "chest pain or trouble breathing, flag it as an EMERGENCY and urge them to visit the ER immediately."
            )
            
            contents = []
            for h in input_data.chatHistory or []:
                role = "user" if h.get("sender") == "user" else "model"
                contents.append({"role": role, "parts": [{"text": h.get("text")}]})
            
            contents.append({"role": "user", "parts": [{"text": input_data.message}]})
            
            payload = {
                "contents": contents,
                "systemInstruction": {"parts": [{"text": system_instruction}]}
            }
            
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            
            with urllib.request.urlopen(req, timeout=5) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                reply = res_data["candidates"][0]["content"]["parts"][0]["text"]
                return { "reply": reply }
        except Exception as e:
            print(f"Gemini API request failed: {e}. Falling back to local NLP rules...")

    # 2. Local rule-based symptom patterns fallback
    if any(x in msg for x in ["chest pain", "heart pressure", "angina"]):
        reply = "⚠️ EMERGENCY WARNING: Severe chest pain can be a sign of a cardiac arrest or heart condition. Please dial our emergency hotline immediately or visit the nearest ER ward. Do not wait for appointments."
    elif any(x in msg for x in ["fever", "cough", "cold", "flu"]):
        reply = "Flu and cold symptoms can usually be managed with rest, hydration, and paracetamol. If fever persists above 102°F (39°C) for more than 48 hours, or you experience shortness of breath, please book an appointment with our General Medicine unit."
    elif any(x in msg for x in ["stomach", "vomit", "nausea", "abdominal"]):
        reply = "Stomach discomfort or nausea can arise from dietary factors or mild infections. Hydrate well and stick to light foods. If pain is severe or accompanied by persistent vomiting, please book a General Practitioner consultation."
    elif any(x in msg for x in ["headache", "migraine", "head pain"]):
        reply = "Headaches can be triggered by stress, dehydration, or eye strain. Rest in a quiet room and drink plenty of fluids. If the headache is sudden and exceptionally severe, seek medical attention immediately."
    elif any(x in msg for x in ["breath", "asthma", "breathing"]):
        reply = "⚠️ WARNING: Shortness of breath can be a sign of a respiratory issue or allergy. If you are experiencing severe breathing difficulty, please visit our ER immediately."
    elif any(x in msg for x in ["diabetes", "sugar level", "insulin"]):
        reply = "For diabetes management, monitor blood sugar fasting limits. Maintain a low glycemic diet, exercise daily, and avoid skipping prescriptions. If you experience severe symptoms like extreme thirst or fatigue, schedule an endocrinology consultation."
    elif any(x in msg for x in ["appointment", "booking", "schedule", "slot"]):
        reply = "You can book a physical or teleconsultation appointment directly using our online slot booker in the Patient Dashboard. It calculates estimated wait times and suggests appropriate doctors."
    elif any(x in msg for x in ["hello", "hi", "hey"]):
        reply = "Hello! I am your AI clinical assistant. How can I help you today? Specify symptoms like fever or headache, or ask about scheduling bookings."
    elif any(x in msg for x in ["thank", "thanks"]):
        reply = "You are very welcome! If you have any other health queries or need help booking, feel free to ask. Stay healthy!"
    else:
        reply = "Hello! I am your AI clinical assistant. I can help answer queries about symptoms, basic health precautions, and smart clinic scheduling. Please specify your symptoms (e.g. fever, headache) or ask about our specialty departments."

    return { "reply": reply }

@app.post("/ocr/analyze")
def analyze_lab_report(input_data: ReportInput):
    # Simulated OCR extraction text
    # In full deploy, we download from 'reportUrl' and load into EasyOCR.
    # We mock the regex-based abnormal values extraction out-of-the-box.
    raw_extracted_text = (
        "Q9 MULTISPECIALITY CLINICAL REPORT\n"
        "PATIENT ID: P-9082\n"
        "TEST: Blood Glucose Profile\n"
        "Fasting Blood Glucose: 135 mg/dL  [Reference Range: 70 - 100 mg/dL]\n"
        "Hemoglobin (Hb): 14.2 g/dL       [Reference Range: 13.5 - 17.5 g/dL]\n"
        "Creatinine: 2.1 mg/dL            [Reference Range: 0.6 - 1.2 mg/dL]\n"
    )

    # Regex Parsing Logic
    abnormal_values = []
    
    # Check Glucose
    glucose_match = re.search(r"Fasting Blood Glucose:\s*(\d+)", raw_extracted_text)
    if glucose_match:
        val = int(glucose_match.group(1))
        if val > 100:
            abnormal_values.append({
                "parameter": "Fasting Blood Glucose",
                "value": f"{val} mg/dL",
                "referenceRange": "70-100 mg/dL"
            })
            
    # Check Creatinine
    creatinine_match = re.search(r"Creatinine:\s*([\d\.]+)", raw_extracted_text)
    if creatinine_match:
        val = float(creatinine_match.group(1))
        if val > 1.2:
            abnormal_values.append({
                "parameter": "Serum Creatinine",
                "value": f"{val} mg/dL",
                "referenceRange": "0.6-1.2 mg/dL"
            })

    severity = "normal"
    summary = "Your blood metrics look normal and healthy."
    
    if len(abnormal_values) > 0:
        severity = "abnormal"
        if any(x["parameter"] == "Serum Creatinine" for x in abnormal_values):
            severity = "critical"
            summary = "Critical alert: Elevated Creatinine levels indicate possible renal filtering stress. Immediate general practitioner follow-up is highly advised."
        else:
            summary = "Abnormal value detected: Elevated Fasting Glucose limits suggest a diabetic risk pattern. Consider consulting an Endocrinologist."

    return {
        "severity": severity,
        "ocrAnalysis": {
            "rawText": raw_extracted_text,
            "abnormalValues": abnormal_values,
            "summary": summary
        }
    }

@app.get("/health")
def health_check():
    return { "status": "online", "models_loaded": list(models.keys()) }
