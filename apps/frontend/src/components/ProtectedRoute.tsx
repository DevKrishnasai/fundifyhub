"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  fallback?: React.ReactNode;
}

// Remove this function as we'll use AuthContext methods

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallback 
}: ProtectedRouteProps) {
  const { user, isLoading, isLoggedIn, hasRole } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show error if not authenticated
  if (!isLoggedIn || !user) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You need to be logged in to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check role permissions if required
  if (requiredRole && !hasRole(requiredRole)) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this page.
            {Array.isArray(requiredRole) 
              ? ` Required role: ${requiredRole.join(' or ')}`
              : ` Required role: ${requiredRole}`
            }
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}