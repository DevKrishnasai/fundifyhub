"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/contexts/AuthContext"
import { UserMenu } from "@/components/UserMenu"
import { NotificationCenter } from "@/components/features/notifications/NotificationCenter"

/**
 * Minimal header for public pages (landing, auth, etc.)
 * Authenticated users see user menu + notifications
 * Unauthenticated users see login/register buttons
 */
export function PublicHeader() {
  const { user, isLoggedIn, isCustomer, isAgent, isDistrictAdmin, isSuperAdmin } = useAuth()

  // Determine dashboard link based on role
  const getDashboardLink = () => {
    if (!isLoggedIn) return "/dashboard"
    if (isDistrictAdmin() || isSuperAdmin()) return "/admin/dashboard"
    if (isAgent()) return "/agent/dashboard"
    return "/dashboard"
  }

  return (
    <header className="w-full border-b bg-background/50 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white font-bold">
              F
            </div>
            <span className="text-lg font-semibold">FundifyHub</span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {isLoggedIn ? (
              <>
                {/* Dashboard link for logged in users */}
                <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                  <Link href={getDashboardLink()}>Dashboard</Link>
                </Button>
                <NotificationCenter />
                <UserMenu />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
