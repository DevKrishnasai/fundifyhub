import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth, requireRole } from '../../auth';
const requireAdmin = requireRole('ADMIN', 'SUPER_ADMIN');
import {
  listUsersController,
  updateUserController,
  deleteUserController,
  createUserController,
} from './controllers';

const router: ExpressRouter = Router();

/**
 * GET /admin/users
 * List all users
 */
router.get('/', requireAuth, requireAdmin, listUsersController);

/**
 * POST /admin/users
 * Create new user
 */
router.post('/', requireAuth, requireAdmin, createUserController);

/**
 * PATCH /admin/users/:id
 * Update user (roles, isActive, name)
 */
router.patch('/:id', requireAuth, requireAdmin, updateUserController);

/**
 * DELETE /admin/users/:id
 */
router.delete('/:id', requireAuth, requireAdmin, deleteUserController);

export default router;
