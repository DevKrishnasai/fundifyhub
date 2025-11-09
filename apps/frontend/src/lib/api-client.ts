import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { BACKEND_API_CONFIG } from './urls';
import logger from './logger';

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
      logger.error('API Error:', error);
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

// Standardized API result shape for callers that want structured errors
export type ApiError = {
  message?: string
  fieldErrors?: Record<string, string>
  // milliseconds until client can retry (optional)
  retryAfterMs?: number
}

export type ApiResult<T = any> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError; status?: number }

const extractError = (err: unknown): ApiError => {
  const error: ApiError = { message: 'An unexpected error occurred' }
  if (!err) return error

  if ((err as AxiosError).isAxiosError) {
    const axiosErr = err as AxiosError<any>
    const resp = axiosErr.response
    if (resp && resp.data) {
      const payload = resp.data
      // Common shapes: { message, fieldErrors } or { errors } or { error }
      error.message = payload.message || payload.error || axiosErr.message || error.message
      // backend may include retryAfterMs in the JSON body
      if (payload.retryAfterMs && typeof payload.retryAfterMs === 'number') {
        error.retryAfterMs = payload.retryAfterMs
      }
      if (payload.fieldErrors && typeof payload.fieldErrors === 'object') {
        error.fieldErrors = payload.fieldErrors
      } else if (payload.errors && typeof payload.errors === 'object') {
        // sometimes validation errors come as { field: ['msg'] }
        const fe: Record<string, string> = {}
        for (const k of Object.keys(payload.errors)) {
          const v = payload.errors[k]
          fe[k] = Array.isArray(v) ? String(v[0]) : String(v)
        }
        error.fieldErrors = fe
      }
    } else {
      // If server responded without a JSON body, check Retry-After header
      const headers = resp?.headers as Record<string, any> | undefined
      if (headers) {
        const ra = headers['retry-after'] || headers['Retry-After']
        if (ra) {
          const seconds = Number(ra)
          if (!isNaN(seconds)) error.retryAfterMs = seconds * 1000
        }
      }
      error.message = (err as Error).message || error.message
    }
  } else if (err instanceof Error) {
    error.message = err.message
  }

  return error
}

export const getWithResult = async <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResult<T>> => {
  try {
    const res = await api.get<T>(url, config)
    // Backend uses envelope: { success, message, data }
    // Unwrap automatically so callers receive the inner `data` when present.
    const payload = res.data as any
    const unwrapped = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
    return { ok: true, data: unwrapped }
  } catch (err) {
    const e = extractError(err)
    return { ok: false, error: e, status: (err as AxiosError)?.response?.status }
  }
}

export const postWithResult = async <T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<ApiResult<T>> => {
  try {
    const res = await api.post<T>(url, data, config)
    // Unwrap backend envelope when present so callers get the inner `data` directly.
    const payload = res.data as any
    const unwrapped = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
    return { ok: true, data: unwrapped }
  } catch (err) {
    const e = extractError(err)
    return { ok: false, error: e, status: (err as AxiosError)?.response?.status }
  }
}

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
