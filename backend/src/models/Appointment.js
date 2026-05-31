const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProfile', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
  dateTime: { type: Date, required: true },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'no-show'], default: 'scheduled' },
  symptoms: { type: String, required: true },
  queueNumber: { type: Number, default: 0 },
  predictedWaitTime: { type: Number, default: 15 }, // predicted in minutes by ML service
  notes: { type: String },
  consultationType: { type: String, enum: ['in-person', 'video', 'emergency'], default: 'in-person' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  amountPaid: { type: Number, default: 0 },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String }
}, { timestamps: true });

AppointmentSchema.index({ doctorId: 1, dateTime: 1 }); // Compound index for query performance
AppointmentSchema.index({ patientId: 1, dateTime: -1 }); // Index for patient history query speed

module.exports = mongoose.model('Appointment', AppointmentSchema);
