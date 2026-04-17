/* eslint react-refresh/only-export-components: "off" */
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { api } from '../api/axios';
import { setAuth, clearAuth, getUser, isAuthed } from '../auth/auth';
import { getCanonicalRole, normalizeRoleName } from '../auth/roles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      if (isAuthed()) {
        const storedUser = getUser();
        setUser(storedUser);
        try {
          const response = await api.get('/me');
          setUser(response.data);
          setAuth(localStorage.getItem('token'), response.data);
        } catch (err) {
          console.error('Failed to fetch user:', err);
          clearAuth();
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const canonicalRole = useMemo(() => getCanonicalRole(user), [user]);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/login', { email, password });
      
      if (response.data.requires_verification) {
        return { requiresVerification: true, email };
      }
      
      const { token, user: userData } = response.data;
      setAuth(token, userData);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      throw new Error(message);
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      setError(null);
      const response = await api.post('/verify-otp', { email, otp });
      const { token, user: userData } = response.data;
      setAuth(token, userData);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Verification failed.';
      setError(message);
      throw new Error(message);
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await api.post('/register', userData);
      return { success: true, message: response.data.message };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed.';
      setError(message);
      throw new Error(message);
    }
  };

  const verifyEmail = async (token) => {
    try {
      setError(null);
      await api.post('/verify-email', { token });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Email verification failed.';
      setError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearAuth();
      setUser(null);
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await api.put('/profile/update', data);
      setUser(response.data);
      setAuth(localStorage.getItem('token'), response.data);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Profile update failed.';
      throw new Error(message);
    }
  };

  const updatePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
      await api.put('/profile/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Password update failed.';
      throw new Error(message);
    }
  };

  const hasRole = (role) => {
    const current = getCanonicalRole(user);
    if (!current) return false;
    if (Array.isArray(role)) {
      return role.some((r) => normalizeRoleName(r) === current);
    }
    return normalizeRoleName(role) === current;
  };

  const isAdmin = () => canonicalRole === 'admin';
  const isProfessor = () => canonicalRole === 'enseignant';
  const isStudent = () => canonicalRole === 'etudiant';

  const value = {
    user,
    canonicalRole,
    loading,
    error,
    login,
    verifyOtp,
    register,
    verifyEmail,
    logout,
    updateProfile,
    updatePassword,
    hasRole,
    isAdmin,
    isProfessor,
    isStudent,
  };

  return (
    <AuthContext.Provider value={value}>
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
