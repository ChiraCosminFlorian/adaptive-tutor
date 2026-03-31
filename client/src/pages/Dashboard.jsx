import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../hooks/useProgress';
import { useQuiz } from '../hooks/useQuiz';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const SUBJECT_CONFIG = {
  mathematics: { label: 'Mathematics', border: 'border-l-purple-500', accent: 'text-purple-400', bg: 'bg-purple-500/10' },
  algorithms: { label: 'Algorithms', border: 'border-l-blue-500', accent: 'text-blue-400', bg: 'bg-blue-500/10' },
  oop: { label: 'OOP', border: 'border-l-emerald-500', accent: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  databases: { label: 'Databases', border: 'border-l-orange-500', accent: 'text-orange-400', bg: 'bg-orange-500/10' },
};

const CONCEPTS = {
  mathematics: ['Algebra', 'Calculus', 'Statistics', 'Linear Algebra', 'Discrete Math'],
  algorithms: ['Recursion', 'Sorting', 'Graph Algorithms', 'Dynamic Programming', 'Binary Search'],
  oop: ['Inheritance', 'Polymorphism', 'Encapsulation', 'Design Patterns', 'SOLID'],
  databases: ['SQL Joins', 'Indexing', 'Normalization', 'Transactions', 'Query Optimization'],
};

function Dashboard() {
  const { user } = useAuth();
  const { getOverview } = useProgress();
  const { startSession } = useQuiz();
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalSubject, setModalSubject] = useState(null);
  const [startingSession, setStartingSession] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await getOverview();
        setOverview(res.data);
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStartSession(subject, concept) {
    setStartingSession(true);
    try {
      const res = await startSession(subject, concept);
      setModalSubject(null);
      navigate(`/quiz/${subject}`, {
        state: {
          sessionId: res.data.sessionId,
          firstQuestion: res.data.question,
          difficulty: res.data.difficulty,
          answerType: res.data.answerType,
          options: res.data.options,
          correctOption: res.data.correctOption,
          hint: res.data.hint,
          conceptTested: res.data.conceptTested || concept,
          pL: res.data.pL,
          knowledgeLevel: res.data.knowledgeLevel,
        },
      });
    } catch {
      toast.error('Failed to start session');
    } finally {
      setStartingSession(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const chartData = (overview?.recentSessions || [])
    .slice()
    .reverse()
    .map((s, i) => ({
      index: i + 1,
      accuracy: s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0,
    }));

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Welcome */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              Hello, {user?.username || 'Learner'}
            </h1>
            <p className="text-sm text-gray-500">Keep pushing your limits</p>
          </div>
          {overview?.streakDays > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              {overview.streakDays} day streak
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total Sessions', value: overview?.totalSessions || 0 },
            { label: 'Total Questions', value: overview?.totalQuestions || 0 },
            { label: 'Overall Accuracy', value: `${overview?.overallAccuracy || 0}%` },
            { label: 'Concepts Mastered', value: overview?.masteredConcepts?.length || 0 },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Subject cards */}
        <h2 className="mb-4 text-lg font-semibold text-gray-200">Subjects</h2>
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {Object.entries(SUBJECT_CONFIG).map(([key, cfg]) => {
            const stats = overview?.subjectBreakdown?.[key] || {};
            return (
              <div
                key={key}
                className={`rounded-xl border border-gray-800 bg-gray-900/50 p-5 border-l-4 ${cfg.border}`}
              >
                <h3 className={`text-lg font-semibold ${cfg.accent}`}>{cfg.label}</h3>
                <div className="mt-3 flex items-center gap-6 text-sm text-gray-400">
                  <span>Accuracy: <span className="text-white">{stats.accuracy || 0}%</span></span>
                  <span>Sessions: <span className="text-white">{stats.sessions || 0}</span></span>
                </div>
                <button
                  onClick={() => setModalSubject(key)}
                  className={`mt-4 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${cfg.bg} ${cfg.accent} hover:brightness-125`}
                >
                  Start Session
                </button>
              </div>
            );
          })}
        </div>

        {/* Accuracy chart */}
        {chartData.length > 1 && (
          <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-200">Accuracy Trend</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="index" stroke="#6b7280" tick={{ fontSize: 12 }} label={{ value: 'Session', position: 'insideBottom', offset: -5, fill: '#6b7280' }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} domain={[0, 100]} label={{ value: '%', position: 'insideLeft', fill: '#6b7280' }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
                <Line type="monotone" dataKey="accuracy" stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent sessions */}
        {overview?.recentSessions?.length > 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-200">Recent Sessions</h2>
            <div className="space-y-3">
              {overview.recentSessions.map((s) => (
                <div
                  key={s.sessionId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-800 bg-gray-900/30 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${SUBJECT_CONFIG[s.subject]?.accent || 'text-gray-300'}`}>
                      {SUBJECT_CONFIG[s.subject]?.label || s.subject}
                    </span>
                    <span className="text-xs text-gray-600">
                      {new Date(s.startedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{s.totalQuestions} Q</span>
                    <span>
                      {s.totalQuestions > 0
                        ? Math.round((s.correctAnswers / s.totalQuestions) * 100)
                        : 0}
                      % accuracy
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Concept selector modal */}
      {modalSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Choose a concept — {SUBJECT_CONFIG[modalSubject]?.label}
              </h3>
              <button
                onClick={() => setModalSubject(null)}
                className="text-gray-500 hover:text-gray-300 text-xl leading-none"
              >
                x
              </button>
            </div>
            <div className="space-y-2">
              {CONCEPTS[modalSubject]?.map((concept) => (
                <button
                  key={concept}
                  disabled={startingSession}
                  onClick={() => handleStartSession(modalSubject, concept)}
                  className={`w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-left text-sm font-medium text-gray-300 transition-colors hover:border-indigo-500/50 hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {concept}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
