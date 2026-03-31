const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  register,
  login,
  refresh,
  logout,
  getMe,
} = require('../controllers/authController');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

module.exports = router;
