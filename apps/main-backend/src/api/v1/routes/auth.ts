import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '@fundifyhub/prisma';
import { generateAccessToken } from '../../../utils/jwt';
import { createLogger } from '@fundifyhub/logger';
import { jobQueueService } from '../../../services/job-queue';

const logger = createLogger({ serviceName: 'auth-routes' });

const router: Router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phoneNumber: z.string().optional(),
  roles: z.array(z.enum(['CUSTOMER', 'ADMIN', 'AGENT', 'DISTRICT_ADMIN', 'SUPER_ADMIN'])).default(['CUSTOMER'])
});

const checkEmailSchema = z.object({
  email: z.string().email()
});

const checkPhoneSchema = z.object({
  phoneNumber: z.string().min(10)
});

// Helper function to generate OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Check if email is available
router.post('/check-email', async (req: Request, res: Response) => {
  try {
    const { email } = checkEmailSchema.parse(req.body);
    
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    res.json({
      success: true,
      message: 'Email is available'
    });
  } catch (error) {
    logger.error('Check email error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to check email availability'
    });
  }
});

// Check if phone is available
router.post('/check-phone', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = checkPhoneSchema.parse(req.body);
    
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Phone number is already registered'
      });
    }

    res.json({
      success: true,
      message: 'Phone number is available'
    });
  } catch (error) {
    logger.error('Check phone error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to check phone availability'
    });
  }
});

// Send OTP for registration (individual OTP sending)
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { type, email, phoneNumber, firstName, lastName } = req.body;
    
    if (!type || !['EMAIL', 'PHONE'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP type. Must be EMAIL or PHONE'
      });
    }

    const identifier = type === 'EMAIL' ? email : phoneNumber;
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: `${type.toLowerCase()} is required`
      });
    }

    // Check if identifier already exists
    const existingUser = await prisma.user.findFirst({
      where: type === 'EMAIL' 
        ? { email: email.toLowerCase() }
        : { phoneNumber }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `${type === 'EMAIL' ? 'Email' : 'Phone number'} is already registered`
      });
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await prisma.oTPVerification.create({
      data: {
        identifier: type === 'EMAIL' ? email.toLowerCase() : phoneNumber,
        type,
        code,
        expiresAt,
        attempts: 0,
        maxAttempts: 3
      }
    });

    // Queue OTP job for job worker
    try {
      const userName = `${firstName} ${lastName}`.trim();
      
      if (type === 'EMAIL') {
        await jobQueueService.addEmailOTP({
          recipient: identifier,
          otp: code,
          userName,
          templateType: 'VERIFICATION'
        });
      } else {
        await jobQueueService.addWhatsAppOTP({
          recipient: identifier,
          otp: code,
          userName,
          templateType: 'VERIFICATION'
        });
      }

      logger.info(`${type} OTP job queued for ${identifier}`);
    } catch (queueError) {
      logger.error(`Failed to queue ${type} OTP job:`, queueError as Error);
    }

    res.json({
      success: true,
      message: `OTP sent successfully to your ${type.toLowerCase()}`,
    });
  } catch (error) {
    logger.error('Send OTP error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});

// Verify individual OTP
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { type, otp, email, phoneNumber } = req.body;
    
    if (!type || !['EMAIL', 'PHONE'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP type. Must be EMAIL or PHONE'
      });
    }

    const identifier = type === 'EMAIL' ? email : phoneNumber;
    if (!identifier || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Identifier and OTP are required'
      });
    }

    // Find the OTP record
    const otpRecord = await prisma.oTPVerification.findFirst({
      where: {
        identifier: type === 'EMAIL' ? email.toLowerCase() : phoneNumber,
        type,
        isUsed: false,
        isVerified: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'No valid OTP found. Please request a new OTP.'
      });
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await prisma.oTPVerification.update({
        where: { id: otpRecord.id },
        data: { isUsed: true }
      });
      
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.'
      });
    }

    // Check attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: 'Maximum OTP attempts exceeded. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (otpRecord.code !== otp) {
      // Increment attempts
      await prisma.oTPVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 }
      });

      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${otpRecord.maxAttempts - otpRecord.attempts - 1} attempts remaining.`
      });
    }

    // Mark OTP as verified
    await prisma.oTPVerification.update({
      where: { id: otpRecord.id },
      data: { 
        isVerified: true,
        isUsed: true
      }
    });

    res.json({
      success: true,
      message: `${type.toLowerCase()} verified successfully`
    });

  } catch (error) {
    logger.error('Verify OTP error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed'
    });
  }
});

// Resend OTP
router.post('/resend-otp', async (req: Request, res: Response) => {
  try {
    const { type, email, phoneNumber } = req.body;
    
    if (!type || !['EMAIL', 'PHONE'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP type. Must be EMAIL or PHONE'
      });
    }

    const identifier = type === 'EMAIL' ? email : phoneNumber;
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Identifier is required'
      });
    }

    // Mark previous OTPs as used
    await prisma.oTPVerification.updateMany({
      where: {
        identifier: type === 'EMAIL' ? email.toLowerCase() : phoneNumber,
        type,
        isUsed: false
      },
      data: { isUsed: true }
    });

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await prisma.oTPVerification.create({
      data: {
        identifier: type === 'EMAIL' ? email.toLowerCase() : phoneNumber,
        code: otp,
        type,
        expiresAt,
        attempts: 0,
        maxAttempts: 3
      }
    });

    // Queue OTP job for job worker
    const userName = 'User'; // We don't have firstName/lastName for resend
    
    if (type === 'EMAIL') {
      await jobQueueService.addEmailOTP({
        recipient: identifier,
        otp,
        userName,
        templateType: 'VERIFICATION'
      });
    } else {
      await jobQueueService.addWhatsAppOTP({
        recipient: identifier,
        otp,
        userName,
        templateType: 'VERIFICATION'
      });
    }

    res.json({
      success: true,
      message: `New OTP sent to your ${type.toLowerCase()}`
    });

  } catch (error) {
    logger.error('Resend OTP error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP'
    });
  }
});

// Complete registration after both OTPs are verified
router.post('/complete-registration', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phoneNumber, password } = req.body;
    
    if (!firstName || !lastName || !email || !phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if both email and phone OTPs are verified
    const emailOtpVerified = await prisma.oTPVerification.findFirst({
      where: {
        identifier: email.toLowerCase(),
        type: 'EMAIL',
        isVerified: true,
        isUsed: true,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    const phoneOtpVerified = await prisma.oTPVerification.findFirst({
      where: {
        identifier: phoneNumber,
        type: 'PHONE',
        isVerified: true,
        isUsed: true,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!emailOtpVerified || !phoneOtpVerified) {
      return res.status(400).json({
        success: false,
        message: 'Both email and phone must be verified before registration'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { phoneNumber }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email or phone number'
      });
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        password: hashedPassword,
        phoneNumber,
        roles: ['CUSTOMER'], // Default role for registration
        isActive: true,
        emailVerified: true,
        phoneVerified: true
      }
    });

    const tokenPayload = {
      id: newUser.id,
      userId: newUser.id,
      email: newUser.email,
      roles: newUser.roles,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      emailVerified: newUser.emailVerified,
      phoneVerified: newUser.phoneVerified
    };

    const accessToken = generateAccessToken(tokenPayload);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully',
      data: { user: tokenPayload }
    });

  } catch (error) {
    logger.error('Complete registration error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const tokenPayload = {
      id: user.id,
      userId: user.id,
      email: user.email,
      roles: user.roles,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified
    };

    const accessToken = generateAccessToken(tokenPayload);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: tokenPayload }
    });

  } catch (error) {
    logger.error('Login error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { firstName, lastName, email, password, phoneNumber, roles } = validatedData;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          ...(phoneNumber ? [{ phoneNumber }] : [])
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        password: hashedPassword,
        phoneNumber,
        roles,
        isActive: true,
        emailVerified: false,
        phoneVerified: false
      }
    });

    const tokenPayload = {
      id: newUser.id,
      userId: newUser.id,
      email: newUser.email,
      roles: newUser.roles,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      emailVerified: newUser.emailVerified,
      phoneVerified: newUser.phoneVerified
    };

    const accessToken = generateAccessToken(tokenPayload);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user: tokenPayload }
    });

  } catch (error) {
    logger.error('Registration error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// Get queue statistics (for monitoring)
router.get('/queue-stats', async (req: Request, res: Response) => {
  try {
    const stats = await jobQueueService.getQueueStats();
    
    res.json({
      success: true,
      data: {
        otpQueue: stats,
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Get queue stats error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to get queue statistics'
    });
  }
});

export default router;