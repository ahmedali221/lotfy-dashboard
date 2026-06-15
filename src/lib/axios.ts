import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('adminToken');
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
