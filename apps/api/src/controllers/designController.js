const Design = require('../models/Design');

exports.submitDesign = async (req, res) => {
  try {
    if (req.user.verificationStatus !== 'approved') {
      return res.status(403).json({ message: 'Your designer account is pending admin verification' });
    }
    if (!req.file) return res.status(400).json({ message: 'Design image is required' });

    const { title, description, category, suggestedPrice, suggestedQuantity } = req.body;
    const imageUrl = `/uploads/designs/${req.file.filename}`;

    const design = await Design.create({
      designer: req.user._id,
      title,
      description,
      category,
      imageUrl,
      suggestedPrice: Number(suggestedPrice),
      suggestedQuantity: Number(suggestedQuantity),
    });

    res.status(201).json({ design, message: 'Design submitted for moderation' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyDesigns = async (req, res) => {
  try {
    const designs = await Design.find({ designer: req.user._id }).sort({ createdAt: -1 });
    res.json({ designs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDesignById = async (req, res) => {
  try {
    const design = await Design.findOne({ _id: req.params.id, designer: req.user._id })
      .populate('drop');
    if (!design) return res.status(404).json({ message: 'Design not found' });
    res.json({ design });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
