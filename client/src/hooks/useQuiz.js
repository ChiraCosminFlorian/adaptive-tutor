import { useCallback } from 'react';
import axios from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

export function useQuiz() {
  const { accessToken } = useAuth();

  const headers = useCallback(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken]
  );

  const startSession = useCallback(
    async (subject, concept) => {
      const res = await axios.post(
        '/quiz/start',
        { subject, concept },
        { headers: headers() }
      );
      return res.data;
    },
    [headers]
  );

  const submitAnswer = useCallback(
    async (sessionId, answerData) => {
      const res = await axios.post(
        '/quiz/answer',
        { sessionId, ...answerData },
        { headers: headers() }
      );
      return res.data;
    },
    [headers]
  );

  const getHint = useCallback(
    async (question, concept, subject) => {
      const res = await axios.post(
        '/quiz/hint',
        { question, concept, subject },
        { headers: headers() }
      );
      return res.data;
    },
    [headers]
  );

  const endSession = useCallback(
    async (sessionId) => {
      const res = await axios.post(
        '/quiz/end',
        { sessionId },
        { headers: headers() }
      );
      return res.data;
    },
    [headers]
  );

  return { startSession, submitAnswer, getHint, endSession };
}
