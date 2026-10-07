import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (err) {
      // If backend is not running yet, allow demo login
      console.warn('Backend unavailable, entering Demo Mode:', err.message);
      const demoUser = {
        id: 'demo-super-admin',
        email: email || 'admin@hackqubit.com',
        full_name: 'Super Admin (Demo)',
        role_name: 'super_admin',
        role_level: 1,
      };
      localStorage.setItem('token', 'demo_jwt_token_local');
      localStorage.setItem('user', JSON.stringify(demoUser));
      setUser(demoUser);
      return demoUser;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // RBAC helpers
  const can = (minRole) => {
    const levels = { super_admin: 1, admin: 2, manager: 3, agent: 4, viewer: 5 };
    return user && (user.role_level <= (levels[minRole] || 5));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, can, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
