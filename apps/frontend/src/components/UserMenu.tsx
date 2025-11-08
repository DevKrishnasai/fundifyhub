"use client";

import { useState } from 'react';
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
  UserCheck 
} from 'lucide-react';
import logger from '@/lib/logger';

export function UserMenu() {
  const { user, logout } = useAuth();
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
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  };

  const getRoleIcon = () => {
    const roles = user.roles?.map((r: string) => r.toLowerCase()) || [];
    if (roles.includes('admin') || roles.includes('super_admin')) {
      return <Shield className="w-4 h-4" />;
    }
    if (roles.includes('agent')) {
      return <UserCheck className="w-4 h-4" />;
    }
    return <User className="w-4 h-4" />;
  };

  const getRoleLabel = () => {
    const roles = user.roles || [];
    if (roles.length === 0) return 'User';
    if (roles.length === 1) {
      const role = roles[0].toLowerCase();
      switch (role) {
        case 'admin':
        case 'super_admin':
          return 'Administrator';
        case 'agent':
          return 'Agent';
        case 'customer':
          return 'Customer';
        default:
          return roles[0];
      }
    }
    // Multiple roles - show them all
    return roles.join(', ');
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
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <div className="flex items-center gap-2 pt-1">
              {getRoleIcon()}
              <span className="text-xs text-muted-foreground">
                {getRoleLabel()}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
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