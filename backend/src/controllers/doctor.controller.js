const DoctorProfile = require('../models/DoctorProfile');

exports.getAllDoctors = async (req, res, next) => {
  try {
    const doctors = await DoctorProfile.find()
      .populate('userId', 'name email phone');
    res.status(200).json({ success: true, doctors });
  } catch (err) {
    next(err);
  }
};

exports.updateSchedule = async (req, res, next) => {
  try {
    const { availabilitySlots } = req.body;
    const doctor = await DoctorProfile.findOne({ userId: req.user.id });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    doctor.availabilitySlots = availabilitySlots;
    await doctor.save();

    res.status(200).json({ success: true, message: 'Availability schedule updated', doctor });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { consultationFee, videoConsultationFee, emergencyFee, availabilityStatus, specialization } = req.body;
    const doctor = await DoctorProfile.findOne({ userId: req.user.id });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    if (consultationFee !== undefined) doctor.consultationFee = Number(consultationFee);
    if (videoConsultationFee !== undefined) doctor.videoConsultationFee = Number(videoConsultationFee);
    if (emergencyFee !== undefined) doctor.emergencyFee = Number(emergencyFee);
    if (availabilityStatus !== undefined) doctor.availabilityStatus = availabilityStatus;
    if (specialization !== undefined) doctor.specialization = specialization;

    await doctor.save();

    res.status(200).json({ success: true, message: 'Doctor profile details updated successfully.', doctor });
  } catch (err) {
    next(err);
  }
};
