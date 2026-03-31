const { verifyAccessToken } = require('../utils/tokenUtils');

/**
 * Express middleware that requires a valid JWT access token.
 * Reads the Bearer token from the Authorization header,
 * verifies it, and attaches the decoded user to req.user.
 */
function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }
}

module.exports = { requireAuth };
