const express = require('express');
const router = express.Router();
const mlController = require('../controllers/ml.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/predict', verifyToken, mlController.predictDisease);
router.post('/chatbot', mlController.chatAssistant);
router.post('/report/analyze', verifyToken, mlController.analyzeReport);
router.post('/symptoms/predict', verifyToken, mlController.predictSymptoms);
router.get('/symptoms/history', verifyToken, mlController.getSymptomPredictionHistory);

module.exports = router;
