const mongoose = require('mongoose');

const PublicBookingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  department: { type: String, required: true },
  doctor: { type: String, required: true },
  dateTime: { type: Date, required: true },
  message: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('PublicBooking', PublicBookingSchema);
