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
  <ProtectedRoute requiredRole={["AGENT"]}>
      <AgentContent>{children}</AgentContent>
    </ProtectedRoute>
  )
}

function AgentContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
      <main className="min-h-screen bg-background">{children}</main>
    </div>
  )
}