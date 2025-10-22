import { clearAuthData } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

/**
 * Enhanced fetch with automatic authentication using httpOnly cookies
 */
export async function apiClient(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  // Make the request with credentials to include httpOnly cookies
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include' // This sends httpOnly cookies automatically
  });

  // Handle 401 responses (token expired - simplified approach)
  if (response.status === 401) {
    // In simplified approach, redirect to login immediately
    clearAuthData();
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    throw new Error('Authentication required - please login again');
  }

  return response;
}

/**
 * GET request with authentication
 */
export async function apiGet(endpoint: string): Promise<any> {
  const response = await apiClient(endpoint, { method: 'GET' });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * POST request with authentication
 */
export async function apiPost(endpoint: string, data?: any): Promise<any> {
  const response = await apiClient(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * PUT request with authentication
 */
export async function apiPut(endpoint: string, data?: any): Promise<any> {
  const response = await apiClient(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * DELETE request with authentication
 */
export async function apiDelete(endpoint: string): Promise<any> {
  const response = await apiClient(endpoint, { method: 'DELETE' });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Upload file with authentication using httpOnly cookies
 */
export async function apiUpload(endpoint: string, formData: FormData): Promise<any> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include' // Include httpOnly cookies for authentication
  });

  // Handle 401 responses (token expired - simplified approach)  
  if (response.status === 401) {
    // In simplified approach, redirect to login immediately
    clearAuthData();
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    throw new Error('Authentication required - please login again');
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}