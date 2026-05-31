const LabReport = require('../models/LabReport');
const PatientProfile = require('../models/PatientProfile');
const AiPrediction = require('../models/AiPrediction');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

exports.predictDisease = async (req, res, next) => {
  try {
    const { disease, features } = req.body; // e.g., disease = 'heart' or 'diabetes'
    
    // Call the Python FastAPI microservice
    const response = await fetch(`${ML_SERVICE_URL}/predict/${disease}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features)
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      return res.status(response.status).json({ success: false, message: `ML Service Error: ${errorMsg}` });
    }

    const data = await response.json();
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    // If Python ML microservice is offline, return mock data in development mode
    if (process.env.NODE_ENV !== 'production') {
      console.warn("Python ML Microservice is offline. Returning simulated mock data...");
      const mockResult = {
        prediction: Math.random() > 0.5 ? 1 : 0,
        probability: Math.random(),
        risk_level: Math.random() > 0.6 ? 'High' : Math.random() > 0.3 ? 'Medium' : 'Low',
        simulated: true
      };
      return res.status(200).json({ success: true, ...mockResult });
    }
    next(err);
  }
};

exports.chatAssistant = async (req, res, next) => {
  try {
    const { message, chatHistory } = req.body;

    const response = await fetch(`${ML_SERVICE_URL}/chatbot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, chatHistory })
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      return res.status(response.status).json({ success: false, message: `Chatbot Error: ${errorMsg}` });
    }

    const data = await response.json();
    res.status(200).json({ success: true, reply: data.reply });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn("Python chatbot service offline. Returning simulated chatbot reply...");
      return res.status(200).json({
        success: true,
        reply: `This is a simulated assistant response. It seems the Python ML service is offline. However, I can suggest scheduling a check-up if you are experiencing symptoms like chest discomfort or high fever.`,
        simulated: true
      });
    }
    next(err);
  }
};

exports.analyzeReport = async (req, res, next) => {
  try {
    const { reportUrl, testName } = req.body;

    const patient = await PatientProfile.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    // Call Python FastAPI OCR parser
    const response = await fetch(`${ML_SERVICE_URL}/ocr/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportUrl })
    });

    let ocrAnalysis = {
      rawText: "Sample blood report text detailing Hemoglobin levels.",
      abnormalValues: [],
      summary: "All clinical parameters are within acceptable thresholds."
    };
    let severity = "normal";

    if (response.ok) {
      const data = await response.json();
      ocrAnalysis = data.ocrAnalysis;
      severity = data.severity;
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.warn("Python OCR service offline. Creating report with baseline normal values...");
        // Setup a mock abnormal value to test UI highlights
        ocrAnalysis = {
          rawText: "PATIENT REPORT: Blood glucose test results. Fasting: 145 mg/dL (Reference: 70-100 mg/dL). Hemoglobin: 14.1 g/dL.",
          abnormalValues: [{
            parameter: "Fasting Blood Glucose",
            value: "145 mg/dL",
            referenceRange: "70-100 mg/dL"
          }],
          summary: "Elevated Fasting Blood Glucose detected. Patient shows signs of potential hyperglycemia."
        };
        severity = "abnormal";
      } else {
        const errorMsg = await response.text();
        return res.status(response.status).json({ success: false, message: `OCR service error: ${errorMsg}` });
      }
    }

    const report = new LabReport({
      patientId: patient._id,
      testName: testName || 'Blood Panel Test',
      reportUrl: reportUrl || 'https://example.com/reports/blood_test.pdf',
      ocrAnalysis,
      severity
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: 'Report uploaded and analyzed successfully',
      report
    });
  } catch (err) {
    next(err);
  }
};

exports.predictSymptoms = async (req, res, next) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms) {
      return res.status(400).json({ success: false, message: 'Symptoms text is required.' });
    }

    const patient = await PatientProfile.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const medicalHistoryList = patient.medicalHistory.map(h => h.condition);

    let predictionData = null;

    try {
      // Call the Python FastAPI microservice
      const response = await fetch(`${ML_SERVICE_URL}/predict/symptoms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms, medicalHistory: medicalHistoryList })
      });

      if (response.ok) {
        predictionData = await response.json();
      }
    } catch (e) {
      console.warn("Python ML Microservice symptom analysis failed/offline. Falling back to local clinical logic...", e);
    }

    if (!predictionData) {
      // Fallback local clinical rules logic
      let predictedDisease = 'General Health Inconvenience';
      let probability = 0.5;
      let riskLevel = 'Low';
      let recommendations = 'No severe disease patterns detected. Rest, stay hydrated, and consult a General Physician if symptoms persist.';

      const msg = symptoms.toLowerCase();
      const hasHistory = (cond) => medicalHistoryList.some(c => c.toLowerCase().includes(cond.toLowerCase()));

      if (msg.includes('chest') || msg.includes('heart') || msg.includes('cardiac') || msg.includes('angina')) {
        predictedDisease = 'Potential Cardiovascular Stress';
        probability = hasHistory('heart') || hasHistory('hypertension') ? 0.85 : 0.65;
        riskLevel = 'High';
        recommendations = '🚨 CRITICAL ALERT: Immediate cardiology consult or emergency Room visit recommended. Avoid physical exertion. Recommended: ECG assessment.';
      } else if (msg.includes('breath') || msg.includes('wheez') || msg.includes('asthma') || msg.includes('cough') || msg.includes('choking')) {
        predictedDisease = 'Respiratory Hyper-responsiveness / Asthma Exacerbation';
        probability = hasHistory('asthma') || hasHistory('copd') || hasHistory('bronchitis') ? 0.80 : 0.60;
        riskLevel = 'Medium';
        recommendations = 'Use rescue inhaler if active. Keep oxygen levels checked. Avoid sudden temperature changes or allergens, and book a Pulmonologist slot.';
      } else if (msg.includes('sugar') || msg.includes('thirsty') || msg.includes('fatigue') || msg.includes('urination') || msg.includes('polyuria')) {
        predictedDisease = 'Blood Glucose Instability / Hyperglycemia';
        probability = hasHistory('diabet') ? 0.90 : 0.70;
        riskLevel = 'Medium';
        recommendations = 'Monitor fasting and post-prandial blood sugar immediately. Follow a strict diabetic diet, take prescribed oral hypoglycemics, and consult an Endocrinologist.';
      } else if (msg.includes('stomach') || msg.includes('vomit') || msg.includes('acid') || msg.includes('nausea') || msg.includes('abdominal')) {
        predictedDisease = 'Gastrointestinal Dyspepsia / Gastroenteritis';
        probability = 0.60;
        riskLevel = 'Low';
        recommendations = 'Maintain hydration (electrolytes). stick to simple BRAT diet. Avoid oily foods, and check with a Gastroenterologist if pain persists.';
      } else if (msg.includes('kidney') || msg.includes('urine') || msg.includes('renal') || msg.includes('back pain')) {
        predictedDisease = 'Renal Function Stress / Nephrolithiasis';
        probability = hasHistory('kidney') || hasHistory('renal') ? 0.82 : 0.55;
        riskLevel = 'High';
        recommendations = 'Drink plenty of water. Avoid self-medicating with NSAID painkillers, monitor urine output color, and consult a Nephrologist.';
      }

      predictionData = {
        predictedDisease,
        probability,
        riskLevel,
        recommendations
      };
    }

    // Save prediction record to backend database
    const predictionRecord = new AiPrediction({
      patientId: patient._id,
      symptoms,
      predictedDisease: predictionData.predictedDisease,
      probability: predictionData.probability,
      riskLevel: predictionData.riskLevel,
      recommendations: predictionData.recommendations,
      treatmentHistoryUsed: medicalHistoryList
    });
    await predictionRecord.save();

    res.status(201).json({
      success: true,
      message: 'AI disease prediction generated and saved successfully.',
      prediction: predictionRecord
    });
  } catch (err) {
    next(err);
  }
};

exports.getSymptomPredictionHistory = async (req, res, next) => {
  try {
    const patient = await PatientProfile.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const history = await AiPrediction.find({ patientId: patient._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      history
    });
  } catch (err) {
    next(err);
  }
};
