const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');

router.post('/', reviewController.submitReview);
router.get('/', reviewController.getReviews);

module.exports = router;
