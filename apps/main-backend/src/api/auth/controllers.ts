import { Request, Response } from 'express';
import type { APIResponse } from '../../types';
import { logger } from '../../utils/logger';
import { prisma } from '@fundifyhub/prisma';
import bcrypt from 'bcrypt';
import { generateAccessToken } from '../../utils/jwt';
import {
  enqueue,
  QUEUE_NAMES,
  JOB_NAMES,
  DEFAULT_JOB_OPTIONS,
  EMAIL_TEMPLATES,
  WHATSAPP_TEMPLATES,
} from '@fundifyhub/utils';
import type { OTPJobData } from '@fundifyhub/types';
import { OTPType, OTPTemplateType, ServiceName } from '@fundifyhub/types';

/*
 TODOs / Future Improvements (high-level):
 - RATE LIMITING: Add per-endpoint and per-identifier/IP rate limits to prevent abuse and enumeration.
 - OTP: Use crypto-secure OTP generation, enforce cooldowns and daily limits per identifier, add audit logs and cleanup jobs.
 - TRANSACTIONS: Wrap user creation and OTP marking in a DB transaction to avoid races.
 - AUTH: Issue/rotate refresh tokens, store them (hashed), and revoke on logout.
 - LOCKOUT: Track failed login attempts and implement temporary lockout/backoff.
 - VALIDATION: Add strong request validation (zod/joi) and a password policy.
 - MONITORING: Emit metrics and alerts for OTP sends, queue failures, login spikes.
*/

/**
 * Check if email/phone is available
 * Needs: { email?, phone? }
 * Returns: { success, available }
 */
export async function checkAvailabilityController(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const { email, phone } = req.body;
    // TODO: Add request validation (e.g. zod/joi). Also apply rate-limiting middleware to this endpoint
    // to prevent enumeration (throttle by IP and by identifier).

    if (!email && !phone) {
      res
        .status(400)
        .json({
          success: false,
          message: 'Email or phone required',
        } as APIResponse);
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
            message: 'Email already exists',
          } as APIResponse);
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
          } as APIResponse);
        return;
      }
    }

    res
      .status(200)
      .json({
        success: true,
        message: 'Email/phone available',
        data: { available: true },
      } as APIResponse);
  } catch (error) {
    logger.error('Check availability error:', error as Error);
    res
      .status(500)
      .json({
        success: false,
        message: 'Failed to check availability',
      } as APIResponse);
  }
}

/**
 * Send OTP to email or phone
 * Needs: { email?, phone? }
 * Returns: { success, sessionId }
 */
export async function sendOTPController(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      res
        .status(400)
        .json({
          success: false,
          message: 'Email or phone required',
        } as APIResponse);
      return;
    }

  // TODO: Replace Math.random with a crypto-secure generator (e.g. crypto.randomInt)
  // and consider using longer or HMAC-based OTPs depending on security requirements.
  // Also: enforce per-identifier cooldown (e.g. max 1 OTP / 60s) and daily caps.
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const identifier = email?.toLowerCase() || phone;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store OTP
    const otpRecord = await prisma.oTPVerification.create({
      data: {
        identifier,
        type: email ? 'EMAIL' : 'PHONE',
        code: otp,
        expiresAt,
      },
    });

    // Enqueue OTP delivery (best-effort)
    try {
      // Note: queue/job names and payload shape may change over time — keep the
      // central `packages/utils/src/queue-names.ts` and `packages/utils/src/templates.ts`
      // in sync with job-worker adapters. We attach the chosen template body here
      // (from shared utils) so it's easy to review/change later.
      const jobPayload = {
        recipient: identifier,
        otp,
        userName: identifier,
        type: email ? OTPType.EMAIL : OTPType.WHATSAPP,
        serviceType: email ? ServiceName.EMAIL : ServiceName.WHATSAPP,
        templateType: OTPTemplateType.VERIFICATION,
        // Include the template object for review/inspection by job-workers; the worker
        // may ignore this and look up templates by name instead. Central source of
        // truth is `packages/utils/src/templates.ts`.
        template: email ? EMAIL_TEMPLATES.VERIFICATION : WHATSAPP_TEMPLATES.VERIFICATION,
      } as any;
      await enqueue(QUEUE_NAMES.OTP, JOB_NAMES.SEND_OTP, jobPayload, DEFAULT_JOB_OPTIONS);
    } catch (err) {
      // TODO: Track enqueue failures with metrics and consider retry/backoff outside the queue
      // (e.g. fallback channels). Avoid logging OTP values.
      logger.error('OTP enqueue error:', err as Error);
    }

    res
      .status(200)
      .json({
        success: true,
        message: 'OTP sent successfully',
        data: { sessionId: otpRecord.id },
      } as APIResponse);
  } catch (error) {
    logger.error('Send OTP error:', error as Error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to send OTP' } as APIResponse);
  }
}

/**
 * Verify OTP code
 * Needs: { sessionId, otp }
 * Returns: { success, verified }
 */
export async function verifyOTPController(
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
        } as APIResponse);

    const otpRecord = await prisma.oTPVerification.findUnique({
      where: { id: sessionId },
    });
    if (!otpRecord)
      return res
        .status(404)
        .json({
          success: false,
          message: 'OTP session not found',
        } as APIResponse);

    if (otpRecord.expiresAt < new Date())
      return res
        .status(400)
        .json({ success: false, message: 'OTP expired' } as APIResponse);
    if (otpRecord.attempts >= otpRecord.maxAttempts)
      return res
        .status(429)
        .json({
          success: false,
          message: 'Maximum OTP attempts exceeded',
        } as APIResponse);

    // TODO: Consider adding an exponential backoff or temporary lock on repeated failures
    // and emitting metrics/alerts when max attempts are reached.
    if (otpRecord.code !== otp) {
      await prisma.oTPVerification.update({
        where: { id: sessionId },
        data: { attempts: otpRecord.attempts + 1 },
      });
      return res
        .status(400)
        .json({ success: false, message: 'Invalid OTP code' } as APIResponse);
    }

    await prisma.oTPVerification.update({
      where: { id: sessionId },
      data: { isVerified: true },
    });
    // TODO: Consider marking the OTP as used or scheduling its deletion. Add an audit record
    // for verification events (successful/failed) for security investigations.
    return res
      .status(200)
      .json({
        success: true,
        message: 'OTP verified successfully',
        data: { sessionId, verified: true },
      } as APIResponse);
  } catch (error) {
    logger.error('Verify OTP error:', error as Error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to verify OTP' } as APIResponse);
  }
}

/**
 * Complete user registration
 * Needs: { sessionId, firstName, lastName, password }
 * Returns: { success, user }
 */
export async function registerController(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const { sessionId, firstName, lastName, password } = req.body;
    if (!sessionId || !firstName || !lastName || !password)
      return res
        .status(400)
        .json({
          success: false,
          message: 'Missing required fields',
        } as APIResponse);

    // TODO: Validate password strength and user inputs. Consider using a schema validator
    // and provide structured validation errors.

    const otpRecord = await prisma.oTPVerification.findUnique({
      where: { id: sessionId },
    });
    if (!otpRecord || !otpRecord.isVerified)
      return res
        .status(400)
        .json({ success: false, message: 'OTP not verified' } as APIResponse);

    const identifier = otpRecord.identifier.trim();
    const isEmail = otpRecord.type === 'EMAIL';
    const emailToUse = isEmail ? identifier.toLowerCase() : undefined;
    const phoneToUse = !isEmail ? identifier : undefined;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          ...(emailToUse ? [{ email: emailToUse }] : []),
          ...(phoneToUse ? [{ phoneNumber: phoneToUse }] : []),
        ],
      },
    });
    if (existing)
      return res
        .status(409)
        .json({
          success: false,
          message: 'Email or phone already registered',
        } as APIResponse);

    const hashedPassword = await bcrypt.hash(password, 10);
    // TODO: Make bcrypt salt rounds configurable via env (e.g. BCRYPT_ROUNDS). Consider
    // using a transaction here so user creation and OTP marking are atomic.
    const placeholderEmail = phoneToUse
      ? `phone+${phoneToUse.replace(/[^0-9]/g, '')}@no-reply.fundifyhub.local`
      : undefined;

    try {
      // TODO: Use prisma.$transaction to create user and mark OTP as used atomically.
      const user = await prisma.user.create({
        data: {
          email: emailToUse ?? placeholderEmail!,
          phoneNumber: phoneToUse ?? undefined,
          firstName,
          lastName,
          password: hashedPassword,
          roles: ['CUSTOMER'],
          emailVerified: !!emailToUse,
          phoneVerified: !!phoneToUse,
        },
      });

      await prisma.oTPVerification.update({
        where: { id: sessionId },
        data: { isUsed: true, userId: user.id },
      });

      if (emailToUse) {
        try {
          // Use central EMAIL_TEMPLATES for the welcome email content. If the
          // job-worker expects only a template key (e.g. 'WELCOME'), it can use
          // `templateKey` below; we also provide the template body for convenience.
          await enqueue(QUEUE_NAMES.EMAIL, JOB_NAMES.WELCOME_EMAIL, {
            recipient: user.email,
            userId: user.id,
            templateKey: 'WELCOME',
            template: EMAIL_TEMPLATES.WELCOME,
          });
        } catch (err) {
          // TODO: Emit metric/alert for failed welcome email enqueue. Consider retries
          // and not blocking registration on welcome-email delivery.
          logger.error('Failed to enqueue welcome email:', err as Error);
        }
      }

      return res
        .status(201)
        .json({
          success: true,
          message: 'Registration completed successfully',
          data: {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
            },
          },
        } as APIResponse);
    } catch (err: any) {
      if (err?.code === 'P2002')
        return res
          .status(409)
          .json({
            success: false,
            message: 'Email or phone already registered',
          } as APIResponse);
      throw err;
    }
  } catch (error) {
    logger.error('Complete registration error:', error as Error);
    return res
      .status(500)
      .json({
        success: false,
        message: 'Failed to complete registration',
      } as APIResponse);
  }
}

/**
 * Login user
 * Needs: { email, password }
 * Returns: { success, user }
 * Sets: httpOnly accessToken cookie
 */
export async function loginController(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({
          success: false,
          message: 'Email and password required',
        } as APIResponse);

    // TODO: Apply rate-limiting and failed-attempt tracking (per account and per IP).
    // Consider adding captcha or progressive delays after repeated failures.

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.password)
      return res
        .status(401)
        .json({
          success: false,
          message: 'Invalid email or password',
        } as APIResponse);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res
        .status(401)
        .json({
          success: false,
          message: 'Invalid email or password',
        } as APIResponse);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateAccessToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      roles: user.roles,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    });

    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    // TODO: Issue and persist a refresh token (hashed) to support session rotation and revocation.
    // Also consider setting SameSite=None + secure for cross-site clients if needed.

    return res
      .status(200)
      .json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        },
      } as APIResponse);
  } catch (error) {
    logger.error('Login error:', error as Error);
    return res
      .status(500)
      .json({ success: false, message: 'Login failed' } as APIResponse);
  }
}

/**
 * Logout user
 * Needs: {} (empty)
 * Returns: { success }
 * Clears: accessToken cookie
 */
export async function logoutController(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const userId = (req as any).user?.id;
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
      logger.info(`User logged out: ${userId}`);
      // TODO: Revoke all active sessions for the user if requested. Consider device/session
      // management so users can see and revoke sessions.
    }
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return res
      .status(200)
      .json({
        success: true,
        message: 'Logged out successfully',
      } as APIResponse);
  } catch (error) {
    logger.error('Logout error:', error as Error);
    return res
      .status(500)
      .json({ success: false, message: 'Logout failed' } as APIResponse);
  }
}

// Wire up validation middleware and rate-limiters in the route definitions when ready.
