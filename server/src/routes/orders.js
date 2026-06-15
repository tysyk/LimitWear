const router = require('express').Router();
const { createOrder, getUserOrders, cancelOrder } = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/', createOrder);
router.get('/', getUserOrders);
router.delete('/:id', cancelOrder);

module.exports = router;
