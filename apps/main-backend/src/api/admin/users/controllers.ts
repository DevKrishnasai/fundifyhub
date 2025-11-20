import { Request, Response } from 'express';
import { APIResponseType } from '../../../types';
import logger from '../../../utils/logger';
import { Prisma, prisma } from '@fundifyhub/prisma';
import { ROLES } from '@fundifyhub/types';
import bcrypt from 'bcrypt';
import { checkUserExists } from './utils';

export async function createUserController(req: Request, res: Response): Promise<void> {
  try {
    const { email, firstName, lastName, phoneNumber, district, districts, roles, isActive } = req.body;

    if (!email || !firstName) {
      res.status(400).json({ success: false, message: 'Email and firstName are required' } as APIResponseType);
      return;
    }

    // Check if user already exists (reuse logic from registration) 
    const existing = await checkUserExists(email, phoneNumber);

    if (existing) {
      res.status(409).json({
        success: false,
        message: 'User with this email or phone already exists'
      } as APIResponseType);
      return;
    }

    // Generate a temporary password (user will need to reset it)
    const tempPassword = Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Accept either single `district` (legacy) or `districts` (preferred)
    const finalDistricts = Array.isArray(districts)
      ? districts
      : district
        ? (Array.isArray(district) ? district : [district])
        : [];

    const userData: Prisma.UserCreateInput = {
      email: email.toLowerCase(),
      firstName,
      lastName,
      phoneNumber,
      district: finalDistricts as any,
      roles: roles || [ROLES.CUSTOMER],
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

    // Normalize response to use `districts` key for API consumers
    const resp = { ...user, districts: user.district } as any;
    delete (resp as any).district;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: resp
    } as APIResponseType);
  } catch (error) {
    logger.error('createUserController error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to create user' } as APIResponseType);
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
    // Map `district` -> `districts` in response
    const mapped = users.map(u => ({ ...u, districts: u.district }));
    res.status(200).json({ success: true, message: 'Users retrieved', data: mapped } as APIResponseType);
  } catch (error) {
    logger.error('listUsersController error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to retrieve users' } as APIResponseType);
  }
}

export async function updateUserController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const payload = req.body;

    if (!id) {
      res.status(400).json({ success: false, message: 'User id is required' } as APIResponseType);
      return;
    }

    // Get current user state before update
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { isActive: true, firstName: true, email: true }
    });

    if (!currentUser) {
      res.status(404).json({ success: false, message: 'User not found' } as APIResponseType);
      return;
    }

    // Check for email/phone conflicts if they're being updated
    if (payload.email || payload.phoneNumber) {
      const conflictCheck = await checkUserExists(payload.email, payload.phoneNumber, id);

      if (conflictCheck) {
        res.status(409).json({
          success: false,
          message: 'Email or phone number already exists for another user'
        } as APIResponseType);
        return;
      }
    }

    const allowed: Partial<Prisma.UserUpdateInput> = {};
    if (typeof payload.isActive === 'boolean') allowed.isActive = payload.isActive;
    if (Array.isArray(payload.roles)) allowed.roles = payload.roles;
    if (payload.firstName !== undefined) allowed.firstName = payload.firstName;
    if (payload.lastName !== undefined) allowed.lastName = payload.lastName;
    if (payload.phoneNumber !== undefined) allowed.phoneNumber = payload.phoneNumber;
    if (payload.district !== undefined) allowed.district = payload.district;
    if (payload.districts !== undefined) allowed.district = payload.districts;

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
    const resp = { ...updated, districts: updated.district } as any;
    delete (resp as any).district;

    res.status(200).json({ success: true, message: 'User updated', data: resp } as APIResponseType);
  } catch (error) {
    logger.error('updateUserController error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to update user' } as APIResponseType);
  }
}

export async function deleteUserController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, message: 'User id is required' } as APIResponseType);
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'User deleted' } as APIResponseType);
  } catch (error) {
    logger.error('deleteUserController error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to delete user' } as APIResponseType);
  }
}