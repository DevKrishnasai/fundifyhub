import { Request, Response } from 'express';
import { APIResponseType } from '@fundifyhub/types';
import logger from '../utils/logger';
import { Prisma, prisma, UserRole } from '@fundifyhub/prisma';
import { ROLES } from '@fundifyhub/types';
import bcrypt from 'bcrypt';
import { checkUserExists } from '../services/user.service';
import { auditUser } from '../../utils/audit';
import { sendAdminUserCreatedNotification } from '../../utils/notifications';
import crypto from 'crypto';

/**
 * Generate a secure random password
 */
function generateSecurePassword(length: number = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const randomBytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

export async function createUserController(req: Request, res: Response): Promise<void> {
  try {
    const { email, firstName, lastName, phoneNumber, district, roles, isActive } = req.body;

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

    // Generate a secure temporary password
    const tempPassword = generateSecurePassword(12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const userData: Prisma.UserCreateInput = {
      email: email.toLowerCase(),
      firstName,
      lastName,
      phoneNumber,
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
        createdAt: true,
        updatedAt: true,
        districtAssignments: {
          where: { deletedAt: null },
          select: {
            districtId: true,
            isPrimary: true,
            district: { select: { id: true, name: true, code: true } }
          }
        },
      },
    });

    // Create district assignments if provided
    if (district && Array.isArray(district) && district.length > 0) {
      await prisma.userDistrictAssignment.createMany({
        data: district.map((districtId: string, idx: number) => ({
          userId: user.id,
          districtId,
          isPrimary: idx === 0,
        })),
      });
    }

    // Get admin name for notification
    const adminUser = req.user;
    const adminName = adminUser 
      ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || adminUser.email
      : 'Administrator';

    // Get district names from assignments for notification
    const userDistrictNames = user.districtAssignments?.map(a => a.district.name) || [];

    // Send notification with credentials to the new user
    sendAdminUserCreatedNotification(
      {
        userId: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber || undefined,
        name: `${user.firstName} ${user.lastName || ''}`.trim(),
      },
      {
        tempPassword,
        createdByAdmin: adminName,
        assignedRoles: user.roles as string[],
        assignedDistricts: userDistrictNames,
      }
    ).catch((err) => {
      logger.error('Failed to send admin user created notification:', err);
    });

    // Audit: User created by admin
    auditUser.created(req, user.id, {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      districts: userDistrictNames,
      createdByAdmin: true,
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'User created successfully. Login credentials have been sent to their email.',
      data: user
    } as APIResponseType);
  } catch (error) {
    logger.error('createUserController error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to create user' } as APIResponseType);
  }
}

export async function listUsersController(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 10)));
    const skip = (page - 1) * limit;

    const { role, district, isActive, search } = req.query;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (role && typeof role === 'string') {
      // Cast role string to UserRole enum
      where.roles = { has: role as UserRole };
    }

    if (district && typeof district === 'string') {
      where.districtAssignments = {
        some: {
          districtId: district,
          deletedAt: null,
        },
      };
    }

    if (isActive !== undefined && typeof isActive === 'string') {
      where.isActive = isActive === 'true';
    }

    if (search && typeof search === 'string' && search.trim()) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          roles: true,
          isActive: true,
          phoneNumber: true,
          createdAt: true,
          updatedAt: true,
          districtAssignments: {
            where: { deletedAt: null },
            select: {
              districtId: true,
              isPrimary: true,
              district: { select: { id: true, name: true, code: true } }
            }
          },
          _count: {
            select: {
              requests: true,
            }
          }
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Transform users to include districts array for frontend compatibility
    const transformedUsers = users.map(user => ({
      ...user,
      districts: user.districtAssignments?.map(a => a.district.name) || [],
    }));

    res.status(200).json({
      success: true,
      message: 'Users retrieved',
      data: {
        users: transformedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    } as APIResponseType);
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
      select: { 
        isActive: true, 
        firstName: true, 
        lastName: true, 
        email: true, 
        roles: true, 
        phoneNumber: true,
        districtAssignments: {
          where: { deletedAt: null },
          select: {
            districtId: true,
            district: { select: { id: true, name: true } }
          }
        },
      }
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
        createdAt: true,
        updatedAt: true,
        districtAssignments: {
          where: { deletedAt: null },
          select: {
            districtId: true,
            isPrimary: true,
            district: { select: { id: true, name: true, code: true } }
          }
        },
      },
    });

    // Handle district assignments update if provided
    if (payload.district !== undefined && Array.isArray(payload.district)) {
      // Soft delete existing assignments
      await prisma.userDistrictAssignment.updateMany({
        where: { userId: id, deletedAt: null },
        data: { deletedAt: new Date(), deletedBy: req.user?.id },
      });
      // Create new assignments
      if (payload.district.length > 0) {
        await prisma.userDistrictAssignment.createMany({
          data: payload.district.map((districtId: string, idx: number) => ({
            userId: id,
            districtId,
            isPrimary: idx === 0,
            assignedBy: req.user?.id,
          })),
        });
      }
    }

    // Audit: User updated by admin
    // Track what changed
    const changes: Record<string, unknown> = {};
    const previousValues: Record<string, unknown> = {};

    if (payload.isActive !== undefined && payload.isActive !== currentUser.isActive) {
      changes.isActive = payload.isActive;
      previousValues.isActive = currentUser.isActive;
    }
    if (payload.roles && JSON.stringify(payload.roles) !== JSON.stringify(currentUser.roles)) {
      changes.roles = payload.roles;
      previousValues.roles = currentUser.roles;
      // Also log role change specifically
      auditUser.roleChanged(req, id, currentUser.roles, payload.roles).catch(() => {});
    }
    if (payload.firstName !== undefined && payload.firstName !== currentUser.firstName) {
      changes.firstName = payload.firstName;
      previousValues.firstName = currentUser.firstName;
    }
    if (payload.lastName !== undefined && payload.lastName !== currentUser.lastName) {
      changes.lastName = payload.lastName;
      previousValues.lastName = currentUser.lastName;
    }
    if (payload.phoneNumber !== undefined && payload.phoneNumber !== currentUser.phoneNumber) {
      changes.phoneNumber = payload.phoneNumber;
      previousValues.phoneNumber = currentUser.phoneNumber;
    }
    // Track district changes
    const currentDistrictIds = currentUser.districtAssignments?.map(a => a.districtId) || [];
    if (payload.district !== undefined && JSON.stringify(payload.district) !== JSON.stringify(currentDistrictIds)) {
      changes.district = payload.district;
      previousValues.district = currentDistrictIds;
    }

    if (Object.keys(changes).length > 0) {
      auditUser.updated(req, id, changes, previousValues).catch(() => {});
    }
    
    res.status(200).json({ success: true, message: 'User updated', data: updated } as APIResponseType);
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

    // Get user data before deletion for audit
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        districtAssignments: {
          where: { deletedAt: null },
          select: {
            district: { select: { name: true } }
          }
        },
      },
    });

    if (!userToDelete) {
      res.status(404).json({ success: false, message: 'User not found' } as APIResponseType);
      return;
    }

    await prisma.user.delete({ where: { id } });

    // Audit: User deleted by admin
    auditUser.deleted(req, id, {
      email: userToDelete.email,
      firstName: userToDelete.firstName,
      lastName: userToDelete.lastName,
      roles: userToDelete.roles,
      districts: userToDelete.districtAssignments?.map(a => a.district.name) || [],
    }).catch(() => {});

    res.status(200).json({ success: true, message: 'User deleted' } as APIResponseType);
  } catch (error) {
    logger.error('deleteUserController error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to delete user' } as APIResponseType);
  }
}