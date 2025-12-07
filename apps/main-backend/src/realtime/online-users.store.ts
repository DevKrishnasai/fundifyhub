/**
 * Online Users Store
 * Tracks connected users and their socket IDs
 */

interface UserConnection {
  userId: string;
  socketId: string;
  connectedAt: Date;
}

const onlineUsers = new Map<string, Set<string>>();

export function addUserConnection(userId: string, socketId: string): void {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId)!.add(socketId);
}

export function removeUserConnection(userId: string, socketId: string): void {
  const sockets = onlineUsers.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      onlineUsers.delete(userId);
    }
  }
}

export function getUserSocketIds(userId: string): string[] {
  return Array.from(onlineUsers.get(userId) || []);
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
}

export function getTotalConnections(): number {
  let total = 0;
  onlineUsers.forEach(sockets => total += sockets.size);
  return total;
}

export function getAllOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys());
}
