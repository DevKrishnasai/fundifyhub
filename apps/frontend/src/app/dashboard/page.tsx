"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Unified Dashboard Entry Point
 * Redirects users to role-appropriate dashboards based on their roles
 * For users with multiple roles, shows a role selector or combined view
 */
export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      const roles = user.roles.map(r => r.toUpperCase());
      
      // Priority-based routing for users with multiple roles
      // If user has admin/super_admin role, go to admin dashboard
      if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
        router.replace('/admin/dashboard');
      }
      // If user has district admin role
      else if (roles.includes('DISTRICT_ADMIN')) {
        router.replace('/admin/dashboard'); // District admin uses admin dashboard
      }
      // If user has agent role
      else if (roles.includes('AGENT')) {
        router.replace('/agent/dashboard');
      }
      // Default to customer dashboard
      else if (roles.includes('CUSTOMER')) {
        router.replace('/customer/dashboard');
      }
      // Fallback
      else {
        router.replace('/auth/login');
      }
    }
  }, [user, isLoading, router]);

  // Loading state
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
}
