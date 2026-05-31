const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'super_secret_jwt_token_for_smart_hospital_123!',
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_token_for_smart_hospital_987!',
    { expiresIn: '7d' }
  );
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, ...extraDetails } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address already registered.' });
    }

    const user = new User({ name, email, password, role, phone });
    await user.save();

    // Create corresponding profiles
    if (role === 'Patient') {
      const patientProfile = new PatientProfile({
        userId: user._id,
        bloodGroup: extraDetails.bloodGroup || 'O+',
        emergencyContact: extraDetails.emergencyContact || {
          name: 'Emergency Contact',
          relationship: 'Family',
          phone: phone
        }
      });
      await patientProfile.save();
    } else if (role === 'Doctor') {
      const doctorProfile = new DoctorProfile({
        userId: user._id,
        specialization: extraDetails.specialization || 'General Medicine',
        licenseNumber: extraDetails.licenseNumber || `LIC-${Math.floor(100000 + Math.random() * 900000)}`,
        consultationFee: extraDetails.consultationFee || 500
      });
      await doctorProfile.save();
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let profile = null;
    if (user.role === 'Patient') {
      profile = await PatientProfile.findOne({ userId: user._id });
    } else if (user.role === 'Doctor') {
      profile = await DoctorProfile.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      user,
      profile
    });
  } catch (err) {
    next(err);
  }
};
