const PatientProfile = require('../models/PatientProfile');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const LabReport = require('../models/LabReport');
const User = require('../models/User');

exports.updateMedicalHistory = async (req, res, next) => {
  try {
    const { condition, status } = req.body;
    const patient = await PatientProfile.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    patient.medicalHistory.push({ condition, status, diagnosedDate: new Date() });
    await patient.save();

    res.status(200).json({ success: true, message: 'Medical history updated', patient });
  } catch (err) {
    next(err);
  }
};

exports.getPatientHistory = async (req, res, next) => {
  try {
    const patient = await PatientProfile.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const appointments = await Appointment.find({ patientId: patient._id })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name specialization' } })
      .sort({ dateTime: -1 });

    const prescriptions = await Prescription.find({ patientId: patient._id })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } })
      .sort({ createdAt: -1 });

    const labReports = await LabReport.find({ patientId: patient._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      patient,
      appointments,
      prescriptions,
      labReports
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, bloodGroup, insurance, emergencyContact } = req.body;

    // 1. Update user data
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (name) user.name = name;
    if (phone) user.phone = phone;
    await user.save();

    // 2. Find or create patient profile
    let patient = await PatientProfile.findOne({ userId: req.user.id });
    if (!patient) {
      patient = new PatientProfile({
        userId: req.user.id,
        emergencyContact: emergencyContact || { name: 'N/A', relationship: 'N/A', phone: '0000000000' }
      });
    }

    if (bloodGroup) patient.bloodGroup = bloodGroup;
    if (insurance) {
      patient.insurance = {
        provider: insurance.provider || patient.insurance?.provider || '',
        policyNumber: insurance.policyNumber || patient.insurance?.policyNumber || '',
        coverageLimit: insurance.coverageLimit !== undefined ? insurance.coverageLimit : (patient.insurance?.coverageLimit || 0)
      };
    }
    if (emergencyContact) {
      patient.emergencyContact = {
        name: emergencyContact.name || patient.emergencyContact?.name || 'N/A',
        relationship: emergencyContact.relationship || patient.emergencyContact?.relationship || 'N/A',
        phone: emergencyContact.phone || patient.emergencyContact?.phone || '0000000000'
      };
    }

    await patient.save();

    res.status(200).json({
      success: true,
      message: 'Profile details updated successfully.',
      user: { name: user.name, email: user.email, phone: user.phone },
      patient
    });
  } catch (err) {
    next(err);
  }
};
