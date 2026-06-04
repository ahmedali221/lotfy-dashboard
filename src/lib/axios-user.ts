import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://165.227.137.145:8080';

const userApi = axios.create({
  baseURL: BASE_URL,
});

// Proactively refresh the access token if missing but a refresh token exists
userApi.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    let token = localStorage.getItem('customerToken');

    if (!token) {
      const refresh = localStorage.getItem('customerRefresh');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/api/auth/refresh/`, { refresh });
          token = data.access;
          localStorage.setItem('customerToken', data.access);
          document.cookie = `customerToken=${data.access}; path=/`;
        } catch {
          // Refresh failed — proceed without token, will 401 below
        }
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

userApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (typeof window !== 'undefined') {
        const refresh = localStorage.getItem('customerRefresh');
        if (refresh) {
          try {
            const { data } = await axios.post(`${BASE_URL}/api/auth/refresh/`, { refresh });
            localStorage.setItem('customerToken', data.access);
            document.cookie = `customerToken=${data.access}; path=/`;
            original.headers.Authorization = `Bearer ${data.access}`;
            return userApi(original);
          } catch {
            // Refresh also failed — clear everything and send to login
          }
        }
        localStorage.removeItem('customerToken');
        localStorage.removeItem('customerRefresh');
        localStorage.removeItem('customerUser');
        document.cookie = 'customerToken=; path=/; max-age=0';
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default userApi;
