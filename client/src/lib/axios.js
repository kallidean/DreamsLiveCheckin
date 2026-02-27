import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://dreamslivecheckin-production.up.railway.app',
  withCredentials: true,
});

// Attach access token from localStorage as Authorization header on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const SKIP_REFRESH_URLS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/register'];

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
        const refreshToken = localStorage.getItem('refreshToken');
        const res = await api.post('/api/auth/refresh', { refreshToken });
        localStorage.setItem('accessToken', res.data.accessToken);
        processQueue(null);
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
