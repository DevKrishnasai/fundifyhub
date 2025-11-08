import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '@fundifyhub/prisma';
import { LoginAlertPayloadType, OTPVerificationPayloadType, TEMPLATE_NAMES, WelcomePayloadType } from '@fundifyhub/types';
import logger from '../../utils/logger';
import { APIResponseType } from '../../types';
import queueClient from '../../utils/queues';
import { generateAccessToken } from '../../utils/jwt';

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

    try {
      const jobPayload: OTPVerificationPayloadType = {
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

      queueClient.addAJob(TEMPLATE_NAMES.OTP_VERIFICATION, jobPayload);

    } catch (err) {
      logger.error('OTP enqueue error:', err as Error);
    }

    res
      .status(200)
      .json({
        success: true,
        message: 'OTP sent successfully',
        data: { sessionId: otpRecord.id },
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

    const otpRecord = await prisma.oTPVerification.findUnique({
      where: { id: sessionId },
    });
    if (!otpRecord)
      return res
        .status(404)
        .json({
          success: false,
          message: 'OTP session not found',
        } as APIResponseType);

    if (otpRecord.expiresAt < new Date())
      return res
        .status(400)
        .json({ success: false, message: 'OTP expired' } as APIResponseType);
    if (otpRecord.attempts >= otpRecord.maxAttempts)
      return res
        .status(429)
        .json({
          success: false,
          message: 'Maximum OTP attempts exceeded',
        } as APIResponseType);

    if (otpRecord.code !== otp) {
      await prisma.oTPVerification.update({
        where: { id: sessionId },
        data: { attempts: otpRecord.attempts + 1 },
      });
      return res
        .status(400)
        .json({ success: false, message: 'Invalid OTP code' } as APIResponseType);
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
      } as APIResponseType);
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
): Promise<any> {
  try {
    const { email, phoneNumber, firstName, lastName, password, district } = req.body;
    if (!email || !phoneNumber || !firstName || !lastName || !password)
      return res
        .status(400)
        .json({
          success: false,
          message: 'Missing required fields: email, phoneNumber, firstName, lastName, password',
        } as APIResponseType);

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
        .json({ success: false, message: 'Both email and phone must be verified with OTP before registration' } as APIResponseType);

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
        } as APIResponseType);

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
        } as APIResponseType);
    } catch (err: any) {
      if (err?.code === 'P2002')
        return res
          .status(409)
          .json({
            success: false,
            message: 'Email or phone already registered',
          } as APIResponseType);
      throw err;
    }
  } catch (error) {
    logger.error('Complete registration error:', error as Error);
    return res
      .status(500)
      .json({
        success: false,
        message: 'Failed to complete registration',
      } as APIResponseType);
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
): Promise<any> {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({
          success: false,
          message: 'Email and password required',
        } as APIResponseType);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.password)
      return res
        .status(401)
        .json({
          success: false,
          message: 'Invalid email or password',
        } as APIResponseType);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res
        .status(401)
        .json({
          success: false,
          message: 'Invalid email or password',
        } as APIResponseType);

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
      district: user.district,
      isActive: user.isActive,
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
      } as APIResponseType);
  } catch (error) {
    logger.error('Login error:', error as Error);
    return res
      .status(500)
      .json({ success: false, message: 'Login failed' } as APIResponseType);
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
export async function logout(
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
      } as APIResponseType);
  } catch (error) {
    logger.error('Logout error:', error as Error);
    return res
      .status(500)
      .json({ success: false, message: 'Logout failed' } as APIResponseType);
  }
}

// Wire up validation middleware and rate-limiters in the route definitions when ready.
