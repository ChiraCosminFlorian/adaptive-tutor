const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { quizLimiter } = require('../middleware/rateLimiter');
const {
  startSession,
  submitAnswer,
  endSession,
  getHint,
} = require('../controllers/quizController');

router.use(requireAuth);
router.use(quizLimiter);

router.post('/start', startSession);
router.post('/answer', submitAnswer);
router.post('/end', endSession);
router.post('/hint', getHint);

module.exports = router;
