const mongoose = require('mongoose');

const PrescriptionSchema = new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProfile', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
  medications: [{
    name: { type: String, required: true },
    dosage: { type: String, required: true }, // e.g. 500mg
    frequency: { type: String, required: true }, // e.g. Twice a day (morning / night)
    duration: { type: String, required: true } // e.g. 5 days
  }],
  instructions: { type: String, default: '' }
}, { timestamps: true });

PrescriptionSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('Prescription', PrescriptionSchema);
