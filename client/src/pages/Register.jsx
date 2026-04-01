import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

function getPasswordStrength(password) {
  if (!password) return { label: '', score: 0 };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;

  if (score <= 2) return { label: 'Weak', score: 1, color: 'bg-red-500', width: 'w-1/3' };
  if (score <= 3) return { label: 'Medium', score: 2, color: 'bg-yellow-500', width: 'w-2/3' };
  return { label: 'Strong', score: 3, color: 'bg-emerald-500', width: 'w-full' };
}

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  function validate() {
    const e = {};

    if (!form.username || !/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) {
      e.username = 'Username must be 3-20 characters (letters, numbers, underscores)';
    }

    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Please enter a valid email address';
    }

    if (!form.password || form.password.length < 8) {
      e.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(form.password)) {
      e.password = 'Password must contain at least 1 uppercase letter';
    } else if (!/[0-9]/.test(form.password)) {
      e.password = 'Password must contain at least 1 number';
    }

    if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }

    return Object.keys(e).length > 0 ? e : null;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setErrors({});

    const validationErrors = validate();
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      toast.success('Account created! Welcome to AdaptIQ');
      navigate('/dashboard');
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.errors) {
        setErrors(respData.errors);
      } else {
        const msg = respData?.message || 'Registration failed';
        setErrors({ general: msg });
      }
      toast.error(respData?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(ev) {
    setForm({ ...form, [ev.target.name]: ev.target.value });
    if (errors[ev.target.name]) {
      setErrors({ ...errors, [ev.target.name]: undefined });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-8">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/3 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            AdaptIQ
          </span>
        </Link>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-8 backdrop-blur-sm">
          <h1 className="mb-1 text-2xl font-bold text-white">Create your account</h1>
          <p className="mb-6 text-sm text-gray-500">Start your adaptive learning journey</p>

          {errors.general && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-400">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                className={`w-full rounded-lg border bg-gray-800/50 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                  errors.username ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="your_username"
              />
              {errors.username && <p className="mt-1 text-xs text-red-400">{errors.username}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-400">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className={`w-full rounded-lg border bg-gray-800/50 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-400">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  className={`w-full rounded-lg border bg-gray-800/50 px-4 py-2.5 pr-16 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-700'
                  }`}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}

              {/* Strength bar */}
              {form.password && (
                <div className="mt-2">
                  <div className="h-1.5 w-full rounded-full bg-gray-800">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${strength.color} ${strength.width}`}
                    />
                  </div>
                  <p className={`mt-1 text-xs ${
                    strength.score === 1 ? 'text-red-400' : strength.score === 2 ? 'text-yellow-400' : 'text-emerald-400'
                  }`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-400">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={`w-full rounded-lg border bg-gray-800/50 px-4 py-2.5 pr-16 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-700'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500 hover:text-gray-300"
                >
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
