const mongoose = require('mongoose');
const Design = require('../models/Design');
const Drop = require('../models/Drop');
const Order = require('../models/Order');
const User = require('../models/User');

exports.getPendingDesigns = async (req, res) => {
  try {
    const designs = await Design.find({ status: 'pending' })
      .populate('designer', 'name email avatar')
      .sort({ createdAt: -1 });
    res.json({ designs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.moderateDesign = async (req, res) => {
  try {
    const { action, moderationNote } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject' });
    }

    const design = await Design.findById(req.params.id).populate('designer', 'name email');
    if (!design) return res.status(404).json({ message: 'Design not found' });
    if (design.status !== 'pending') {
      return res.status(400).json({ message: 'Design already moderated' });
    }

    design.status = action === 'approve' ? 'approved' : 'rejected';
    design.moderationNote = moderationNote || '';
    design.moderatedBy = req.user._id;
    design.moderatedAt = new Date();
    await design.save();

    res.json({ design, message: `Design ${design.status}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createDropFromDesign = async (req, res) => {
  try {
    const { designId, price, totalQuantity, deadline, designerShare, tags } = req.body;

    const design = await Design.findById(designId).populate('designer');
    if (!design) return res.status(404).json({ message: 'Design not found' });
    if (design.status !== 'approved') {
      return res.status(400).json({ message: 'Design must be approved first' });
    }
    if (design.drop) {
      return res.status(400).json({ message: 'Drop already created for this design' });
    }

    const drop = await Drop.create({
      design: design._id,
      designer: design.designer._id,
      title: design.title,
      description: design.description,
      category: design.category,
      imageUrl: design.imageUrl,
      price: price || design.suggestedPrice,
      totalQuantity: totalQuantity || design.suggestedQuantity,
      deadline: new Date(deadline),
      designerShare: designerShare || 20,
      tags: tags || [],
      isNewDrop: true,
    });

    design.drop = drop._id;
    await design.save();

    res.status(201).json({ drop, message: 'Drop created successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllDrops = async (req, res) => {
  try {
    const drops = await Drop.find()
      .populate('designer', 'name email')
      .sort({ createdAt: -1 });
    res.json({ drops });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [totalUsers, totalDrops, totalOrders, activeDrops, pendingDesigns] = await Promise.all([
      User.countDocuments(),
      Drop.countDocuments(),
      Order.countDocuments(),
      Drop.countDocuments({ status: 'active' }),
      Design.countDocuments({ status: 'pending' }),
    ]);

    const revenue = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    res.json({
      totalUsers,
      totalDrops,
      totalOrders,
      activeDrops,
      pendingDesigns,
      totalRevenue: revenue[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPendingDesigners = async (req, res) => {
  try {
    const designers = await User.find({ role: 'designer', verificationStatus: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ designers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.verifyDesigner = async (req, res) => {
  try {
    const { action, note } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject' });
    }

    const user = await User.findOne({ _id: req.params.userId, role: 'designer' });
    if (!user) return res.status(404).json({ message: 'Designer not found' });

    user.verificationStatus = action === 'approve' ? 'approved' : 'rejected';
    await user.save();

    res.json({ user, message: `Designer ${user.verificationStatus}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.topUpUserBalance = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $inc: { balance: amount } },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user, message: `Added ${amount} UAH to user balance` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
