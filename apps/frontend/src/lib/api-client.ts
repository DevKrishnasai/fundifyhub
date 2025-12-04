import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosHeaders } from 'axios';
import { BACKEND_API_CONFIG } from './urls';
import logger from './logger';

/**
 * Standard backend response envelope shape
 */
export interface BackendEnvelope<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

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

export const get = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const res = await api.get<T>(url, config);
  return res.data;
};

export const post = async <T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> => {
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

export type ApiResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError; status?: number }

/**
 * Type guard to check if a value is an AxiosError
 */
function isAxiosError(err: unknown): err is AxiosError<BackendEnvelope> {
  return (
    typeof err === 'object' &&
    err !== null &&
    'isAxiosError' in err &&
    (err as AxiosError).isAxiosError === true
  );
}

/**
 * Type guard to check if value is an object with potential error fields
 */
function isErrorPayload(
  payload: unknown
): payload is {
  message?: string;
  error?: string;
  retryAfterMs?: number;
  fieldErrors?: Record<string, string>;
  errors?: Record<string, unknown>;
} {
  return typeof payload === 'object' && payload !== null;
}

const extractError = (err: unknown): ApiError => {
  const error: ApiError = { message: 'An unexpected error occurred' }
  if (!err) return error

  if (isAxiosError(err)) {
    const resp = err.response
    if (resp && resp.data) {
      const payload = resp.data
      if (isErrorPayload(payload)) {
        error.message = payload.message || payload.error || err.message || error.message
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
      }
    } else {
      // If server responded without a JSON body, check Retry-After header
      const headers = resp?.headers
      if (headers) {
        // AxiosHeaders may be object or AxiosHeaders instance
        const ra = headers instanceof AxiosHeaders 
          ? headers.get('retry-after') 
          : (headers as Record<string, string>)['retry-after'];
        if (ra && typeof ra === 'string') {
          const seconds = Number(ra)
          if (!isNaN(seconds)) error.retryAfterMs = seconds * 1000
        }
      }
      error.message = err.message || error.message
    }
  } else if (err instanceof Error) {
    error.message = err.message
  }

  return error
}

/**
 * Type guard to check if value is a backend envelope with data
 */
function isBackendEnvelope<T>(payload: unknown): payload is BackendEnvelope<T> {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload
  );
}

export const getWithResult = async <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResult<T>> => {
  try {
    const res = await api.get<BackendEnvelope<T> | T>(url, config)
    // Some HTTP statuses (like 304 Not Modified) may be returned by intermediate caches or proxies
    // and will not include a body. Treat non-200 statuses as errors so callers get structured errors
    // instead of `undefined` payloads which can lead to empty lists/rendering bugs.
    if (res.status !== 200) {
      const err: ApiError = { message: `Unexpected response status: ${res.status} ${res.statusText}` };
      return { ok: false, error: err, status: res.status };
    }
    // Backend uses envelope: { success, message, data }
    // Unwrap automatically so callers receive the inner `data` when present.
    const payload = res.data
    const unwrapped = isBackendEnvelope<T>(payload) ? payload.data as T : payload as T
    return { ok: true, data: unwrapped }
  } catch (err) {
    const e = extractError(err)
    return { ok: false, error: e, status: isAxiosError(err) ? err.response?.status : undefined }
  }
}

export const postWithResult = async <T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<ApiResult<T>> => {
  try {
    const res = await api.post<BackendEnvelope<T> | T>(url, data, config)
    if (res.status !== 200 && res.status !== 201) {
      const err: ApiError = { message: `Unexpected response status: ${res.status} ${res.statusText}` };
      return { ok: false, error: err, status: res.status };
    }
    // Unwrap backend envelope when present so callers get the inner `data` directly.
    const payload = res.data
    const unwrapped = isBackendEnvelope<T>(payload) ? payload.data as T : payload as T
    return { ok: true, data: unwrapped }
  } catch (err) {
    const e = extractError(err)
    return { ok: false, error: e, status: isAxiosError(err) ? err.response?.status : undefined }
  }
}

export const put = async <T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> => {
  const res = await api.put<T>(url, data, config);
  return res.data;
};

export const putWithResult = async <T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<ApiResult<T>> => {
  try {
    const res = await api.put<BackendEnvelope<T> | T>(url, data, config)
    if (res.status !== 200 && res.status !== 201) {
      const err: ApiError = { message: `Unexpected response status: ${res.status} ${res.statusText}` };
      return { ok: false, error: err, status: res.status };
    }
    // Unwrap backend envelope when present
    const payload = res.data
    const unwrapped = isBackendEnvelope<T>(payload) ? payload.data as T : payload as T
    return { ok: true, data: unwrapped }
  } catch (err) {
    const e = extractError(err)
    return { ok: false, error: e, status: isAxiosError(err) ? err.response?.status : undefined }
  }
}

export const del = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const res = await api.delete<T>(url, config);
  return res.data;
};

export const deleteWithResult = async <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResult<T>> => {
  try {
    const res = await api.delete<BackendEnvelope<T> | T>(url, config)
    if (res.status !== 200 && res.status !== 204) {
      const err: ApiError = { message: `Unexpected response status: ${res.status} ${res.statusText}` };
      return { ok: false, error: err, status: res.status };
    }
    // Unwrap backend envelope when present
    const payload = res.data
    const unwrapped = isBackendEnvelope<T>(payload) ? payload.data as T : payload as T
    return { ok: true, data: unwrapped }
  } catch (err) {
    const e = extractError(err)
    return { ok: false, error: e, status: isAxiosError(err) ? err.response?.status : undefined }
  }
}

export const patch = async <T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> => {
  const res = await api.patch<T>(url, data, config);
  return res.data;
};

export const apiClient = api;
export default api;
