const mongoose = require('mongoose');

const designSchema = new mongoose.Schema({
  designer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['hoodie', 'jacket', 'pants', 'tshirt', 'accessories'],
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  suggestedPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  suggestedQuantity: {
    type: Number,
    required: true,
    min: 10,
    max: 1000,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  moderationNote: {
    type: String,
    default: '',
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  moderatedAt: {
    type: Date,
    default: null,
  },
  drop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Drop',
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('Design', designSchema);
