"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  User, 
  clearAuthData,
  logout as logoutUser
} from '@/lib/auth';

interface AuthContextType {
  // User state
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  
  // Auth actions
  login: (user: User) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Utility methods
  hasRole: (roles: string | string[]) => boolean;
  isAdmin: () => boolean;
  isAgent: () => boolean;
  isCustomer: () => boolean;
  getDisplayName: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/register',
  '/forgot-password',
  '/about',
  '/contact',
  '/privacy',
  '/terms'
];

// Check if a route is public
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => {
    if (route === '/') return pathname === route;
    return pathname.startsWith(route);
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastTokenCheck, setLastTokenCheck] = useState<number>(0);
  const router = useRouter();
  const pathname = usePathname();

  // Get user display name
  const getDisplayName = useCallback((): string => {
    if (!user) return '';
    return `${user.firstName} ${user.lastName}`.trim() || user.email;
  }, [user]);

  // Client-side role checking (fast)
  const hasRole = useCallback((roles: string | string[]): boolean => {
    console.log('AuthContext.hasRole called with:', roles, 'user:', user);
    if (!user) {
      console.log('No user found in AuthContext');
      return false;
    }
    
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

  const isAdmin = useCallback((): boolean => {
    return hasRole(['ADMIN']);
  }, [hasRole]);

  const isAgent = useCallback((): boolean => {
    return hasRole(['AGENT']);
  }, [hasRole]);

  const isCustomer = useCallback((): boolean => {
    return hasRole(['CUSTOMER']);
  }, [hasRole]);

  // Server-side authentication validation (when needed)
  const validateWithServer = async (): Promise<User | null> => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
      const response = await fetch(`${apiUrl}/api/v1/user/validate`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.user) {
          return data.data.user;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Server validation failed:', error);
      return null;
    }
  };

  // Initialize authentication state
  const initializeAuth = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Since we use httpOnly cookies, we can't read the token client-side
      // We need to validate with the server to get user data
      const serverUser = await validateWithServer();
      
      if (serverUser) {
        setUser(serverUser);
        setLastTokenCheck(Date.now());
      } else {
        setUser(null);
      }
      
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle login
  const handleLogin = useCallback((userData: User) => {
    setUser(userData);
    setLastTokenCheck(Date.now());
    
    // Redirect all users to unified dashboard
    router.replace('/dashboard');
  }, [router]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await logoutUser(); // Clear server-side cookies
      clearAuthData(); // Clear any client-side data
      setUser(null);
      setLastTokenCheck(0);
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout even if server call fails
      clearAuthData();
      setUser(null);
      router.replace('/auth/login');
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
        router.replace('/dashboard');
        return;
      }
      
      // Redirect non-authenticated users to login (except public routes)
      if (!isLoggedIn && !isPublicRoute(pathname)) {
        router.replace('/auth/login');
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
        console.log('Session expired, logging out');
        handleLogout();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [user, handleLogout]);

  // Development debug info
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && user) {
      console.log('Auth Debug Info:', {
        user: user,
        isLoggedIn: !!user,
        pathname: pathname,
        lastTokenCheck: new Date(lastTokenCheck).toLocaleString()
      });
    }
  }, [user, pathname, lastTokenCheck]);

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
    isAdmin,
    isAgent,
    isCustomer,
    getDisplayName,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;