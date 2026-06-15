const router = require('express').Router();
const {
  getPendingDesigns,
  moderateDesign,
  createDropFromDesign,
  getAllDrops,
  getAllUsers,
  getStats,
  topUpUserBalance,
  getPendingDesigners,
  verifyDesigner,
} = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect, requireRole('admin'));
router.get('/stats', getStats);
router.get('/designs/pending', getPendingDesigns);
router.patch('/designs/:id/moderate', moderateDesign);
router.post('/drops', createDropFromDesign);
router.get('/drops', getAllDrops);
router.get('/users', getAllUsers);
router.patch('/users/:userId/balance', topUpUserBalance);
router.get('/designers/pending', getPendingDesigners);
router.patch('/designers/:userId/verify', verifyDesigner);

module.exports = router;
