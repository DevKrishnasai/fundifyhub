import { Prisma, prisma } from '@fundifyhub/prisma';
import logger from '../../../utils/logger';

/**
 * Check if a user exists with the given email or phone number
 * Used for validation before creating or updating users
 */
export async function checkUserExists(email?: string, phoneNumber?: string, excludeUserId?: string) {
  try {
    const where: Prisma.UserWhereInput = {};

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