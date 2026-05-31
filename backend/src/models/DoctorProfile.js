const mongoose = require('mongoose');

const DoctorProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  specialization: { type: String, required: true },
  licenseNumber: { type: String, required: true, unique: true },
  consultationFee: { type: Number, required: true, default: 500 },
  videoConsultationFee: { type: Number, default: 600 },
  emergencyFee: { type: Number, default: 1000 },
  availabilityStatus: { type: String, enum: ['Available', 'On Leave', 'Busy'], default: 'Available' },
  availabilitySlots: [{
    dayOfWeek: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
    startTime: { type: String, required: true }, // Format HH:MM (e.g. 09:00)
    endTime: { type: String, required: true }  // Format HH:MM (e.g. 17:00)
  }],
  averageRating: { type: Number, default: 5.0 }
}, { timestamps: true });

module.exports = mongoose.model('DoctorProfile', DoctorProfileSchema);
