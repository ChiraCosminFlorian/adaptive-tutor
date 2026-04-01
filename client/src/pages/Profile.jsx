import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../hooks/useProgress';
import axios from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const SUBJECT_CONFIG = {
  mathematics: { label: 'Mathematics', color: 'bg-purple-500' },
  algorithms: { label: 'Algorithms', color: 'bg-blue-500' },
  oop: { label: 'OOP', color: 'bg-emerald-500' },
  databases: { label: 'Databases', color: 'bg-orange-500' },
};

function PasswordInput({ id, label, value, onChange, placeholder, error }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-400">{label}</label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className={`w-full rounded-lg border bg-gray-800/50 px-4 py-2.5 pr-16 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${error ? 'border-red-500' : 'border-gray-700'}`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500 hover:text-gray-300"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function Profile() {
  const { user, accessToken } = useAuth();
  const { getOverview } = useProgress();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, overviewRes] = await Promise.all([
          axios.get('/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } }),
          getOverview(),
        ]);
        setProfile(meRes.data.data.user);
        setOverview(overviewRes.data);
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleChangePassword(ev) {
    ev.preventDefault();
    setPwErrors({});

    const e = {};
    if (!pwForm.currentPassword) e.currentPassword = 'Required';
    if (!pwForm.newPassword || pwForm.newPassword.length < 8) {
      e.newPassword = 'Min 8 characters';
    } else if (!/[A-Z]/.test(pwForm.newPassword)) {
      e.newPassword = 'Must contain 1 uppercase letter';
    } else if (!/[0-9]/.test(pwForm.newPassword)) {
      e.newPassword = 'Must contain 1 number';
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    if (Object.keys(e).length > 0) { setPwErrors(e); return; }

    setPwLoading(true);
    try {
      await axios.put('/auth/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      }, { headers: { Authorization: `Bearer ${accessToken}` } });
      toast.success('Password updated');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update password';
      setPwErrors({ general: msg });
      toast.error(msg);
    } finally {
      setPwLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const initial = (profile?.username || 'U')[0].toUpperCase();

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header card */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white">
              {initial}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white">{profile?.username}</h1>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  profile?.role === 'admin'
                    ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                    : 'border-gray-700 bg-gray-800 text-gray-400'
                }`}>
                  {profile?.role === 'admin' ? 'Admin' : 'Student'}
                </span>
              </div>
              <p className="text-sm text-gray-500">{profile?.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span>Member since {new Date(profile?.createdAt).toLocaleDateString()}</span>
                {profile?.profile?.streakDays > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {profile.profile.streakDays} day streak
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total Sessions', value: overview?.totalSessions || 0 },
            { label: 'Total Questions', value: overview?.totalQuestions || 0 },
            { label: 'Overall Accuracy', value: `${overview?.overallAccuracy || 0}%` },
            { label: 'Concepts Mastered', value: overview?.masteredConcepts?.length || 0 },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{s.label}</p>
              <p className="mt-1 text-xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Subject progress */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-200">Subject Progress</h2>
          <div className="space-y-4">
            {Object.entries(SUBJECT_CONFIG).map(([key, cfg]) => {
              const acc = overview?.subjectBreakdown?.[key]?.accuracy || 0;
              return (
                <div key={key} className="flex items-center gap-4">
                  <span className="w-28 text-sm text-gray-400">{cfg.label}</span>
                  <div className="flex-1">
                    <div className="h-2 w-full rounded-full bg-gray-800">
                      <div className={`h-2 rounded-full transition-all ${cfg.color}`} style={{ width: `${acc}%` }} />
                    </div>
                  </div>
                  <span className="w-12 text-right text-sm font-medium text-gray-300">{acc}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Account section */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-200">Account</h2>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Username</p>
              <p className="text-sm text-gray-300">{profile?.username}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Email</p>
              <p className="text-sm text-gray-300">{profile?.email}</p>
            </div>
          </div>

          <h3 className="mb-3 text-sm font-semibold text-gray-300">Change Password</h3>
          {pwErrors.general && (
            <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">
              {pwErrors.general}
            </div>
          )}
          <form onSubmit={handleChangePassword} className="space-y-3">
            <PasswordInput id="currentPassword" label="Current Password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} placeholder="Current password" error={pwErrors.currentPassword} />
            <PasswordInput id="newPassword" label="New Password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} placeholder="Min 8 chars, 1 uppercase, 1 number" error={pwErrors.newPassword} />
            <PasswordInput id="confirmPassword" label="Confirm New Password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} placeholder="Confirm new password" error={pwErrors.confirmPassword} />
            <button type="submit" disabled={pwLoading} className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110 disabled:opacity-50">
              {pwLoading ? <LoadingSpinner size="sm" /> : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Admin button */}
        {profile?.role === 'admin' && (
          <Link
            to="/admin"
            className="block w-full rounded-xl border border-purple-500/30 bg-purple-500/10 px-5 py-4 text-center text-sm font-semibold text-purple-400 transition-colors hover:bg-purple-500/20"
          >
            Admin Panel
          </Link>
        )}
      </div>
    </div>
  );
}

export default Profile;
