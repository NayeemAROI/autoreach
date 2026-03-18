import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  // Refresh access token using stored refresh token
  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        scheduleTokenRefresh(data.token);
        return true;
      }
    } catch (err) {
      console.error('Token refresh failed:', err);
    }
    return false;
  }, []);

  // Schedule refresh 1 minute before token expires
  const scheduleTokenRefresh = useCallback((accessToken) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const expiresIn = (payload.exp * 1000) - Date.now() - 60000; // 1 min before expiry
      if (expiresIn > 0) {
        refreshTimerRef.current = setTimeout(() => refreshAccessToken(), expiresIn);
      }
    } catch (e) { /* ignore parse errors */ }
  }, [refreshAccessToken]);

  // Broadcast token to extension
  useEffect(() => {
    if (token) {
      window.postMessage({ type: 'AUTOREACH_AUTH_TOKEN', token }, '*');
    }
  }, [token]);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            scheduleTokenRefresh(token);
          } else {
            // Try refresh
            const refreshed = await refreshAccessToken();
            if (refreshed) {
              const retryRes = await fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
              });
              if (retryRes.ok) {
                const data = await retryRes.json();
                setUser(data.user);
              }
            } else {
              setToken(null);
              setUser(null);
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
            }
          }
        } catch (error) {
          console.error('Failed to load user', error);
        }
      }
      setLoading(false);
    };

    loadUser();
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error('Server returned an invalid response. Please try again.');
    }

    if (!res.ok) {
      throw new Error(data.error || data.message || 'Login failed');
    }

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    scheduleTokenRefresh(data.token);
    return data;
  };

  const register = async (name, email, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error('Server returned an invalid response. Please try again.');
    }

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    return data;
  };

  const logout = () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  };

  const completeOnboarding = () => {
    if (user) {
      setUser({ ...user, has_completed_onboarding: 1 });
    }
  };

  const switchWorkspace = async (workspaceId) => {
    const res = await fetch(`/api/workspaces/${workspaceId}/switch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setUser(prev => ({ ...prev, activeWorkspaceId: workspaceId }));
      // Refresh token to include new workspace
      await refreshAccessToken();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, completeOnboarding, switchWorkspace, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};
