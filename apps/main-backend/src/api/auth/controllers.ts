import { Request, Response } from 'express';
import type { APIResponse } from '../../types';
import { logger } from '../../utils/logger';
import { prisma } from '@fundifyhub/prisma';
import bcrypt from 'bcrypt';
import { generateAccessToken } from '../../utils/jwt';
import { enqueue, EMAIL_TEMPLATES, WHATSAPP_TEMPLATES } from '@fundifyhub/utils';
import type { OTPJobData } from '@fundifyhub/types';
import { OTPType, OTPTemplateType, ServiceName } from '@fundifyhub/types';

/**
 * Authentication Controllers
 *
 * This module handles user authentication including:
 * - Email/Phone availability checking
 * - OTP generation and sending
 * - OTP verification
 * - User registration with dual verification
 * - User login/logout
 *
 * Security Features:
 * - OTP-based verification for both email and phone
 * - Password hashing with bcrypt
 * - JWT token-based authentication
 * - Rate limiting considerations (TODO)
 * - Input validation (TODO)
 */

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
export async function checkAvailabilityController(
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
    const contextLogger = logger.child('[check-availability]');
    contextLogger.error('Failed to check availability:', error as Error);
    res
      .status(500)
      .json({
        success: false,
        message: 'Failed to check availability',
      } as APIResponse);
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

    // Generate 6-digit OTP (TODO: Use crypto-secure random generation)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const identifier = email?.toLowerCase() || phone;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    const otpRecord = await prisma.oTPVerification.create({
      data: {
        identifier,
        type: email ? 'EMAIL' : 'PHONE',
        code: otp,
        expiresAt,
      },
    });

    // Enqueue OTP delivery job using template-driven helper.
    try {
      const jobPayload: OTPJobData = {
        recipient: identifier,
        otp,
        userName: identifier,
        type: email ? OTPType.EMAIL : OTPType.WHATSAPP,
        serviceType: email ? ServiceName.EMAIL : ServiceName.WHATSAPP,
        templateType: OTPTemplateType.VERIFICATION,
      };
      // Determine template name and target service
      const templateName = EMAIL_TEMPLATES.OTP; // both email and whatsapp use same template key internally
      const services = jobPayload.serviceType ? [jobPayload.serviceType] as any : undefined;
      await enqueue(templateName, jobPayload as unknown as Record<string, unknown>, { services });
    } catch (err) {
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
 *
 * POST /api/v1/auth/verify-otp
 * Body: { sessionId: string, otp: string }
 * Response: { success: boolean, message: string, data: { verified: boolean } }
 *
 * Validates the OTP code against the stored record.
 * Marks the OTP as verified if correct and not expired.
 * Tracks failed attempts and enforces max attempts limit.
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
 * Needs: { email, phoneNumber, firstName, lastName, password }
 * Returns: { success, user }
 */
export async function registerController(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const { email, phoneNumber, firstName, lastName, password, district } = req.body;
    if (!email || !phoneNumber || !firstName || !lastName || !password)
      return res
        .status(400)
        .json({
          success: false,
          message: 'Missing required fields: email, phoneNumber, firstName, lastName, password',
        } as APIResponse);

    // TODO: Validate password strength and user inputs. Consider using a schema validator
    // and provide structured validation errors.

    // Check for verified OTP records for both email and phone
    const emailOtpRecord = await prisma.oTPVerification.findFirst({
      where: {
        identifier: email.toLowerCase(),
        type: 'EMAIL',
        isVerified: true,
        isUsed: false,
      },
    });

    const phoneOtpRecord = await prisma.oTPVerification.findFirst({
      where: {
        identifier: phoneNumber,
        type: 'PHONE',
        isVerified: true,
        isUsed: false,
      },
    });

    if (!emailOtpRecord || !phoneOtpRecord)
      return res
        .status(400)
        .json({ success: false, message: 'Both email and phone must be verified with OTP before registration' } as APIResponse);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { phoneNumber: phoneNumber },
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

    try {
      // TODO: Use prisma.$transaction to create user and mark OTPs as used atomically.
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          phoneNumber: phoneNumber,
          firstName,
          lastName,
          password: hashedPassword,
          roles: ['CUSTOMER'],
          emailVerified: true,
          phoneVerified: true,
          district: district
        },
      });

      // Mark OTP records as used
      await prisma.oTPVerification.updateMany({
        where: {
          OR: [
            { id: emailOtpRecord.id },
            { id: phoneOtpRecord.id },
          ],
        },
        data: { isUsed: true, userId: user.id },
      });

      if (email.toLowerCase()) {
        try {
          // Use central EMAIL_TEMPLATES for the welcome email content.
          await enqueue(EMAIL_TEMPLATES.WELCOME_EMAIL, {
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
              phoneNumber: user.phoneNumber,
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
      district: user.district

    });

    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    // add login alert here
    // Fire-and-forget: enqueue a template-driven login alert and don't block the
    // login response. Template existence and required-field validation is the
    // responsibility of the job-worker (template registry + renderer).
    (async () => {
      try {
        const ip =
          (req.headers['x-forwarded-for'] as string) || req.ip || req.socket?.remoteAddress || '';
        const userAgent = String(req.headers['user-agent'] || '');
        const loginPayload = {
          recipient: user.email,
          phone: user.phoneNumber, // Add phone number for WhatsApp
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          loginAt: new Date().toISOString(),
          ip,
          userAgent,
        } as Record<string, unknown>;

        const services: Array<ServiceName> = [];
        if (user.email) services.push(ServiceName.EMAIL);
        if (user.phoneNumber) services.push(ServiceName.WHATSAPP);

        // Enqueue without awaiting to avoid delaying the HTTP response.
        enqueue(EMAIL_TEMPLATES.LOGIN_ALERT, loginPayload, { services }).catch((err: unknown) => {
          logger.error('Failed to enqueue login alert (background):', err as Error);
        });
      } catch (err) {
        logger.error('Failed preparing login alert payload:', err as Error);
      }
    })();

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
 * User logout
 *
 * POST /api/v1/auth/logout
 * Body: {} (empty)
 * Response: { success: boolean, message: string }
 * Clears: accessToken cookie
 *
 * Clears the access token cookie and optionally invalidates refresh tokens.
 * Requires authentication middleware to populate req.user.
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
