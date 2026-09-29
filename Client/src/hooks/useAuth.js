import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authService } from '../api';

/**
 * Authentication Hook
 * 
 * Provides authentication operations and state.
 * Bridges the UI layer with the state and API layers.
 * 
 * @returns {Object} Authentication state and actions
 */
export const useAuth = () => {
  const navigate = useNavigate();
  const { user, token, isAuthenticated, setAuth, logout: logoutStore, updateUser } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Sign up a new user
   * @param {Object} credentials - Signup credentials
   * @param {string} credentials.name - User's full name
   * @param {string} credentials.email - User's email
   * @param {string} credentials.password - User's password
   */
  const signup = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[useAuth] Signing up...');
      const { user, token } = await authService.signup(credentials);
      setAuth(user, token);
      console.log('[useAuth] Signup successful');
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Signup failed';
      console.error('[useAuth] Signup error:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [setAuth]);

  /**
   * Log in an existing user
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - User's email
   * @param {string} credentials.password - User's password
   */
  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[useAuth] Logging in...');
      const { user, token } = await authService.login(credentials);
      setAuth(user, token);
      console.log('[useAuth] Login successful');
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      console.error('[useAuth] Login error:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [setAuth]);

  /**
   * Log out the current user
   */
  const logout = useCallback(() => {
    console.log('[useAuth] Logging out...');
    logoutStore();
    authService.logout();
    navigate('/login', { replace: true });
  }, [logoutStore, navigate]);

  /**
   * Refresh current user data from server
   */
  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      console.log('[useAuth] Refreshing user data...');
      const { user } = await authService.getCurrentUser();
      updateUser(user);
      console.log('[useAuth] User data refreshed');
    } catch (err) {
      console.error('[useAuth] Refresh error:', err);
      // Don't update error state for background refresh
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, updateUser]);

  return {
    // State
    user,
    token,
    isAuthenticated,
    loading,
    error,
    
    // Actions
    signup,
    login,
    logout,
    refreshUser,
    clearError: () => setError(null),
  };
};
