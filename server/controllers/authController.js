const bcrypt = require('bcryptjs');
const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/tokenUtils');

const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

// ─── Validation helpers ──────────────────────────────────

function validateRegistration(email, username, password) {
  const errors = {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'A valid email address is required';
  }

  if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    errors.username =
      'Username must be 3-20 characters (letters, numbers, underscores)';
  }

  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (!/[A-Z]/.test(password)) {
    errors.password = 'Password must contain at least 1 uppercase letter';
  } else if (!/[0-9]/.test(password)) {
    errors.password = 'Password must contain at least 1 number';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

// ─── Register ────────────────────────────────────────────

async function register(req, res, next) {
  try {
    const { email, username, password } = req.body;

    const validationErrors = validateRegistration(email, username, password);
    if (validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email,
      username,
      passwordHash,
      profile: { displayName: username },
    });

    if (process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
      user.role = 'admin';
    }

    const accessToken = generateAccessToken(user._id.toString(), user.email);
    const refreshToken = generateRefreshToken(user._id.toString());

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    user.refreshTokens.push(hashedRefresh);
    await user.save();

    res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      data: {
        user: { id: user._id, email: user.email, username: user.username, role: user.role },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Login ───────────────────────────────────────────────

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const accessToken = generateAccessToken(user._id.toString(), user.email);
    const refreshToken = generateRefreshToken(user._id.toString());

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    user.refreshTokens.push(hashedRefresh);

    // Keep only the last 5 refresh tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    await user.save();

    res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      data: {
        user: { id: user._id, email: user.email, username: user.username, role: user.role },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Refresh ─────────────────────────────────────────────

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token missing',
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Find the matching hashed token
    let matchIndex = -1;
    for (let i = 0; i < user.refreshTokens.length; i++) {
      const isMatch = await bcrypt.compare(refreshToken, user.refreshTokens[i]);
      if (isMatch) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex === -1) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Token rotation: remove old, issue new
    user.refreshTokens.splice(matchIndex, 1);

    const newAccessToken = generateAccessToken(user._id.toString(), user.email);
    const newRefreshToken = generateRefreshToken(user._id.toString());

    const hashedRefresh = await bcrypt.hash(newRefreshToken, 10);
    user.refreshTokens.push(hashedRefresh);
    await user.save();

    res.cookie('refreshToken', newRefreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Logout ──────────────────────────────────────────────

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.userId);

      if (user) {
        const remaining = [];
        for (const hash of user.refreshTokens) {
          const isMatch = await bcrypt.compare(refreshToken, hash);
          if (!isMatch) {
            remaining.push(hash);
          }
        }
        user.refreshTokens = remaining;
        await user.save();
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out',
    });
  } catch (error) {
    next(error);
  }
}

// ─── Get Me ──────────────────────────────────────────────

async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).select(
      '-passwordHash -refreshTokens'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Change Password ─────────────────────────────────────

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password must contain at least 1 uppercase letter' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password must contain at least 1 number' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.status(200).json({ success: true, message: 'Password updated' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
  changePassword,
};
