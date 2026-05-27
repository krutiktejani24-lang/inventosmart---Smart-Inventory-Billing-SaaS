import axios from 'axios';
import usePortalStore from '../store/portalStore';

const portalApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/portal`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

portalApi.interceptors.request.use((config) => {
  const token = usePortalStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

portalApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) usePortalStore.getState().logout();
    return Promise.reject(err);
  }
);

export default portalApi;