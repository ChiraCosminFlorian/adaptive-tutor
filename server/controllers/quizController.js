const Session = require('../models/Session');
const Answer = require('../models/Answer');
const ConceptMastery = require('../models/ConceptMastery');
const User = require('../models/User');
const { generateQuestion, evaluateAnswer, generateHint } = require('../services/aiService');
const { updateBKT, isMastered, getKnowledgeLevel, suggestDifficulty } = require('../utils/bktEngine');

// ─── Start Session ───────────────────────────────────────

async function startSession(req, res, next) {
  try {
    const { subject, concept } = req.body;
    const userId = req.user.userId;

    const session = await Session.create({
      userId,
      subject,
    });

    // Find or create the ConceptMastery record
    let mastery = await ConceptMastery.findOne({ userId, subject, concept });
    if (!mastery) {
      mastery = await ConceptMastery.create({ userId, subject, concept });
    }

    const difficulty = suggestDifficulty(mastery.pL);

    // Gather recent mistakes for this subject
    const recentWrong = await Answer.find({ userId, subject, isCorrect: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('concept');
    const recentMistakes = [...new Set(recentWrong.map((a) => a.concept))];

    const question = await generateQuestion(subject, difficulty, concept, recentMistakes);

    // Track the first difficulty in the progression
    session.difficultyProgression.push(difficulty);
    await session.save();

    return res.status(201).json({
      success: true,
      data: {
        sessionId: session._id,
        question: question.question,
        difficulty,
        answerType: question.answerType,
        options: question.options || null,
        correctOption: question.correctOption ?? null,
        hint: question.hint,
        expectedCriteria: question.expectedCriteria,
        conceptTested: question.conceptTested,
        knowledgeLevel: getKnowledgeLevel(mastery.pL),
        pL: mastery.pL,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Submit Answer ───────────────────────────────────────

async function submitAnswer(req, res, next) {
  try {
    const {
      sessionId,
      questionText,
      userAnswer,
      answerType,
      correctOption,
      concept,
      timeSpentSeconds,
    } = req.body;
    const userId = req.user.userId;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Evaluate the answer
    const currentDifficulty =
      session.difficultyProgression[session.difficultyProgression.length - 1] || 1;

    const evaluation = await evaluateAnswer(
      questionText,
      userAnswer,
      session.subject,
      answerType,
      currentDifficulty,
      correctOption
    );

    // Save Answer document
    const answer = await Answer.create({
      userId,
      sessionId: session._id,
      subject: session.subject,
      concept,
      difficulty: currentDifficulty,
      questionText,
      answerType,
      userAnswer,
      isCorrect: evaluation.isCorrect,
      score: evaluation.score,
      aiFeedback: evaluation.feedback,
      aiExplanation: evaluation.explanation,
      timeSpentSeconds: timeSpentSeconds || 0,
    });

    // Update BKT
    let mastery = await ConceptMastery.findOne({
      userId,
      subject: session.subject,
      concept,
    });
    if (!mastery) {
      mastery = await ConceptMastery.create({
        userId,
        subject: session.subject,
        concept,
      });
    }

    const newPL = updateBKT(mastery.pL, mastery.pT, mastery.pS, mastery.pG, evaluation.isCorrect);
    mastery.pL = newPL;
    mastery.attempts += 1;
    if (evaluation.isCorrect) mastery.correctAttempts += 1;
    mastery.mastered = isMastered(newPL);
    mastery.lastAttemptAt = new Date();
    mastery.updatedAt = new Date();
    await mastery.save();

    // Update session stats
    session.totalQuestions += 1;
    if (evaluation.isCorrect) session.correctAnswers += 1;

    const nextDifficulty = suggestDifficulty(newPL);
    const endSession = session.totalQuestions >= 10;

    let nextQuestion = null;
    let nextAnswerType = null;
    let nextOptions = null;

    if (!endSession) {
      // Gather recent mistakes
      const recentWrong = await Answer.find({
        userId,
        subject: session.subject,
        isCorrect: false,
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('concept');
      const recentMistakes = [...new Set(recentWrong.map((a) => a.concept))];

      const generated = await generateQuestion(
        session.subject,
        nextDifficulty,
        concept,
        recentMistakes
      );
      nextQuestion = generated.question;
      nextAnswerType = generated.answerType;
      nextOptions = generated.options || null;

      session.difficultyProgression.push(nextDifficulty);
    }

    await session.save();

    const accuracy =
      session.totalQuestions > 0
        ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        evaluation: {
          isCorrect: evaluation.isCorrect,
          score: evaluation.score,
          feedback: evaluation.feedback,
          explanation: evaluation.explanation,
          encouragement: evaluation.encouragement,
        },
        nextQuestion,
        nextDifficulty,
        nextAnswerType,
        nextOptions,
        sessionStats: {
          totalQuestions: session.totalQuestions,
          correctAnswers: session.correctAnswers,
          accuracy,
        },
        bkt: {
          pL: newPL,
          knowledgeLevel: getKnowledgeLevel(newPL),
          mastered: mastery.mastered,
        },
        endSession,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── End Session ─────────────────────────────────────────

async function endSession(req, res, next) {
  try {
    const { sessionId } = req.body;
    const userId = req.user.userId;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    session.endedAt = new Date();

    // Calculate average difficulty
    if (session.difficultyProgression.length > 0) {
      const sum = session.difficultyProgression.reduce((a, b) => a + b, 0);
      session.averageDifficulty = Math.round((sum / session.difficultyProgression.length) * 100) / 100;
    }
    await session.save();

    // Update user streak and stats
    const user = await User.findById(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = user.profile.lastActiveDate
      ? new Date(user.profile.lastActiveDate)
      : null;

    if (lastActive) {
      lastActive.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today - lastActive) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        user.profile.streakDays += 1;
      } else if (diffDays > 1) {
        user.profile.streakDays = 1;
      }
      // diffDays === 0 → same day, no change
    } else {
      user.profile.streakDays = 1;
    }

    user.profile.totalSessions += 1;
    user.profile.lastActiveDate = new Date();
    await user.save();

    const accuracy =
      session.totalQuestions > 0
        ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        sessionSummary: {
          sessionId: session._id,
          subject: session.subject,
          totalQuestions: session.totalQuestions,
          correctAnswers: session.correctAnswers,
          accuracy,
          averageDifficulty: session.averageDifficulty,
          difficultyProgression: session.difficultyProgression,
          duration: session.endedAt - session.startedAt,
          streakDays: user.profile.streakDays,
          totalSessions: user.profile.totalSessions,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Get Hint ────────────────────────────────────────────

async function getHint(req, res, next) {
  try {
    const { question, concept, subject } = req.body;

    const hint = await generateHint(question, concept, subject);

    return res.status(200).json({
      success: true,
      data: { hint },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  startSession,
  submitAnswer,
  endSession,
  getHint,
};
