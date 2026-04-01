const User = require('../models/User');
const Session = require('../models/Session');
const Answer = require('../models/Answer');
const ConceptMastery = require('../models/ConceptMastery');

const SUBJECTS = ['mathematics', 'algorithms', 'oop', 'databases'];

// ─── Get All Users ───────────────────────────────────────

async function getAllUsers(req, res, next) {
  try {
    const users = await User.find()
      .select('-passwordHash -refreshTokens')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Delete User ─────────────────────────────────────────

async function deleteUser(req, res, next) {
  try {
    const { userId } = req.params;

    if (userId === req.user.userId) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }

    const target = await User.findById(userId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (target.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete another admin' });
    }

    await Promise.all([
      Session.deleteMany({ userId }),
      Answer.deleteMany({ userId }),
      ConceptMastery.deleteMany({ userId }),
      User.findByIdAndDelete(userId),
    ]);

    return res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    next(error);
  }
}

// ─── Get Global Stats ────────────────────────────────────

async function getGlobalStats(req, res, next) {
  try {
    const [users, sessions, answers] = await Promise.all([
      User.find().select('username profile').lean(),
      Session.find().sort({ startedAt: -1 }).lean(),
      Answer.find().select('subject isCorrect').lean(),
    ]);

    const totalUsers = users.length;
    const totalSessions = sessions.length;
    const totalAnswers = answers.length;
    const totalCorrect = answers.filter((a) => a.isCorrect).length;
    const overallAccuracy =
      totalAnswers > 0
        ? Math.round((totalCorrect / totalAnswers) * 10000) / 100
        : 0;

    const subjectBreakdown = {};
    for (const subject of SUBJECTS) {
      const subSessions = sessions.filter((s) => s.subject === subject);
      const subAnswers = answers.filter((a) => a.subject === subject);
      const subCorrect = subAnswers.filter((a) => a.isCorrect).length;
      subjectBreakdown[subject] = {
        sessions: subSessions.length,
        accuracy:
          subAnswers.length > 0
            ? Math.round((subCorrect / subAnswers.length) * 10000) / 100
            : 0,
      };
    }

    const userMap = {};
    for (const u of users) {
      userMap[u._id.toString()] = u.username;
    }

    const recentSessions = sessions.slice(0, 10).map((s) => ({
      sessionId: s._id,
      username: userMap[s.userId.toString()] || 'Unknown',
      subject: s.subject,
      totalQuestions: s.totalQuestions,
      correctAnswers: s.correctAnswers,
      startedAt: s.startedAt,
    }));

    const topUsers = users
      .map((u) => ({
        username: u.username,
        totalSessions: u.profile?.totalSessions || 0,
        streakDays: u.profile?.streakDays || 0,
      }))
      .sort((a, b) => b.totalSessions - a.totalSessions)
      .slice(0, 5);

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalSessions,
        totalAnswers,
        overallAccuracy,
        subjectBreakdown,
        recentSessions,
        topUsers,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Get All Sessions ────────────────────────────────────

async function getAllSessions(req, res, next) {
  try {
    const { userId, subject } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (userId) filter.userId = userId;
    if (subject) filter.subject = subject;

    const [sessions, total] = await Promise.all([
      Session.find(filter)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Session.countDocuments(filter),
    ]);

    const userIds = [...new Set(sessions.map((s) => s.userId.toString()))];
    const users = await User.find({ _id: { $in: userIds } }).select('username').lean();
    const userMap = {};
    for (const u of users) {
      userMap[u._id.toString()] = u.username;
    }

    const sessionsWithUsername = sessions.map((s) => ({
      ...s,
      username: userMap[s.userId.toString()] || 'Unknown',
    }));

    return res.status(200).json({
      success: true,
      data: {
        sessions: sessionsWithUsername,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllUsers,
  deleteUser,
  getGlobalStats,
  getAllSessions,
};
