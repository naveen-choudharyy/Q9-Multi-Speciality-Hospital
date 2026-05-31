const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProfile', required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile' },
  invoiceNumber: { type: String, unique: true },
  consultationType: { type: String },
  subTotal: { type: Number, required: true },
  taxAmount: { type: Number, required: true }, // GST/Tax
  discount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentMethod: { type: String, default: 'razorpay' },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  transactionId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
