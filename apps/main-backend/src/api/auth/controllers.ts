import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { createOtpSession, verifyOtpSession } from '../../utils/otpStore'
import { prisma } from '@fundifyhub/prisma';
import { ROLES } from '@fundifyhub/types';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '@fundifyhub/types';
import logger from '../../utils/logger';
import { APIResponseType } from '../../types';
import { generateAccessToken } from '../../utils/jwt';
import config from '../../utils/config';
import { auditAuth, auditUser } from '../../utils/audit';
import {
  sendOTPNotification,
  sendWelcomeNotification,
  sendLoginAlertNotification,
  sendPasswordResetNotification,
} from '../../utils/notifications';

/**
 * Check if email/phone is available for registration
 *
 * POST /api/v1/auth/check-availability
 * Body: { email?: string, phone?: string }
 * Response: { success: boolean, message: string, data: { available: boolean } }
 *
 * Checks if the provided email or phone number is already registered.
 * At least one of email or phone must be provided.
 */
export async function checkAvailability(
  req: Request,
  res: Response
): Promise<APIResponseType | void> {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      res
        .status(400)
        .json({
          success: false,
          message: 'Email or phone required',
        });
      return;
    }

    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (existingEmail) {
        res
          .status(409)
          .json({
            success: false,
            message: 'Email already exists'
          });
        return;
      }
    }

    if (phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phoneNumber: phone },
      });
      if (existingPhone) {
        res
          .status(409)
          .json({
            success: false,
            message: 'Phone already exists',
          });
        return;
      }
    }

    res
      .status(200)
      .json({
        success: true,
        message: 'Available for registration',
        data: { available: true },
      });
  } catch (error) {
    const contextLogger = logger.child('[check-availability]');
    contextLogger.error('Failed to check availability:', error as Error);
    res
      .status(500)
      .json({
        success: false,
        message: 'Failed to check availability',
      });
  }
}

/**
 * Send OTP to email or phone for verification
 *
 * POST /api/v1/auth/send-otp
 * Body: { email?: string, phone?: string }
 * Response: { success: boolean, message: string, data: { sessionId: string } }
 *
 * Generates a 6-digit OTP, stores it in the database with 10-minute expiry,
 * and enqueues a job to send it via email or WhatsApp.
 * Returns a sessionId for OTP verification.
 */
export async function sendOTP(
  req: Request,
  res: Response
): Promise<APIResponseType | void> {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      res
        .status(400)
        .json({
          success: false,
          message: 'Email or phone required',
        } as APIResponseType);
      return;
    }

    // Use Redis-backed counters for rate limiting so limits apply across instances.
    // Keys: otp:rl:{identifier}:m and otp:rl:{identifier}:h
    const identifier = email?.toLowerCase() || phone as string;
    if (!identifier) {
      res.status(400).json({ success: false, message: 'Email or phone required' } as APIResponseType)
      return
    }

    // central limiter util (tries Redis, falls back to in-memory) for send-rate
    try {
      const { checkAndIncrementOtpRate, checkAndIncrementAttempts } = await import('../../utils/rateLimiter')
      const rl = await checkAndIncrementOtpRate(identifier)
      if (!rl.ok) {
        const msg = rl.reason === 'minute' ? 'Too many OTP requests (per minute). Please try later.' : 'Too many OTP requests (per hour). Please try later.'
        res.status(429).json({ success: false, message: msg } as APIResponseType)
        return
      }

      // Policy B: count sends/resends as attempts. Enforce attempts sliding-window before issuing a new code.
      const attemptsRes = await checkAndIncrementAttempts(identifier)
      if (!attemptsRes.ok) {
        const retryMs = attemptsRes.retryAfterMs ?? Number(config.otp.attemptsWindowMs)
        const retrySeconds = Math.ceil(retryMs / 1000)
        // set Retry-After header in seconds for clients and caches
        res.setHeader('Retry-After', String(retrySeconds))
        res.status(429).json({ success: false, message: 'Maximum OTP attempts exceeded', retryAfterMs: retryMs } as APIResponseType)
        return
      }
    } catch (err) {
      logger.warn('Rate limiter check failed unexpectedly: ' + String(err))
    }

    // Generate 6-digit OTP using crypto and create a Redis-backed session (hybrid: Redis + DB audit)
  const raw = crypto.randomInt(0, 1_000_000)
  const otp = String(raw).padStart(6, '0')
  const { sessionId } = await createOtpSession({ identifier, type: email ? 'EMAIL' : 'PHONE', otp, ttlSeconds: 10 * 60 })

    try {
      // Send OTP notification using the new notification system
      await sendOTPNotification(
        {
          userId: '', // No user yet - this is pre-registration
          email: email || undefined,
          phoneNumber: phone || undefined,
          name: undefined,
        },
        otp,
        10
      );
    } catch (err) {
      logger.error('OTP enqueue error:', err as Error);
    }

    res
      .status(200)
      .json({
        success: true,
        message: 'OTP sent successfully',
        data: { sessionId },
      } as APIResponseType);
  } catch (error) {
    logger.error('Send OTP error:', error as Error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to send OTP' } as APIResponseType);
  }
}

/**
 * Verify OTP code
 *
 * POST /api/v1/auth/verify-otp
 * Body: { sessionId: string, otp: string }
 * Response: { success: boolean, message: string, data: { verified: boolean } }
 *
 * Validates the OTP code against the stored record.
 * Marks the OTP as verified if correct and not expired.
 * Tracks failed attempts and enforces max attempts limit.
 */
export async function verifyOTP(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const { sessionId, otp } = req.body;
    if (!sessionId || !otp)
      return res
        .status(400)
        .json({
          success: false,
          message: 'Session ID and OTP required',
        } as APIResponseType);

    const result = await verifyOtpSession(sessionId, otp);
    if (result.status === 'expired') {
      return res.status(404).json({ success: false, message: 'OTP session not found or expired' } as APIResponseType);
    }
    if (result.status === 'already_used') {
      return res.status(400).json({ success: false, message: 'OTP already used' } as APIResponseType);
    }
    if (result.status === 'too_many_attempts') {
      const retryMs = (result as any).retryAfterMs ?? Number(config.otp.attemptsWindowMs)
      const retrySeconds = Math.ceil(retryMs / 1000)
      res.setHeader('Retry-After', String(retrySeconds))
      return res.status(429).json({ success: false, message: 'Maximum OTP attempts exceeded', retryAfterMs: retryMs } as APIResponseType);
    }
    if (result.status === 'invalid') {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' } as APIResponseType);
    }
    if (result.status === 'verified') {
      return res.status(200).json({ success: true, message: 'OTP verified successfully', data: { sessionId, verified: true } } as APIResponseType);
    }
  } catch (error) {
    logger.error('Verify OTP error:', error as Error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to verify OTP' } as APIResponseType);
  }
}

/**
 * Complete user registration
 * Needs: { email, phoneNumber, firstName, lastName, password }
 * Returns: { success, user }
 */
export async function register(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      // Convert zod errors into a fieldErrors map for frontend convenience
      const fieldErrors: Record<string, string> = {};
      for (const e of parseResult.error.errors) {
        const key = e.path?.[0] ? String(e.path[0]) : 'form'
        if (!fieldErrors[key]) fieldErrors[key] = e.message
      }
      res.status(400).json({
        success: false,
        message: 'Invalid registration data',
        fieldErrors,
      });
      return;
    }
    const { email, password, firstName, lastName, district } = parseResult.data;
    const phoneNumber = req.body.phoneNumber;
    if (!phoneNumber) {
      res.status(400).json({
        success: false,
        message: 'Missing required field: phoneNumber',
      });
      return;
    }

    // Check for verified OTP records for both email and phone
    // Find any OTP audit row that has been verified for the given identifier.
    // Note: verifyOtpSession marks audit rows as `isUsed=true` when the code is verified.
    // We only need to check `isVerified: true` here to confirm verification occurred.
    const emailOtpRecord = await prisma.oTPVerification.findFirst({
      where: {
        identifier: email.toLowerCase(),
        type: 'EMAIL',
        isVerified: true,
      },
    });

    const phoneOtpRecord = await prisma.oTPVerification.findFirst({
      where: {
        identifier: phoneNumber,
        type: 'PHONE',
        isVerified: true,
      },
    });

    if (!emailOtpRecord || !phoneOtpRecord) {
      res.status(400).json({ success: false, message: 'Both email and phone must be verified with OTP before registration' });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { phoneNumber: phoneNumber },
        ],
      },
    });
    if (existing) {
      res.status(409).json({
        success: false,
        message: 'Email or phone already registered',
      });
      return;
    }

  const saltRounds = Number(config.bcrypt.rounds)
  const hashedPassword = await bcrypt.hash(password, saltRounds);
    // TODO: Make bcrypt salt rounds configurable via env (e.g. BCRYPT_ROUNDS). Consider
    // using a transaction here so user creation and OTP marking are atomic.

    try {
      // Use a transaction so user creation and OTP marking are atomic
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: email.toLowerCase(),
            phoneNumber: phoneNumber,
            firstName,
            lastName,
            password: hashedPassword,
            roles: [ROLES.CUSTOMER],
            emailVerified: true,
            phoneVerified: true,
            // district is String[] in Prisma schema
            district: district ? [district] : []
          },
        });

        await tx.oTPVerification.updateMany({
          where: {
            OR: [
              { id: emailOtpRecord.id },
              { id: phoneOtpRecord.id },
            ],
          },
          data: { isUsed: true, userId: created.id },
        });

        return created;
      });

      if (email.toLowerCase()) {
        try {
          await sendWelcomeNotification({
            userId: user.id,
            email: email.toLowerCase(),
            phoneNumber: phoneNumber,
            name: firstName,
          });
        } catch (err) {
          // TODO: Emit metric/alert for failed welcome email enqueue. Consider retries
          // and not blocking registration on welcome-email delivery.
          logger.error('Failed to enqueue welcome email:', err as Error);
        }
      }

      // Audit user registration
      auditUser.created(req, user.id, {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
      }).catch(() => {});

      res.status(201).json({
        success: true,
        message: 'Registration completed successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            phoneNumber: user.phoneNumber,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: Array.isArray(user.roles) ? user.roles : [ROLES.CUSTOMER],
            districts: Array.isArray(user.district) ? user.district : (user.district ? [user.district] : []),
            isActive: user.isActive ?? true,
          },
        },
      });
      return;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
        res.status(409).json({
          success: false,
          message: 'Email or phone already registered',
        });
        return;
      }
      throw err;
    }
  } catch (error) {
    logger.error('Complete registration error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete registration',
    });
    return;
  }
}

/**
 * User login with email and password
 *
 * POST /api/v1/auth/login
 * Body: { email: string, password: string }
 * Response: { success: boolean, message: string, data: { user: User } }
 * Sets: httpOnly accessToken cookie
 *
 * Authenticates user credentials and issues JWT access token.
 * Updates last login timestamp on successful authentication.
 */
export async function login(
  req: Request,
  res: Response
): Promise<APIResponseType | void> {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {}
      for (const e of parseResult.error.errors) {
        const key = e.path?.[0] ? String(e.path[0]) : 'form'
        if (!fieldErrors[key]) fieldErrors[key] = e.message
      }
      res.status(400).json({
        success: false,
        message: 'Invalid login data',
        fieldErrors,
      });
      return;
    }
    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.password) {
      // Audit failed login attempt - user not found
      auditAuth.login(req, '', email.toLowerCase(), false).catch(() => {});
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Audit failed login attempt - wrong password
      auditAuth.login(req, user.id, user.email, false).catch(() => {});
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateAccessToken({
      id: user.id,
      email: user.email,
      roles: user.roles,
      firstName: user.firstName,
      lastName: user.lastName,
      districts: user.district, // user.district is String[] in Prisma schema
      isActive: user.isActive,
    });

    res.cookie('accessToken', token, {
      httpOnly: true,
  secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    // Set a non-httpOnly token for socket authentication
    // This is safe because it's the same token, just accessible to JS for WebSocket auth
    res.cookie('socketToken', token, {
      httpOnly: false,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    // Audit successful login
    auditAuth.login(req, user.id, user.email, true).catch(() => {});

    (async () => {
      try {
        const ip =
          (req.headers['x-forwarded-for'] as string) || req.ip || req.socket?.remoteAddress || '';
        const userAgent = String(req.headers['user-agent'] || '');
        await sendLoginAlertNotification(
          {
            userId: user.id,
            email: user.email,
            phoneNumber: user.phoneNumber || undefined,
            name: user.firstName,
          },
          {
            device: userAgent,
            location: ip,
            time: new Date().toISOString(),
          }
        );
      } catch (err) {
        logger.error('Failed preparing login alert payload:', err as Error);
      }
    })();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: Array.isArray(user.roles) ? user.roles : [ROLES.CUSTOMER],
          districts: user.district, // user.district is String[] in Prisma schema
          isActive: user.isActive ?? true,
        },
      },
    });
    return;
  } catch (error) {
    logger.error('Login error:', error as Error);
    res.status(500).json({ success: false, message: 'Login failed' });
    return;
  }
}

export async function logout(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
      // Audit logout
      auditAuth.logout(req).catch(() => {});
      logger.info(`User logged out: ${userId}`);
    }
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie('socketToken', {
      httpOnly: false,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
    });
    res
      .status(200)
      .json({
        success: true,
        message: 'Logged out successfully',
      } as APIResponseType);
  } catch (error) {
    logger.error('Logout error:', error as Error);
    res
      .status(500)
      .json({ success: false, message: 'Logout failed' } as APIResponseType);
  }
}

/**
 * Change user password
 *
 * POST /api/v1/auth/change-password
 * Body: { currentPassword: string, newPassword: string }
 * Response: { success: boolean, message: string }
 *
 * Requires authentication. Validates current password before updating.
 * Password must meet minimum requirements (8 characters).
 */
export async function changePassword(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
      return;
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long',
      });
      return;
    }

    // Fetch user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true },
    });

    if (!user || !user.password) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
      return;
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      res.status(400).json({
        success: false,
        message: 'New password must be different from current password',
      });
      return;
    }

    // Hash new password
    const saltRounds = Number(config.bcrypt.rounds);
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Audit password change
    auditAuth.passwordChanged(req, userId).catch(() => {});

    logger.info(`Password changed for user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Change password error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
    });
  }
}

// Wire up validation middleware and rate-limiters in the route definitions when ready.

/**
 * Request password reset (Forgot Password)
 *
 * POST /api/v1/auth/forgot-password
 * Body: { email: string }
 * Response: { success: boolean, message: string }
 *
 * Generates a password reset token and sends a reset link via email.
 * Token expires after 1 hour. Always returns success to prevent email enumeration.
 */
export async function forgotPassword(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const e of parseResult.error.errors) {
        const key = e.path?.[0] ? String(e.path[0]) : 'form';
        if (!fieldErrors[key]) fieldErrors[key] = e.message;
      }
      res.status(400).json({
        success: false,
        message: 'Invalid request',
        fieldErrors,
      });
      return;
    }

    const { email } = parseResult.data;
    const normalizedEmail = email.toLowerCase();

    // Always respond with success to prevent email enumeration
    const successResponse = () => {
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    };

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, firstName: true, phoneNumber: true, isActive: true },
    });

    // If user doesn't exist, still return success (prevent enumeration)
    if (!user) {
      logger.debug('[ForgotPassword] User not found, returning generic response', { email: normalizedEmail });
      successResponse();
      return;
    }

    // If user is inactive, still return success (prevent enumeration)
    if (!user.isActive) {
      logger.debug('[ForgotPassword] Inactive user attempted reset', { userId: user.id });
      successResponse();
      return;
    }

    // Generate secure reset token (32 bytes = 64 hex characters)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token before storing (so DB theft doesn't compromise tokens)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Token expires in 1 hour
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Store hashed token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry,
      },
    });

    // Build reset URL
    const frontendUrl = config.server.frontendUrl || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

    // Send password reset email
    try {
      await sendPasswordResetNotification(
        {
          userId: user.id,
          email: user.email,
          phoneNumber: user.phoneNumber || undefined,
          name: user.firstName,
        },
        resetUrl,
        60 // expires in 60 minutes
      );
      logger.info('[ForgotPassword] Reset email sent', { userId: user.id });
    } catch (err) {
      logger.error('[ForgotPassword] Failed to send reset email:', err as Error);
      // Don't fail the request - user can try again
    }

    // Audit the reset request
    auditAuth.passwordResetRequested(req, user.id).catch(() => {});

    successResponse();
  } catch (error) {
    logger.error('[ForgotPassword] Error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
    });
  }
}

/**
 * Reset password with token
 *
 * POST /api/v1/auth/reset-password
 * Body: { token: string, email: string, newPassword: string }
 * Response: { success: boolean, message: string }
 *
 * Validates the reset token and updates the user's password.
 * Token is invalidated after successful use.
 */
export async function resetPassword(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const e of parseResult.error.errors) {
        const key = e.path?.[0] ? String(e.path[0]) : 'form';
        if (!fieldErrors[key]) fieldErrors[key] = e.message;
      }
      res.status(400).json({
        success: false,
        message: 'Invalid request',
        fieldErrors,
      });
      return;
    }

    const { token, email, newPassword } = parseResult.data;
    const normalizedEmail = email.toLowerCase();

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching email and valid token
    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        resetToken: hashedToken,
        resetTokenExpiry: {
          gt: new Date(), // Token must not be expired
        },
      },
      select: { id: true, email: true, password: true },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset.',
      });
      return;
    }

    // Check if new password is same as current (optional but good UX)
    if (user.password) {
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        res.status(400).json({
          success: false,
          message: 'New password must be different from your current password',
        });
        return;
      }
    }

    // Hash new password
    const saltRounds = Number(config.bcrypt.rounds);
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token (atomic transaction)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Audit password reset
    auditAuth.passwordReset(req, user.id).catch(() => {});

    logger.info('[ResetPassword] Password reset successful', { userId: user.id });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    logger.error('[ResetPassword] Error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
    });
  }
}

/**
 * Validate password reset token (check if token is valid)
 *
 * GET /api/v1/auth/validate-reset-token?token=...&email=...
 * Response: { success: boolean, message: string, data?: { valid: boolean } }
 *
 * Allows frontend to check if a reset link is valid before showing the form.
 */
export async function validateResetToken(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { token, email } = req.query;

    if (!token || !email || typeof token !== 'string' || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Token and email are required',
        data: { valid: false },
      });
      return;
    }

    const normalizedEmail = email.toLowerCase();
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Check if token exists and is not expired
    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        resetToken: hashedToken,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
      select: { id: true },
    });

    if (!user) {
      res.status(200).json({
        success: true,
        message: 'Token is invalid or expired',
        data: { valid: false },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: { valid: true },
    });
  } catch (error) {
    logger.error('[ValidateResetToken] Error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate token',
      data: { valid: false },
    });
  }
}
