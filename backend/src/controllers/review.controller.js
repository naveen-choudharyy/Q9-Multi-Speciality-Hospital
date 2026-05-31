const Review = require('../models/Review');

exports.submitReview = async (req, res, next) => {
  try {
    const { name, rating, text, role } = req.body;

    if (!name || !text) {
      return res.status(400).json({ success: false, message: 'Please provide name and review text.' });
    }

    const review = new Review({
      name,
      rating: rating || 5,
      text,
      role: role || 'Patient'
    });

    await review.save();

    res.status(201).json({
      success: true,
      message: 'Review saved successfully',
      review
    });
  } catch (err) {
    next(err);
  }
};

exports.getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, reviews });
  } catch (err) {
    next(err);
  }
};
