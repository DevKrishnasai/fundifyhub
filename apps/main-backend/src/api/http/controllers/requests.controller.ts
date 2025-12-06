/**
 * Requests Controller
 *
 * Handles HTTP requests related to loan requests.
 *
 * @module api/http/controllers/requests
 */
import { requestsService } from '../../../domain/requests';
import type { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../../../utils/logger';
import { asyncHandler } from '../middlewares';
import { 
  createRequestSchema, 
  assignAgentSchema,
  assignAdminSchema,
  createOfferSchema,
  scheduleInspectionSchema,
  uploadDocumentsSchema,
  API_MESSAGES, 
  type PaginationParams 
} from '@fundifyhub/types';

export const requestsController = {
  createRequest: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: API_MESSAGES.ERROR.UNAUTHORIZED });
      return;
    }

    const data = createRequestSchema.parse(req.body);

    // Map district to districtId if needed, or ensure service handles it
    // The schema has 'district' (string), service might expect 'districtId'
    // We'll pass data as is and let service handle mapping or update service
    const request = await requestsService.create(req.user.id, {
      ...data,
      districtId: data.district, // Map district to districtId
    });

    logger.info('[RequestsController] Request created', { requestId: request.id, userId: req.user.id });

    res.status(201).json({
      success: true,
      message: 'Request created successfully',
      data: { request },
    });
  }),

  getRequest: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: API_MESSAGES.ERROR.UNAUTHORIZED });
      return;
    }

    const { id } = req.params;

    const request = await requestsService.getById(id, req.user);

    res.status(200).json({
      success: true,
      data: { request },
    });
  }),

  listRequests: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: API_MESSAGES.ERROR.UNAUTHORIZED });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const stage = req.query.stage as string | undefined;
    const status = req.query.status as string | undefined;
    const sortBy = (req.query.sortBy as 'createdAt' | 'updatedAt' | 'amount') || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const result = await requestsService.list(req.user, {
      page,
      pageSize,
      stage,
      status,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  }),

  submitForReview: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: API_MESSAGES.ERROR.UNAUTHORIZED });
      return;
    }

    const { id } = req.params;

    const request = await requestsService.submitForReview(id);

    logger.info('[RequestsController] Request submitted for review', { requestId: id, userId: req.user.id });

    res.status(200).json({
      success: true,
      message: 'Request submitted for review',
      data: { request },
    });
  }),

  assignAgent: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: API_MESSAGES.ERROR.UNAUTHORIZED });
      return;
    }

    const { id } = req.params;
    const { agentId } = assignAgentSchema.parse(req.body);

    const request = await requestsService.assignAgent({ requestId: id, agentId });

    logger.info('[RequestsController] Agent assigned to request', { requestId: id, agentId, adminId: req.user.id });

    res.status(200).json({
      success: true,
      message: 'Agent assigned successfully',
      data: { request },
    });
  }),

  assignAdmin: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: API_MESSAGES.ERROR.UNAUTHORIZED });
      return;
    }

    const { id } = req.params;
    const { adminId } = assignAdminSchema.parse(req.body);

    const request = await requestsService.assignAdmin({ requestId: id, adminId });

    logger.info('[RequestsController] Admin assigned to request', { requestId: id, adminId, assignedBy: req.user.id });

    res.status(200).json({
      success: true,
      message: 'Admin assigned successfully',
      data: { request },
    });
  }),

  createOffer: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: API_MESSAGES.ERROR.UNAUTHORIZED });
      return;
    }

    const { id } = req.params;
    const offerData = createOfferSchema.parse(req.body);

    const offer = await requestsService.createOffer({
      requestId: id,
      tenure: offerData.tenureMonths,
      interestRate: offerData.interestRate,
      processingFeeAmount: offerData.processingFeeAmount,
      ltvPercentage: offerData.ltvPercentage,
    });

    logger.info('[RequestsController] Offer created', { requestId: id, offerId: offer.id, userId: req.user.id });

    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: { offer },
    });
  }),

  acceptOffer: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: API_MESSAGES.ERROR.UNAUTHORIZED });
      return;
    }

    const { id, offerId } = req.params;

    const request = await requestsService.customerAcceptOffer(id);

    logger.info('[RequestsController] Offer accepted', { requestId: id, offerId, userId: req.user.id });

    res.status(200).json({
      success: true,
      message: 'Offer accepted successfully',
      data: { request },
    });
  }),

  scheduleInspection: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: API_MESSAGES.ERROR.UNAUTHORIZED });
      return;
    }

    const { id } = req.params;
    const { scheduledAt, notes } = scheduleInspectionSchema.parse(req.body);

    const request = await requestsService.scheduleInspection(id, scheduledAt);

    logger.info('[RequestsController] Inspection scheduled', { requestId: id, scheduledAt, userId: req.user.id });

    res.status(200).json({
      success: true,
      message: 'Inspection scheduled successfully',
      data: { request },
    });
  }),

  uploadDocuments: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: API_MESSAGES.ERROR.UNAUTHORIZED });
      return;
    }

    const { id } = req.params;
    const { documents } = uploadDocumentsSchema.parse(req.body);

    const request = await requestsService.uploadDocuments(id, documents);

    logger.info('[RequestsController] Documents uploaded', { requestId: id, count: documents.length, userId: req.user.id });

    res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully',
      data: { request },
    });
  }),

  disburse: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: API_MESSAGES.ERROR.UNAUTHORIZED });
      return;
    }

    const { id } = req.params;
    const loan = await requestsService.disburseLoan(id);

    logger.info('[RequestsController] Loan disbursed', { requestId: id, userId: req.user.id });

    res.status(200).json({
      success: true,
      message: 'Loan disbursed successfully',
      data: { loan },
    });
  }),
};
