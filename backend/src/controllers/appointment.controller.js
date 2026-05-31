const Appointment = require('../models/Appointment');
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const Prescription = require('../models/Prescription');

exports.createAppointment = async (req, res, next) => {
  try {
    const { doctorId, dateTime, symptoms } = req.body;
    
    // Find active patient profile for the logged in user
    const patient = await PatientProfile.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found. Please register as patient first.' });
    }

    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    // Dynamic queue estimation: Find how many appointments are already booked for this doctor on the same day
    const startOfDay = new Date(dateTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateTime);
    endOfDay.setHours(23, 59, 59, 999);

    const appointmentsCount = await Appointment.countDocuments({
      doctorId,
      dateTime: { $gte: startOfDay, $lte: endOfDay }
    });

    const queueNumber = appointmentsCount + 1;
    const predictedWaitTime = queueNumber * 15; // 15 mins average per consultation slot

    const appointment = new Appointment({
      patientId: patient._id,
      doctorId: doctor._id,
      dateTime,
      symptoms,
      queueNumber,
      predictedWaitTime
    });

    await appointment.save();

    // Populate references for UI socket triggers
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate({ path: 'patientId', populate: { path: 'userId', select: 'name' } })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } });

    // Socket.IO Emit: Notify doctor room of a new appointment request
    const doctorRoom = `doctor_${doctor._id.toString()}`;
    req.io.to(doctorRoom).emit('new-appointment', populatedAppointment);
    req.io.emit('new-appointment', populatedAppointment);
    
    // Global notification for queue updates
    req.io.emit('queue-update', { doctorId: doctor._id, queueNumber, predictedWaitTime });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: populatedAppointment
    });
  } catch (err) {
    next(err);
  }
};

exports.getAppointments = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'Patient') {
      const patient = await PatientProfile.findOne({ userId: req.user.id });
      if (!patient) return res.status(200).json({ success: true, appointments: [] });
      query.patientId = patient._id;
    } else if (req.user.role === 'Doctor') {
      const doctor = await DoctorProfile.findOne({ userId: req.user.id });
      if (!doctor) return res.status(200).json({ success: true, appointments: [] });
      query.doctorId = doctor._id;
    }

    const appointments = await Appointment.find(query)
      .populate({ path: 'patientId', populate: { path: 'userId', select: 'name email phone' } })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name specialization' } })
      .sort({ dateTime: 1 });

    res.status(200).json({ success: true, appointments });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, medications, instructions } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    // Auto-create Prescription in database if completed with prescription parameters
    if (status === 'completed' && (medications || instructions)) {
      const prescription = new Prescription({
        appointmentId: appointment._id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        medications: medications || [],
        instructions: instructions || ''
      });
      await prescription.save();
      console.log(`Auto-created prescription for completed appointment: ${id}`);
    }

    // Socket.IO Notify Patient
    req.io.emit('appointment-status-change', {
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      status
    });

    res.status(200).json({ success: true, appointment });
  } catch (err) {
    next(err);
  }
};

const PublicBooking = require('../models/PublicBooking');

exports.createPublicBooking = async (req, res, next) => {
  try {
    const { name, phone, email, department, doctor, date, time, message } = req.body;
    
    if (!name || !phone || !email || !department || !doctor || !date || !time) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const dateTime = new Date(`${date}T${time}`);

    const booking = new PublicBooking({
      name, phone, email, department, doctor, dateTime, message
    });

    await booking.save();

    // Emit event to notify the admin panel in real-time
    req.io.emit('new-public-booking', booking);

    res.status(201).json({
      success: true,
      message: 'Public appointment requested successfully',
      booking
    });
  } catch (err) {
    next(err);
  }
};

exports.getPublicBookings = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
    }

    const bookings = await PublicBooking.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, bookings });
  } catch (err) {
    next(err);
  }
};

exports.updatePublicBookingStatus = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
    }

    const { id } = req.params;
    const { status } = req.body;

    const booking = await PublicBooking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Public booking not found.' });
    }

    // Emit event to update dashboard in real-time
    req.io.emit('public-booking-status-change', {
      bookingId: booking._id,
      status
    });

    res.status(200).json({ success: true, booking });
  } catch (err) {
    next(err);
  }
};

exports.deletePublicBooking = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
    }

    const { id } = req.params;

    const booking = await PublicBooking.findByIdAndDelete(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Public booking not found.' });
    }

    // Emit event to update dashboard in real-time
    req.io.emit('public-booking-deleted', {
      bookingId: id
    });

    res.status(200).json({ success: true, message: 'Public booking deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
