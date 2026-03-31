const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication endpoints (login, register).
 * 5 requests per 15-minute window per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again after 15 minutes',
  },
});

/**
 * Rate limiter for quiz endpoints.
 * 60 requests per 1-minute window per IP.
 */
const quizLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again shortly',
  },
});

module.exports = { authLimiter, quizLimiter };
