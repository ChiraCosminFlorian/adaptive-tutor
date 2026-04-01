const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');
const {
  getAllUsers,
  deleteUser,
  getGlobalStats,
  getAllSessions,
} = require('../controllers/adminController');

router.use(requireAuth);
router.use(requireAdmin);

router.get('/users', getAllUsers);
router.delete('/users/:userId', deleteUser);
router.get('/stats', getGlobalStats);
router.get('/sessions', getAllSessions);

module.exports = router;
