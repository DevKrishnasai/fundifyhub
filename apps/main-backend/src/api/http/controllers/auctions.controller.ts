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
} from '@fundifyhub/types';
import { ValidationError, ErrorCode } from '@fundifyhub/utils';
import logger from '../../../utils/logger';
import { asyncHandler } from '../middlewares';
import { API_MESSAGES } from '@fundifyhub/types';

export const auctionsController = {
  /**
   * Create new auction for defaulted loan
   * POST /api/auctions
   */
  createAuction: asyncHandler(async (req: Request, res: Response) => {
    const validatedData = createAuctionSchema.parse(req.body);
    const input = {
      ...validatedData,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
    };
    const auction = await auctionsService.create(input, req.user as RBACUser);
    res.status(201).json({ success: true, data: auction });
  }),

  /**
   * Get auction by ID
   * GET /api/auctions/:auctionId
   */
  getAuction: asyncHandler(async (req: Request, res: Response) => {
    const { auctionId } = auctionIdSchema.parse(req.params);
    const auction = await auctionsService.getById(auctionId, req.user as RBACUser);
    res.status(200).json({ success: true, data: auction });
  }),

  /**
   * List auctions with filtering and pagination
   * GET /api/auctions
   */
  listAuctions: asyncHandler(async (req: Request, res: Response) => {
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
  }),

  /**
   * Place bid on auction
   * POST /api/auctions/:auctionId/bids
   */
  placeBid: asyncHandler(async (req: Request, res: Response) => {
    const { auctionId } = auctionIdSchema.parse(req.params);
    const { bidAmount } = placeBidSchema.parse({ ...req.body, auctionId });
    if (!req.user?.id) {
      throw new ValidationError(API_MESSAGES.ERROR.UNAUTHORIZED, ErrorCode.AUTHENTICATION_ERROR);
    }
    const result = await auctionsService.placeBid(
      { auctionId, bidderId: req.user.id, bidAmount },
      req.user as RBACUser
    );
    res.status(201).json({ success: true, data: result });
  }),

  /**
   * Publish auction (SCHEDULED -> ACTIVE)
   * POST /api/auctions/:auctionId/publish
   */
  publishAuction: asyncHandler(async (req: Request, res: Response) => {
    const { auctionId } = auctionIdSchema.parse(req.params);
    const auction = await auctionsService.publish(auctionId, req.user as RBACUser);
    res.status(200).json({ success: true, data: auction });
  }),

  /**
   * Extend auction end time
   * POST /api/auctions/:auctionId/extend
   */
  extendAuction: asyncHandler(async (req: Request, res: Response) => {
    const { auctionId } = auctionIdSchema.parse(req.params);
    const { newEndDate } = extendAuctionSchema.parse(req.body);
    const auction = await auctionsService.extend(
      auctionId,
      new Date(newEndDate),
      req.user as RBACUser
    );
    res.status(200).json({ success: true, data: auction });
  }),

  /**
   * End auction and determine winner
   * POST /api/auctions/:auctionId/end
   */
  endAuction: asyncHandler(async (req: Request, res: Response) => {
    const { auctionId } = auctionIdSchema.parse(req.params);
    const auction = await auctionsService.endAuction(auctionId, req.user as RBACUser);
    res.status(200).json({ success: true, data: auction });
  }),

  /**
   * Cancel auction
   * POST /api/auctions/:auctionId/cancel
   */
  cancelAuction: asyncHandler(async (req: Request, res: Response) => {
    const { auctionId } = auctionIdSchema.parse(req.params);
    const { reason } = cancelAuctionSchema.parse(req.body);
    const auction = await auctionsService.cancelAuction(auctionId, reason, req.user as RBACUser);
    res.status(200).json({ success: true, data: auction });
  }),
};

