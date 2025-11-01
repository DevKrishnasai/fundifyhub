/**
 * Adds new asset photos to the request (does not delete existing)
 */
async function updateAssetPhotos(tx: any, requestId: string, assetPhotos: any, customerId: string, res: Response) {
  const parsedPhotos = validateAssetPhotos(assetPhotos, res);
  if (parsedPhotos === null || parsedPhotos.length === 0) return false;
  await Promise.all(parsedPhotos.map((url: string) =>
    tx.document.create({
      data: {
        requestId,
        url,
        documentType: 'asset_photo',
        documentCategory: DocumentCategory.ASSET,
        uploadedBy: customerId,
      },
    })
  ));
  return true;
}
/**
 * User Controllers
 * Handles HTTP requests and responses for user operations
 * Business logic is delegated to user services
 */

import { prisma, User } from '@fundifyhub/prisma';
import { Request, Response } from 'express';
import { createLogger } from '@fundifyhub/logger';
import { isValidAssetType, isValidAssetCondition, DocumentCategory,RequestStatus, LoanStatus } from '@fundifyhub/types';
const logger = createLogger({ serviceName: 'user-controllers' });
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
 * GET /user/debug-auth
 * Debug authentication - shows token data vs database data (development only)
 */
export async function debugAuthController(req: Request, res: Response): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }

  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const result = await debugAuth(req.user.id, req.user);

    res.json({
      success: result.success,
      data: result.data,
    });
  } catch (error) {
    logger.error('Debug auth error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
    });
  }
}

/**
 * Shared validation and helper functions for asset operations
 */

/**
 * Validates required fields for asset request
 */
function validateAssetFields(fields: any, res: Response): boolean {
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
function validateAssetPhotos(assetPhotos: any, res: Response): string[] | null {
  if (assetPhotos === undefined) return [];
  
  if (!Array.isArray(assetPhotos)) {
    res.status(400).json({ success: false, message: 'assetPhotos must be an array of URLs' });
    return null;
  }
  
  return assetPhotos.filter((p: any) => typeof p === 'string' && p.trim() !== '');
}

/**
 * Builds request data object from input fields
 */
function buildRequestData(fields: any): any {
  const requestData: any = {
    district: fields.district,
    assetType: fields.assetType,
    assetBrand: fields.assetBrand,
    assetModel: fields.assetModel,
    assetCondition: fields.assetCondition,
    requestedAmount: typeof fields.requestedAmount === 'number' ? fields.requestedAmount : 0,
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
async function handleDocuments(tx: any, requestId: string, photos: string[], customerId: string) {
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
          url,
          documentType: 'asset_photo',
          documentCategory: DocumentCategory.ASSET,
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
    const customerId = req.user!.id;
    const district = req.user!.district
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

    // Validate required fields
    if (!validateAssetFields({ district, assetType, assetBrand, assetModel, assetCondition }, res)) {
      return;
    }

    // Validate enum values
    if (!validateAssetEnums(assetType, assetCondition, res)) {
      return;
    }

    // Validate and parse photos
    const photos = validateAssetPhotos(assetPhotos, res);
    if (photos === null) return;

    // Build request data
    const requestData = buildRequestData({
      district,
      assetType,
      assetBrand,
      assetModel,
      assetCondition,
      purchaseYear,
      requestedAmount,
      AdditionalDescription,
    });
    requestData.customerId = customerId;

    // Create request and documents in transaction
    const createdRequest = await prisma.$transaction(async (tx) => {
      const reqCreated = await tx.request.create({ data: requestData });
      await handleDocuments(tx, reqCreated.id, photos, customerId);
      return reqCreated;
    });

    res.status(201).json({ 
      success: true, 
      message: 'Asset request created successfully'
      
    });
  } catch (error) {
    logger.error('Add asset error:', error as Error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create asset request' 
    });
  }
}

/**
 * PUT /user/update-asset
 * Update an existing asset request (protected)
 * 
 * @param req - Express request object
 * @param req.body.requestId - ID of the request to update (required)
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
// Make sure you have RequestStatus enum imported, e.g.:
// import { RequestStatus } from '@prisma/client';
// (Or wherever your enum is defined)

export async function updateAssetController(req: Request, res: Response): Promise<void> {
  try {
    const customerId = req.user!.id;
    const userRoles = Array.isArray(req.user!.roles) ? req.user!.roles : [];
  const { requestId, assetPhotos, ...updateData } = req.body || {};

    if (!requestId || typeof requestId !== 'string') {
      res.status(400).json({ success: false, message: 'requestId is required' });
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
    const isAdminOrAgent = userRoles.includes('ADMIN') || userRoles.includes('AGENT');
    if (customerId !== existing.customerId || !isAdminOrAgent) {
      res.status(403).json({ success: false, message: 'Not authorized to update this request' });
      return;
    }

    const allowedUpdateStatuses = [
      RequestStatus.PENDING,
      RequestStatus.OFFER_REJECTED,
      RequestStatus.REJECTED,
      RequestStatus.CANCELLED
    ];
    if (!allowedUpdateStatuses.includes(existing.currentStatus as RequestStatus)) {
      res.status(400).json({
        success: false,
        message: 'This request cannot be updated as it has already been processed or is in a locked state.'
      });
      return;
    }

    // Always set status to PENDING on update
    updateData.currentStatus = RequestStatus.PENDING;

    // Update request and asset photos in transaction
    await prisma.$transaction(async (tx) => {
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
  data?: any;
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
    user?: any;
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
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
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
 * Debug authentication - shows token data vs database data
 */
export async function debugAuth(
  userId: string,
  tokenData: any
): Promise<{
  success: boolean;
  data?: any;
  message: string;
}> {
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      message: 'Not available in production',
    };
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    return {
      success: true,
      data: {
        tokenData: {
          ...tokenData,
          rolesType: Array.isArray(tokenData?.roles) ? 'array' : typeof tokenData?.roles,
        },
        databaseData: {
          ...dbUser,
          rolesType: Array.isArray(dbUser?.roles) ? 'array' : typeof dbUser?.roles,
        },
        comparison: {
          rolesMatch: JSON.stringify(tokenData?.roles) === JSON.stringify(dbUser?.roles),
          tokenRoles: tokenData?.roles,
          dbRoles: dbUser?.roles,
        },
      },
      message: 'Debug data retrieved',
    };
  } catch (error) {
    logger.error('Debug auth error:', error as Error);
    return {
      success: false,
      message: 'Debug failed',
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
        status: LoanStatus.ACTIVE,
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
        currentStatus: RequestStatus.PENDING,
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
 * Service: Get total borrowed amount (from Loan table)
 * Includes all loans where:
 *   - related request belongs to the user
 *   - loan status is either APPROVED, ACTIVE, or COMPLETED
 */
export async function getTotalBorrowStats(userId: string): Promise<{ totalBorrowed: number }> {
  try {
    const result = await prisma.loan.aggregate({
      where: {
        status: LoanStatus.ACTIVE,
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
