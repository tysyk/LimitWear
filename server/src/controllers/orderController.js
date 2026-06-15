const Order = require('../models/Order');
const Drop = require('../models/Drop');
const User = require('../models/User');

exports.createOrder = async (req, res) => {
  try {
    const { dropId, quantity, size, shippingAddress, phone } = req.body;
    const userId = req.user._id;

    const drop = await Drop.findById(dropId);
    if (!drop) return res.status(404).json({ message: 'Drop not found' });
    if (drop.status !== 'active') return res.status(400).json({ message: 'This drop is no longer accepting preorders' });
    if (new Date() > drop.deadline) return res.status(400).json({ message: 'Preorder deadline has passed' });

    const available = drop.totalQuantity - drop.reservedQuantity;
    if (available < quantity) return res.status(400).json({ message: `Only ${available} spots left` });

    const existingOrder = await Order.findOne({ user: userId, drop: dropId, status: 'frozen' });
    if (existingOrder) return res.status(400).json({ message: 'You already have an active preorder for this drop' });

    const totalAmount = drop.price * quantity;
    const user = await User.findById(userId);

    if (user.balance < totalAmount) {
      return res.status(400).json({ message: `Недостатньо коштів. Потрібно ${totalAmount} грн, є ${user.balance} грн` });
    }

    user.balance -= totalAmount;
    user.frozenBalance += totalAmount;
    await user.save();

    drop.reservedQuantity += quantity;
    if (drop.reservedQuantity >= drop.totalQuantity) drop.status = 'funded';
    await drop.save();

    const order = await Order.create({
      user: userId, drop: dropId, quantity, size,
      totalAmount, shippingAddress, phone, status: 'frozen',
    });

    const populatedOrder = await Order.findById(order._id).populate('drop', 'title imageUrl price deadline');
    res.status(201).json({ order: populatedOrder, message: 'Передзамовлення оформлено! Кошти заморожено.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('drop', 'title imageUrl price deadline status category')
      .sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'frozen') return res.status(400).json({ message: 'This order cannot be cancelled' });

    const drop = await Drop.findById(order.drop);
    if (!drop || drop.status !== 'active') {
      return res.status(400).json({ message: 'Cannot cancel — drop is already funded or failed' });
    }

    drop.reservedQuantity = Math.max(0, drop.reservedQuantity - order.quantity);
    await drop.save();

    const user = await User.findById(req.user._id);
    user.frozenBalance = Math.max(0, user.frozenBalance - order.totalAmount);
    user.balance += order.totalAmount;
    await user.save();

    order.status = 'refunded';
    order.refundedAt = new Date();
    await order.save();

    res.json({ message: 'Замовлення скасовано. Кошти повернуто на баланс.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
