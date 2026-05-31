const mongoose = require('mongoose');

const PatientProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  insurance: {
    provider: { type: String, default: '' },
    policyNumber: { type: String, default: '' },
    coverageLimit: { type: Number, default: 0 }
  },
  medicalHistory: [{
    condition: { type: String, required: true },
    diagnosedDate: { type: Date },
    status: { type: String, enum: ['active', 'resolved'], default: 'active' }
  }],
  allergies: [{ type: String }],
  emergencyContact: {
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('PatientProfile', PatientProfileSchema);
