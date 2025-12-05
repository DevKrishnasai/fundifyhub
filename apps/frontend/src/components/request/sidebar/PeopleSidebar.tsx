'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  User, 
  UserCheck, 
  UserCog,
  Phone,
  Mail,
  MapPin,
  Building2,
} from 'lucide-react';
import type { RequestType, UserType, UserRole } from '@fundifyhub/types';
import { REQUEST_STATUS } from '@fundifyhub/types';
import { cn } from '@/lib/utils';
import { getDistrictName } from '@/lib/type-guards';
import { useAuth } from '@/contexts/AuthContext';

/**
 * PeopleSidebar - Shows all people involved in the request
 * Customer, assigned agent, and handling admin
 */

interface PeopleSidebarProps {
  request: RequestType;
  currentUserId: string;
  userRole: UserRole;
  className?: string;
}

/** Statuses where agent information becomes relevant */
const AGENT_RELEVANT_STATUSES: string[] = [
  REQUEST_STATUS.INSPECTION_SCHEDULED,
  REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED,
  REQUEST_STATUS.INSPECTION_IN_PROGRESS,
  REQUEST_STATUS.INSPECTION_COMPLETED,
  REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE,
  REQUEST_STATUS.ASSET_MISMATCH,
  REQUEST_STATUS.AGENT_NOT_AVAILABLE,
  REQUEST_STATUS.APPROVED,
  REQUEST_STATUS.PENDING_SIGNATURE,
  REQUEST_STATUS.PENDING_BANK_DETAILS,
  REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
  REQUEST_STATUS.TRANSFER_FAILED,
  REQUEST_STATUS.AMOUNT_DISBURSED,
  REQUEST_STATUS.ACTIVE,
  REQUEST_STATUS.PAYMENT_OVERDUE,
  REQUEST_STATUS.DEFAULTED,
  REQUEST_STATUS.COMPLETED,
];

export function PeopleSidebar({ request, currentUserId, userRole, className }: PeopleSidebarProps) {
  const customer = request.customer;
  const agent = request.assignedAgent;
  const assignedAdmin = request.assignedAdmin;
  const isCustomer = userRole === 'CUSTOMER';
  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'DISTRICT_ADMIN';
  
  // Determine if agent section should be shown
  const currentStatus = request.currentStatus;
  const showAgentSection = agent || (
    // Only show "No Agent Assigned" for admins OR when status is in agent-relevant phase
    isAdmin || AGENT_RELEVANT_STATUSES.includes(currentStatus)
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          People
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer - Don't show to customer themselves unless admin/agent */}
        {customer && !isCustomer && (
          <PersonCard
            user={customer}
            role="Customer"
            roleIcon={User}
            roleColor="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            isCurrentUser={customer.id === currentUserId}
          />
        )}

        {/* Customer seeing their own details - simplified */}
        {customer && isCustomer && (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {`${customer.firstName?.[0] || ''}${customer.lastName?.[0] || ''}`.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">
                  {customer.firstName} {customer.lastName}
                </p>
                <Badge variant="secondary" className="text-xs">You</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Request Owner</p>
            </div>
          </div>
        )}

        {/* Assigned Admin - Show if assigned */}
        {assignedAdmin && (
          <>
            <Separator />
            <PersonCard
              user={assignedAdmin}
              role="Handling Admin"
              roleIcon={UserCog}
              roleColor="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
              isCurrentUser={assignedAdmin.id === currentUserId}
            />
          </>
        )}

        {/* Agent - Only show when assigned */}
        {agent && (
          <>
            <Separator />
            <PersonCard
              user={agent}
              role="Field Agent"
              roleIcon={UserCheck}
              roleColor="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              isCurrentUser={agent.id === currentUserId}
            />
          </>
        )}

        {/* No agent assigned - Only show for admins or when in agent-relevant phase */}
        {!agent && showAgentSection && (
          <>
            <Separator />
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <UserCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  No Agent Assigned
                </p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'Assign an agent for inspection' : 'Agent will be assigned soon'}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * PersonCard - Individual person display
 */
interface PersonCardProps {
  user: UserType;
  role: string;
  roleIcon: typeof User;
  roleColor: string;
  isCurrentUser?: boolean;
  showContact?: boolean;
  onContact?: () => void;
}

export function PersonCard({
  user,
  role,
  roleIcon: RoleIcon,
  roleColor,
  isCurrentUser,
  showContact = true,
  onContact,
}: PersonCardProps) {
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="space-y-3">
      {/* Header with avatar and name */}
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">
              {user.firstName} {user.lastName}
            </p>
            {isCurrentUser && (
              <Badge variant="secondary" className="text-xs">You</Badge>
            )}
          </div>
          <Badge variant="secondary" className={cn("text-xs mt-1", roleColor)}>
            <RoleIcon className="mr-1 h-3 w-3" />
            {role}
          </Badge>
        </div>
      </div>

      {/* Contact Info */}
      {showContact && (
        <div className="space-y-1.5 pl-[52px]">
          {user.email && (
            <a
              href={`mailto:${user.email}`}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="h-3 w-3" />
              <span className="truncate">{user.email}</span>
            </a>
          )}
          {user.phoneNumber && (
            <a
              href={`tel:${user.phoneNumber}`}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="h-3 w-3" />
              {user.phoneNumber}
            </a>
          )}
          {user.districts && user.districts.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {user.districts.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * QuickInfo - Compact request info for sidebar
 * Shows key request details - actions are handled via WorkflowActionBar
 */
interface QuickInfoProps {
  request: RequestType;
  className?: string;
}

export function QuickInfo({ request, className }: QuickInfoProps) {
  const { user } = useAuth();
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isAlreadyAssigned = request.assignedAdminId === user?.id;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Quick Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Request #</span>
          <span className="font-mono font-medium">{request.requestNumber}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Requested</span>
          <span className="font-semibold text-primary">
            {formatCurrency(request.requestedAmount)}
          </span>
        </div>
        {request.adminOfferedAmount && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Offered</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(request.adminOfferedAmount)}
            </span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">District</span>
          <span>{getDistrictName(request)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Asset</span>
          <span className="truncate max-w-[120px]" title={`${request.asset?.brand || ''} ${request.asset?.model || ''}`}>
            {request.asset?.brand || 'N/A'} {request.asset?.model || ''}
          </span>
        </div>
        {request.loan?.loanNumber && (
          <>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Loan #</span>
              <span className="font-mono font-medium">{request.loan.loanNumber}</span>
            </div>
          </>
        )}
        
        {/* Assigned Admin Info */}
        {request.assignedAdmin && (
          <>
            <Separator />
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground">Handling Admin</span>
              <span className="flex items-center gap-1">
                {request.assignedAdmin.firstName} {request.assignedAdmin.lastName}
                {isAlreadyAssigned && (
                  <Badge variant="secondary" className="text-xs ml-1">You</Badge>
                )}
              </span>
            </div>
          </>
        )}
        
        {/* Assigned Agent Info */}
        {request.assignedAgent && (
          <>
            <Separator />
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground">Field Agent</span>
              <span>{request.assignedAgent.firstName} {request.assignedAgent.lastName}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default PeopleSidebar;
