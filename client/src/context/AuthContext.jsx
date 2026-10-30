import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('rms_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('rms_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [dbStatus, setDbStatus] = useState({ checked: false, connected: true, message: '' });

  // Check health and db connectivity on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.database) {
          setDbStatus({
            checked: true,
            connected: data.database.connected,
            message: data.database.message || '',
            suggestion: data.database.suggestion || ''
          });
        }
      })
      .catch(() => {
        setDbStatus({
          checked: true,
          connected: false,
          message: 'Backend API unreachable or offline.'
        });
      });
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Login failed.');
    }

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('rms_token', data.token);
    localStorage.setItem('rms_user', JSON.stringify(data.user));
    return data.user;
  };

  const register = async (userData) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Registration failed.');
    }

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('rms_token', data.token);
    localStorage.setItem('rms_user', JSON.stringify(data.user));
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('rms_token');
    localStorage.removeItem('rms_user');
  };

  const authFetch = (url, options = {}) => {
    const headers = {
      ...(options.headers || {}),
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAdmin: user?.role === 'ADMIN',
        dbStatus,
        login,
        register,
        logout,
        authFetch
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
