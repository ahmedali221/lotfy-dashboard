import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://165.227.137.145:8080';

const userApi = axios.create({
  baseURL: BASE_URL,
});

userApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('userToken');
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
        const refresh = localStorage.getItem('userRefresh');
        if (refresh) {
          try {
            const { data } = await axios.post(`${BASE_URL}/api/auth/refresh/`, { refresh });
            localStorage.setItem('userToken', data.access);
            document.cookie = `userToken=${data.access}; path=/`;
            original.headers.Authorization = `Bearer ${data.access}`;
            return userApi(original);
          } catch {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userRefresh');
            localStorage.removeItem('userInfo');
            document.cookie = 'userToken=; path=/; max-age=0';
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default userApi;
