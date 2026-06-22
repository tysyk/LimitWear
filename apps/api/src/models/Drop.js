const mongoose = require('mongoose');

const dropSchema = new mongoose.Schema({
  design: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Design',
    required: true,
  },
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
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  totalQuantity: {
    type: Number,
    required: true,
    min: 1,
  },
  reservedQuantity: {
    type: Number,
    default: 0,
  },
  deadline: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'funded', 'failed', 'manufacturing', 'completed'],
    default: 'active',
  },
  isNewDrop: {
    type: Boolean,
    default: true,
  },
  designerShare: {
    type: Number,
    default: 20,
    min: 0,
    max: 100,
  },
  tags: [{ type: String }],
}, { timestamps: true });

dropSchema.virtual('progress').get(function () {
  return Math.round((this.reservedQuantity / this.totalQuantity) * 100);
});

dropSchema.virtual('availableQuantity').get(function () {
  return this.totalQuantity - this.reservedQuantity;
});

dropSchema.set('toJSON', { virtuals: true });
dropSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Drop', dropSchema);
