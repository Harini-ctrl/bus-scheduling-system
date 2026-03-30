import axios from 'axios';

const api = axios.create({
  baseURL: '/api',  // Vite proxy handles → localhost:5000/api
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Request failed';
    console.error('[API Error]', message);
    return Promise.reject(error);
  }
);

export default api;