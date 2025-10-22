"use client";

import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ProtectedRoute } from "@/components/ProtectedRoute"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"

export default function AgentLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ProtectedRoute requiredRole={["agent", "admin"]}>
      <AgentContent>{children}</AgentContent>
    </ProtectedRoute>
  )
}

function AgentContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
      <nav className="bg-blue-600 dark:bg-blue-800 text-white shadow-sm px-4 py-3">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">AssetLend - Agent Portal</h1>
            <div className="hidden md:flex gap-4 ml-6">
              <Link href="/agent/dashboard" className="text-blue-100 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/agent/inspection" className="text-blue-100 hover:text-white transition-colors">
                Inspections
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">
              Welcome, {user?.firstName} {user?.lastName} ({user?.roles?.join(', ')})
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