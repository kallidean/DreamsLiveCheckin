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

const SKIP_REFRESH_URLS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/register'];

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    const skipRefresh = SKIP_REFRESH_URLS.some(url => original.url?.includes(url));
    if (err.response?.status === 401 && !original._retry && !skipRefresh) {
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
