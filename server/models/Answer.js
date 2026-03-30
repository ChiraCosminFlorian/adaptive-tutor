const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
  },
  subject: { type: String, required: true },
  concept: { type: String, required: true },
  difficulty: { type: Number, min: 1, max: 5, required: true },
  questionText: { type: String, required: true },
  answerType: {
    type: String,
    enum: ['text', 'code', 'multiple_choice'],
    required: true,
  },
  userAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  score: { type: Number, min: 0, max: 100 },
  aiFeedback: String,
  aiExplanation: String,
  timeSpentSeconds: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

answerSchema.index({ userId: 1, createdAt: -1 });
answerSchema.index({ userId: 1, subject: 1 });

module.exports = mongoose.model('Answer', answerSchema);
