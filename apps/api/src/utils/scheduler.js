const cron = require('node-cron');
const Drop = require('../models/Drop');
const Order = require('../models/Order');
const User = require('../models/User');

const processExpiredDrops = async () => {
  try {
    const expiredActive = await Drop.find({
      status: 'active',
      deadline: { $lte: new Date() },
    });

    for (const drop of expiredActive) {
      if (drop.reservedQuantity >= drop.totalQuantity) {
        drop.status = 'funded';
        await drop.save();
        console.log(`Drop "${drop.title}" → funded`);
      } else {
        drop.status = 'failed';
        await drop.save();

        const orders = await Order.find({ drop: drop._id, status: 'frozen' });
        for (const order of orders) {
          await User.findByIdAndUpdate(order.user, {
            $inc: { balance: order.totalAmount, frozenBalance: -order.totalAmount },
          });
          order.status = 'refunded';
          order.refundedAt = new Date();
          await order.save();
        }
        console.log(`Drop "${drop.title}" failed — refunded ${orders.length} orders`);
      }
    }

    const fundedDrops = await Drop.find({ status: 'funded' });
    for (const drop of fundedDrops) {
      const orders = await Order.find({ drop: drop._id, status: 'frozen' });
      for (const order of orders) {
        await User.findByIdAndUpdate(order.user, {
          $inc: { frozenBalance: -order.totalAmount },
        });
        order.status = 'completed';
        order.completedAt = new Date();
        await order.save();
      }
      drop.status = 'manufacturing';
      await drop.save();
      console.log(`Drop "${drop.title}" → manufacturing`);
    }
  } catch (err) {
    console.error('Scheduler error:', err.message);
  }
};

const startScheduler = () => {
  cron.schedule('* * * * *', processExpiredDrops);
  console.log('Drop scheduler started');
};

module.exports = { startScheduler, processExpiredDrops };
