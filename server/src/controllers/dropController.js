const Drop = require('../models/Drop');

exports.getDrops = async (req, res) => {
  try {
    const { status = 'active', category, page = 1, limit = 12 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) {
      const cats = Array.isArray(category) ? category : category.split(',').filter(Boolean);
      if (cats.length > 0) filter.category = { $in: cats };
    }

    const total = await Drop.countDocuments(filter);
    const sortField = req.query.sort === 'deadline' ? { deadline: 1 } : { createdAt: -1 };
    const drops = await Drop.find(filter)
      .populate('designer', 'name avatar')
      .sort(sortField)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ drops, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDropById = async (req, res) => {
  try {
    const drop = await Drop.findById(req.params.id)
      .populate('designer', 'name avatar designerInfo')
      .populate('design');

    if (!drop) return res.status(404).json({ message: 'Drop not found' });
    res.json({ drop });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTrendingDrops = async (req, res) => {
  try {
    const drops = await Drop.find({ status: 'active' })
      .populate('designer', 'name avatar')
      .sort({ reservedQuantity: -1 })
      .limit(6);
    res.json({ drops });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getNewDrops = async (req, res) => {
  try {
    const drops = await Drop.find({ status: 'active', isNewDrop: true })
      .populate('designer', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(6);
    res.json({ drops });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
