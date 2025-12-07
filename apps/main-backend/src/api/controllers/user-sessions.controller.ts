/**
 * Session Controllers
 * 
 * API endpoints for managing user sessions:
 * - GET /sessions - List user's active sessions
 * - DELETE /sessions/:id - Revoke a specific session
 * - DELETE /sessions - Revoke all sessions (except current)
 */

import { Request, Response } from 'express';
import { 
  getUserSessions, 
  revokeSession, 
  revokeAllSessions 
} from '../services/session.service';
import { 
  successResponse, 
  errorResponse, 
  notFoundResponse 
} from '../utils/response';
import { NotFoundError } from '../../utils/errors';
import logger from '../../utils/logger';
import { UserType } from '@fundifyhub/types';

/**
 * Get all active sessions for the current user
 * GET /api/v1/user/sessions
 */
export async function getSessionsController(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as UserType;
    const tokenId = (req as Request & { tokenId?: string }).tokenId;
    
    const sessions = await getUserSessions(user.id, tokenId);
    
    successResponse(res, 'Sessions retrieved successfully', { sessions });
  } catch (error) {
    logger.error('Failed to get sessions', error as Error);
    errorResponse(res, 'Failed to retrieve sessions', 500);
  }
}

/**
 * Revoke a specific session
 * DELETE /api/v1/user/sessions/:id
 */
export async function revokeSessionController(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as UserType;
    const { id: sessionId } = req.params;
    
    const success = await revokeSession(sessionId, user.id, 'user_revoke');
    
    if (!success) {
      notFoundResponse(res, 'Session', sessionId);
      return;
    }
    
    successResponse(res, 'Session revoked successfully');
  } catch (error) {
    logger.error('Failed to revoke session', error as Error);
    errorResponse(res, 'Failed to revoke session', 500);
  }
}

/**
 * Revoke all sessions except the current one
 * DELETE /api/v1/user/sessions
 */
export async function revokeAllSessionsController(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as UserType;
    const tokenId = (req as Request & { tokenId?: string }).tokenId;
    
    const count = await revokeAllSessions(user.id, tokenId, 'user_logout_all');
    
    successResponse(res, `${count} session(s) revoked successfully`, { revokedCount: count });
  } catch (error) {
    logger.error('Failed to revoke all sessions', error as Error);
    errorResponse(res, 'Failed to revoke sessions', 500);
  }
}
