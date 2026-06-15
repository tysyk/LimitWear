const router = require('express').Router();
const { submitDesign, getMyDesigns, getDesignById } = require('../controllers/designController');
const { protect, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect, requireRole('designer', 'admin'));
router.post('/', upload.single('image'), submitDesign);
router.get('/', getMyDesigns);
router.get('/:id', getDesignById);

module.exports = router;
