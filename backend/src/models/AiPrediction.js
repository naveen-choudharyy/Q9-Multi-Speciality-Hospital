const mongoose = require('mongoose');

const AiPredictionSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProfile', required: true },
  symptoms: { type: String, required: true },
  predictedDisease: { type: String, required: true },
  probability: { type: Number, required: true }, // e.g. 0.85 for 85%
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  recommendations: { type: String, required: true },
  treatmentHistoryUsed: [{ type: String }] // conditions active during evaluation
}, { timestamps: true });

module.exports = mongoose.model('AiPrediction', AiPredictionSchema);
