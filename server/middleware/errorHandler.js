/**
 * Global error-handling middleware.
 * Catches all errors forwarded via next(error) and returns
 * a consistent JSON response. Stack traces are hidden in production.
 */
function errorHandler(err, req, res, next) {
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = {};
    for (const field of Object.keys(err.errors)) {
      errors[field] = err.errors[field].message;
    }
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Email or username already exists',
    });
  }

  // JWT invalid signature / malformed
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  // JWT expired
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }

  // Default — internal server error
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  const response = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = { errorHandler };
