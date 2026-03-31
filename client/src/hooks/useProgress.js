import { useCallback } from 'react';
import axios from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

export function useProgress() {
  const { accessToken } = useAuth();

  const headers = useCallback(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken]
  );

  const getOverview = useCallback(async () => {
    const res = await axios.get('/progress/overview', { headers: headers() });
    return res.data;
  }, [headers]);

  const getSessionDetail = useCallback(
    async (sessionId) => {
      const res = await axios.get(`/progress/session/${sessionId}`, {
        headers: headers(),
      });
      return res.data;
    },
    [headers]
  );

  const getWeakAreas = useCallback(async () => {
    const res = await axios.get('/progress/weak-areas', { headers: headers() });
    return res.data;
  }, [headers]);

  return { getOverview, getSessionDetail, getWeakAreas };
}
