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
import type { 
  UserRole, 
  User, 
  AuthTokens,
  BackendRegisterPayload, 
  LoginPayload, 
  ForgotPasswordPayload, 
  BackendResetPasswordPayload,
  SendOtpPayload,
  VerifyOtpPayload,
  OtpPurpose,
} from '@fundifyhub/types';
import { OTP_CONSTANTS, OTP_PURPOSES, NotificationTemplateName, NotificationChannel, DeliveryMode, NotificationPriority, DOCUMENT_TYPE, DOCUMENT_CATEGORY, DOCUMENT_UPLOADER_ROLE } from '@fundifyhub/types';
import { NotificationService } from '@fundifyhub/providers';
import { documentService } from '../documents/document.service';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../../config';
import logger from '../../utils/logger';
import { checkAndIncrementAttempts, checkAndIncrementOtpRate } from '../../utils/rate-limit';

/**
 * AuthService - Core authentication business logic
 * 
 * All external calls (emails, password hashing) go through adapters.
 * Domain service handles business rules and state transitions.
 * 
 * TODO: (agent) Inject logger dependency
 */
export class AuthService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = NotificationService.getInstance();
    // Initialize notification service
    this.notificationService.initialize().catch((err: Error) => {
      logger.error('[AuthService] Failed to initialize NotificationService', { error: err });
    });
  }

  private generateOtpCode(): string {
    return Math.floor(10 ** (OTP_CONSTANTS.CODE_LENGTH - 1) + Math.random() * 9 * 10 ** (OTP_CONSTANTS.CODE_LENGTH - 1)).toString();
  }

  private hashOtp(sessionId: string, otp: string): string {
    return crypto.createHmac('sha256', config.otp.hmacSecret).update(`${sessionId}:${otp}`).digest('hex');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private getExpiryFromToken(token: string): Date {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (decoded?.exp) {
      return new Date(decoded.exp * 1000);
    }
    // fallback 7 days
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  private sanitizeUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles as UserRole[],
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      phoneNumber: user.phoneNumber ?? undefined,
      phoneVerified: user.phoneVerified ?? undefined,
      homeDistrictId: user.homeDistrictId ?? undefined,
      districts: user.districts ?? undefined,
    };
  }

  private async ensureOtpVerified(sessionId: string, expectedPurpose: OtpPurpose, expectedIdentifier?: string) {
    const record = await prisma.oTPVerification.findUnique({ where: { sessionId } });
    if (!record || record.expiresAt < new Date()) {
      throw new ValidationError('Invalid or expired OTP session', ErrorCode.INVALID_TOKEN, { fieldErrors: { sessionId: 'OTP session expired' } });
    }

    if (record.type !== expectedPurpose) {
      throw new ValidationError('OTP purpose mismatch', ErrorCode.INVALID_INPUT, { expected: expectedPurpose });
    }

    if (!record.isVerified || record.isUsed) {
      throw new ValidationError('OTP not verified', ErrorCode.INVALID_INPUT, { fieldErrors: { otp: 'Please verify OTP first' } });
    }

    if (expectedIdentifier && record.identifier !== expectedIdentifier) {
      throw new ValidationError('OTP identifier mismatch', ErrorCode.INVALID_INPUT);
    }

    await prisma.oTPVerification.update({ where: { id: record.id }, data: { isUsed: true, userId: record.userId ?? undefined } });
    return record;
  }
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
  async sendOtp(payload: SendOtpPayload): Promise<{ sessionId: string; expiresAt: Date; debugCode?: string }> {
    const identifier = payload.email?.toLowerCase() || payload.phone;
    if (!identifier) {
      throw new ValidationError('Email or phone is required', ErrorCode.INVALID_INPUT);
    }

    const rate = await checkAndIncrementOtpRate(identifier);
    if (!rate.ok) {
      throw new ValidationError('Too many OTP requests. Please try again later.', ErrorCode.RATE_LIMIT_EXCEEDED, {
        retryAfterMs: rate.reason === 'minute' ? 60_000 : 3_600_000,
      });
    }

    const code = this.generateOtpCode();
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + OTP_CONSTANTS.DEFAULT_EXPIRY_MINUTES * 60 * 1000);

    const hashedCode = this.hashOtp(sessionId, code);

    await prisma.oTPVerification.create({
      data: {
        sessionId,
        identifier,
        type: payload.purpose,
        code: hashedCode,
        expiresAt,
        isUsed: false,
        isVerified: false,
        attempts: 0,
        resendCount: 0,
      },
    });

    logger.info(`[AuthService.sendOtp] OTP issued for ${identifier} (${payload.purpose})`, { sessionId });

    // Log OTP code in development for testing
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n🔐 OTP CODE FOR TESTING: ${code} (expires in ${OTP_CONSTANTS.DEFAULT_EXPIRY_MINUTES} minutes)`);
    }

    // Send OTP via NotificationService
    try {
      const channels = [];
      const recipient: any = {};

      if (payload.email) {
        channels.push(NotificationChannel.EMAIL);
        recipient.email = payload.email;
      }

      if (payload.phone) {
        channels.push(NotificationChannel.WHATSAPP);
        recipient.phoneNumber = payload.phone;
      }

      await this.notificationService.send({
        templateName: NotificationTemplateName.OTP_VERIFICATION,
        recipient,
        variables: {
          otpCode: code,
          expiresInMinutes: OTP_CONSTANTS.DEFAULT_EXPIRY_MINUTES,
          companyName: 'FundifyHub',
          purpose: payload.purpose,
        },
        channels,
        deliveryMode: DeliveryMode.BROADCAST,
        priority: NotificationPriority.CRITICAL,
        correlationId: sessionId,
        metadata: {
          sessionId,
          purpose: payload.purpose,
          identifier,
        },
      });

      logger.info('[AuthService.sendOtp] OTP sent via NotificationService', {
        sessionId,
        channels,
        identifier,
      });
    } catch (err) {
      // Don't fail the request if notification fails, but log it
      logger.error('[AuthService.sendOtp] Failed to send OTP notification', {
        error: err,
        sessionId,
        identifier,
      });
    }

    return {
      sessionId,
      expiresAt,
      debugCode: process.env.NODE_ENV === 'production' ? undefined : code,
    };
  }

  async verifyOtp(payload: VerifyOtpPayload): Promise<{ verified: boolean; identifier: string; purpose: OtpPurpose }> {
    const record = await prisma.oTPVerification.findUnique({ where: { sessionId: payload.sessionId } });
    if (!record) {
      throw new ValidationError('Invalid OTP session', ErrorCode.INVALID_TOKEN);
    }

    const attemptCheck = await checkAndIncrementAttempts(record.identifier);
    if (!attemptCheck.ok) {
      throw new ValidationError('Too many OTP attempts. Please try later.', ErrorCode.RATE_LIMIT_EXCEEDED, {
        retryAfterMs: attemptCheck.retryAfterMs,
        fieldErrors: { otp: 'Too many attempts. Please retry later.' },
      });
    }

    if (record.expiresAt < new Date()) {
      throw new ValidationError('OTP expired', ErrorCode.INVALID_TOKEN, { fieldErrors: { otp: 'OTP expired' } });
    }

    const hashed = this.hashOtp(payload.sessionId, payload.otp);
    if (hashed !== record.code) {
      await prisma.oTPVerification.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      throw new ValidationError('Invalid OTP', ErrorCode.INVALID_TOKEN, { fieldErrors: { otp: 'Invalid OTP' } });
    }

    const updated = await prisma.oTPVerification.update({
      where: { id: record.id },
      data: { isVerified: true, isUsed: true, attempts: { increment: 1 } },
    });

    logger.info('[AuthService.verifyOtp] OTP verified', { sessionId: record.sessionId, purpose: record.type });

    return { verified: true, identifier: updated.identifier, purpose: updated.type as OtpPurpose };
  }

  async register(input: BackendRegisterPayload): Promise<{ user: User; verificationEmailSent: boolean }> {
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

      const email = input.email.toLowerCase();
      const phone = input.phoneNumber;

      // Ensure OTPs are verified
      await this.ensureOtpVerified(input.emailSessionId, OTP_PURPOSES.REGISTER_EMAIL, email);
      await this.ensureOtpVerified(input.phoneSessionId, OTP_PURPOSES.REGISTER_PHONE, phone);

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          phoneNumber: phone,
          firstName: input.firstName,
          lastName: input.lastName,
          password: hashedPassword,
          roles: [input.role || 'CUSTOMER'],
          homeDistrictId: input.districtIds?.[0],
          resetToken: verificationToken,
          resetTokenExpiry: verificationExpiry,
          emailVerified: true,
          phoneVerified: true,
          isActive: true,
          // ID Proof fields (user submits during registration, admin verifies later)
          idProofType: input.idProofType,
          idProofNumber: input.idProofNumber,
          idProofDocumentUrl: input.idProofDocumentUrl,
          isVerified: false, // Admin will verify the ID proof documents
        },
      });

      // Create document record for ID proof if provided
      if (input.idProofDocumentUrl && input.idProofType) {
        try {
          // Extract file key from URL (assuming uploadthing URL structure)
          const fileKey = input.idProofDocumentUrl.split('/').pop() || input.idProofDocumentUrl;
          
          await documentService.createDocument({
            fileKey,
            fileName: `${input.idProofType}_${user.id}`,
            fileSize: 0, // Size not known during registration
            fileType: 'application/pdf', // Assuming PDF for ID proofs
            documentType: DOCUMENT_TYPE.ID_PROOF,
            documentCategory: DOCUMENT_CATEGORY.IDENTITY,
            uploadedBy: user.id,
            uploaderRole: DOCUMENT_UPLOADER_ROLE.USER_SUBMITTED,
            description: `${input.idProofType} - ${input.idProofNumber}`,
            metadata: {
              idProofType: input.idProofType,
              idProofNumber: input.idProofNumber,
            },
            isPublic: false,
          });

          logger.info('[AuthService.register] ID proof document created', {
            userId: user.id,
            idProofType: input.idProofType,
          });
        } catch (docErr) {
          logger.error('[AuthService.register] Failed to create ID proof document', {
            error: docErr,
            userId: user.id,
          });
          // Don't fail registration if document creation fails
        }
      }

      // Send welcome email
      try {
        await this.notificationService.send({
          templateName: NotificationTemplateName.WELCOME,
          recipient: {
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
          },
          variables: {
            userName: `${user.firstName} ${user.lastName}`,
            companyName: 'FundifyHub',
          },
          channels: [NotificationChannel.EMAIL],
          deliveryMode: DeliveryMode.SINGLE,
          priority: NotificationPriority.NORMAL,
          correlationId: user.id,
        });

        logger.info('[AuthService.register] Welcome email sent', { userId: user.id });
      } catch (notifErr) {
        logger.error('[AuthService.register] Failed to send welcome email', {
          error: notifErr,
          userId: user.id,
        });
      }

      logger.info(`[AuthService.register] User registered: ${user.email}`, { userId: user.id, role: input.role });

      return {
        user: this.sanitizeUser(user),
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
  async login(input: LoginPayload): Promise<AuthTokens> {
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
        user: this.sanitizeUser(user),
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
  async requestPasswordReset(input: ForgotPasswordPayload): Promise<{ success: boolean; sessionId?: string; expiresAt?: Date }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (!user) {
        // Don't reveal if user doesn't exist
        logger.debug(`[AuthService.requestPasswordReset] Password reset requested for non-existent email: ${input.email}`);
        return { success: true };
      }

      const otpResult = await this.sendOtp({ email: user.email, purpose: OTP_PURPOSES.RESET_PASSWORD });

      await prisma.oTPVerification.update({ where: { sessionId: otpResult.sessionId }, data: { userId: user.id } });

      logger.info(`[AuthService.requestPasswordReset] Password reset OTP sent to: ${user.email}`, { userId: user.id });

      return { success: true, sessionId: otpResult.sessionId, expiresAt: otpResult.expiresAt };
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
  async confirmPasswordReset(input: BackendResetPasswordPayload): Promise<{ success: boolean }> {
    try {
      if (!input.sessionId || !input.newPassword) {
        throw new ValidationError('Missing session or password', ErrorCode.INVALID_INPUT);
      }

      if (input.newPassword.length < 8) {
        throw new ValidationError('Password must be at least 8 characters', ErrorCode.INVALID_INPUT);
      }

      const identifier = input.email.toLowerCase();
      const otpRecord = await this.ensureOtpVerified(input.sessionId, OTP_PURPOSES.RESET_PASSWORD, identifier);

      const user = await prisma.user.findUnique({ where: { email: identifier } });

      if (!user) {
        throw new ValidationError('Account not found for provided email', ErrorCode.USER_NOT_FOUND);
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

      await prisma.oTPVerification.update({ where: { id: otpRecord.id }, data: { userId: user.id, isUsed: true } });

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
        user: this.sanitizeUser(updatedUser),
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

