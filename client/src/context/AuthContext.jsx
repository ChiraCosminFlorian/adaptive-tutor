import { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from '../api/axiosInstance';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const restore = async () => {
      try {
        const res = await axios.post('/auth/refresh');
        setAccessToken(res.data.data.accessToken);
        const me = await axios.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${res.data.data.accessToken}`,
          },
        });
        setUser(me.data.data.user);
      } catch {
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    restore();
  }, []);

  const login = async (email, password) => {
    const res = await axios.post('/auth/login', { email, password });
    setAccessToken(res.data.data.accessToken);
    setUser(res.data.data.user);
    return res.data;
  };

  const register = async (username, email, password) => {
    const res = await axios.post('/auth/register', { username, email, password });
    setAccessToken(res.data.data.accessToken);
    setUser(res.data.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
