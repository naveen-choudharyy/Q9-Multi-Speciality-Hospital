const Message = require('../models/Message');

exports.submitMessage = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'Please provide all fields.' });
    }

    const newMessage = new Message({ name, email, subject, message });
    await newMessage.save();

    res.status(201).json({
      success: true,
      message: 'Inquiry saved successfully'
    });
  } catch (err) {
    next(err);
  }
};
