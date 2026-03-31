import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuiz } from '../hooks/useQuiz';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const SUBJECT_LABELS = {
  mathematics: 'Mathematics',
  algorithms: 'Algorithms',
  oop: 'OOP',
  databases: 'Databases',
};

function getPlaceholder(subject) {
  if (subject === 'algorithms' || subject === 'oop') return '// Write your C# code here...';
  if (subject === 'databases') return '-- Write your SQL query here...';
  return 'Type your answer here...';
}

function plColor(pL) {
  if (pL > 0.95) return 'bg-emerald-500';
  if (pL >= 0.6) return 'bg-blue-500';
  if (pL >= 0.3) return 'bg-orange-500';
  return 'bg-red-500';
}

function plBadgeColor(level) {
  if (level === 'mastered') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  if (level === 'proficient') return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
  if (level === 'learning') return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
  return 'text-red-400 border-red-500/30 bg-red-500/10';
}

function DifficultySquares({ level }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className={`h-3 w-3 rounded-sm ${n <= level ? 'bg-indigo-500' : 'bg-gray-700'}`}
        />
      ))}
    </div>
  );
}

function Quiz() {
  const { subject } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { submitAnswer, getHint, endSession } = useQuiz();

  const state = location.state || {};
  const sessionIdRef = useRef(state.sessionId);

  const [currentQuestion, setCurrentQuestion] = useState(state.firstQuestion || '');
  const [currentDifficulty, setCurrentDifficulty] = useState(state.difficulty || 1);
  const [currentAnswerType, setCurrentAnswerType] = useState(state.answerType || 'text');
  const [currentOptions, setCurrentOptions] = useState(state.options || null);
  const [currentCorrectOption, setCurrentCorrectOption] = useState(state.correctOption ?? null);
  const [currentConcept, setCurrentConcept] = useState(state.conceptTested || '');
  const [questionNumber, setQuestionNumber] = useState(1);
  const [timer, setTimer] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState(null);
  const [currentPL, setCurrentPL] = useState(state.pL || 0.1);
  const [prevPL, setPrevPL] = useState(state.pL || 0.1);
  const [currentKnowledgeLevel, setCurrentKnowledgeLevel] = useState(state.knowledgeLevel || 'beginner');
  const [hint, setHint] = useState(state.hint || '');
  const [showHint, setShowHint] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [nextQuestionData, setNextQuestionData] = useState(null);
  const [isEnded, setIsEnded] = useState(false);
  const [sessionStats, setSessionStats] = useState(null);

  const timerRef = useRef(null);
  const endedRef = useRef(false);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (sessionIdRef.current && !endedRef.current) {
        endedRef.current = true;
        endSession(sessionIdRef.current).catch(() => {});
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect if no session state
  useEffect(() => {
    if (!state.sessionId) {
      navigate('/dashboard', { replace: true });
    }
  }, [state.sessionId, navigate]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  async function handleSubmit() {
    const userAnswer =
      currentAnswerType === 'multiple_choice'
        ? String(selectedOption)
        : textAnswer;

    if (!userAnswer && userAnswer !== '0') return;

    setIsSubmitting(true);
    try {
      const res = await submitAnswer(sessionIdRef.current, {
        questionText: currentQuestion,
        userAnswer,
        answerType: currentAnswerType,
        correctOption: currentCorrectOption,
        concept: currentConcept,
        timeSpentSeconds: timer,
      });

      const d = res.data;
      setLastEvaluation(d.evaluation);
      setPrevPL(currentPL);
      setCurrentPL(d.bkt.pL);
      setCurrentKnowledgeLevel(d.bkt.knowledgeLevel);
      setSessionStats(d.sessionStats);
      setShowFeedback(true);
      clearInterval(timerRef.current);

      if (d.endSession) {
        setIsEnded(true);
        endedRef.current = true;
        await endSession(sessionIdRef.current).catch(() => {});
      } else {
        setNextQuestionData({
          question: d.nextQuestion,
          difficulty: d.nextDifficulty,
          answerType: d.nextAnswerType,
          options: d.nextOptions,
        });
      }
    } catch {
      toast.error('Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNext() {
    if (!nextQuestionData) return;
    setCurrentQuestion(nextQuestionData.question);
    setCurrentDifficulty(nextQuestionData.difficulty);
    setCurrentAnswerType(nextQuestionData.answerType);
    setCurrentOptions(nextQuestionData.options);
    setCurrentCorrectOption(null);
    setQuestionNumber((n) => n + 1);
    setTimer(0);
    setSelectedOption(null);
    setTextAnswer('');
    setShowFeedback(false);
    setLastEvaluation(null);
    setShowHint(false);
    setHint('');
    setNextQuestionData(null);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  }

  async function handleGetHint() {
    setHintLoading(true);
    try {
      const res = await getHint(currentQuestion, currentConcept, subject);
      setHint(res.data.hint);
      setShowHint(true);
    } catch {
      toast.error('Failed to get hint');
    } finally {
      setHintLoading(false);
    }
  }

  const canSubmit =
    currentAnswerType === 'multiple_choice'
      ? selectedOption !== null
      : textAnswer.trim().length >= 3;

  if (!state.sessionId) return null;

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Top bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300">
              {SUBJECT_LABELS[subject] || subject}
            </span>
            <span className="text-sm font-medium text-gray-400">
              Question {questionNumber}/10
            </span>
          </div>
          <span className="font-mono text-sm text-gray-500">{formatTime(timer)}</span>
        </div>

        {/* Progress bar */}
        <div className="mb-6 h-1.5 w-full rounded-full bg-gray-800">
          <div
            className="h-1.5 rounded-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${(questionNumber / 10) * 100}%` }}
          />
        </div>

        {/* BKT indicator */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3">
          <span className="text-xs font-medium text-gray-500">Knowledge estimate:</span>
          <div className="flex-1 min-w-[100px]">
            <div className="h-2 w-full rounded-full bg-gray-800">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${plColor(currentPL)}`}
                style={{ width: `${Math.round(currentPL * 100)}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-medium text-gray-400">{Math.round(currentPL * 100)}%</span>
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${plBadgeColor(currentKnowledgeLevel)}`}>
            {currentKnowledgeLevel}
          </span>
        </div>

        {/* Difficulty */}
        <div className="mb-6 flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500">Difficulty:</span>
          <DifficultySquares level={currentDifficulty} />
        </div>

        {/* Question card */}
        {!showFeedback ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
            <p className="mb-6 text-base leading-relaxed text-gray-200 whitespace-pre-wrap">
              {currentQuestion}
            </p>

            {/* Multiple choice */}
            {currentAnswerType === 'multiple_choice' && currentOptions && (
              <div className="space-y-3">
                {currentOptions.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedOption(i)}
                    className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                      selectedOption === i
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : 'border-gray-700 bg-gray-800/30 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <span className="mr-2 font-medium text-gray-500">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Text answer */}
            {currentAnswerType === 'text' && (
              <textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Type your answer here..."
              />
            )}

            {/* Code answer */}
            {currentAnswerType === 'code' && (
              <textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                rows={8}
                className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 font-mono text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder={getPlaceholder(subject)}
              />
            )}

            {/* Hint */}
            <div className="mt-4">
              <button
                onClick={handleGetHint}
                disabled={hintLoading || showHint}
                className="text-xs font-medium text-gray-500 hover:text-indigo-400 transition-colors disabled:opacity-50"
              >
                {hintLoading ? 'Loading...' : showHint ? 'Hint shown below' : 'Get Hint'}
              </button>
              {showHint && hint && (
                <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
                  {hint}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="mt-6 w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-xl hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : 'Submit Answer'}
            </button>
          </div>
        ) : (
          /* Feedback panel */
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
            {/* Header */}
            <div className={`px-6 py-4 ${lastEvaluation?.isCorrect ? 'bg-emerald-500/10 border-b border-emerald-500/20' : 'bg-red-500/10 border-b border-red-500/20'}`}>
              <h3 className={`text-lg font-bold ${lastEvaluation?.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                {lastEvaluation?.isCorrect ? 'Correct' : 'Incorrect'}
              </h3>
            </div>

            <div className="p-6 space-y-5">
              {/* Score bar */}
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Score</span>
                  <span className="font-medium text-white">{lastEvaluation?.score}/100</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-800">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${lastEvaluation?.isCorrect ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${lastEvaluation?.score || 0}%` }}
                  />
                </div>
              </div>

              {/* Feedback */}
              <div>
                <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Feedback</h4>
                <p className="text-sm leading-relaxed text-gray-300">{lastEvaluation?.feedback}</p>
              </div>

              {/* Explanation */}
              <div>
                <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Explanation</h4>
                <p className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">{lastEvaluation?.explanation}</p>
              </div>

              {/* Encouragement */}
              <p className="text-sm font-medium text-indigo-400">{lastEvaluation?.encouragement}</p>

              {/* BKT update */}
              <div className="rounded-lg border border-gray-700 bg-gray-800/30 px-4 py-3">
                <span className="text-xs text-gray-500">Knowledge updated: </span>
                <span className="text-sm font-medium text-white">
                  {Math.round(prevPL * 100)}% → {Math.round(currentPL * 100)}%
                </span>
              </div>

              {/* Session stats */}
              {sessionStats && (
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{sessionStats.totalQuestions} questions</span>
                  <span>{sessionStats.correctAnswers} correct</span>
                  <span>{sessionStats.accuracy}% accuracy</span>
                </div>
              )}

              {/* Next / Results button */}
              {isEnded ? (
                <button
                  onClick={() => navigate(`/results/${sessionIdRef.current}`)}
                  className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110"
                >
                  View Results
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110"
                >
                  Next Question
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Quiz;
