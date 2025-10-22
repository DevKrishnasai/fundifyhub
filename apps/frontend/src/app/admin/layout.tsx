"use client";

import type React from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminContent>{children}</AdminContent>
}

function AdminContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  // Check if user has admin role (case-insensitive)
  const isAdmin = user && user.roles?.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()))

  return (
    <div className="min-h-screen bg-background">
      {isAdmin && (
        <nav className="bg-card border-b border-border px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-red-600">FundifyHub Admin</h1>
              <div className="hidden md:flex gap-4">
                <Link href="/admin/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </Link>
                <Link href="/admin/workers" className="text-muted-foreground hover:text-foreground transition-colors">
                  Worker Config
                </Link>
                <Link href="/admin/settings" className="text-muted-foreground hover:text-foreground transition-colors">
                  Settings
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {user?.firstName} {user?.lastName} - Admin
              </span>
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-red-600 dark:text-red-200">
                  {user?.firstName?.charAt(0)}
                </span>
              </div>
              <button
                onClick={logout}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors ml-2"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}
      {children}
    </div>
  )
}
