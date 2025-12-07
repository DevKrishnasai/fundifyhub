/**
 * Session Service
 * 
 * Manages user login sessions with support for:
 * - Multiple active sessions per user
 * - Device tracking
 * - Session revocation
 * - Auto-expiry
 */

import { prisma } from '@fundifyhub/prisma';
import { createHash, randomBytes } from 'crypto';
import logger from '../utils/logger';

// Session configuration
const SESSION_EXPIRY_DAYS = 7;
const MAX_SESSIONS_PER_USER = 10;

/**
 * Device info extracted from user-agent
 */
export interface DeviceInfo {
  deviceName?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser?: string;
  os?: string;
}

/**
 * Session creation payload
 */
export interface CreateSessionPayload {
  userId: string;
  tokenId: string; // JWT's jti claim
  deviceInfo?: DeviceInfo;
  ipAddress?: string;
  city?: string;
  country?: string;
}

/**
 * Session info returned to client
 */
export interface SessionInfo {
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  city: string | null;
  country: string | null;
  lastActivityAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

/**
 * Hash the token ID for secure storage
 */
function hashTokenId(tokenId: string): string {
  return createHash('sha256').update(tokenId).digest('hex');
}

/**
 * Generate a unique token ID for JWT
 */
export function generateTokenId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a new session for a user
 */
export async function createSession(payload: CreateSessionPayload): Promise<string> {
  const { userId, tokenId, deviceInfo, ipAddress, city, country } = payload;
  
  const tokenHash = hashTokenId(tokenId);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  
  try {
    // Create new session
    const session = await prisma.session.create({
      data: {
        userId,
        tokenHash,
        deviceName: deviceInfo?.deviceName,
        deviceType: deviceInfo?.deviceType,
        browser: deviceInfo?.browser,
        os: deviceInfo?.os,
        ipAddress,
        city,
        country,
        expiresAt,
      },
    });
    
    // Clean up old sessions if user has too many
    await cleanupOldSessions(userId);
    
    logger.info('Session created', { userId, sessionId: session.id });
    
    return session.id;
  } catch (error) {
    logger.error('Failed to create session', error as Error);
    throw error;
  }
}

/**
 * Validate and update session activity
 * Returns true if session is valid, false otherwise
 */
export async function validateSession(tokenId: string): Promise<boolean> {
  const tokenHash = hashTokenId(tokenId);
  
  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        isActive: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
    
    if (!session) {
      return false;
    }
    
    // Check if session is revoked
    if (session.revokedAt || !session.isActive) {
      return false;
    }
    
    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Mark as inactive
      await prisma.session.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      return false;
    }
    
    // Update last activity (don't await to avoid blocking)
    prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    }).catch((err: unknown) => {
      logger.warn('Failed to update session activity', { 
        error: err instanceof Error ? err.message : String(err)
      });
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to validate session', error as Error);
    return false;
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(
  userId: string, 
  currentTokenId?: string
): Promise<SessionInfo[]> {
  const currentTokenHash = currentTokenId ? hashTokenId(currentTokenId) : null;
  
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      isActive: true,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      tokenHash: true,
      deviceName: true,
      deviceType: true,
      browser: true,
      os: true,
      ipAddress: true,
      city: true,
      country: true,
      lastActivityAt: true,
      createdAt: true,
    },
    orderBy: { lastActivityAt: 'desc' },
  });
  
  return sessions.map((session) => ({
    id: session.id,
    deviceName: session.deviceName,
    deviceType: session.deviceType,
    browser: session.browser,
    os: session.os,
    ipAddress: session.ipAddress,
    city: session.city,
    country: session.country,
    lastActivityAt: session.lastActivityAt,
    createdAt: session.createdAt,
    isCurrent: session.tokenHash === currentTokenHash,
  }));
}

/**
 * Revoke a specific session
 */
export async function revokeSession(
  sessionId: string, 
  userId: string, 
  reason: string
): Promise<boolean> {
  try {
    const result = await prisma.session.updateMany({
      where: {
        id: sessionId,
        userId, // Ensure user can only revoke their own sessions
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
    
    if (result.count > 0) {
      logger.info('Session revoked', { userId, sessionId, reason });
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Failed to revoke session', error as Error);
    return false;
  }
}

/**
 * Revoke all sessions for a user (except current one)
 */
export async function revokeAllSessions(
  userId: string, 
  exceptTokenId?: string,
  reason = 'user_logout_all'
): Promise<number> {
  const exceptTokenHash = exceptTokenId ? hashTokenId(exceptTokenId) : null;
  
  try {
    const result = await prisma.session.updateMany({
      where: {
        userId,
        isActive: true,
        revokedAt: null,
        ...(exceptTokenHash ? { tokenHash: { not: exceptTokenHash } } : {}),
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
    
    logger.info('All sessions revoked', { userId, count: result.count, reason });
    
    return result.count;
  } catch (error) {
    logger.error('Failed to revoke all sessions', error as Error);
    return 0;
  }
}

/**
 * Revoke current session (on logout)
 */
export async function revokeCurrentSession(tokenId: string): Promise<void> {
  const tokenHash = hashTokenId(tokenId);
  
  try {
    await prisma.session.updateMany({
      where: { tokenHash },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'user_logout',
      },
    });
  } catch (error) {
    logger.error('Failed to revoke current session', error as Error);
  }
}

/**
 * Revoke all sessions for a user (called on password change)
 */
export async function revokeSessionsOnPasswordChange(userId: string): Promise<void> {
  await revokeAllSessions(userId, undefined, 'password_change');
}

/**
 * Clean up old sessions when user has too many
 */
async function cleanupOldSessions(userId: string): Promise<void> {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId, isActive: true },
      orderBy: { lastActivityAt: 'desc' },
      select: { id: true },
    });
    
    if (sessions.length > MAX_SESSIONS_PER_USER) {
      const sessionsToRemove = sessions.slice(MAX_SESSIONS_PER_USER);
      const idsToRemove = sessionsToRemove.map((s) => s.id);
      
      await prisma.session.updateMany({
        where: { id: { in: idsToRemove } },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: 'session_limit_exceeded',
        },
      });
      
      logger.info('Cleaned up old sessions', { userId, count: idsToRemove.length });
    }
  } catch (error) {
    logger.error('Failed to cleanup old sessions', error as Error);
  }
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.session.updateMany({
      where: {
        isActive: true,
        expiresAt: { lt: new Date() },
      },
      data: {
        isActive: false,
        revokedReason: 'expired',
      },
    });
    
    if (result.count > 0) {
      logger.info('Cleaned up expired sessions', { count: result.count });
    }
    
    return result.count;
  } catch (error) {
    logger.error('Failed to cleanup expired sessions', error as Error);
    return 0;
  }
}

/**
 * Parse user agent string to extract device info
 */
export function parseUserAgent(userAgent: string | undefined): DeviceInfo {
  if (!userAgent) {
    return { deviceType: 'unknown' };
  }
  
  const ua = userAgent.toLowerCase();
  
  // Detect device type
  let deviceType: DeviceInfo['deviceType'] = 'desktop';
  if (/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)) {
    if (/tablet|ipad/i.test(ua)) {
      deviceType = 'tablet';
    } else {
      deviceType = 'mobile';
    }
  }
  
  // Detect OS
  let os = 'Unknown OS';
  if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  
  // Detect browser
  let browser = 'Unknown Browser';
  if (/edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'Google Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';
  
  // Create device name
  const deviceName = `${browser} on ${os}`;
  
  return {
    deviceName,
    deviceType,
    browser,
    os,
  };
}
