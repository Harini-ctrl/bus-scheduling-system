import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — add token to every request ──
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — handle errors globally ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Request failed';

    // Token expired or invalid — force logout
    if (error.response?.status === 401) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.replace('/login');
}

    console.error('[API Error]', message);
    return Promise.reject(error);
  }
);

export default api;