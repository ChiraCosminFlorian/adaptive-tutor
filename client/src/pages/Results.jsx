import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProgress } from '../hooks/useProgress';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts';

const SUBJECT_LABELS = {
  mathematics: 'Mathematics',
  algorithms: 'Algorithms',
  oop: 'OOP',
  databases: 'Databases',
};

function plColor(pL) {
  if (pL > 0.95) return 'bg-emerald-500';
  if (pL >= 0.6) return 'bg-blue-500';
  if (pL >= 0.3) return 'bg-orange-500';
  return 'bg-red-500';
}

function Results() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { getSessionDetail } = useProgress();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await getSessionDetail(sessionId);
        setData(res.data);
      } catch {
        toast.error('Failed to load results');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <p className="text-gray-500">Session not found</p>
      </div>
    );
  }

  const { session, answers, conceptProgress } = data;
  const accuracy =
    session.totalQuestions > 0
      ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
      : 0;

  const duration = session.endedAt
    ? Math.round((new Date(session.endedAt) - new Date(session.startedAt)) / 1000)
    : 0;
  const durationMin = Math.floor(duration / 60);
  const durationSec = duration % 60;

  const chartData = answers.map((a, i) => ({
    question: i + 1,
    difficulty: a.difficulty,
    isCorrect: a.isCorrect,
  }));

  const weakConcepts = (conceptProgress || []).filter((c) => c.pL < 0.4);

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Session Results</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300">
              {SUBJECT_LABELS[session.subject] || session.subject}
            </span>
            <span>{new Date(session.startedAt).toLocaleDateString()}</span>
            {duration > 0 && <span>{durationMin}m {durationSec}s</span>}
          </div>
        </div>

        {/* Score card */}
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 p-6 text-center">
          <p className="text-5xl font-extrabold text-white">{accuracy}%</p>
          <p className="mt-1 text-sm text-gray-500">
            {session.correctAnswers} / {session.totalQuestions} correct
          </p>
          <div className="mx-auto mt-4 h-2 w-full max-w-xs rounded-full bg-gray-800">
            <div
              className={`h-2 rounded-full transition-all ${accuracy >= 80 ? 'bg-emerald-500' : accuracy >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>

        {/* BKT summary */}
        {conceptProgress?.length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-200">Concept Mastery</h2>
            <div className="space-y-3">
              {conceptProgress.map((cp) => (
                <div key={cp.concept} className="flex items-center gap-4">
                  <span className="w-32 text-sm text-gray-400 truncate" title={cp.concept}>
                    {cp.concept}
                  </span>
                  <div className="flex-1">
                    <div className="h-2 w-full rounded-full bg-gray-800">
                      <div
                        className={`h-2 rounded-full transition-all ${plColor(cp.pL)}`}
                        style={{ width: `${Math.round(cp.pL * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right text-sm font-medium text-gray-300">
                    {Math.round(cp.pL * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Difficulty chart */}
        {chartData.length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-200">Difficulty Progression</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="question" stroke="#6b7280" tick={{ fontSize: 12 }} label={{ value: 'Question', position: 'insideBottom', offset: -5, fill: '#6b7280' }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} label={{ value: 'Difficulty', position: 'insideLeft', fill: '#6b7280' }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
                <Bar dataKey="difficulty" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.isCorrect ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Answers list */}
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-200">Answers</h2>
          <div className="space-y-2">
            {answers.map((a, i) => (
              <div key={a._id || i} className="rounded-lg border border-gray-800 bg-gray-900/30">
                <button
                  onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${a.isCorrect ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-gray-300">Q{i + 1}</span>
                    <span className="text-xs text-gray-600">{a.concept}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{a.score}/100</span>
                    <svg
                      className={`h-4 w-4 text-gray-600 transition-transform ${expandedIdx === i ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandedIdx === i && (
                  <div className="border-t border-gray-800 px-4 py-4 space-y-3">
                    <div>
                      <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Question</h4>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{a.questionText}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Your Answer</h4>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{a.userAnswer}</p>
                    </div>
                    {a.aiFeedback && (
                      <div>
                        <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Feedback</h4>
                        <p className="text-sm text-gray-400">{a.aiFeedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Weak areas */}
        {weakConcepts.length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-200">Weak Areas</h2>
            <div className="space-y-2">
              {weakConcepts.map((c) => (
                <div key={c.concept} className="rounded-lg border-l-4 border-l-red-500 border border-gray-800 bg-gray-900/30 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">{c.concept}</span>
                    <span className="text-sm text-red-400">{Math.round(c.pL * 100)}% mastery</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => navigate(`/quiz/${session.subject}`, { replace: true })}
            className="flex-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-800"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default Results;
