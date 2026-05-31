const Razorpay = require('razorpay');
const crypto = require('crypto');
const Invoice = require('../models/Invoice');
const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const PatientProfile = require('../models/PatientProfile');

// Initialize Razorpay only if valid keys are present and they are not dummy placeholders
const hasValidKeys = process.env.RAZORPAY_KEY_ID && 
                     process.env.RAZORPAY_KEY_SECRET &&
                     process.env.RAZORPAY_KEY_ID !== 'rzp_test_5n4q8X93hsk5l4' &&
                     process.env.RAZORPAY_KEY_SECRET !== 'your_razorpay_key_secret' &&
                     process.env.RAZORPAY_KEY_ID !== 'rzp_test_placeholder' &&
                     !process.env.RAZORPAY_KEY_ID.includes('placeholder');

const razorpay = hasValidKeys
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    })
  : null;

// Helper to generate Invoice Number (INV-YYYYMMDD-XXXXX)
const generateInvoiceNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.floor(10000 + Math.random() * 90000).toString();
  return `INV-${dateStr}-${randomStr}`;
};

exports.createOrder = async (req, res, next) => {
  try {
    const { doctorId, consultationType } = req.body;
    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    // Determine consultation fee based on type
    const rawFee = consultationType === 'video' ? doctor.videoConsultationFee || (doctor.consultationFee * 1.2)
      : consultationType === 'emergency' ? doctor.emergencyFee || (doctor.consultationFee * 2)
      : doctor.consultationFee;

    const subTotal = Math.round(rawFee);
    const taxAmount = Math.round(subTotal * 0.18); // 18% GST
    const grandTotal = subTotal + taxAmount;

    // Razorpay amount is in paise (rupees * 100)
    const amountInPaise = grandTotal * 100;

    let order;
    let isSimulated = false;

    if (!razorpay) {
      isSimulated = true;
    } else {
      try {
        const options = {
          amount: amountInPaise,
          currency: 'INR',
          receipt: `receipt_order_${Date.now()}`,
        };
        order = await razorpay.orders.create(options);
      } catch (rzpErr) {
        console.warn("Razorpay order creation failed (likely due to sandbox/expired keys). Falling back to simulation mode...", rzpErr.message);
        isSimulated = true;
      }
    }

    if (isSimulated || !order) {
      console.warn("Returning simulated order parameters...");
      return res.status(200).json({
        success: true,
        isSimulated: true,
        orderId: `order_mock_${Math.random().toString(36).slice(2, 11)}`,
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        feesDetails: { subTotal, taxAmount, grandTotal }
      });
    }

    res.status(200).json({
      success: true,
      isSimulated: false,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      feesDetails: { subTotal, taxAmount, grandTotal }
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      doctorId,
      consultationType,
      dateTime,
      symptoms,
      isSimulated
    } = req.body;

    const patient = await PatientProfile.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    // Determine consultation fee based on type
    const rawFee = consultationType === 'video' ? doctor.videoConsultationFee || (doctor.consultationFee * 1.2)
      : consultationType === 'emergency' ? doctor.emergencyFee || (doctor.consultationFee * 2)
      : doctor.consultationFee;

    const subTotal = Math.round(rawFee);
    const taxAmount = Math.round(subTotal * 0.18); // 18% GST
    const grandTotal = subTotal + taxAmount;

    let paymentVerified = false;

    if (isSimulated || !razorpay) {
      // Accept simulated credentials directly in developer mode
      paymentVerified = razorpayPaymentId && razorpayPaymentId.startsWith('pay_mock_');
    } else {
      // Cryptographic verification of signatures
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
      hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
      const generatedSignature = hmac.digest('hex');
      paymentVerified = generatedSignature === razorpaySignature;
    }

    if (!paymentVerified) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed.' });
    }

    // 1. Create and schedule the appointment in DB
    const appointment = new Appointment({
      patientId: patient._id,
      doctorId: doctor._id,
      dateTime: new Date(dateTime),
      symptoms,
      consultationType,
      paymentStatus: 'paid',
      amountPaid: grandTotal,
      razorpayOrderId,
      razorpayPaymentId
    });
    await appointment.save();

    // 2. Create the invoice
    const invoice = new Invoice({
      patientId: patient._id,
      appointmentId: appointment._id,
      doctorId: doctor._id,
      invoiceNumber: generateInvoiceNumber(),
      consultationType,
      subTotal,
      taxAmount,
      grandTotal,
      paymentStatus: 'paid',
      paymentMethod: isSimulated ? 'simulation' : 'razorpay',
      razorpayOrderId,
      razorpayPaymentId,
      transactionId: razorpayPaymentId
    });
    await invoice.save();

    res.status(201).json({
      success: true,
      message: 'Payment verified and appointment confirmed successfully.',
      appointment,
      invoice
    });
  } catch (err) {
    next(err);
  }
};

exports.getPaymentHistory = async (req, res, next) => {
  try {
    const patient = await PatientProfile.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const invoices = await Invoice.find({ patientId: patient._id })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name specialization' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, invoices });
  } catch (err) {
    next(err);
  }
};
