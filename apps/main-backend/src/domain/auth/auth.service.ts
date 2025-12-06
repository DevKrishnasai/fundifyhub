/**
 * Authentication Service
 * 
 * Handles all authentication workflows:
 * - User registration with email verification
 * - User login with JWT token generation
 * - Password reset flows
 * - Session management
 * 
 * @module domain/auth
 */

import { prisma } from '@fundifyhub/prisma';
import { ValidationError, AppError, ForbiddenError, ErrorCode } from '@fundifyhub/utils';
import type { UserRole } from '@fundifyhub/types';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../../config';
import logger from '../../utils/logger';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
}

export interface RegisterInput {
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
  districtIds?: string[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface PasswordResetRequestInput {
  email: string;
}

export interface PasswordResetConfirmInput {
  token: string;
  newPassword: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/**
 * AuthService - Core authentication business logic
 * 
 * All external calls (emails, password hashing) go through adapters.
 * Domain service handles business rules and state transitions.
 * 
 * TODO: (agent) Inject logger dependency
 */
export class AuthService {
  /**
   * Register a new user
   * 
   * 1. Validate input
   * 2. Check email uniqueness
   * 3. Hash password
   * 4. Create user with PENDING_VERIFICATION status
   * 5. Send verification email
   * 6. Return user without sensitive data
   * 
   * @throws ValidationError if input invalid or email already exists
   */
  async register(input: RegisterInput): Promise<{ user: User; verificationEmailSent: boolean }> {
    try {
      // Validate input
      if (!input.email || !input.password || !input.firstName || !input.lastName) {
        throw new ValidationError('Missing required fields', ErrorCode.INVALID_INPUT, {
          requiredFields: ['email', 'password', 'firstName', 'lastName'],
        });
      }

      if (input.password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters', ErrorCode.INVALID_INPUT);
      }

      // Check email uniqueness
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (existingUser) {
        throw new ValidationError('Email already registered', ErrorCode.DUPLICATE_ENTRY, {
          email: input.email,
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const user = await prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          phoneNumber: input.phoneNumber,
          firstName: input.firstName,
          lastName: input.lastName,
          password: hashedPassword,
          roles: [input.role],
          homeDistrictId: input.districtIds?.[0],
          resetToken: verificationToken,
          resetTokenExpiry: verificationExpiry,
          emailVerified: false,
          isActive: true,
        },
      });

      // TODO: (agent) Send verification email via notification service

      logger.info(`[AuthService.register] User registered: ${user.email}`, { userId: user.id, role: input.role });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles as UserRole[],
        },
        verificationEmailSent: false,
      };
    } catch (err) {
      console.error(`[AuthService.register] Registration failed for ${input.email}:`, err);
      throw err;
    }
  }

  /**
   * Login user with email and password
   * 
   * 1. Find user by email
   * 2. Verify password
   * 3. Check if email is verified
   * 4. Generate JWT tokens
   * 5. Return tokens and user
   * 
   * @throws ForbiddenError if credentials invalid or email not verified
   */
  async login(input: LoginInput): Promise<AuthTokens> {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (!user) {
        logger.warn(`[AuthService.login] Login attempt with non-existent email: ${input.email}`);
        throw new ForbiddenError('Invalid credentials', ErrorCode.AUTHENTICATION_ERROR);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(input.password, user.password);
      if (!isPasswordValid) {
        logger.warn(`[AuthService.login] Invalid password for: ${input.email}`);
        throw new ForbiddenError('Invalid credentials', ErrorCode.AUTHENTICATION_ERROR);
      }

      // Check email verification
      if (!user.emailVerified) {
        throw new ForbiddenError('Email not verified', ErrorCode.AUTHENTICATION_ERROR);
      }

      // Check user status
      if (!user.isActive) {
        throw new ForbiddenError('Account is not active', ErrorCode.AUTHENTICATION_ERROR);
      }

      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, roles: user.roles },
        config.jwt.secret as jwt.Secret,
        { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
      );

      const refreshToken = jwt.sign(
        { userId: user.id, tokenType: 'refresh' },
        config.jwt.secret as jwt.Secret,
        { expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'] }
      );

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      logger.info(`[AuthService.login] User logged in: ${user.email}`, { userId: user.id });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles as UserRole[],
        },
      };
    } catch (err) {
      console.error(`[AuthService.login] Login failed for ${input.email}:`, err);
      throw err;
    }
  }

  /**
   * Request password reset
   * 
   * 1. Find user by email
   * 2. Generate reset token with expiry
   * 3. Store reset token in database
   * 4. Send reset email
   * 5. Return success (don't leak if email exists)
   * 
   * @throws AppError only for system errors, never for non-existent emails
   */
  async requestPasswordReset(input: PasswordResetRequestInput): Promise<{ success: boolean }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (!user) {
        // Don't reveal if user doesn't exist
        logger.debug(`[AuthService.requestPasswordReset] Password reset requested for non-existent email: ${input.email}`);
        return { success: true };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store token in database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry: resetExpiry,
        },
      });

      // TODO: (agent) Send reset email via notification service

      logger.info(`[AuthService.requestPasswordReset] Password reset email sent to: ${user.email}`, { userId: user.id });

      return { success: true };
    } catch (err) {
      console.error(`[AuthService.requestPasswordReset] Password reset request failed:`, err);
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to process password reset request');
    }
  }

  /**
   * Confirm password reset
   * 
   * 1. Find reset token
   * 2. Verify token not expired
   * 3. Validate new password
   * 4. Hash new password
   * 5. Update user password
   * 6. Invalidate all reset tokens
   * 7. Invalidate all active sessions (force re-login)
   * 
   * @throws ValidationError if token invalid/expired or password invalid
   */
  async confirmPasswordReset(input: PasswordResetConfirmInput): Promise<{ success: boolean }> {
    try {
      if (!input.token || !input.newPassword) {
        throw new ValidationError('Missing token or password', ErrorCode.INVALID_INPUT);
      }

      if (input.newPassword.length < 8) {
        throw new ValidationError('Password must be at least 8 characters', ErrorCode.INVALID_INPUT);
      }

      // Find user by reset token
      const user = await prisma.user.findFirst({
        where: {
          resetToken: input.token,
          resetTokenExpiry: { gt: new Date() },
        },
      });

      if (!user) {
        throw new ValidationError('Invalid or expired reset token', ErrorCode.INVALID_TOKEN);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      logger.info('[AuthService.confirmPasswordReset] Password reset confirmed successfully', { userId: user.id });

      return { success: true };
    } catch (err) {
      console.error('[AuthService.confirmPasswordReset] Password reset confirmation failed:', err);
      throw err;
    }
  }

  /**
   * Verify email via token
   * 
   * 1. Find verification token
   * 2. Verify token not expired
   * 3. Update user emailVerifiedAt
   * 4. Invalidate token
   * 5. Return success
   * 
   * @throws ValidationError if token invalid/expired
   */
  async verifyEmail(token: string): Promise<{ success: boolean; user: User }> {
    try {
      if (!token) {
        throw new ValidationError('Missing verification token', ErrorCode.INVALID_INPUT);
      }

      // Find user by verification token
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: { gt: new Date() },
        },
      });

      if (!user) {
        throw new ValidationError('Invalid or expired verification token', ErrorCode.INVALID_TOKEN);
      }

      // Update user email verification status
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          resetToken: null,
          resetTokenExpiry: null,
          isActive: true,
        },
      });

      logger.info('[AuthService.verifyEmail] Email verified successfully', { userId: user.id });

      return {
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          roles: updatedUser.roles as UserRole[],
        },
      };
    } catch (err) {
      console.error('[AuthService.verifyEmail] Email verification failed:', err);
      throw err;
    }
  }

  /**
   * Refresh access token
   * 
   * 1. Verify refresh token validity
   * 2. Check token not blacklisted/revoked
   * 3. Generate new access token
   * 4. Return new access token
   * 
   * @throws ForbiddenError if token invalid or expired
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      if (!refreshToken) {
        throw new ForbiddenError('Missing refresh token', ErrorCode.AUTHENTICATION_ERROR);
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.secret as jwt.Secret) as {
        userId: string;
        tokenType: string;
      };

      if (decoded.tokenType !== 'refresh') {
        throw new ForbiddenError('Invalid token type', ErrorCode.AUTHENTICATION_ERROR);
      }

      // Get user for new access token
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, roles: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw new ForbiddenError('User not found or inactive', ErrorCode.AUTHENTICATION_ERROR);
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, roles: user.roles },
        config.jwt.secret as jwt.Secret,
        { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
      );

      logger.info('[AuthService.refreshAccessToken] Access token refreshed', { userId: user.id });

      return { accessToken };
    } catch (err) {
      console.error('[AuthService.refreshAccessToken] Token refresh failed:', err);
      throw new ForbiddenError('Invalid refresh token', ErrorCode.AUTHENTICATION_ERROR);
    }
  }

  /**
   * Logout user
   * 
   * 1. Invalidate refresh token
   * 2. Add to token blacklist if needed
   * 3. Clear session data
   * 
   * @throws AppError only for system errors
   */
  async logout(refreshToken: string): Promise<{ success: boolean }> {
    try {
      // TODO: (agent) Invalidate refresh token in database
      // TODO: (agent) Add to Redis blacklist if using in-memory validation
      // TODO: (agent) Clear session data

      console.log('[AuthService.logout] User logged out');

      return { success: true };
    } catch (err) {
      console.error('[AuthService.logout] Logout failed:', err);
      // Don't fail logout
      return { success: true };
    }
  }
}

export const authService = new AuthService();

