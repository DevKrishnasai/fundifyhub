import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import redis from '../../utils/redis'
import { createOtpSession, verifyOtpSession } from '../../utils/otpStore'
import { prisma } from '@fundifyhub/prisma';
import { LoginAlertPayloadType, OTPVerificationPayloadType, TEMPLATE_NAMES, WelcomePayloadType, SERVICE_NAMES, ROLES } from '@fundifyhub/types';
import { loginSchema, registerSchema } from '@fundifyhub/types';
import logger from '../../utils/logger';
import { APIResponseType } from '../../types';
import queueClient from '../../utils/queues';
import { generateAccessToken } from '../../utils/jwt';
import config from '../../utils/config';

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
      const basePayload: OTPVerificationPayloadType = {
        email: email || '',
        phoneNumber: phone || '',
        otpCode: otp,
        expiresInMinutes: 10,
        companyName: 'Dummy Hub',
        supportUrl: 'https://support.fundifyhub.com',
        verifyUrl: 'https://app.fundifyhub.com/verify-otp',
        companyUrl: 'https://fundifyhub.com',
        logoUrl: 'https://fundifyhub.com/logo.png',
      };

      // Enqueue per-service so template is executed only for the intended channel.
      // If both email and phone are provided (e.g., registration), we enqueue two jobs
      // with service-specific variables to avoid broadcasting to all supported services.
      const enqueueResults: Promise<any>[] = []

      if (email) {
        const emailPayload = { ...basePayload, phoneNumber: '' } as OTPVerificationPayloadType
        enqueueResults.push(queueClient.addAJob(TEMPLATE_NAMES.OTP_VERIFICATION, emailPayload, { services: [SERVICE_NAMES.EMAIL] }));
      }

      if (phone) {
        const whatsappPayload = { ...basePayload, email: '' } as OTPVerificationPayloadType
        // Use WHATSAPP as the channel for phone-based OTPs (template supports it)
        enqueueResults.push(queueClient.addAJob(TEMPLATE_NAMES.OTP_VERIFICATION, whatsappPayload, { services: [SERVICE_NAMES.WHATSAPP] }));
      }

      await Promise.all(enqueueResults);
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
            // Cast to any to satisfy transient type differences between generated Prisma client
            // and local types during the migration. After regenerating clients this can be tightened.
            district: district ? ([district] as any) : ([] as any)
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
          const welcomePayload: WelcomePayloadType = {
            email: email.toLowerCase(),
            phoneNumber: phoneNumber,
            customerName: firstName,
            supportUrl: 'https://support.fundifyhub.com',
            logoUrl: 'https://fundifyhub.com/logo.png',
            companyName: 'Dummy Hub',
            companyUrl: 'https://fundifyhub.com'
          };
          await queueClient.addAJob(TEMPLATE_NAMES.WELCOME, welcomePayload);
        } catch (err) {
          // TODO: Emit metric/alert for failed welcome email enqueue. Consider retries
          // and not blocking registration on welcome-email delivery.
          logger.error('Failed to enqueue welcome email:', err as Error);
        }
      }

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
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
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
  districts: Array.isArray(user.district) ? (user.district as any) : (user.district ? ([user.district] as any) : ([] as any)),
      isActive: user.isActive,
    });

    res.cookie('accessToken', token, {
      httpOnly: true,
  secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    (async () => {
      try {
        const ip =
          (req.headers['x-forwarded-for'] as string) || req.ip || req.socket?.remoteAddress || '';
        const userAgent = String(req.headers['user-agent'] || '');
        const alertPayload: LoginAlertPayloadType = {
          email: user.email,
          phoneNumber: user.phoneNumber!,
          customerName: user.firstName,
          time: new Date().toISOString(),
          location: ip,
          device: userAgent,
          supportUrl: 'https://support.fundifyhub.com',
          resetPasswordUrl: 'https://app.fundifyhub.com/reset-password',
          companyName: 'Dummy Hub',
        };
        await queueClient.addAJob(TEMPLATE_NAMES.LOGIN_ALERT, alertPayload);
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
          districts: Array.isArray(user.district) ? (user.district as any) : (user.district ? ([user.district] as any) : ([] as any)),
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
      logger.info(`User logged out: ${userId}`);
    }
    res.clearCookie('accessToken', {
      httpOnly: true,
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

// Wire up validation middleware and rate-limiters in the route definitions when ready.
