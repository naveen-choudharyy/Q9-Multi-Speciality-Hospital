const mongoose = require('mongoose');

const LabReportSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProfile', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile' },
  testName: { type: String, required: true },
  reportUrl: { type: String, required: true },
  ocrAnalysis: {
    rawText: { type: String },
    abnormalValues: [{
      parameter: { type: String },
      value: { type: String },
      referenceRange: { type: String }
    }],
    summary: { type: String }
  },
  severity: { type: String, enum: ['normal', 'abnormal', 'critical'], default: 'normal' }
}, { timestamps: true });

LabReportSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('LabReport', LabReportSchema);
