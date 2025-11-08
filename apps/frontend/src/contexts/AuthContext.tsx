"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  logout as logoutUser
} from '@/lib/utils';
import { ROLES, UserType } from '@fundifyhub/types';
import { BACKEND_API_CONFIG, FRONTEND_API_CONFIG, FrontendPublicRoutes } from '@/lib/urls';
import { get } from '@/lib/api-client';
import logger from '@/lib/logger';

interface AuthContextType {
  user: UserType | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  // Auth actions
  login: (user: UserType) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  // Utility methods
  hasRole: (roles: string | string[]) => boolean;
  isSuperAdmin: () => boolean;
  isDistrictAdmin: () => boolean;
  isAgent: () => boolean;
  isCustomer: () => boolean;
  getDisplayName: () => string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastTokenCheck, setLastTokenCheck] = useState<number>(0);
  const router = useRouter();
  const pathname = usePathname();

  /** 
   * Check if a route is public 
   */
  function isPublicRoute(pathname: string): boolean {
    return FrontendPublicRoutes.some(route => {
      if (route === '/') return pathname === route;
      return pathname.startsWith(route);
    });
  }

  /** 
   * Get user's display name
   */
  const getDisplayName = useCallback((): string => {
    if (!user) return '';
    return `${user.firstName} ${user.lastName}`.trim();
  }, [user]);

  /**
   * Check if user has required role(s)
   */
  const hasRole = useCallback((roles: string | string[]): boolean => {
    if (!user) 
      return false;
    
    // Use capital case for all role comparisons
    const toCapitalCase = (str: string) => str.trim().toUpperCase();
    const userRoles = user.roles.map(toCapitalCase);
    
    const rolesToCheck = Array.isArray(roles)
      ? roles.map(toCapitalCase)
      : [toCapitalCase(roles)];
    
    // Check if user has ANY of the required roles
    const hasAccess = rolesToCheck.some(role => userRoles.includes(role));
    return hasAccess;
  }, [user]);

  const isSuperAdmin = useCallback((): boolean => {
    return hasRole([ROLES.SUPER_ADMIN]);
  }, [hasRole]);

  const isDistrictAdmin = useCallback((): boolean => {
    return hasRole([ROLES.DISTRICT_ADMIN]);
  }, [hasRole]);

  const isAgent = useCallback((): boolean => {
    return hasRole([ROLES.AGENT]);
  }, [hasRole]);

  const isCustomer = useCallback((): boolean => {
    return hasRole([ROLES.CUSTOMER]);
  }, [hasRole]);

  const redirectToDashboard = useCallback(() => {
    if (isDistrictAdmin()) {
      router.replace('/admin/dashboard');
    } else if (isAgent()) {
      router.replace('/agent/dashboard');
    } else {
      router.replace('/dashboard');
    }
  }, [router, isDistrictAdmin, isAgent]);

  /** 
   * Server-side authentication validation
   */
  const validateWithServer = async (): Promise<UserType | null> => {
      const data = await get(BACKEND_API_CONFIG.ENDPOINTS.AUTH.VALIDATE);
      if (data && data.success && data.data?.user) 
        return data.data.user as UserType;
      return null;  
  };

  // Initialize authentication state
  const initializeAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const serverUser = await validateWithServer();
      if (serverUser) {
        setUser(serverUser);
        setLastTokenCheck(Date.now());
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle login
  const handleLogin = useCallback((userData: UserType) => {
    setUser(userData);
    setLastTokenCheck(Date.now());
    redirectToDashboard();
  }, [router]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
      setUser(null);
      setLastTokenCheck(0);
      router.replace(FRONTEND_API_CONFIG.ENDPOINTS.AUTH.LOGIN);
    } catch (error) {
      setUser(null);
      router.replace(FRONTEND_API_CONFIG.ENDPOINTS.AUTH.LOGIN);
    }
  }, [router]);

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    await initializeAuth();
  }, [initializeAuth]);

  // Initialize on mount and pathname changes
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth, pathname]);

  // Handle route protection and redirects
  useEffect(() => {
    if (!isLoading) {
      const isLoggedIn = !!user;
      
      // Redirect logged-in users away from auth pages
      if (isLoggedIn && (pathname.startsWith('/auth') || pathname === '/forgot-password')) {
        redirectToDashboard();
        return;
      }
      
      // Redirect non-authenticated users to login (except public routes)
      if (!isLoggedIn && !isPublicRoute(pathname)) {
        router.replace(FRONTEND_API_CONFIG.ENDPOINTS.AUTH.LOGIN);
        return;
      }
    }
  }, [user, isLoading, pathname, router]);

  // Set up periodic server validation (since we can't check token client-side with httpOnly cookies)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      // Validate session with server every 5 minutes
      const serverUser = await validateWithServer();
      if (!serverUser) {
        logger.info('Session expired, logging out');
        handleLogout();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, handleLogout]);

  const value: AuthContextType = {
    // State
    user,
    isLoading,
    isLoggedIn: !!user,
    // Actions
    login: handleLogin,
    logout: handleLogout,
    refresh: handleRefresh,
    // Utilities
    hasRole,
    isDistrictAdmin,
    isAgent,
    isCustomer,
    isSuperAdmin,
    getDisplayName,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;