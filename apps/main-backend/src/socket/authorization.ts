/**
 * Socket Room Authorization
 *
 * Checks if a user is authorized to join a specific room.
 *
 * @module socket/authorization
 */
import { AuthenticatedSocket } from './types';
import { hasRole, hasAnyRole, hasDistrictAccess } from '../domain/access-control/rbac';
import { ROLES } from '@fundifyhub/types';

/**
 * Check if user can join a Socket.IO room
 * 
 * Room patterns:
 * - `user:{userId}` - User's personal room (only that user)
 * - `admin` - All admins
 * - `district:{districtId}` - Users in that district
 * - `request:{requestId}` - Users involved in that request
 * - `loan:{loanId}` - Users involved in that loan
 * - `auction:{auctionId}` - Public auction rooms (customers can join)
 * - `resource:{resourceId}` - Shared resource rooms
 * 
 * @param socket - Authenticated socket with user info
 * @param room - Room name to join
 * @returns true if user can join, false otherwise
 */
export function canJoinRoom(socket: AuthenticatedSocket, room: string): boolean {
  if (!socket.authenticated || !socket.userId) {
    return false;
  }

  // Build a user object for RBAC checks
  const user = {
    id: socket.userId,
    roles: socket.userRoles || [],
    districts: socket.userDistricts || [],
  };

  // User's personal room - only they can join
  if (room.startsWith('user:')) {
    const roomUserId = room.split(':')[1];
    return user.id === roomUserId;
  }

  // Admin room - only admins
  if (room === 'admin') {
    return hasAnyRole(user, [
      ROLES.DISTRICT_ADMIN,
      ROLES.STATE_ADMIN,
      ROLES.SUPER_ADMIN,
    ]);
  }

  // District rooms - users in that district
  if (room.startsWith('district:')) {
    const districtId = room.split(':')[1];
    return hasDistrictAccess(user, districtId);
  }

  // Request rooms - users involved in the request
  // TODO: This would need to fetch the request and check ownership/assignment
  if (room.startsWith('request:')) {
    // For now, allow admins and agents
    return hasAnyRole(user, [
      ROLES.CUSTOMER,
      ROLES.AGENT,
      ROLES.DISTRICT_ADMIN,
      ROLES.STATE_ADMIN,
      ROLES.SUPER_ADMIN,
    ]);
  }

  // Loan rooms - users involved in the loan
  if (room.startsWith('loan:')) {
    // For now, allow admins, agents, and customers
    return hasAnyRole(user, [
      ROLES.CUSTOMER,
      ROLES.AGENT,
      ROLES.DISTRICT_ADMIN,
      ROLES.STATE_ADMIN,
      ROLES.SUPER_ADMIN,
    ]);
  }

  // Auction rooms - public for active auctions
  if (room.startsWith('auction:')) {
    // Any authenticated user can join auction rooms
    return true;
  }

  // Resource rooms - collaborative features
  if (room.startsWith('resource:')) {
    // Any authenticated user can join resource rooms
    return true;
  }

  // Default: deny access to unknown room patterns
  return false;
}
