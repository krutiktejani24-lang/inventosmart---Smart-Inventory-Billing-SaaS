import axios from 'axios';
import useAuthStore from '../store/authStore';

/**
 * Axios instance — base URL .env thi, JWT auto-attach, 401 pe auto logout
 */
const api = axios.create({
  baseURL: "https://inventosmart-smart-inventory-billing-saas.onrender.com/api",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Request interceptor — har request ma JWT token lagavo */
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/** Response interceptor — 401 aave to auto logout */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
