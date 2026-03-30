const mongoose = require('mongoose');

const conceptMasterySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: { type: String, required: true },
  concept: { type: String, required: true },

  // Bayesian Knowledge Tracing parameters
  pL: { type: Number, default: 0.1 },  // P(Learned) — updated after each answer
  pT: { type: Number, default: 0.2 },  // P(Transit) — probability of learning
  pS: { type: Number, default: 0.1 },  // P(Slip)    — knows but answers wrong
  pG: { type: Number, default: 0.2 },  // P(Guess)   — doesn't know but correct

  attempts: { type: Number, default: 0 },
  correctAttempts: { type: Number, default: 0 },
  mastered: { type: Boolean, default: false }, // true when pL > 0.95
  lastAttemptAt: Date,
  updatedAt: { type: Date, default: Date.now },
});

conceptMasterySchema.index({ userId: 1, subject: 1, concept: 1 }, { unique: true });

module.exports = mongoose.model('ConceptMastery', conceptMasterySchema);
