/**
 * JWT Client-side utilities for authentication
 * Handles JWT decoding and validation without API calls
 */

interface JWTPayload {
  id: string;
  userId: string; // backward compatibility
  email: string;
  roles: string[]; // Changed from role to roles array
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  iat: number; // issued at
  exp: number; // expires at
}

interface UserData {
  id: string;
  email: string;
  roles: string[]; // Changed from role to roles array
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

/**
 * Decode JWT token without verification (client-side only)
 * NOTE: This is for UI purposes only, server still validates tokens
 */
function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode the payload (base64url)
    const payload = parts[1];
    // Add padding if needed
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Replace URL-safe characters
    const base64 = paddedPayload.replace(/-/g, '+').replace(/_/g, '/');
    
    const decoded = JSON.parse(atob(base64));
    return decoded as JWTPayload;
  } catch (error) {
    console.warn('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
function isTokenExpired(payload: JWTPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * Check if JWT token expires soon (within 5 minutes)
 */
function isTokenExpiringSoon(payload: JWTPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  const fiveMinutes = 5 * 60;
  return (payload.exp - now) < fiveMinutes;
}

/**
 * Get access token from document cookies (client-side only)
 */
function getAccessTokenFromCookies(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(cookie => 
      cookie.trim().startsWith('accessToken=')
    );
    
    if (!tokenCookie) return null;
    
    const token = tokenCookie.split('=')[1];
    return token ? decodeURIComponent(token) : null;
  } catch (error) {
    console.warn('Failed to get token from cookies:', error);
    return null;
  }
}

/**
 * Get decoded JWT data with expiration info
 */
export function getTokenData(): { 
  payload: JWTPayload; 
  isExpired: boolean; 
  isExpiringSoon: boolean;
  token: string;
} | null {
  try {
    const token = getAccessTokenFromCookies();
    if (!token) return null;

    const payload = decodeJWTPayload(token);
    if (!payload) return null;

    const isExpired = isTokenExpired(payload);
    const isExpiringSoon = isTokenExpiringSoon(payload);
    
    return { payload, isExpired, isExpiringSoon, token };
  } catch (error) {
    console.warn('Failed to get token data:', error);
    return null;
  }
}

/**
 * Check if user is authenticated (has valid, non-expired token)
 */
export function isAuthenticated(): boolean {
  const tokenData = getTokenData();
  return tokenData !== null && !tokenData.isExpired;
}

/**
 * Get current user data from JWT token
 */
export function getCurrentUserFromToken(): UserData | null {
  const tokenData = getTokenData();
  if (!tokenData || tokenData.isExpired) return null;
  
  return {
    id: tokenData.payload.id,
    email: tokenData.payload.email,
    roles: tokenData.payload.roles,
    firstName: tokenData.payload.firstName,
    lastName: tokenData.payload.lastName,
    emailVerified: tokenData.payload.emailVerified,
    phoneVerified: tokenData.payload.phoneVerified
  };
}

/**
 * Check if user has required role (client-side validation)
 * Checks if user has ANY of the required roles
 */
export function hasRole(requiredRoles: string | string[]): boolean {
  const tokenData = getTokenData();
  if (!tokenData || tokenData.isExpired) return false;
  
  const userRoles = tokenData.payload.roles.map(r => r.toLowerCase());
  const rolesToCheck = Array.isArray(requiredRoles) 
    ? requiredRoles.map(r => r.toLowerCase()) 
    : [requiredRoles.toLowerCase()];
  
  // Check if user has ANY of the required roles
  return rolesToCheck.some(role => userRoles.includes(role));
}

/**
 * Check if user has admin role
 */
export function isAdmin(): boolean {
  return hasRole(['admin', 'super_admin']);
}

/**
 * Check if user has agent role
 */
export function isAgent(): boolean {
  return hasRole(['agent', 'admin', 'super_admin']);
}

/**
 * Check if user has customer role
 */
export function isCustomer(): boolean {
  return hasRole(['customer', 'admin', 'super_admin']);
}

/**
 * Get dashboard path - unified for all users
 * All users redirect to /dashboard after login, then client-side routing handles role-specific views
 */
export function getDashboardPath(role?: string): string {
  return '/dashboard';
}

/**
 * Check if token needs refresh (expires in 5 minutes)
 */
export function shouldRefreshToken(): boolean {
  const tokenData = getTokenData();
  return tokenData ? tokenData.isExpiringSoon : false;
}

/**
 * Debug: Get token info for development
 */
export function getTokenDebugInfo() {
  if (process.env.NODE_ENV !== 'development') return null;
  
  const tokenData = getTokenData();
  if (!tokenData) return { message: 'No token found' };
  
  return {
    user: getCurrentUserFromToken(),
    expires: new Date(tokenData.payload.exp * 1000).toLocaleString(),
    isExpired: tokenData.isExpired,
    isExpiringSoon: tokenData.isExpiringSoon,
    timeUntilExpiry: Math.max(0, tokenData.payload.exp - Math.floor(Date.now() / 1000))
  };
}