import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach JWT from localStorage on every request
apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('auth-storage');
    const token = raw ? JSON.parse(raw)?.state?.token : null;
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
  } catch { /* ignore */ }
  return config;
});

// Redirect to /login on 401
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default apiClient;
