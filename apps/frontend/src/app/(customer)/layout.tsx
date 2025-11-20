"use client";

import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { ROLES } from '@fundifyhub/types'
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"

export default function CustomerLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ProtectedRoute requiredRole={[ROLES.CUSTOMER]}>
      <CustomerContent>{children}</CustomerContent>
    </ProtectedRoute>
  )
}

function CustomerContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
      <main className="min-h-screen bg-background">{children}</main>
    </div>
  )
}