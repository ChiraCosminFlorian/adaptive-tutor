const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true,
  },
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  refreshTokens: [String],
  profile: {
    displayName: String,
    totalSessions: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    lastActiveDate: Date,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
