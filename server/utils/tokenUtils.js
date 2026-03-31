const jwt = require('jsonwebtoken');

/**
 * Generate a short-lived access token.
 * @param {string} userId - MongoDB ObjectId as string
 * @param {string} email  - User email
 * @returns {string} Signed JWT (15 min expiry)
 */
function generateAccessToken(userId, email) {
  return jwt.sign(
    { userId, email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

/**
 * Generate a long-lived refresh token.
 * @param {string} userId - MongoDB ObjectId as string
 * @returns {string} Signed JWT (7 day expiry)
 */
function generateRefreshToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify and decode an access token.
 * @param {string} token - JWT access token
 * @returns {object} Decoded payload { userId, email, iat, exp }
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

/**
 * Verify and decode a refresh token.
 * @param {string} token - JWT refresh token
 * @returns {object} Decoded payload { userId, iat, exp }
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
