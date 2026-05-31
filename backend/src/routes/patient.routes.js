const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/history', verifyToken, patientController.updateMedicalHistory);
router.get('/timeline', verifyToken, patientController.getPatientHistory);
router.put('/profile', verifyToken, patientController.updateProfile);

module.exports = router;
