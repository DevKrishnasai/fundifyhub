"use client";

import type React from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ROLES } from '@fundifyhub/types';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin area should be accessible to district admins and super admins
  const allowed = [ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN];

  return (
    <ProtectedRoute requiredRole={allowed}>
      <AdminContent>{children}</AdminContent>
    </ProtectedRoute>
  );
}

function AdminContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main>{children}</main>
    </div>
  );
}
