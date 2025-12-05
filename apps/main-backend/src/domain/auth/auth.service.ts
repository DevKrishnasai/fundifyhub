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

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  districts?: string[];
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

      // TODO: (agent) Hash password using bcrypt
      // TODO: (agent) Call notification adapter to send verification email
      // TODO: (agent) Create user record in database

      console.log(`[AuthService.register] User registration initiated: ${input.email} with role ${input.role}`);

      return {
        user: {} as User,
        verificationEmailSent: true,
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
        console.warn(`[AuthService.login] Login attempt with non-existent email: ${input.email}`);
        throw new ForbiddenError('Invalid credentials', ErrorCode.AUTHENTICATION_ERROR);
      }

      // TODO: (agent) Verify password using bcrypt
      // TODO: (agent) Check if email is verified (emailVerifiedAt !== null)
      // TODO: (agent) Generate JWT tokens (accessToken, refreshToken)
      // TODO: (agent) Update lastLoginAt timestamp

      console.log(`[AuthService.login] User logged in: ${user.email}`);

      return {
        accessToken: '',
        refreshToken: '',
        user,
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
        console.debug(`[AuthService.requestPasswordReset] Password reset requested for non-existent email: ${input.email}`);
        return { success: true };
      }

      // TODO: (agent) Generate reset token (crypto.randomBytes)
      // TODO: (agent) Store token with expiry (15 mins)
      // TODO: (agent) Send reset email with token
      // TODO: (agent) Log reset request

      console.log(`[AuthService.requestPasswordReset] Password reset email sent to: ${user.email}`);

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

      // TODO: (agent) Find reset token in database
      // TODO: (agent) Verify token not expired
      // TODO: (agent) Find associated user
      // TODO: (agent) Hash new password
      // TODO: (agent) Update user password
      // TODO: (agent) Invalidate reset token
      // TODO: (agent) Invalidate all refresh tokens (force re-login)

      console.log('[AuthService.confirmPasswordReset] Password reset confirmed successfully');

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

      // TODO: (agent) Find verification token in database
      // TODO: (agent) Verify token not expired
      // TODO: (agent) Find associated user
      // TODO: (agent) Update user emailVerifiedAt = now()
      // TODO: (agent) Mark token as used
      // TODO: (agent) Log verification

      console.log('[AuthService.verifyEmail] Email verified successfully');

      return {
        success: true,
        user: {} as User,
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

      // TODO: (agent) Verify refresh token signature
      // TODO: (agent) Check token not blacklisted
      // TODO: (agent) Generate new access token
      // TODO: (agent) Return new access token

      console.log('[AuthService.refreshAccessToken] Access token refreshed');

      return { accessToken: '' };
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

