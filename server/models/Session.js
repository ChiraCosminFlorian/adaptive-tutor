const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: String,
    enum: ['mathematics', 'algorithms', 'oop', 'databases'],
    required: true,
  },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  totalQuestions: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  averageDifficulty: { type: Number, default: 0 },
  difficultyProgression: [Number],
});

sessionSchema.index({ userId: 1, startedAt: -1 });

module.exports = mongoose.model('Session', sessionSchema);
