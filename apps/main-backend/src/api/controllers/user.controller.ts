import { Request, Response } from 'express';
import { Prisma, prisma, RequestStage, AssetCondition } from '@fundifyhub/prisma';
import { ROLES, ALLOWED_IMAGE_TYPES, stageToLegacyStatus, UserRole } from '@fundifyhub/types';
import { ASSET_CONDITION, ASSET_TYPE, DOCUMENT_CATEGORY, LOAN_STATUS, REQUEST_STAGE, SUB_STATUS, UserType, AssetPhotoData, ADMIN_AGENT_ROLES, PENDING_STAGES, ALLOWED_UPDATE_STAGES, AGENT_WORK_STAGES } from '@fundifyhub/types';
import logger from '../../utils/logger';
import { CLIENT_CONSTANTS } from '@fundifyhub/types';
import { generateSignedUrl } from '../../utils/uploadthing';
import { normalizeDistricts } from '../../utils/district';
import { sendAssetPledgeNotification } from '../../utils/notifications';
import { cache, CACHE_KEYS, CACHE_TTL } from '../../utils/cache';
import { auditUser } from '../../utils/audit';

/**
 * Enrich request with computed currentStatus for backward compatibility with frontend
 */
function enrichRequestWithLegacyStatus<T extends { stage?: string; subStatus?: string | null }>(
  request: T
): T & { currentStatus: string } {
  const stage = (request.stage as REQUEST_STAGE) || REQUEST_STAGE.REVIEW;
  const subStatus = request.subStatus || null;
  const currentStatus = stageToLegacyStatus(stage, subStatus);
  return { ...request, currentStatus };
}

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
        fileName: 'asset_photo.jpg', // Default filename
        fileSize: 0, // Default size
        fileType: 'image/jpeg', // Default type
        documentType: 'asset_photo',
        documentCategory: DOCUMENT_CATEGORY.ASSET,
        uploadedBy: customerId,
        uploaderRole: 'USER_SUBMITTED', // Customer is uploading asset photos
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
  assetType?: string;
  assetBrand?: string;
  assetModel?: string;
  assetCondition?: string;
}, res: Response): boolean {
  const requiredFields = {
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
  districtId: string;
  assetType: string;
  assetBrand: string;
  assetModel: string;
  assetCondition: string;
  purchaseYear?: number;
  requestedAmount?: number;
  AdditionalDescription?: string;
  customerId: string;
}): Prisma.RequestCreateInput {
  const requestData: Prisma.RequestCreateInput = {
    district: { connect: { id: fields.districtId } },
    requestedAmount: typeof fields.requestedAmount === 'number' ? fields.requestedAmount : 0,
    customer: { connect: { id: fields.customerId } },
    requestNumber: `REQ${Date.now()}`, // Temporary request number
    // Stage-based status
    stage: REQUEST_STAGE.REVIEW,
    subStatus: SUB_STATUS.REVIEW.PENDING,
    // Action flags for filtering
    requiresAdminAction: true,
    requiresCustomerAction: false,
    requiresAgentAction: false,
    asset: {
      create: {
        assetType: fields.assetType,
        brand: fields.assetBrand,
        model: fields.assetModel,
        condition: fields.assetCondition as AssetCondition,
        purchaseYear: fields.purchaseYear || new Date().getFullYear(),
        description: fields.AdditionalDescription || '',
        estimatedValue: typeof fields.requestedAmount === 'number' ? fields.requestedAmount : null,
      }
    }
  };

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
          fileName: 'asset_photo.jpg', // Default filename
          fileSize: 0, // Default size
          fileType: 'image/jpeg', // Default type
          documentType: 'asset_photo',
          documentCategory: DOCUMENT_CATEGORY.ASSET,
          uploadedBy: customerId,
          uploaderRole: 'USER_SUBMITTED', // Customer is uploading asset photos
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
  // Get user's home district ID for new requests - from JWT payload or fetch from DB
  const userDistrictIds = Array.isArray(req.user?.districts) ? req.user!.districts : [];
  const districtId = userDistrictIds.length > 0 ? userDistrictIds[0] : '';

    // Enforce non-null for required user fields
    if (!customerId || !districtId) {
      res.status(400).json({ success: false, message: 'Missing customerId or districtId in user context.' });
      logger.error('Asset request failed: missing customerId or districtId');
      return;
    }
    const {
      documents,
      assetType,
      assetBrand,
      assetModel,
      purchaseYear,
      assetCondition,
      requestedAmount,
      AdditionalDescription,
    } = req.body || {};

    // Step 1: Validate required fields
    if (!validateAssetFields({ assetType, assetBrand, assetModel, assetCondition }, res)) {
      logger.warn('Asset request validation failed: missing required fields');
      return;
    }

    // Step 2: Validate enums
    if (!validateAssetEnums(assetType, assetCondition, res)) {
      logger.warn('Asset request validation failed: invalid enum values');
      return;
    }

    // Step 3: Validate documents array (strict requirements - no backward compatibility)
    interface DocumentData {
      fileKey: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      documentType?: string;
    }
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      res.status(400).json({ success: false, message: 'Documents are required. Please upload all required documents.' });
      logger.warn('Asset request validation failed: no documents provided');
      return;
    }

    // Validate each document has required metadata
    const validDocuments: DocumentData[] = documents.filter((doc: DocumentData) => {
      return doc &&
             typeof doc === 'object' &&
             typeof doc.fileKey === 'string' &&
             doc.fileKey.trim() !== '' &&
             typeof doc.fileName === 'string' &&
             doc.fileName.trim() !== '' &&
             typeof doc.fileSize === 'number' &&
             doc.fileSize > 0 &&
             typeof doc.fileType === 'string' &&
             doc.fileType.trim() !== '';
    });

    if (validDocuments.length !== documents.length) {
      res.status(400).json({ success: false, message: 'All documents must have valid metadata (fileKey, fileName, fileSize, fileType).' });
      logger.warn('Asset request validation failed: invalid document metadata');
      return;
    }

    // Strict document validation - all 4 categories required
    const documentValidationErrors: string[] = [];

    // 1. Asset Photos: min 2, max 6, images only
    const assetPhotos = validDocuments.filter(d => 
      d.documentType?.toUpperCase() === 'ASSET_PHOTO'
    );
    if (assetPhotos.length < 2) {
      documentValidationErrors.push(`Asset Photos: minimum 2 required, you have ${assetPhotos.length}`);
    }
    if (assetPhotos.length > 6) {
      documentValidationErrors.push(`Asset Photos: maximum 6 allowed, you have ${assetPhotos.length}`);
    }
    // Check asset photos are images only (not PDF)
    const nonImageAssetPhotos = assetPhotos.filter(d => !ALLOWED_IMAGE_TYPES.includes(d.fileType));
    if (nonImageAssetPhotos.length > 0) {
      documentValidationErrors.push(`Asset Photos: only images allowed (JPEG, PNG, WebP). ${nonImageAssetPhotos.length} invalid file(s) found.`);
    }

    // 2. ID Proof: exactly 1
    const idProofs = validDocuments.filter(d => 
      d.documentType?.toUpperCase() === 'ID_PROOF'
    );
    if (idProofs.length !== 1) {
      documentValidationErrors.push(`ID Proof: exactly 1 required, you have ${idProofs.length}`);
    }

    // 3. Address Proof: exactly 1
    const addressProofs = validDocuments.filter(d => 
      d.documentType?.toUpperCase() === 'ADDRESS_PROOF'
    );
    if (addressProofs.length !== 1) {
      documentValidationErrors.push(`Address Proof: exactly 1 required, you have ${addressProofs.length}`);
    }

    // 4. Asset Documents: min 1, max 4
    const assetDocs = validDocuments.filter(d => 
      d.documentType?.toUpperCase() === 'ASSET_DOCUMENT'
    );
    if (assetDocs.length < 1) {
      documentValidationErrors.push(`Asset Documents: minimum 1 required, you have ${assetDocs.length}`);
    }
    if (assetDocs.length > 4) {
      documentValidationErrors.push(`Asset Documents: maximum 4 allowed, you have ${assetDocs.length}`);
    }

    // Return all validation errors at once
    if (documentValidationErrors.length > 0) {
      res.status(400).json({ 
        success: false, 
        message: 'Document validation failed',
        errors: documentValidationErrors
      });
      logger.warn('Asset request validation failed: ' + documentValidationErrors.join('; '));
      return;
    }

    // Step 4: Build request data
    const requestData = buildRequestData({
  districtId,
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
      // Map documentType to appropriate category
      const getDocumentCategory = (docType: string): string => {
        const typeUpper = docType?.toUpperCase() || 'OTHER';
        switch (typeUpper) {
          case 'ASSET_PHOTO':
          case 'ASSET_DOCUMENT':
          case 'PURCHASE_RECEIPT':
            return DOCUMENT_CATEGORY.ASSET;
          case 'ID_PROOF':
          case 'ADDRESS_PROOF':
            return DOCUMENT_CATEGORY.IDENTITY;
          default:
            return DOCUMENT_CATEGORY.OTHER;
        }
      };

      const documentData = validDocuments.map((doc, idx: number) => ({
        requestId: reqCreated.id,
        fileKey: doc.fileKey,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        documentType: (doc.documentType || 'OTHER').toLowerCase(),
        documentCategory: getDocumentCategory(doc.documentType || 'OTHER'),
        uploadedBy: customerId as string,
        uploaderRole: 'USER_SUBMITTED',
        displayOrder: idx + 1,
      }));
      
      await tx.document.createMany({ data: documentData });
      return reqCreated;
    });

    const assetPhotoCount = validDocuments.filter(d => 
      d.documentType?.toUpperCase() === 'ASSET_PHOTO'
    ).length;
    const idProofCount = validDocuments.filter(d => d.documentType?.toUpperCase() === 'ID_PROOF').length;
    const addressProofCount = validDocuments.filter(d => d.documentType?.toUpperCase() === 'ADDRESS_PROOF').length;
    const assetDocCount = validDocuments.filter(d => d.documentType?.toUpperCase() === 'ASSET_DOCUMENT').length;
    
    logger.info(`Asset request created: ${createdRequest.id} with ${assetPhotoCount} asset photos, ${idProofCount} ID proof, ${addressProofCount} address proof, ${assetDocCount} asset documents`);
    res.status(201).json({
      success: true,
      message: 'Asset request created successfully',
      data: { requestId: createdRequest.id, requestNumber: createdRequest.requestNumber },
    });

    // Step 6: Enqueue admin notification (non-blocking)
    (async () => {
      try {
        const customerName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || undefined;
        let recipientEmail: string | undefined = undefined;
        let recipientUserId: string | undefined = undefined;
        
        try {
          // Query district admins with their district assignments
          const candidates = await prisma.user.findMany({
            where: { roles: { has: ROLES.DISTRICT_ADMIN } },
            select: { 
              id: true, 
              email: true, 
              phoneNumber: true, 
              firstName: true,
              districtAssignments: {
                where: { deletedAt: null },
                select: { districtId: true }
              }
            },
          });
          const districtAdmin = candidates.find((u) => 
            u.districtAssignments?.some(a => a.districtId === districtId)
          );
          if (districtAdmin) {
            recipientUserId = districtAdmin.id;
            recipientEmail = districtAdmin.email;
          }
        } catch (e) {
          logger.warn('Failed to lookup district admin email, will fallback to global admin');
        }
        
        if (!recipientUserId) {
          // fallback: find any super admin or district admin (global admin presence)
          const anyAdmin = await prisma.user.findFirst({
            where: {
              OR: [
                { roles: { has: ROLES.SUPER_ADMIN } },
                { roles: { has: ROLES.DISTRICT_ADMIN } },
              ],
            },
            select: { id: true, email: true, phoneNumber: true, firstName: true },
          });
          if (anyAdmin) {
            recipientUserId = anyAdmin.id;
            recipientEmail = anyAdmin.email;
          }
        }
        
        if (recipientUserId) {
          await sendAssetPledgeNotification(
            {
              userId: recipientUserId,
              email: recipientEmail || undefined,
              name: undefined, // Admin name not needed
            },
            {
              assetName: `${assetBrand || ''} ${assetModel || ''}`.trim(),
              amount: requestedAmount ?? 0,
              districtId,
              requestId: createdRequest.id,
              timestamp: new Date().toISOString(),
              additionalDescription: AdditionalDescription,
            }
          );
        }
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
      select: { id: true, customerId: true, stage: true, subStatus: true }
    });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }
// Either User or Admin/Agent can only update the request
    const isAdminOrAgent = userRoles.some(role => (ADMIN_AGENT_ROLES as readonly string[]).includes(role));
    if (customerId !== existing.customerId || !isAdminOrAgent) {
      res.status(403).json({ success: false, message: 'Not authorized to update this request' });
      return;
    }

    // Check if stage allows updates
    const allowedUpdateStages = ALLOWED_UPDATE_STAGES;
    if (!allowedUpdateStages.includes(existing.stage as REQUEST_STAGE)) {
      res.status(400).json({
        success: false,
        message: 'This request cannot be updated as it has already been processed or is in a locked state.'
      });
      return;
    }

    // Always set status to REVIEW:PENDING on update
    updateData.stage = REQUEST_STAGE.REVIEW;
    updateData.subStatus = SUB_STATUS.REVIEW.PENDING;

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
        homeDistrictId: true,
        homeDistrict: { select: { id: true, name: true } },
        districtAssignments: {
          where: { deletedAt: null },
          select: {
            districtId: true,
            district: { select: { id: true, name: true } }
          }
        },
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

    // Extract district IDs from assignments for compatibility
    const districtIds = user.districtAssignments?.map(a => a.districtId) || [];

    const normalizedUser: UserType = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      roles: user.roles as UserRole[],
      homeDistrictId: user.homeDistrictId,
      districts: districtIds,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    };

    return {
      success: true,
      data: { user: normalizedUser },
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
        districtAssignments: {
          where: { deletedAt: null },
          select: { districtId: true }
        },
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

    const normalizedFreshUser: UserType = {
      id: freshUser.id,
      email: freshUser.email,
      firstName: freshUser.firstName,
      lastName: freshUser.lastName,
      roles: freshUser.roles as UserRole[],
      districts: freshUser.districtAssignments?.map(a => a.districtId) || [],
      isActive: freshUser.isActive,
    };

    return {
      success: true,
      data: {
        isAuthenticated: true,
        user: normalizedFreshUser,
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
        stage: { in: PENDING_STAGES },
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
      // Map common keywords to stage-based filtering
      if (s === 'PENDING') {
        where.stage = { in: PENDING_STAGES };
      } else if (s === 'REJECTED') {
        where.stage = REQUEST_STAGE.REJECTED;
      } else if (s === 'CLOSED') {
        where.stage = { in: [REQUEST_STAGE.CANCELLED, REQUEST_STAGE.COMPLETED] };
      } else if (s === 'ACTIVE') {
        where.stage = REQUEST_STAGE.ACTIVE;
      } else {
        // Fallback: if a direct stage value passed, match exactly
        where.stage = rawStatus as RequestStage;
      }
    }

    // Optional simple search (search by id or brand/model)
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    if (search && search.length > 0) {
      where.OR = [
        { id: { contains: search } },
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { asset: { brand: { contains: search, mode: 'insensitive' } } },
        { asset: { model: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.request.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          asset: true,
          assignedAgent: { select: { id: true, firstName: true, lastName: true, email: true } },
          loan: { select: { id: true, approvedAmount: true, status: true } },
          _count: { select: { documents: true, comments: true, inspections: true } },
        },
      }),
      prisma.request.count({ where }),
    ]);

    // Add currentStatus for backward compatibility
    const requestsWithLegacyStatus = items.map(enrichRequestWithLegacyStatus);

    res.status(200).json({
      success: true,
      message: 'Requests fetched',
      data: {
        requests: requestsWithLegacyStatus,
        pagination: {
          page,
          limit: pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      },
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
        loan: { select: { id: true, loanNumber: true, approvedAmount: true, status: true, disbursedDate: true, approvedDate: true, tenureMonths: true, emiAmount: true, emisSchedule: { select: { id: true, emiNumber: true, dueDate: true, emiAmount: true, principalAmount: true, interestAmount: true, status: true, paidDate: true, paidAmount: true, lateFee: true } } } },
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
                const { url, expiresAt } = await generateSignedUrl(d.fileKey, CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT);
                return { ...d, signedUrl: url, signedUrlExpiresAt: expiresAt };
              } catch (e) {
            // If signed URL generation fails for a document, return the document without signedUrl
            logger.warn(`Failed to generate signed URL for fileKey=${d.fileKey}: ${String(e)}`);
            return d;
          }
        })
      );

      const responsePayload = enrichRequestWithLegacyStatus({ ...request, documents: docsWithUrls });
      res.json({ success: true, data: responsePayload });
      return;
    } catch (e) {
      logger.warn('Failed to generate signed URLs for documents: ' + String(e));
      res.json({ success: true, data: enrichRequestWithLegacyStatus(request) });
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

    // Find request by requestNumber or id. Include commentsEnabled flag so we can enforce comment permissions.
    const found = await prisma.request.findFirst({
      where: { OR: [{ requestNumber: identifier }, { id: identifier }] },
      select: { id: true, customerId: true, commentsEnabled: true },
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

    // Enforce maximum comment length using shared client constant
    if (content.trim().length > CLIENT_CONSTANTS.COMMENT_MAX_LENGTH) {
      res.status(400).json({ success: false, message: `Comment must be at most ${CLIENT_CONSTANTS.COMMENT_MAX_LENGTH} characters` });
      return;
    }

    const isAdmin = userRoles.some((r) => r === ROLES.SUPER_ADMIN || r === ROLES.DISTRICT_ADMIN);
    const isAgent = userRoles.some((r) => r === ROLES.AGENT);

    const isAdminOrAgent = isAdmin || isAgent;
    // Customers/Agents cannot post internal comments unless admin/agent
    const internalFlag = Boolean(isInternal && isAdminOrAgent);
    if (isInternal && !isAdminOrAgent) {
      res.status(403).json({ success: false, message: 'Not authorized to post internal comments' });
      return;
    }

    // Only request owner or admin/agent can comment (agents are allowed here)
    if (found.customerId !== userId && !isAdminOrAgent) {
      res.status(403).json({ success: false, message: 'Not authorized to comment on this request' });
      return;
    }

    // Enforce commentsEnabled flag: if comments are disabled for this request,
    // disallow comments from customers and agents. Only admin roles (district/super) can still comment.
    if (found.commentsEnabled === false && (isAgent || !isAdmin)) {
      // If user is agent or a plain customer (not admin), block
      if (!isAdmin) {
        res.status(403).json({ success: false, message: 'Comments are disabled for this request' });
        return;
      }
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

/**
 * GET /user/dashboard-stats
 * Returns dashboard statistics based on user role (protected)
 * Uses Redis caching to reduce database load
 */
export async function getDashboardStatsController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not found in token',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    const userId = req.user.id;
    const userRoles = req.user.roles || [];
    const userDistricts = req.user.districts || [];

    // Check if user is admin or super admin
    const isSuperAdmin = userRoles.includes(ROLES.SUPER_ADMIN);
    const isDistrictAdmin = userRoles.includes(ROLES.DISTRICT_ADMIN);
    const isAgent = userRoles.includes(ROLES.AGENT);
    const isCustomer = userRoles.includes(ROLES.CUSTOMER);

    // Determine role for cache key
    const role = isSuperAdmin ? 'super_admin' : isDistrictAdmin ? 'district_admin' : isAgent ? 'agent' : 'customer';
    const cacheKey = CACHE_KEYS.DASHBOARD_STATS(userId, role);

    // Try to get from cache first
    const cachedStats = await cache.get<Record<string, number>>(cacheKey);
    if (cachedStats) {
      res.status(200).json({
        success: true,
        data: cachedStats,
        cached: true,
      });
      return;
    }

    const stats: Record<string, number> = {
      totalRequests: 0,
      activeLoans: 0,
      totalDisbursed: 0,
      pendingCount: 0,
    };

    if (isSuperAdmin) {
      // Super admin sees all stats
      stats.totalRequests = await prisma.request.count();
      stats.activeLoans = await prisma.loan.count({
        where: { status: LOAN_STATUS.ACTIVE },
      });
      const disbursedResult = await prisma.loan.aggregate({
        where: { status: { in: [LOAN_STATUS.ACTIVE, LOAN_STATUS.COMPLETED, LOAN_STATUS.DEFAULTED] } },
        _sum: { approvedAmount: true },
      });
      stats.totalDisbursed = disbursedResult._sum.approvedAmount ?? 0;
      stats.pendingCount = await prisma.request.count({
        where: { stage: { in: PENDING_STAGES } },
      });
    } else if (isDistrictAdmin && userDistricts.length > 0) {
      // District admin sees stats for:
      // 1. Requests assigned to them (regardless of district)
      // 2. Requests in their districts
      const districtAdminWhere: Prisma.RequestWhereInput = {
        OR: [
          { assignedAdminId: userId },
          { districtId: { in: userDistricts } }
        ]
      };

      stats.totalRequests = await prisma.request.count({
        where: districtAdminWhere,
      });
      stats.activeLoans = await prisma.loan.count({
        where: {
          status: LOAN_STATUS.ACTIVE,
          request: districtAdminWhere,
        },
      });
      const disbursedResult = await prisma.loan.aggregate({
        where: {
          status: { in: [LOAN_STATUS.ACTIVE, LOAN_STATUS.COMPLETED, LOAN_STATUS.DEFAULTED] },
          request: districtAdminWhere,
        },
        _sum: { approvedAmount: true },
      });
      stats.totalDisbursed = disbursedResult._sum?.approvedAmount ?? 0;
      stats.pendingCount = await prisma.request.count({
        where: {
          ...districtAdminWhere,
          stage: { in: PENDING_STAGES },
        },
      });
    } else if (isAgent) {
      // Agent sees stats for requests assigned to them
      stats.totalRequests = await prisma.request.count({
        where: { assignedAgentId: userId },
      });
      stats.activeLoans = await prisma.loan.count({
        where: {
          status: LOAN_STATUS.ACTIVE,
          request: { assignedAgentId: userId },
        },
      });
      const disbursedResult = await prisma.loan.aggregate({
        where: {
          status: { in: [LOAN_STATUS.ACTIVE, LOAN_STATUS.COMPLETED, LOAN_STATUS.DEFAULTED] },
          request: { assignedAgentId: userId },
        },
        _sum: { approvedAmount: true },
      });
      stats.totalDisbursed = disbursedResult._sum.approvedAmount ?? 0;
      stats.pendingCount = await prisma.request.count({
        where: {
          assignedAgentId: userId,
          stage: { in: PENDING_STAGES },
        },
      });
      
      // Agent specific stats - count inspection stage requests
      stats.pendingInspections = await prisma.request.count({
        where: {
          assignedAgentId: userId,
          stage: REQUEST_STAGE.INSPECTION,
          subStatus: { in: [SUB_STATUS.INSPECTION.SCHEDULED, SUB_STATUS.INSPECTION.IN_PROGRESS] },
        },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      stats.completedInspections = await prisma.request.count({
        where: {
          assignedAgentId: userId,
          stage: REQUEST_STAGE.INSPECTION,
          subStatus: SUB_STATUS.INSPECTION.COMPLETED,
          updatedAt: { gte: today },
        },
      });

    } else if (isCustomer) {
      // Customer sees only their own stats
      stats.totalRequests = await prisma.request.count({
        where: { customerId: userId },
      });
      stats.activeLoans = await prisma.loan.count({
        where: {
          status: LOAN_STATUS.ACTIVE,
          request: { customerId: userId },
        },
      });
      const disbursedResult = await prisma.loan.aggregate({
        where: {
          status: { in: [LOAN_STATUS.ACTIVE, LOAN_STATUS.COMPLETED, LOAN_STATUS.DEFAULTED] },
          request: { customerId: userId },
        },
        _sum: { approvedAmount: true },
      });
      stats.totalDisbursed = disbursedResult._sum.approvedAmount ?? 0;
      stats.pendingCount = await prisma.request.count({
        where: {
          customerId: userId,
          stage: { in: PENDING_STAGES },
        },
      });
    }

    // Cache the results for dashboard TTL (2 minutes)
    await cache.set(cacheKey, stats, CACHE_TTL.MEDIUM);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Dashboard stats error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics',
    });
  }
}

/**
 * PUT /user/profile
 * Update current user profile (protected)
 * Body: { firstName?: string, lastName?: string, phoneNumber?: string }
 */
export async function updateProfileController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not found in token',
      });
      return;
    }

    const userId = req.user.id;
    const { firstName, lastName, phoneNumber } = req.body;

    // Validate at least one field is provided
    if (!firstName && !lastName && !phoneNumber) {
      res.status(400).json({
        success: false,
        message: 'At least one field (firstName, lastName, or phoneNumber) is required',
      });
      return;
    }

    // Validate firstName if provided
    if (firstName !== undefined) {
      if (typeof firstName !== 'string' || firstName.trim().length < 2) {
        res.status(400).json({
          success: false,
          message: 'First name must be at least 2 characters',
        });
        return;
      }
    }

    // Validate lastName if provided
    if (lastName !== undefined) {
      if (typeof lastName !== 'string' || lastName.trim().length < 2) {
        res.status(400).json({
          success: false,
          message: 'Last name must be at least 2 characters',
        });
        return;
      }
    }

    // Validate phoneNumber if provided
    if (phoneNumber !== undefined) {
      const phoneRegex = /^\+?[1-9]\d{9,14}$/;
      if (typeof phoneNumber !== 'string' || !phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
        res.status(400).json({
          success: false,
          message: 'Invalid phone number format',
        });
        return;
      }
    }

    // Fetch current user for audit comparison
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, phoneNumber: true },
    });

    if (!currentUser) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Build update data
    const updateData: Prisma.UserUpdateInput = {};
    const previousValues: Record<string, string | null> = {};
    const changes: Record<string, string> = {};

    if (firstName !== undefined && firstName.trim() !== currentUser.firstName) {
      updateData.firstName = firstName.trim();
      previousValues.firstName = currentUser.firstName;
      changes.firstName = firstName.trim();
    }

    if (lastName !== undefined && lastName.trim() !== currentUser.lastName) {
      updateData.lastName = lastName.trim();
      previousValues.lastName = currentUser.lastName;
      changes.lastName = lastName.trim();
    }

    if (phoneNumber !== undefined && phoneNumber.replace(/\s/g, '') !== currentUser.phoneNumber) {
      updateData.phoneNumber = phoneNumber.replace(/\s/g, '');
      previousValues.phoneNumber = currentUser.phoneNumber;
      changes.phoneNumber = phoneNumber.replace(/\s/g, '');
    }

    // Check if any actual changes
    if (Object.keys(updateData).length === 0) {
      res.status(200).json({
        success: true,
        message: 'No changes detected',
      });
      return;
    }

    // Update user
    const updatedUser = await prisma.user.update({
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
        districtAssignments: {
          where: { deletedAt: null },
          select: { districtId: true }
        },
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
      },
      data: updateData,
    });

    // Audit the profile update
    auditUser.updated(req, userId, changes, previousValues).catch(() => {});

    // Clear user cache
    await cache.del(CACHE_KEYS.USER_PROFILE(userId));

    const normalizedUser: UserType = {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phoneNumber: updatedUser.phoneNumber,
      roles: updatedUser.roles as UserRole[],
      districts: updatedUser.districtAssignments?.map(a => a.districtId) || [],
      isActive: updatedUser.isActive,
      emailVerified: updatedUser.emailVerified,
      phoneVerified: updatedUser.phoneVerified,
    };

    logger.info(`Profile updated for user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: normalizedUser },
    });
  } catch (error) {
    logger.error('Update profile error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
}
