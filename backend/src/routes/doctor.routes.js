const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', doctorController.getAllDoctors);
router.post('/schedule', verifyToken, doctorController.updateSchedule);
router.put('/profile', verifyToken, doctorController.updateProfile);

module.exports = router;
