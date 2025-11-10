"use client"

import Link from 'next/link'
import React, { useState } from 'react'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './UserMenu'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from './popover'
import { Menu, X, ChevronDown } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const { user, isLoggedIn, isAgent, isDistrictAdmin, isSuperAdmin, isCustomer } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Primary/customer links
  const primaryLinks: { href: string; label: string }[] = isLoggedIn && isCustomer()
    ? [
        { href: '/dashboard', label: 'Dashboard' },
      ]
    : []

  // Agent links (use generic labels)
  const agentLinks = isLoggedIn && isAgent() ? [{ href: '/agent/dashboard', label: 'Dashboard' }] : []

  // Admin links grouped into a dropdown on desktop (use generic labels)
  const adminLinks = isLoggedIn && (isDistrictAdmin() || isSuperAdmin())
    ? [
        { href: '/admin/dashboard', label: 'Dashboard' },
        { href: '/admin/users-access', label: 'Users' },
        { href: '/admin/settings', label: 'Settings' },
      ]
    : []

  const isActive = (href: string) => {
    if (!pathname) return false
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <header className="w-full border-b bg-background/50 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white font-bold">F</div>
              <span className="text-lg font-semibold">FundifyHub</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-4 mr-2" aria-label="Primary Navigation">
              {primaryLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn('text-sm hover:text-foreground', isActive(l.href) ? 'text-foreground font-semibold' : 'text-muted-foreground')}
                >
                  {l.label}
                </Link>
              ))}

              {agentLinks.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                      Agent
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-44">
                    <div className="flex flex-col gap-2">
                      {agentLinks.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          className={cn(
                            'text-sm block px-2 py-1 rounded',
                            isActive(l.href) ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted/50'
                          )}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {adminLinks.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                      Admin
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-44">
                    <div className="flex flex-col gap-2">
                      {adminLinks.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          className={cn(
                            'text-sm block px-2 py-1 rounded',
                            isActive(l.href) ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted/50'
                          )}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </nav>

            <ThemeToggle />

            {/* Mobile hamburger */}
            <button aria-label="Toggle menu" onClick={() => setMobileOpen((s) => !s)} className="md:hidden p-2 rounded-md">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Auth / user menu */}
            {user ? (
              <UserMenu />
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/register">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background/60 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-col gap-2">
              {primaryLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn('block px-3 py-2 rounded', isActive(l.href) ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted/50')}
                >
                  {l.label}
                </Link>
              ))}

              {agentLinks.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground uppercase px-3">Agent</p>
                  <div className="mt-1 space-y-1">
                    {agentLinks.map((l) => (
                      <Link key={l.href} href={l.href} className={cn('block px-3 py-2 rounded', isActive(l.href) ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted/50')}>
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {adminLinks.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground uppercase px-3">Admin</p>
                  <div className="mt-1 space-y-1">
                    {adminLinks.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className={cn('block px-3 py-2 rounded', isActive(l.href) ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted/50')}
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* If not logged in, show auth actions in mobile menu */}
              {!user && (
                <div className="pt-2 flex gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/auth/login">Login</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/auth/register">Get Started</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
