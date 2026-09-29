import axios from 'axios';

/**
 * Base API client with interceptors for authentication and error handling
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor: Attach JWT token from localStorage
apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('auth-storage');
    const token = raw ? JSON.parse(raw)?.state?.token : null;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('[API] Token attached to request');
    }
  } catch (err) {
    console.error('[API] Error reading token:', err);
  }
  console.log('[API] Request:', config.method?.toUpperCase(), config.url);
  return config;
});

// Response interceptor: Handle errors and 401 unauthorized
apiClient.interceptors.response.use(
  (res) => {
    console.log('[API] Response:', res.status, res.config.url);
    return res;
  },
  (err) => {
    console.error('[API] Error:', err.response?.status, err.config?.url, err.response?.data);
    
    // Handle 401 Unauthorized
    if (err.response?.status === 401) {
      console.log('[API] Unauthorized - clearing auth and redirecting to login');
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    
    return Promise.reject(err);
  }
);

export default apiClient;
