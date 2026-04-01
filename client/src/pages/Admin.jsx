import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const SUBJECT_CONFIG = {
  mathematics: { label: 'Mathematics', border: 'border-l-purple-500' },
  algorithms: { label: 'Algorithms', border: 'border-l-blue-500' },
  oop: { label: 'OOP', border: 'border-l-emerald-500' },
  databases: { label: 'Databases', border: 'border-l-orange-500' },
};

function Admin() {
  const { user, accessToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const [statsRes, usersRes] = await Promise.all([
          axios.get('/admin/stats', { headers }),
          axios.get('/admin/users', { headers }),
        ]);
        setStats(statsRes.data.data);
        setUsers(usersRes.data.data.users);
      } catch {
        toast.error('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleDelete(userId, username) {
    if (!window.confirm(`Delete user "${username}" and all their data? This cannot be undone.`)) return;
    setDeleting(userId);
    try {
      await axios.delete(`/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      toast.success(`User "${username}" deleted`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <Link to="/dashboard" className="text-sm text-gray-500 hover:text-indigo-400 transition-colors">
            Back to Dashboard
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total Users', value: stats?.totalUsers || 0 },
            { label: 'Total Sessions', value: stats?.totalSessions || 0 },
            { label: 'Total Answers', value: stats?.totalAnswers || 0 },
            { label: 'Overall Accuracy', value: `${stats?.overallAccuracy || 0}%` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Subject breakdown */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(SUBJECT_CONFIG).map(([key, cfg]) => {
            const sub = stats?.subjectBreakdown?.[key] || {};
            return (
              <div key={key} className={`rounded-xl border border-gray-800 bg-gray-900/50 p-4 border-l-4 ${cfg.border}`}>
                <h3 className="text-sm font-semibold text-gray-300">{cfg.label}</h3>
                <div className="mt-2 text-xs text-gray-500">
                  <span>Sessions: <span className="text-white">{sub.sessions || 0}</span></span>
                  <span className="ml-4">Accuracy: <span className="text-white">{sub.accuracy || 0}%</span></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top users */}
        {stats?.topUsers?.length > 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-200">Top Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="pb-3 pr-4">Username</th>
                    <th className="pb-3 pr-4">Sessions</th>
                    <th className="pb-3">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topUsers.map((u, i) => (
                    <tr key={i} className="border-b border-gray-800/50">
                      <td className="py-3 pr-4 text-gray-300">{u.username}</td>
                      <td className="py-3 pr-4 text-gray-400">{u.totalSessions}</td>
                      <td className="py-3 text-gray-400">{u.streakDays} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-200">All Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="pb-3 pr-4">Username</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Joined</th>
                  <th className="pb-3 pr-4">Sessions</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u._id === user?.id;
                  const isAdmin = u.role === 'admin';
                  return (
                    <tr key={u._id} className="border-b border-gray-800/50">
                      <td className="py-3 pr-4 text-gray-300">{u.username}</td>
                      <td className="py-3 pr-4 text-gray-400">{u.email}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                          isAdmin
                            ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                            : 'border-gray-700 bg-gray-800 text-gray-400'
                        }`}>
                          {isAdmin ? 'Admin' : 'Student'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 pr-4 text-gray-400">{u.profile?.totalSessions || 0}</td>
                      <td className="py-3">
                        <button
                          onClick={() => handleDelete(u._id, u.username)}
                          disabled={isSelf || isAdmin || deleting === u._id}
                          className="rounded-lg bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {deleting === u._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent sessions */}
        {stats?.recentSessions?.length > 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-200">Recent Sessions (All Users)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="pb-3 pr-4">Username</th>
                    <th className="pb-3 pr-4">Subject</th>
                    <th className="pb-3 pr-4">Accuracy</th>
                    <th className="pb-3 pr-4">Questions</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSessions.map((s, i) => (
                    <tr key={i} className="border-b border-gray-800/50">
                      <td className="py-3 pr-4 text-gray-300">{s.username}</td>
                      <td className="py-3 pr-4 text-gray-400">{SUBJECT_CONFIG[s.subject]?.label || s.subject}</td>
                      <td className="py-3 pr-4 text-gray-400">
                        {s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0}%
                      </td>
                      <td className="py-3 pr-4 text-gray-400">{s.totalQuestions}</td>
                      <td className="py-3 text-gray-500">{new Date(s.startedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
