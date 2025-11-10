"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  User,
  Settings,
  LogOut,
  Shield,
  UserCheck,
} from 'lucide-react';
import logger from '@/lib/logger';

export function UserMenu() {
  const { user, logout, getDisplayName, isSuperAdmin, isDistrictAdmin, isAgent, isCustomer } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      logger.error('Logout error:', error as Error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getInitials = () => {
    const name = getDisplayName() || user.email || '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getRoleLabel = () => {
    if (isSuperAdmin() || isDistrictAdmin()) return 'Administrator';
    if (isAgent()) return 'Agent';
    if (isCustomer()) return 'Customer';
    return 'User';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-2" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-0">
          <div className="flex flex-col space-y-1 px-3 pb-2">
            <p className="text-sm font-medium leading-none">{getDisplayName() || user.email}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-2 pt-1">
              {isSuperAdmin() || isDistrictAdmin() ? (
                <Shield className="w-4 h-4" />
              ) : isAgent() ? (
                <UserCheck className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
              <span className="text-xs text-muted-foreground">{getRoleLabel()}</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Profile (full-width button style for symmetry) */}
        <DropdownMenuItem asChild>
          <Link href="/profile" className="w-full rounded-md px-3 py-2 text-sm bg-primary text-primary-foreground flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>

        {/* Keep menu focused: no Settings here (settings removed per request) */}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}