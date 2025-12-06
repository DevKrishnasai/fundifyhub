/**
 * Auctions Controller
 *
 * Handles HTTP requests related to auctions.
 *
 * @module api/http/controllers/auctions
 */
import { auctionsService } from '../../../domain/auctions';
import type { RBACUser } from '../../../domain/access-control/rbac';
import type { Request, Response } from 'express';
import {
  createAuctionSchema,
  placeBidSchema,
  extendAuctionSchema,
  cancelAuctionSchema,
  listAuctionsSchema,
  auctionIdSchema,
} from '../../../domain/auctions/auctions.validators';
import { ValidationError, ErrorCode } from '@fundifyhub/utils';
import logger from '../../../utils/logger';

/**
 * Create new auction for defaulted loan
 * POST /api/auctions
 */
async function createAuction(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const validatedData = createAuctionSchema.parse(req.body);

    // Convert date strings to Date objects
    const input = {
      ...validatedData,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
    };

    // Call service
    const auction = await auctionsService.create(input, req.user as RBACUser);

    res.status(201).json({
      success: true,
      data: auction,
    });
  } catch (error: any) {
    logger.error('[AuctionsController.createAuction] Error', { error });
    
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        code: ErrorCode.INVALID_INPUT,
        message: 'Validation failed',
        errors: error.errors,
      });
      return;
    }

    res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
    });
  }
}

/**
 * Get auction by ID
 * GET /api/auctions/:auctionId
 */
async function getAuction(req: Request, res: Response): Promise<void> {
  try {
    const { auctionId } = auctionIdSchema.parse(req.params);

    const auction = await auctionsService.getById(auctionId, req.user as RBACUser);

    res.status(200).json({
      success: true,
      data: auction,
    });
  } catch (error: any) {
    logger.error('[AuctionsController.getAuction] Error', { error });
    
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        code: ErrorCode.INVALID_INPUT,
        message: 'Validation failed',
        errors: error.errors,
      });
      return;
    }

    res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
    });
  }
}

/**
 * List auctions with filtering and pagination
 * GET /api/auctions
 */
async function listAuctions(req: Request, res: Response): Promise<void> {
  try {
    const validatedQuery = listAuctionsSchema.parse(req.query);

    const result = await auctionsService.list(req.user as RBACUser, validatedQuery);

    res.status(200).json({
      success: true,
      data: result.auctions,
      pagination: {
        page: validatedQuery.page,
        pageSize: validatedQuery.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / (validatedQuery.pageSize || 10)),
      },
    });
  } catch (error: any) {
    logger.error('[AuctionsController.listAuctions] Error', { error });
    
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        code: ErrorCode.INVALID_INPUT,
        message: 'Validation failed',
        errors: error.errors,
      });
      return;
    }

    res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
    });
  }
}

/**
 * Place bid on auction
 * POST /api/auctions/:auctionId/bids
 */
async function placeBid(req: Request, res: Response): Promise<void> {
  try {
    const { auctionId } = auctionIdSchema.parse(req.params);
    const { bidAmount } = placeBidSchema.parse({ ...req.body, auctionId });

    if (!req.user?.id) {
      throw new ValidationError('User not authenticated', ErrorCode.AUTHENTICATION_ERROR);
    }

    const result = await auctionsService.placeBid(
      {
        auctionId,
        bidderId: req.user.id,
        bidAmount,
      },
      req.user as RBACUser
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('[AuctionsController.placeBid] Error', { error });
    
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        code: ErrorCode.INVALID_INPUT,
        message: 'Validation failed',
        errors: error.errors,
      });
      return;
    }

    res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
    });
  }
}

/**
 * Publish auction (SCHEDULED -> ACTIVE)
 * POST /api/auctions/:auctionId/publish
 */
async function publishAuction(req: Request, res: Response): Promise<void> {
  try {
    const { auctionId } = auctionIdSchema.parse(req.params);

    const auction = await auctionsService.publish(auctionId, req.user as RBACUser);

    res.status(200).json({
      success: true,
      data: auction,
    });
  } catch (error: any) {
    logger.error('[AuctionsController.publishAuction] Error', { error });

    res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
    });
  }
}

/**
 * Extend auction end time
 * POST /api/auctions/:auctionId/extend
 */
async function extendAuction(req: Request, res: Response): Promise<void> {
  try {
    const { auctionId } = auctionIdSchema.parse(req.params);
    const { newEndDate } = extendAuctionSchema.parse(req.body);

    const auction = await auctionsService.extend(
      auctionId,
      new Date(newEndDate),
      req.user as RBACUser
    );

    res.status(200).json({
      success: true,
      data: auction,
    });
  } catch (error: any) {
    logger.error('[AuctionsController.extendAuction] Error', { error });
    
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        code: ErrorCode.INVALID_INPUT,
        message: 'Validation failed',
        errors: error.errors,
      });
      return;
    }

    res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
    });
  }
}

/**
 * End auction and determine winner
 * POST /api/auctions/:auctionId/end
 */
async function endAuction(req: Request, res: Response): Promise<void> {
  try {
    const { auctionId } = auctionIdSchema.parse(req.params);

    const auction = await auctionsService.endAuction(auctionId, req.user as RBACUser);

    res.status(200).json({
      success: true,
      data: auction,
    });
  } catch (error: any) {
    logger.error('[AuctionsController.endAuction] Error', { error });

    res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
    });
  }
}

/**
 * Cancel auction
 * POST /api/auctions/:auctionId/cancel
 */
async function cancelAuction(req: Request, res: Response): Promise<void> {
  try {
    const { auctionId } = auctionIdSchema.parse(req.params);
    const { reason } = cancelAuctionSchema.parse(req.body);

    const auction = await auctionsService.cancelAuction(auctionId, reason, req.user as RBACUser);

    res.status(200).json({
      success: true,
      data: auction,
    });
  } catch (error: any) {
    logger.error('[AuctionsController.cancelAuction] Error', { error });
    
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        code: ErrorCode.INVALID_INPUT,
        message: 'Validation failed',
        errors: error.errors,
      });
      return;
    }

    res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
    });
  }
}

export const auctionsController = {
  createAuction,
  getAuction,
  listAuctions,
  placeBid,
  publishAuction,
  extendAuction,
  endAuction,
  cancelAuction,
};

