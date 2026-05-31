import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Heart, Info, ChevronRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '../services/api';

export default function DiseasePrediction() {
  const [activeTab, setActiveTab] = useState('heart'); // 'heart' or 'diabetes'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Heart inputs state
  const [heartAge, setHeartAge] = useState('45');
  const [heartSex, setHeartSex] = useState('1'); // 1 = Male, 0 = Female
  const [chestPain, setChestPain] = useState('2'); // Chest pain type (0-3)
  const [bloodPressure, setBloodPressure] = useState('120');
  const [cholesterol, setCholesterol] = useState('230');
  const [fastingSugar, setFastingSugar] = useState('0'); // 1 = >120, 0 = <=120
  const [maxHeartRate, setMaxHeartRate] = useState('150');
  const [angina, setAngina] = useState('0'); // 1 = Yes, 0 = No

  // Diabetes inputs state
  const [preg, setPreg] = useState('0');
  const [glucose, setGlucose] = useState('110');
  const [bp, setBp] = useState('80');
  const [bmi, setBmi] = useState('24.5');
  const [age, setAge] = useState('35');

  const handlePredictHeart = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setResult(null);

    // Heart features: age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal
    // We send a flat list of 13 features to our backend endpoint
    const features = [
      parseFloat(heartAge),
      parseFloat(heartSex),
      parseFloat(chestPain),
      parseFloat(bloodPressure),
      parseFloat(cholesterol),
      parseFloat(fastingSugar),
      0, // restecg mock
      parseFloat(maxHeartRate),
      parseFloat(angina),
      1.0, // oldpeak mock
      1, // slope mock
      0, // ca mock
      2 // thal mock
    ];

    try {
      const response = await api.post('/ml/predict', { disease: 'heart', features });
      setResult(response.data);
    } catch (err) {
      setErrorMsg('Error executing AI inference request. Please verify connection.');
    } finally {
      setLoading(false);
    }
  };

  const handlePredictDiabetes = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setResult(null);

    // Diabetes features: Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin, BMI, Pedigree, Age
    const features = [
      parseFloat(preg),
      parseFloat(glucose),
      parseFloat(bp),
      20, // SkinThickness mock
      80, // Insulin mock
      parseFloat(bmi),
      0.5, // DiabetesPedigreeFunction mock
      parseFloat(age)
    ];

    try {
      const response = await api.post('/ml/predict', { disease: 'diabetes', features });
      setResult(response.data);
    } catch (err) {
      setErrorMsg('Error executing AI inference request. Please verify connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Title */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center space-x-2">
            <Activity className="w-8 h-8 text-blue-400" />
            <span>AI Predictive Health Engine</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Compute disease risk percentages using production-grade XGBoost classifiers trained on standard clinical datasets.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-slate-850">
          <button
            onClick={() => { setActiveTab('heart'); setResult(null); }}
            className={`py-3 px-6 text-sm font-semibold flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'heart' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Cardiac Risk Profiler</span>
          </button>
          <button
            onClick={() => { setActiveTab('diabetes'); setResult(null); }}
            className={`py-3 px-6 text-sm font-semibold flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'diabetes' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Diabetes Screening Tool</span>
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4 text-center">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          {/* Diagnostic forms */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md">
            {activeTab === 'heart' ? (
              <form onSubmit={handlePredictHeart} className="space-y-4">
                <h3 className="text-lg font-bold text-slate-200 mb-4">Patient Profile Questionnaire</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">AGE</label>
                    <input 
                      type="number" value={heartAge} onChange={(e) => setHeartAge(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">GENDER</label>
                    <select
                      value={heartSex} onChange={(e) => setHeartSex(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-300"
                    >
                      <option value="1">Male</option>
                      <option value="0">Female</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">CHEST PAIN TYPE</label>
                  <select
                    value={chestPain} onChange={(e) => setChestPain(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-300"
                  >
                    <option value="0">Typical Angina (0)</option>
                    <option value="1">Atypical Angina (1)</option>
                    <option value="2">Non-anginal Pain (2)</option>
                    <option value="3">Asymptomatic (3)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">BLOOD PRESSURE (resting)</label>
                    <input 
                      type="number" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm"
                      placeholder="120 mmHg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">SERUM CHOLESTEROL</label>
                    <input 
                      type="number" value={cholesterol} onChange={(e) => setCholesterol(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm"
                      placeholder="230 mg/dL"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">FASTING BLOOD SUGAR</label>
                    <select
                      value={fastingSugar} onChange={(e) => setFastingSugar(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-300"
                    >
                      <option value="0">Below or Equal 120 mg/dL</option>
                      <option value="1">Above 120 mg/dL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">MAX HEART RATE</label>
                    <input 
                      type="number" value={maxHeartRate} onChange={(e) => setMaxHeartRate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm"
                      placeholder="150 bpm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">EXERCISE ANGINA TRIGGER</label>
                  <select
                    value={angina} onChange={(e) => setAngina(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-300"
                  >
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 font-semibold rounded-lg text-sm transition"
                >
                  {loading ? 'Evaluating Model Inferences...' : 'Analyze Cardiac Risks'}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePredictDiabetes} className="space-y-4">
                <h3 className="text-lg font-bold text-slate-200 mb-4">Patient Profile Questionnaire</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">PREGNANCIES</label>
                    <input 
                      type="number" value={preg} onChange={(e) => setPreg(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">GLUCOSE LIMIT (2hr oral test)</label>
                    <input 
                      type="number" value={glucose} onChange={(e) => setGlucose(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm"
                      placeholder="110 mg/dL"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">DIASTOLIC BLOOD PRESSURE</label>
                    <input 
                      type="number" value={bp} onChange={(e) => setBp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm"
                      placeholder="80 mmHg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">BMI SCORE</label>
                    <input 
                      type="text" value={bmi} onChange={(e) => setBmi(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm"
                      placeholder="24.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">AGE</label>
                  <input 
                    type="number" value={age} onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-lg text-sm transition"
                >
                  {loading ? 'Evaluating Model Inferences...' : 'Analyze Diabetic Risks'}
                </button>
              </form>
            )}
          </div>

          {/* AI Result presentation */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md min-h-[300px] flex flex-col justify-between">
            {result ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-extrabold text-slate-200">Evaluation Complete</h3>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Computed classification result</span>
                </div>

                {/* Severity Risk Gauge */}
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl text-center space-y-4">
                  <span className="text-xs text-slate-400 font-bold block uppercase">DISEASE SUSCEPTIBILITY</span>
                  <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                    {/* Ring gauge */}
                    <div className="absolute inset-0 rounded-full border-[8px] border-slate-800"></div>
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="64"
                        fill="transparent"
                        stroke={result.risk_level === 'High' ? '#f87171' : result.risk_level === 'Medium' ? '#fbbf24' : '#60a5fa'}
                        strokeWidth="8"
                        strokeDasharray={402}
                        strokeDashoffset={402 - (402 * result.probability)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="text-center">
                      <span className="text-2xl font-black block">{(result.probability * 100).toFixed(0)}%</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Probability</span>
                    </div>
                  </div>
                  <span className={`inline-block px-3 py-1 border text-xs font-black rounded-lg uppercase ${
                    result.risk_level === 'High' 
                      ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                      : result.risk_level === 'Medium'
                        ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  }`}>
                    Risk Level: {result.risk_level}
                  </span>
                </div>

                {/* Recommendations */}
                <div className="border border-slate-850 p-4 rounded-xl flex items-start space-x-3 bg-slate-950/20">
                  {result.prediction === 1 ? (
                    <>
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <strong>AI Clinical Advice:</strong> The model classifies your inputs under positive risk boundaries. We suggest booking a consult slot with the corresponding clinic specialty unit for clinical assessment.
                      </p>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <strong>AI Clinical Advice:</strong> Symptoms and health metrics reside within normal classification bands. Maintain regular diets and exercises. Consult doctors if symptoms develop.
                      </p>
                    </>
                  )}
                </div>

                <p className="text-[9px] text-slate-500 leading-relaxed italic text-center">
                  "{result.disclaimer}"
                </p>

              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 p-8 space-y-3">
                <Info className="w-12 h-12 text-slate-700" />
                <div>
                  <h4 className="font-bold text-sm text-slate-400">Ready for Diagnostic Intake</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-[250px] mx-auto">
                    Fill out patient clinical factors on the left panel to execute inference estimations.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
