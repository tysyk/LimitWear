const router = require('express').Router();
const { getDrops, getDropById, getTrendingDrops, getNewDrops } = require('../controllers/dropController');

router.get('/', getDrops);
router.get('/trending', getTrendingDrops);
router.get('/new', getNewDrops);
router.get('/:id', getDropById);

module.exports = router;
