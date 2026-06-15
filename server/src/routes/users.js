const router = require('express').Router();
const { topUpBalance, withdrawBalance, updateProfile } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/balance/topup', topUpBalance);
router.post('/balance/withdraw', withdrawBalance);
router.patch('/profile', updateProfile);

module.exports = router;
