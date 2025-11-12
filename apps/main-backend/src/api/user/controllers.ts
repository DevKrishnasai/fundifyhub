import { Request, Response } from 'express';
import { Prisma, prisma } from '@fundifyhub/prisma';
import { ASSET_CONDITION, ASSET_TYPE, DOCUMENT_CATEGORY, LOAN_STATUS, REQUEST_STATUS, UserType, AssetPhotoData, AssetPledgePayloadType, ALLOWED_UPDATE_STATUSES, ADMIN_AGENT_ROLES, PENDING_REQUEST_STATUSES } from '@fundifyhub/types';
import logger from '../../utils/logger';
import { generateSignedUrl } from '../../utils/uploadthing';
import { normalizeDistrict } from '../../utils/district';

/**
 * Adds new asset photos to the request (does not delete existing)
 */
async function updateAssetPhotos(tx: Prisma.TransactionClient, requestId: string, assetPhotos: string[], customerId: string, res: Response) {
  const parsedPhotos = validateAssetPhotos(assetPhotos, res);
  if (parsedPhotos === null || parsedPhotos.length === 0) return false;
  await Promise.all(parsedPhotos.map((url: string) =>
    tx.document.create({
      data: {
        requestId,
        fileKey: url, // Assuming url contains the file key from UploadThing
        documentType: 'asset_photo',
        documentCategory: DOCUMENT_CATEGORY.ASSET,
        uploadedBy: customerId,
      },
    })
  ));
  return true;
}

/**
 * GET /user/profile
 * Get current user profile (protected)
 */
export async function getProfileController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not found in token',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    const result = await getUserProfile(req.user.id);
    const statusCode = result.success ? 200 : 404;

    res.status(statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logger.error('Get profile error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
    });
  }
}

/**
 * GET /user/validate
 * Validate authentication status (protected)
 */
export async function validateController(req: Request, res: Response): Promise<void> {
  try {
    // Prevent caching of auth validation responses
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
        data: {
          isAuthenticated: false,
          user: null,
        },
      });
      return;
    }

    logger.info(`Validating auth for user ID: ${req.user.id}`);

    const result = await validateUserAuth(req.user.id);
    const statusCode = result.success ? 200 : 401;

    res.status(statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logger.error('Auth validation error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Authentication validation failed',
    });
  }
}

/**
 * Shared validation and helper functions for asset operations
 */

/**
 * Validates required fields for asset request
 */
function validateAssetFields(fields: {
  district?: string;
  assetType?: string;
  assetBrand?: string;
  assetModel?: string;
  assetCondition?: string;
}, res: Response): boolean {
  const requiredFields = {
    district: { value: fields.district, message: 'district is required' },
    assetType: { value: fields.assetType, message: 'assetType is required' },
    assetBrand: { value: fields.assetBrand, message: 'assetBrand is required' },
    assetModel: { value: fields.assetModel, message: 'assetModel is required' },
    assetCondition: { value: fields.assetCondition, message: 'assetCondition is required' },
  };

  for (const [field, config] of Object.entries(requiredFields)) {
    if (!config.value || typeof config.value !== 'string') {
      res.status(400).json({ success: false, message: config.message });
      return false;
    }
  }
  return true;
}

/**
 * Validates enum values for asset type and condition
 */
function validateAssetEnums(assetType: string, assetCondition: string, res: Response): boolean {
  const isValidAssetType = (type: string) => {
    return Object.values(ASSET_TYPE).includes(type as ASSET_TYPE);
  };
  const isValidAssetCondition = (condition: string) => {
    return Object.values(ASSET_CONDITION).includes(condition as ASSET_CONDITION);
  };

  if (!isValidAssetType(assetType)) {
    res.status(400).json({ 
      success: false, 
      message: assetType + 'Invalid assetType. Must be one of: VEHICLE, PROPERTY, MACHINERY, JEWELRY, ELECTRONICS, OTHER' 
    });
    return false;
  }

  if (!isValidAssetCondition(assetCondition)) {
    res.status(400).json({ 
      success: false, 
      message: 'Invalid assetCondition. Must be one of: EXCELLENT, GOOD, FAIR, POOR' 
    });
    return false;
  }
  return true;
}

/**
 * Validates and parses asset photos array
 */
function validateAssetPhotos(assetPhotos: string[] | undefined, res: Response): string[] | null {
  if (assetPhotos === undefined) return [];
  
  if (!Array.isArray(assetPhotos)) {
    res.status(400).json({ success: false, message: 'assetPhotos must be an array of URLs' });
    return null;
  }
  
  return assetPhotos.filter((p: string) => typeof p === 'string' && p.trim() !== '');
}

/**
 * Builds request data object from input fields
 */
function buildRequestData(fields: {
  district: string;
  assetType: string;
  assetBrand: string;
  assetModel: string;
  assetCondition: string;
  purchaseYear?: number;
  requestedAmount?: number;
  AdditionalDescription?: string;
  customerId: string;
}): Prisma.RequestUncheckedCreateInput {
  const requestData: Prisma.RequestUncheckedCreateInput = {
    district: fields.district,
    assetType: fields.assetType,
    assetBrand: fields.assetBrand,
    assetModel: fields.assetModel,
    assetCondition: fields.assetCondition,
    requestedAmount: typeof fields.requestedAmount === 'number' ? fields.requestedAmount : 0,
    customerId: fields.customerId,
  };

  if (typeof fields.purchaseYear === 'number') {
    requestData.purchaseYear = fields.purchaseYear;
  }

  if (fields.AdditionalDescription) {
    requestData.AdditionalDescription = fields.AdditionalDescription;
  }

  return requestData;
}

/**
 * Handles document creation/update in a transaction
 */
async function handleDocuments(tx: Prisma.TransactionClient, requestId: string, photos: string[], customerId: string) {
  if (photos.length === 0) return;
  
  // Delete existing asset photos
  await tx.document.deleteMany({ 
    where: { requestId, documentType: 'asset_photo' } 
  });
  
  // Create new documents
  await Promise.all(
    photos.map((url) =>
      tx.document.create({
        data: {
          requestId,
          fileKey: url, // Assuming url contains the file key from UploadThing
          documentType: 'asset_photo',
          documentCategory: DOCUMENT_CATEGORY.ASSET,
          uploadedBy: customerId,
        },
      })
    )
  );
}

/**
 * POST /user/add-asset
 * Create a new asset request (protected)
 * 
 * @param req - Express request object
 * @param req.body.district - Customer's district (required)
 * @param req.body.assetPhotos - Array of asset photo URLs (optional)
 * @param req.body.assetType - Type of asset: VEHICLE, PROPERTY, MACHINERY, JEWELRY, ELECTRONICS, OTHER (required)
 * @param req.body.assetBrand - Brand/manufacturer of the asset (required)
 * @param req.body.assetModel - Model/name of the asset (required)
 * @param req.body.purchaseYear - Year of purchase (optional)
 * @param req.body.assetCondition - Condition: EXCELLENT, GOOD, FAIR, POOR (required)
 * @param req.body.requestedAmount - Loan amount requested (optional, defaults to 0)
 * @param req.body.AdditionalDescription - Additional details about the asset (optional)
 * 
 * @param res - Express response object
 * 
 * @returns JSON response
 * - 201: { success: true, message: 'Asset request created successfully', data: { request: Request } }
 * - 400: { success: false, message: 'Validation error message' }
 * - 500: { success: false, message: 'Failed to create asset request' }
 * 
 * @remarks
 * - Creates Request record with inline asset details
 * - Creates Document records for each asset photo with documentType='asset_photo'
 * - Uses transactions to ensure atomicity
 */
export async function addAssetController(req: Request, res: Response): Promise<void> {
  try {
  const customerId = req.user?.id;
  const userDistricts = Array.isArray(req.user?.district) ? req.user!.district : [];
  const district = userDistricts.length > 0 ? userDistricts[0] : '';

    // Enforce non-null for required user fields
    if (!customerId || !district) {
      res.status(400).json({ success: false, message: 'Missing customerId or district in user context.' });
      logger.error('Asset request failed: missing customerId or district');
      return;
    }
    const {
      assetPhotos,
      assetType,
      assetBrand,
      assetModel,
      purchaseYear,
      assetCondition,
      requestedAmount,
      AdditionalDescription,
    } = req.body || {};

    // Step 1: Validate required fields
    if (!validateAssetFields({ district, assetType, assetBrand, assetModel, assetCondition }, res)) {
      logger.warn('Asset request validation failed: missing required fields');
      return;
    }

    // Step 2: Validate enums
    if (!validateAssetEnums(assetType, assetCondition, res)) {
      logger.warn('Asset request validation failed: invalid enum values');
      return;
    }

    // Step 3: Validate assetPhotos
    if (!Array.isArray(assetPhotos) || assetPhotos.length < 2 || assetPhotos.length > 6) {
      res.status(400).json({ success: false, message: 'Please upload between 2 and 6 asset photos.' });
      logger.warn('Asset request validation failed: assetPhotos count invalid');
      return;
    }

    // Validate each photo has required metadata
    const validPhotos = assetPhotos.filter((photo: AssetPhotoData) => {
      return photo &&
             typeof photo === 'object' &&
             typeof photo.fileKey === 'string' &&
             photo.fileKey.trim() !== '' &&
             typeof photo.fileName === 'string' &&
             photo.fileName.trim() !== '' &&
             typeof photo.fileSize === 'number' &&
             photo.fileSize > 0 &&
             typeof photo.fileType === 'string' &&
             photo.fileType.trim() !== '';
    });

    if (validPhotos.length !== assetPhotos.length) {
      res.status(400).json({ success: false, message: 'All asset photos must have valid metadata (fileKey, fileName, fileSize, fileType).' });
      logger.warn('Asset request validation failed: invalid photo metadata');
      return;
    }

    // Step 4: Build request data
    const requestData = buildRequestData({
  district,
  assetType,
  assetBrand,
  assetModel,
  assetCondition,
  purchaseYear,
  requestedAmount,
  AdditionalDescription,
  customerId,
    });

    // Step 5: Create request and link documents in transaction
    const createdRequest = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Generate a human-friendly request number and attach to the request
      try {
        // Import locally to avoid circular issues at top-level imports
        const { generateRequestNumber } = require('../../utils/serial') as typeof import('../../utils/serial')
        const reqNumber = await generateRequestNumber(tx);
        // Attach requestNumber to the create data
        requestData.requestNumber = reqNumber
      } catch (e) {
        // If serial generation fails, log and continue with creation (non-blocking)
        logger.warn('Failed to generate request number, proceeding without it: ' + String(e))
      }

      // Create the asset request
      const reqCreated = await tx.request.create({ data: requestData });

      // Prepare document objects for bulk creation with full metadata
      const documentData = validPhotos.map((photo: AssetPhotoData, idx: number) => ({
        requestId: reqCreated.id,
        fileKey: photo.fileKey,
        fileName: photo.fileName,
        fileSize: photo.fileSize,
        fileType: photo.fileType,
        documentType: 'asset_photo',
        documentCategory: DOCUMENT_CATEGORY.ASSET,
        uploadedBy: customerId as string,
        displayOrder: idx + 1,
      }));
      await tx.document.createMany({ data: documentData });
      return reqCreated;
    });

    logger.info(`Asset request created: ${createdRequest.id} with ${validPhotos.length} photos`);
    res.status(201).json({
      success: true,
      message: 'Asset request created successfully',
      data: { requestId: createdRequest.id, requestNumber: createdRequest.requestNumber },
    });

    // Step 6: Enqueue admin notification (non-blocking)
    (async () => {
      try {
        const templateName = 'assetPledge';
        const customerName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || undefined;
        let recipientEmail: string | undefined = undefined;
        try {
          // Prisma filters for string[] can be awkward across generated types; query candidates
          // then filter in JS by district membership.
          const candidates = await prisma.user.findMany({
            where: { roles: { has: 'DISTRICT_ADMIN' } },
            select: { email: true, district: true },
          });
          const districtAdmin = candidates.find((u) => Array.isArray((u as any).district) && (u as any).district.includes(district));
          recipientEmail = districtAdmin?.email;
        } catch (e) {
          logger.warn('Failed to lookup district admin email, will fallback to global admin');
        }
        if (!recipientEmail) {
          const anyAdmin = await prisma.user.findFirst({
            where: { roles: { has: 'ADMIN' } },
            select: { email: true },
          });
          recipientEmail = anyAdmin?.email;
        }
        // const jobPayload: AssetPledgePayloadType = {
        //   customerName,
        //   assetName: `${assetBrand || ''} ${assetModel || ''}`.trim(),
        //   amount: requestedAmount ?? 0,
        //   district,
        //   requestId: createdRequest.id,
        //   companyName: process.env.COMPANY_NAME || 'Fundify',
        //   timestamp: new Date().toISOString(),
        //   additionalDescription: AdditionalDescription,
        //   recipient: recipientEmail,
        // };
        // await enqueue(templateName, jobPayload, { services: [ServiceName.EMAIL] });
      } catch (err) {
        logger.error('Failed to enqueue assetPledge job:', err as Error);
      }
    })();
  } catch (error) {
    logger.error('Add asset error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to create asset request',
    });
  }
}

/**
 * PUT /user/update-asset
 * Update an existing asset request (protected)
 * 
 * @param req - Express request object
 * @param req.body.requestId - ID of the request to update (optional if requestNumber provided)
 * @param req.body.requestNumber - Human-friendly request number (e.g., REQ1000) (optional)
 * @param req.body.district - Customer's district (optional)
 * @param req.body.assetPhotos - Array of asset photo URLs (optional, replaces existing)
 * @param req.body.assetType - Type of asset (optional)
 * @param req.body.assetBrand - Brand/manufacturer of the asset (optional)
 * @param req.body.assetModel - Model/name of the asset (optional)
 * @param req.body.purchaseYear - Year of purchase (optional)
 * @param req.body.assetCondition - Condition (optional)
 * @param req.body.requestedAmount - Loan amount requested (optional)
 * @param req.body.AdditionalDescription - Additional details (optional)
 * 
 * @param res - Express response object
 * 
 * @returns JSON response
 * - 200: { success: true, message: 'Request updated successfully', data: { request: Request } }
 * - 400: { success: false, message: 'Validation error message' }
 * - 403: { success: false, message: 'Not authorized to update this request' }
 * - 404: { success: false, message: 'Request not found' }
 * - 500: { success: false, message: 'Failed to update asset request' }
 * 
 * @remarks
 * - Only request owner or ADMIN/AGENT roles can update
 * - Replaces all existing asset photos with new ones if provided
 * - Uses transactions to ensure atomicity
 */
// Make sure you have REQUEST_STATUS enum imported, e.g.:
// import { REQUEST_STATUS } from '@prisma/client';
// (Or wherever your enum is defined)

export async function updateAssetController(req: Request, res: Response): Promise<void> {
  try {
    const customerId = req.user!.id;
    const userRoles = Array.isArray(req.user!.roles) ? req.user!.roles : [];
  let { requestId } = req.body || {};
  const { requestNumber, assetPhotos, ...updateData } = req.body || {};

    // Allow callers to pass requestNumber (human-friendly) instead of DB id
    if ((!requestId || typeof requestId !== 'string') && requestNumber && typeof requestNumber === 'string') {
      const found = await prisma.request.findUnique({ where: { requestNumber } });
      if (found) requestId = found.id;
    }

    if (!requestId || typeof requestId !== 'string') {
      res.status(400).json({ success: false, message: 'requestId is required (or provide requestNumber)' });
      return;
    }

    const existing = await prisma.request.findUnique({
      where: { id: requestId },
      select: { id: true, customerId: true, currentStatus: true }
    });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }
// Either User or Admin/Agent can only update the request
    const isAdminOrAgent = userRoles.some(role => ADMIN_AGENT_ROLES.includes(role));
    if (customerId !== existing.customerId || !isAdminOrAgent) {
      res.status(403).json({ success: false, message: 'Not authorized to update this request' });
      return;
    }

    const allowedUpdateStatuses = ALLOWED_UPDATE_STATUSES;
    if (!allowedUpdateStatuses.includes(existing.currentStatus as REQUEST_STATUS)) {
      res.status(400).json({
        success: false,
        message: 'This request cannot be updated as it has already been processed or is in a locked state.'
      });
      return;
    }

    // Always set status to PENDING on update
    updateData.currentStatus = REQUEST_STATUS.PENDING;

    // Update request and asset photos in transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.request.update({ where: { id: requestId }, data: updateData });
      if (assetPhotos !== undefined) {
        await updateAssetPhotos(tx, requestId, assetPhotos, customerId, res);
      }
    });

    res.status(200).json({ success: true, message: 'Request updated successfully' });
  } catch (error) {
    logger.error('Update asset error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to update asset request' });
  }
}


/**
 * User Services
 * Handles business logic for user profile and validation
 * DB operations
 */

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<{
  success: boolean;
  data?: { user: UserType };
  message: string;
}> {
  try {
    if (!userId) {
      return {
        success: false,
        message: 'User not found in token',
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
        district: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || !user.isActive) {
      return {
        success: false,
        message: 'User not found or inactive',
      };
    }

    return {
      success: true,
      data: { user },
      message: 'Profile retrieved successfully',
    };
  } catch (error) {
    logger.error('Get profile error:', error as Error);
    return {
      success: false,
      message: 'Failed to retrieve profile',
    };
  }
}

/**
 * Validate user authentication status
 */
export async function validateUserAuth(userId: string): Promise<{
  success: boolean;
  data?: {
    isAuthenticated: boolean;
    user?: UserType;
  };
  message: string;
}> {
  try {
    if (!userId) {
      return {
        success: false,
        data: {
          isAuthenticated: false,
        },
        message: 'Not authenticated',
      };
    }

    const freshUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
        district: true,
      },
    });

    if (!freshUser || !freshUser.isActive) {
      return {
        success: false,
        data: {
          isAuthenticated: false,
        },
        message: 'User not found or inactive',
      };
    }

    return {
      success: true,
      data: {
        isAuthenticated: true,
        user: freshUser,
      },
      message: 'Authentication validated',
    };
  } catch (error) {
    logger.error('Auth validation error:', error as Error);
    return {
      success: false,
      data: {
        isAuthenticated: false,
      },
      message: 'Authentication validation failed',
    };
  }
}

/**
 * GET /user/active-loans-count
 * Returns the count of active loans for the logged-in customer (protected)
 */
export async function activeLoansCountController(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const count = await countActiveLoans(userId);
    res.status(200).json({ success: true, data: { activeLoans: count } });
  } catch (error) {
    logger.error('Active loans count error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve active loans count',
    });
  }
}

export async function countActiveLoans(userId: string): Promise<number> {
  try {
    return await prisma.loan.count({
      where: {
        status: LOAN_STATUS.ACTIVE,
        request: { customerId: userId },
      },
    });
  } catch (error) {
    logger.error('Count active loans error:', error as Error);
    throw error;
  }
}

/**
 * GET /user/pending-loans-count
 * Returns count of loans currently in PENDING status for the logged-in user (protected)
 */
export async function pendingLoansCountController(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const count = await countPendingLoans(userId);
    res.status(200).json({ success: true, data: { pendingLoans: count } });
  } catch (error) {
    logger.error('Pending loans count error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to retrieve pending loans count' });
  }
}

export async function countPendingLoans(userId: string): Promise<number> {
  try {
    return await prisma.request.count({
      where: {
        currentStatus: REQUEST_STATUS.PENDING,
        customerId: userId,
      },
    });
  } catch (error) {
    logger.error('Count pending loans error:', error as Error);
    throw error;
  }
}

/**
 * GET /user/total-borrow
 * Returns total borrowed amount for the logged-in user (protected)
 */
export async function totalBorrowController(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const stats = await getTotalBorrowStats(userId);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    logger.error('Total borrow error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to retrieve total borrow stats' });
  }
}

/**
 * GET /user/requests
 * Returns paginated list of requests for the authenticated user
 * Query params: page (default 1), pageSize (default 10)
 */
export async function getUserRequestsController(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not found in token' });
      return;
    }

    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize ?? 10)));

    const where: Prisma.RequestWhereInput = { customerId: userId };

    // Optional status filter: support friendly keywords (pending, active, rejected, closed)
    const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;
    if (rawStatus) {
      const s = rawStatus.toUpperCase();
      // Map common keywords to arrays where helpful
      if (s === 'PENDING') {
        where.currentStatus = { in: PENDING_REQUEST_STATUSES as any } as any;
      } else if (s === 'REJECTED') {
        where.currentStatus = { in: [REQUEST_STATUS.REJECTED, REQUEST_STATUS.OFFER_DECLINED] as any } as any;
      } else if (s === 'CLOSED') {
        where.currentStatus = { in: [REQUEST_STATUS.CANCELLED, REQUEST_STATUS.COMPLETED] as any } as any;
      } else if (s === 'ACTIVE') {
        where.currentStatus = { in: [REQUEST_STATUS.APPROVED, REQUEST_STATUS.AMOUNT_DISBURSED, REQUEST_STATUS.ACTIVE] as any } as any;
      } else {
        // Fallback: if a direct enum value passed, match exactly
        where.currentStatus = rawStatus as any;
      }
    }

    // Optional simple search (search by id or brand/model)
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    if (search && search.length > 0) {
      where.OR = [
        { id: { contains: search } },
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { assetBrand: { contains: search, mode: 'insensitive' } },
        { assetModel: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.request.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          assignedAgent: { select: { id: true, firstName: true, lastName: true, email: true } },
          loan: { select: { id: true, approvedAmount: true, status: true } },
          _count: { select: { documents: true, comments: true, inspections: true } },
        },
      }),
      prisma.request.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Requests fetched',
      data: { items, total, page, pageSize },
    });
  } catch (error) {
    logger.error('Get user requests error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
}

/**
 * GET /user/request/:identifier
 * Fetch a single request by DB id or by human-friendly requestNumber (e.g., REQ1000)
 */
export async function getUserRequestController(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not found in token' });
      return;
    }

    const { identifier } = req.params;
    if (!identifier || typeof identifier !== 'string') {
      res.status(400).json({ success: false, message: 'Identifier is required' });
      return;
    }

    // Try to find by requestNumber first (human-friendly), then by id
    const request = await prisma.request.findFirst({
      where: {
        customerId: userId,
        OR: [{ requestNumber: identifier }, { id: identifier }],
      },
      include: {
        assignedAgent: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
        loan: { select: { id: true, loanNumber: true, approvedAmount: true, status: true, disbursedDate: true, approvedDate: true, tenureMonths: true, emiAmount: true, emisSchedule: true } },
        comments: { select: { id: true, content: true, createdAt: true, authorId: true, author: { select: { id: true, firstName: true, lastName: true, roles: true } } } },
        _count: { select: { documents: true, comments: true, inspections: true } },
        documents: { select: { id: true, fileKey: true, fileName: true, fileType: true } },
      },
    });

    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }
    // Generate signed URLs for each document so the frontend can render images directly
    try {
      const docsWithUrls = await Promise.all(
        (request.documents || []).map(async (d) => {
          try {
            const { url, expiresAt } = await generateSignedUrl(d.fileKey, 900);
            return { ...d, signedUrl: url, signedUrlExpiresAt: expiresAt };
          } catch (e) {
            // If signed URL generation fails for a document, return the document without signedUrl
            logger.warn(`Failed to generate signed URL for fileKey=${d.fileKey}: ${String(e)}`);
            return d;
          }
        })
      );

      const responsePayload = { ...request, documents: docsWithUrls };
      res.json({ success: true, data: responsePayload });
      return;
    } catch (e) {
      logger.warn('Failed to generate signed URLs for documents: ' + String(e));
      res.json({ success: true, data: request });
      return;
    }
  } catch (error) {
    logger.error('Get user request error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to fetch request' });
  }
}

/**
 * POST /user/request/:identifier/comment
 * Add a comment to a request (protected)
 */
export async function postCommentController(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const userRoles = Array.isArray(req.user?.roles) ? req.user!.roles : [];
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not found in token' });
      return;
    }

    const { identifier } = req.params as { identifier?: string };
    if (!identifier) {
      res.status(400).json({ success: false, message: 'Request identifier is required' });
      return;
    }

    // Find request by requestNumber or id
    const found = await prisma.request.findFirst({
      where: { OR: [{ requestNumber: identifier }, { id: identifier }] },
      select: { id: true, customerId: true },
    });
    if (!found) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }

    const { content, isInternal, commentType } = req.body || {};
    if (!content || typeof content !== 'string' || content.trim() === '') {
      res.status(400).json({ success: false, message: 'Comment content is required' });
      return;
    }

    const isAdminOrAgent = userRoles.some((r) => ADMIN_AGENT_ROLES.includes(r));
    // Customers cannot post internal comments
    const internalFlag = Boolean(isInternal && isAdminOrAgent);
    if (isInternal && !isAdminOrAgent) {
      res.status(403).json({ success: false, message: 'Not authorized to post internal comments' });
      return;
    }

    // Only request owner or admin/agent can comment
    if (found.customerId !== userId && !isAdminOrAgent) {
      res.status(403).json({ success: false, message: 'Not authorized to comment on this request' });
      return;
    }

    const created = await prisma.comment.create({
      data: {
        requestId: found.id,
        authorId: userId,
        content: content.trim(),
        isInternal: internalFlag,
        commentType: commentType && typeof commentType === 'string' ? commentType : 'GENERAL',
      },
      include: { author: { select: { id: true, firstName: true, lastName: true, roles: true } } },
    });

    res.status(201).json({ success: true, message: 'Comment created', data: created });
    return;
  } catch (error) {
    logger.error('Post comment error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to create comment' });
  }
}

/**
 * Service: Get total borrowed amount (from Loan table)
 * Includes all loans where:
 *   - related request belongs to the user
 *   - loan status is either APPROVED, ACTIVE, or COMPLETED
 */
export async function getTotalBorrowStats(userId: string): Promise<{ totalBorrowed: number }> {
  try {
    const result = await prisma.loan.aggregate({
      where: {
        status: LOAN_STATUS.ACTIVE,
        request: {
          customerId: userId,
        },
      },
      _sum: {
        approvedAmount: true,
      },
    });

    const totalBorrowed = result._sum.approvedAmount ?? 0;
    return { totalBorrowed };
  } catch (error) {
    logger.error('Get total borrow stats error:', error as Error);
    throw error;
  }
}
