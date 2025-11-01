import { prisma } from '@fundifyhub/prisma';
import { createLogger } from '@fundifyhub/logger';
import bcrypt from 'bcrypt';

const logger = createLogger({ serviceName: 'admin-users-service' });

/**
 * Check if a user exists with the given email or phone number
 * Used for validation before creating or updating users
 */
export async function checkUserExists(email?: string, phoneNumber?: string, excludeUserId?: string) {
  try {
    const where: any = {};

    if (excludeUserId) {
      where.id = { not: excludeUserId };
    }

    where.OR = [];

    if (email) {
      where.OR.push({ email: email.toLowerCase() });
    }

    if (phoneNumber) {
      where.OR.push({ phoneNumber });
    }

    if (where.OR.length === 0) {
      return null;
    }

    const existing = await prisma.user.findFirst({ where });
    return existing;
  } catch (error) {
    logger.error('checkUserExists error:', error as Error);
    throw error;
  }
}

export async function createUser(data: {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  district?: string;
  roles?: string[];
  isActive?: boolean;
}) {
  try {
    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const userData: any = {
      email: data.email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      district: data.district,
      roles: data.roles || ['CUSTOMER'],
      isActive: data.isActive !== undefined ? data.isActive : true,
      password: hashedPassword,
      emailVerified: false,
      phoneVerified: !!data.phoneNumber,
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

    return { user, tempPassword };
  } catch (error) {
    logger.error('createUser error:', error as Error);
    throw error;
  }
}

export async function getAllUsers() {
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
    return users;
  } catch (error) {
    logger.error('getAllUsers error:', error as Error);
    throw error;
  }
}

export async function updateUserById(userId: string, data: Partial<any>) {
  try {
    const allowed: any = {};
    if (typeof data.isActive === 'boolean') allowed.isActive = data.isActive;
    if (Array.isArray(data.roles)) allowed.roles = data.roles;
    if (data.firstName !== undefined) allowed.firstName = data.firstName;
    if (data.lastName !== undefined) allowed.lastName = data.lastName;
    if (data.phoneNumber !== undefined) allowed.phoneNumber = data.phoneNumber;
    if (data.district !== undefined) allowed.district = data.district;

    const updated = await prisma.user.update({
      where: { id: userId },
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

    return updated;
  } catch (error) {
    logger.error('updateUserById error:', error as Error);
    throw error;
  }
}

export async function deleteUserById(userId: string) {
  try {
    // Use soft-delete if your schema supports it; here we hard delete for MVP
    const deleted = await prisma.user.delete({ where: { id: userId } });
    return deleted;
  } catch (error) {
    logger.error('deleteUserById error:', error as Error);
    throw error;
  }
}