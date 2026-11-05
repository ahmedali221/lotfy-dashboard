import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: BASE_URL,
});

// Seconds left before a JWT expires (-Infinity when it cannot be read).
function secondsLeft(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp - Date.now() / 1000;
  } catch {
    return -Infinity;
  }
}

// Product reads accept an expired token and answer with the public view (active
// products only) instead of 401, so the token must be refreshed before it is sent.
let refreshing: Promise<string | null> | null = null;
function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem('adminRefresh');
  if (!refresh) return Promise.resolve(null);
  refreshing ??= axios
    .post(`${BASE_URL}/api/auth/refresh/`, { refresh })
    .then(({ data }) => {
      localStorage.setItem('adminToken', data.access);
      document.cookie = `adminToken=${data.access}; path=/`;
      return data.access as string;
    })
    .catch(() => null)
    .finally(() => { refreshing = null; });
  return refreshing;
}

api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    let token = localStorage.getItem('adminToken');
    if (token && secondsLeft(token) < 30) {
      token = (await refreshAccessToken()) ?? token;
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (typeof window !== 'undefined') {
        const refresh = localStorage.getItem('adminRefresh');
        if (refresh) {
          try {
            const { data } = await axios.post(`${BASE_URL}/api/auth/refresh/`, { refresh });
            localStorage.setItem('adminToken', data.access);
            document.cookie = `adminToken=${data.access}; path=/`;
            original.headers.Authorization = `Bearer ${data.access}`;
            return api(original);
          } catch {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminRefresh');
            localStorage.removeItem('adminUser');
            document.cookie = 'adminToken=; path=/; max-age=0';
            window.location.href = '/admin/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
