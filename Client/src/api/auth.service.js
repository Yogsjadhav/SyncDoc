import apiClient from './client';

/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */

/**
 * Sign up a new user
 * @param {Object} credentials - User signup data
 * @param {string} credentials.name - User's full name
 * @param {string} credentials.email - User's email address
 * @param {string} credentials.password - User's password
 * @returns {Promise<{token: string, user: Object}>}
 */
export const signup = async (credentials) => {
  console.log('[Auth Service] Signup request:', { name: credentials.name, email: credentials.email });
  const response = await apiClient.post('/api/auth/signup', credentials);
  console.log('[Auth Service] Signup success');
  return response.data;
};

/**
 * Log in an existing user
 * @param {Object} credentials - User login data
 * @param {string} credentials.email - User's email address
 * @param {string} credentials.password - User's password
 * @returns {Promise<{token: string, user: Object}>}
 */
export const login = async (credentials) => {
  console.log('[Auth Service] Login request:', { email: credentials.email });
  const response = await apiClient.post('/api/auth/login', credentials);
  console.log('[Auth Service] Login success');
  return response.data;
};

/**
 * Get current authenticated user
 * @returns {Promise<{user: Object}>}
 */
export const getCurrentUser = async () => {
  console.log('[Auth Service] Get current user');
  const response = await apiClient.get('/api/auth/me');
  return response.data;
};

/**
 * Log out user (client-side only)
 * Clears local storage and redirects
 */
export const logout = () => {
  console.log('[Auth Service] Logout');
  localStorage.removeItem('auth-storage');
  window.location.href = '/login';
};
