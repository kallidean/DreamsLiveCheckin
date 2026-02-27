import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://dreamslivecheckin-production.up.railway.app',
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error) {
  failedQueue.forEach(prom => (error ? prom.reject(error) : prom.resolve()));
  failedQueue = [];
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(original)).catch(e => Promise.reject(e));
      }
      original._retry = true;
      isRefreshing = true;
      try {
        await api.post('/api/auth/refresh');
        processQueue(null);
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
