"use client";

import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ProtectedRoute } from "@/components/ProtectedRoute"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"

export default function CustomerLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ProtectedRoute requiredRole={["customer", "admin", "super_admin"]}>
      <CustomerContent>{children}</CustomerContent>
    </ProtectedRoute>
  )
}

function CustomerContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
      <nav className="bg-card shadow-sm border-b border-border px-4 py-3">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-foreground">AssetLend - Customer Portal</h1>
            <div className="hidden md:flex gap-4 ml-6">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link href="/upload-asset" className="text-muted-foreground hover:text-foreground transition-colors">
                Upload Asset
              </Link>
              <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
                Profile
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.firstName} {user?.lastName}
            </span>
            <button 
              onClick={logout}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-1 rounded text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="min-h-screen bg-background">{children}</main>
    </div>
  )
}