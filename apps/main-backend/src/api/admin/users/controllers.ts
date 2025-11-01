import { Request, Response } from 'express';
import { APIResponse } from '../../../types';
import { logger } from '../../../utils/logger';
import { prisma } from '@fundifyhub/prisma';
import bcrypt from 'bcrypt';
// import { enqueue, QUEUE_NAMES, JOB_NAMES, EMAIL_TEMPLATES } from '@fundifyhub/utils';
import { createUser, checkUserExists } from './services';

export async function createUserController(req: Request, res: Response): Promise<void> {
  try {
    const { email, firstName, lastName, phoneNumber, district, roles, isActive } = req.body;

    if (!email || !firstName) {
      res.status(400).json({ success: false, message: 'Email and firstName are required' } as APIResponse);
      return;
    }

    // Check if user already exists (reuse logic from registration)
    const existing = await checkUserExists(email, phoneNumber);

    if (existing) {
      res.status(409).json({
        success: false,
        message: 'User with this email or phone already exists'
      } as APIResponse);
      return;
    }

    // Generate a temporary password (user will need to reset it)
    const tempPassword = Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const userData: any = {
      email: email.toLowerCase(),
      firstName,
      lastName,
      phoneNumber,
      district,
      roles: roles || ['CUSTOMER'],
      isActive: isActive !== undefined ? isActive : true,
      password: hashedPassword,
      emailVerified: false, // Admin-created users need to verify email
      phoneVerified: !!phoneNumber, // Assume phone is verified if provided
    };

    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
        phoneNumber: true,
        district: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Send welcome email to new user with account setup instructions
    try {
    //   await enqueue(QUEUE_NAMES.EMAIL, JOB_NAMES.WELCOME_EMAIL, {
    //     recipient: user.email,
    //     subject: EMAIL_TEMPLATES.WELCOME.subject,
    //     template: EMAIL_TEMPLATES.WELCOME.body,
    //     templateData: {
    //       firstName: user.firstName,
    //     },
    //   });
      logger.info(`Welcome email queued for new user: ${user.email}`);
    } catch (err) {
      logger.error('Failed to enqueue welcome email for admin-created user:', err as Error);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    } as APIResponse);
  } catch (error) {
    logger.error('createUserController error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to create user' } as APIResponse);
  }
}

export async function listUsersController(req: Request, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
        phoneNumber: true,
        district: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.status(200).json({ success: true, message: 'Users retrieved', data: users } as APIResponse);
  } catch (error) {
    logger.error('listUsersController error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to retrieve users' } as APIResponse);
  }
}

export async function updateUserController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const payload = req.body as any;

    if (!id) {
      res.status(400).json({ success: false, message: 'User id is required' } as APIResponse);
      return;
    }

    // Get current user state before update
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { isActive: true, firstName: true, email: true }
    });

    if (!currentUser) {
      res.status(404).json({ success: false, message: 'User not found' } as APIResponse);
      return;
    }

    // Check for email/phone conflicts if they're being updated
    if (payload.email || payload.phoneNumber) {
      const conflictCheck = await checkUserExists(payload.email, payload.phoneNumber, id);

      if (conflictCheck) {
        res.status(409).json({
          success: false,
          message: 'Email or phone number already exists for another user'
        } as APIResponse);
        return;
      }
    }

    const allowed: any = {};
    if (typeof payload.isActive === 'boolean') allowed.isActive = payload.isActive;
    if (Array.isArray(payload.roles)) allowed.roles = payload.roles;
    if (payload.firstName !== undefined) allowed.firstName = payload.firstName;
    if (payload.lastName !== undefined) allowed.lastName = payload.lastName;
    if (payload.phoneNumber !== undefined) allowed.phoneNumber = payload.phoneNumber;
    if (payload.district !== undefined) allowed.district = payload.district;

    const updated = await prisma.user.update({
      where: { id },
      data: { ...allowed, updatedAt: new Date() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
        phoneNumber: true,
        district: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Send email notification when user status changes
    if (typeof payload.isActive === 'boolean' && currentUser.isActive !== payload.isActive) {
      try {
        // const template = payload.isActive ? EMAIL_TEMPLATES.USER_ACTIVATED : EMAIL_TEMPLATES.USER_DEACTIVATED;
        // await enqueue(QUEUE_NAMES.EMAIL, JOB_NAMES.WELCOME_EMAIL, {
        //   recipient: updated.email,
        //   subject: template.subject,
        //   template: template.body,
        //   templateData: {
        //     firstName: updated.firstName,
        //   },
        // });
        logger.info(`${payload.isActive ? 'Activation' : 'Deactivation'} email queued for user: ${updated.email}`);
      } catch (err) {
        logger.error(`Failed to enqueue ${payload.isActive ? 'activation' : 'deactivation'} email:`, err as Error);
        // Don't fail the request if email fails
      }
    }

    res.status(200).json({ success: true, message: 'User updated', data: updated } as APIResponse);
  } catch (error) {
    logger.error('updateUserController error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to update user' } as APIResponse);
  }
}

export async function deleteUserController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, message: 'User id is required' } as APIResponse);
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'User deleted' } as APIResponse);
  } catch (error) {
    logger.error('deleteUserController error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to delete user' } as APIResponse);
  }
}