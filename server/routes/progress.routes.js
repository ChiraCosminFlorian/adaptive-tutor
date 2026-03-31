const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const {
  getOverview,
  getHistory,
  getWeakAreas,
  getSessionDetail,
} = require('../controllers/progressController');

router.use(requireAuth);

router.get('/overview', getOverview);
router.get('/history', getHistory);
router.get('/weak-areas', getWeakAreas);
router.get('/session/:id', getSessionDetail);

module.exports = router;
