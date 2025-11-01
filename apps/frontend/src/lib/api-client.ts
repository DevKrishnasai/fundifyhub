import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { BACKEND_API_CONFIG } from './urls';

/**
 * Axios API client
 * - Uses BACKEND_API_CONFIG.BASE_URL as baseURL
 * - Sends cookies by default (withCredentials: true)
 * - Exposes helper methods that return response.data directly
 */

const createApiClient = (): AxiosInstance => {
  const baseURL = BACKEND_API_CONFIG.BASE_URL;

  const instance = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    }
  });

  // Optional: add response interceptor to centralize error handling
  instance.interceptors.response.use(
    (resp) => resp,
    (error) => {
      console.error('API Error:', error);
      return Promise.reject(error);
    }
  );

  return instance;
};

export const api = createApiClient();

export const get = async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const res = await api.get<T>(url, config);
  return res.data;
};

export const post = async <T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> => {
  const res = await api.post<T>(url, data, config);
  return res.data;
};

export const put = async <T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> => {
  const res = await api.put<T>(url, data, config);
  return res.data;
};

export const del = async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const res = await api.delete<T>(url, config);
  return res.data;
};

export const patch = async <T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> => {
  const res = await api.patch<T>(url, data, config);
  return res.data;
};

export default api;
