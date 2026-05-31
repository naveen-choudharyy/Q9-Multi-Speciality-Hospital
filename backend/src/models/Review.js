const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rating: { type: Number, default: 5 },
  text: { type: String, required: true },
  role: { type: String, default: 'Patient' }
}, { timestamps: true });

module.exports = mongoose.model('Review', ReviewSchema);
