const Session = require('../models/Session');
const Answer = require('../models/Answer');
const ConceptMastery = require('../models/ConceptMastery');
const User = require('../models/User');

const SUBJECTS = ['mathematics', 'algorithms', 'oop', 'databases'];

// ─── Get Overview ────────────────────────────────────────

async function getOverview(req, res, next) {
  try {
    const userId = req.user.userId;

    const [sessions, answers, masteries, user] = await Promise.all([
      Session.find({ userId }).sort({ startedAt: -1 }).lean(),
      Answer.find({ userId }).lean(),
      ConceptMastery.find({ userId }).lean(),
      User.findById(userId).select('profile').lean(),
    ]);

    // Overall stats
    const totalSessions = sessions.length;
    const totalQuestions = answers.length;
    const totalCorrect = answers.filter((a) => a.isCorrect).length;
    const overallAccuracy =
      totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 10000) / 100
        : 0;

    // Per-subject breakdown
    const subjectBreakdown = {};
    for (const subject of SUBJECTS) {
      const subSessions = sessions.filter((s) => s.subject === subject);
      const subAnswers = answers.filter((a) => a.subject === subject);
      const subCorrect = subAnswers.filter((a) => a.isCorrect).length;
      const subAccuracy =
        subAnswers.length > 0
          ? Math.round((subCorrect / subAnswers.length) * 10000) / 100
          : 0;

      const avgDifficulty =
        subSessions.length > 0
          ? Math.round(
              (subSessions.reduce((sum, s) => sum + (s.averageDifficulty || 0), 0) /
                subSessions.length) *
                100
            ) / 100
          : 0;

      subjectBreakdown[subject] = {
        sessions: subSessions.length,
        questions: subAnswers.length,
        accuracy: subAccuracy,
        avgDifficulty,
      };
    }

    // Recent 5 sessions
    const recentSessions = sessions.slice(0, 5).map((s) => ({
      sessionId: s._id,
      subject: s.subject,
      totalQuestions: s.totalQuestions,
      correctAnswers: s.correctAnswers,
      averageDifficulty: s.averageDifficulty,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
    }));

    // Mastery split
    const masteredConcepts = masteries.filter((m) => m.mastered);
    const conceptsInProgress = masteries
      .filter((m) => !m.mastered)
      .sort((a, b) => b.pL - a.pL);

    return res.status(200).json({
      success: true,
      data: {
        totalSessions,
        totalQuestions,
        overallAccuracy,
        streakDays: user?.profile?.streakDays || 0,
        subjectBreakdown,
        recentSessions,
        masteredConcepts,
        conceptsInProgress,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Get History ─────────────────────────────────────────

async function getHistory(req, res, next) {
  try {
    const userId = req.user.userId;
    const subject = req.query.subject || null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = { userId };
    if (subject) filter.subject = subject;

    const [answers, total] = await Promise.all([
      Answer.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('questionText userAnswer isCorrect score aiFeedback concept difficulty createdAt subject')
        .lean(),
      Answer.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: {
        answers,
        total,
        page,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Get Weak Areas ──────────────────────────────────────

async function getWeakAreas(req, res, next) {
  try {
    const userId = req.user.userId;

    const [answers, masteries] = await Promise.all([
      Answer.find({ userId }).select('subject concept isCorrect').lean(),
      ConceptMastery.find({ userId }).select('subject concept pL').lean(),
    ]);

    // Build a pL lookup map
    const plMap = {};
    for (const m of masteries) {
      plMap[`${m.subject}::${m.concept}`] = m.pL;
    }

    // Aggregate per subject → concept
    const weakAreas = {};
    for (const subject of SUBJECTS) {
      const subAnswers = answers.filter((a) => a.subject === subject);

      // Group by concept
      const conceptMap = {};
      for (const a of subAnswers) {
        if (!conceptMap[a.concept]) {
          conceptMap[a.concept] = { total: 0, wrong: 0 };
        }
        conceptMap[a.concept].total += 1;
        if (!a.isCorrect) conceptMap[a.concept].wrong += 1;
      }

      // Convert to array, compute accuracy, attach pL, sort by wrongCount desc
      const conceptList = Object.entries(conceptMap)
        .map(([concept, stats]) => ({
          concept,
          wrongCount: stats.wrong,
          totalAttempts: stats.total,
          accuracy:
            stats.total > 0
              ? Math.round((1 - stats.wrong / stats.total) * 10000) / 100
              : 0,
          pL: plMap[`${subject}::${concept}`] ?? null,
        }))
        .sort((a, b) => b.wrongCount - a.wrongCount)
        .slice(0, 5);

      weakAreas[subject] = conceptList;
    }

    return res.status(200).json({
      success: true,
      data: weakAreas,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Get Session Detail ──────────────────────────────────

async function getSessionDetail(req, res, next) {
  try {
    const userId = req.user.userId;
    const sessionId = req.params.id;

    const session = await Session.findById(sessionId).lean();
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const answers = await Answer.find({ sessionId })
      .sort({ createdAt: 1 })
      .select('-userId')
      .lean();

    // Gather unique concepts from the session answers
    const concepts = [...new Set(answers.map((a) => a.concept))];

    const conceptProgress = await ConceptMastery.find({
      userId,
      subject: session.subject,
      concept: { $in: concepts },
    })
      .select('concept pL pT pS pG attempts correctAttempts mastered updatedAt')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        session,
        answers,
        conceptProgress,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverview,
  getHistory,
  getWeakAreas,
  getSessionDetail,
};
