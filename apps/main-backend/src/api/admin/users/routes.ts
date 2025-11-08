import { Router, type Router as ExpressRouter } from 'express';
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
router.get('/', listUsersController);

/**
 * POST /admin/users
 * Create new user
 */
router.post('/', createUserController);

/**
 * PATCH /admin/users/:id
 * Update user (roles, isActive, name)
 */
router.patch('/:id', updateUserController);

/**
 * DELETE /admin/users/:id
 */
router.delete('/:id', deleteUserController);

export default router;