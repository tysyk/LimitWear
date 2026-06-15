const User = require('../models/User');

exports.topUpBalance = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0 || amount > 100000) {
      return res.status(400).json({ message: 'Amount must be between 1 and 100,000 UAH' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { balance: amount } },
      { new: true }
    ).select('-password');

    res.json({ balance: user.balance, message: `${amount} UAH added to your balance` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.withdrawBalance = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0 || amount > 100000) {
      return res.status(400).json({ message: 'Amount must be between 1 and 100,000 UAH' });
    }

    const user = await User.findById(req.user._id);
    if (user.balance < amount) {
      return res.status(400).json({ message: `Insufficient balance. Available: ${user.balance} UAH` });
    }

    user.balance -= amount;
    await user.save();

    res.json({ balance: user.balance, message: `${amount} UAH withdrawn successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, designerInfo } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (designerInfo && req.user.role === 'designer') updates.designerInfo = designerInfo;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
