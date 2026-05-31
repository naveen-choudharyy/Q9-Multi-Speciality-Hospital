const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/public', appointmentController.createPublicBooking);
router.get('/public', verifyToken, appointmentController.getPublicBookings);
router.patch('/public/:id', verifyToken, appointmentController.updatePublicBookingStatus);
router.delete('/public/:id', verifyToken, appointmentController.deletePublicBooking);
router.post('/', verifyToken, appointmentController.createAppointment);
router.get('/', verifyToken, appointmentController.getAppointments);
router.patch('/:id', verifyToken, appointmentController.updateStatus);

module.exports = router;
