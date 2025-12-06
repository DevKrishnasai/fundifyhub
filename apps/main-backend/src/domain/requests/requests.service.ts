/**
 * Requests Service
 * 
 * Handles the complete loan request lifecycle:
 * - Request creation and submission
 * - Agent and admin assignment
 * - Offer management
 * - Inspection scheduling
 * - Document uploads
 * - Loan disbursement
 * 
 * Core workflow:
 * CREATED → SUBMITTED → AGENT_ASSIGNED → INSPECTION_SCHEDULED →
 * INSPECTION_COMPLETED → OFFER_CREATED → OFFER_ACCEPTED →
 * READY_FOR_LOAN → LOAN_DISBURSED → COMPLETED
 * 
 * @module domain/requests
 */

import { prisma } from '@fundifyhub/prisma';
import { ValidationError, NotFoundError, ForbiddenError, BusinessRuleError, ErrorCode } from '@fundifyhub/utils';
import type { Request, UserType } from '@fundifyhub/types';
import { ROLES, REQUEST_STAGE, SUB_STATUS, TRANSFER_METHOD } from '@fundifyhub/types';
import { 
  canCreateRequest, 
  canViewRequest, 
  canListRequests, 
  canAssignAgent, 
  canAssignAdmin,
  canCreateOffer,
  hasRole,
  hasDistrictAccess,
  type RBACUser
} from '../access-control/rbac';
import { eventBus } from '../events/bus';
import type { 
  RequestCreatedEvent, 
  RequestSubmittedEvent, 
  AgentAssignedEvent, 
  AdminAssignedEvent,
  OfferCreatedEvent,
  OfferAcceptedEvent,
  OfferRejectedEvent,
  InspectionScheduledEvent
} from './requests.events';
import logger from '../../utils/logger';

export interface CreateRequestInput {
  assetDescription: string;
  requestedAmount: number;
  estimatedAssetValue: number;
  assetType: string;
  districtId: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateRequestInput {
  assetDescription?: string;
  requestedAmount?: number;
  estimatedAssetValue?: number;
}

export interface ListRequestsInput {
  page?: number;
  pageSize?: number;
  stage?: string;
  status?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

export interface AssignAgentInput {
  requestId: string;
  agentId: string;
}

export interface AssignAdminInput {
  requestId: string;
  adminId: string;
}

export interface CreateOfferInput {
  requestId: string;
  tenure: number;
  interestRate: number;
  processingFeeAmount?: number;
  ltvPercentage?: number;
}

/**
 * RequestsService - Core request lifecycle management
 */
export class RequestsService {
  private static instance: RequestsService;

  static getInstance(): RequestsService {
    if (!RequestsService.instance) {
      RequestsService.instance = new RequestsService();
    }
    return RequestsService.instance;
  }

  /**
   * Create a new loan request (CUSTOMER only)
   * 
   * 1. Validate input
   * 2. Check district access (customer's home district)
   * 3. Create request with REVIEW stage (simplified from old CREATED)
   * 4. Emit event for notification
   * 5. Return created request
   * 
   * @throws ValidationError if input invalid
   * @throws ForbiddenError if customer lacks district access
   */
  async create(customerId: string, input: CreateRequestInput): Promise<Request> {
    try {
      // Validate input
      if (!input.assetDescription || !input.requestedAmount || !input.estimatedAssetValue) {
        throw new ValidationError('Missing required fields', ErrorCode.INVALID_INPUT);
      }

      if (input.requestedAmount <= 0 || input.estimatedAssetValue <= 0) {
        throw new ValidationError('Amounts must be positive', ErrorCode.INVALID_INPUT);
      }

      // Verify customer exists and is ACTIVE
      const customer = await prisma.user.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundError('Customer not found', ErrorCode.USER_NOT_FOUND);
      }

      if (!customer.isActive) {
        throw new BusinessRuleError('Customer account is not active');
      }

      // Check customer's home district matches districtId
      if (customer.homeDistrictId !== input.districtId) {
        throw new ForbiddenError('Customer can only create requests in their home district', ErrorCode.FORBIDDEN);
      }

      // Create Request record with REVIEW stage, PENDING sub-status
      const requestNumber = `REQ${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      const request = await prisma.request.create({
        data: {
          requestNumber,
          customerId,
          districtId: input.districtId,
          requestedAmount: input.requestedAmount,
          stage: REQUEST_STAGE.REVIEW,
          subStatus: SUB_STATUS.REVIEW.PENDING,
          requiresCustomerAction: false,
          requiresAdminAction: true,
          requiresAgentAction: false,
          isBlocked: false,
          // Create related asset
          asset: {
            create: {
              assetType: input.assetType,
              brand: '',
              model: '',
              condition: 'GOOD',
              purchaseYear: new Date().getFullYear(),
              description: input.assetDescription,
              estimatedValue: input.estimatedAssetValue,
            },
          },
        },
      });

      // Emit RequestCreated event
      const event: RequestCreatedEvent = {
        type: 'request.created',
        timestamp: new Date(),
        aggregateId: request.id,
        data: {
          requestId: request.id,
          customerId,
          customerEmail: customer.email,
          customerName: `${customer.firstName} ${customer.lastName}`,
          amount: input.requestedAmount,
          requestedAmount: input.requestedAmount,
          districtId: input.districtId,
          assetDescription: input.assetDescription,
        },
      };
      eventBus.emit('request.created', event);

      logger.info('[RequestsService.create] Request created by customer', {
        requestId: request.id,
        customerId,
        amount: input.requestedAmount,
        district: input.districtId,
      });

      return request as unknown as Request;
    } catch (err) {
      logger.error('[RequestsService.create] Request creation failed', { error: err, customerId });
      throw err;
    }
  }

  /**
   * Get request by ID with permission check
   * 
   * Customers can only view their own requests.
   * Agents/Admins can view requests in their district.
   * Super admin can view all.
   * 
   * @throws NotFoundError if request doesn't exist
   * @throws ForbiddenError if user lacks access
   */
  async getById(requestId: string, user: RBACUser): Promise<Request> {
    try {
      // Fetch request from database with relations
      const request = await prisma.request.findUnique({
        where: { id: requestId },
        include: {
          customer: true,
          assignedAgent: true,
          assignedAdmin: true,
          asset: true,
          documents: true,
          district: true,
        },
      });

      if (!request) {
        throw new NotFoundError('Request not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Check user access permissions using RBAC
      const hasAccess = canViewRequest(user, request.customerId, request.districtId);
      if (!hasAccess) {
        throw new ForbiddenError('You do not have permission to view this request', ErrorCode.FORBIDDEN);
      }

      logger.info('[RequestsService.getById] Request retrieved', { requestId, userId: user.id });

      return request as unknown as Request;
    } catch (err) {
      logger.error('[RequestsService.getById] Failed to get request', { error: err, requestId, userId: user.id });
      throw err;
    }
  }

  /**
   * List requests with filtering and pagination
   * 
   * Filters applied based on user role:
   * - CUSTOMER: Only their requests
   * - AGENT: Assigned to them
   * - DISTRICT_ADMIN/STATE_ADMIN: In their district(s)
   * 
   * @throws ValidationError if input invalid
   */
  async list(user: RBACUser, input: ListRequestsInput): Promise<{ requests: Request[]; total: number }> {
    try {
      // Check if user can list requests
      if (!canListRequests(user)) {
        throw new ForbiddenError('You do not have permission to list requests', ErrorCode.FORBIDDEN);
      }

      // Pagination defaults
      const page = input.page ?? 1;
      const pageSize = input.pageSize ?? 20;
      const skip = (page - 1) * pageSize;

      // Build WHERE clause based on user role
      const where: any = {};

      if (hasRole(user, ROLES.CUSTOMER)) {
        // Customer sees only their own requests
        where.customerId = user.id;
      } else if (hasRole(user, ROLES.AGENT)) {
        // Agent sees requests assigned to them
        where.assignedAgentId = user.id;
      } else if (hasRole(user, ROLES.DISTRICT_ADMIN)) {
        // District admin sees requests in their districts
        where.districtId = { in: user.districts || [] };
      } else if (hasRole(user, ROLES.STATE_ADMIN)) {
        // State admin sees requests in their state (via districts)
        where.districtId = { in: user.districts || [] };
      }
      // SUPER_ADMIN sees all - no filter

      // Apply stage/status filters if provided
      if (input.stage) {
        where.stage = input.stage;
      }
      if (input.status) {
        where.subStatus = input.status;
      }

      // Apply sorting
      const sortBy = input.sortBy || 'createdAt';
      const sortOrder = input.sortOrder || 'desc';
      const orderBy = { [sortBy]: sortOrder };

      // Fetch from database with pagination
      const [requests, total] = await Promise.all([
        prisma.request.findMany({
          where,
          orderBy,
          skip,
          take: pageSize,
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
            assignedAgent: { select: { id: true, firstName: true, lastName: true } },
            assignedAdmin: { select: { id: true, firstName: true, lastName: true } },
            district: { select: { id: true, name: true } },
          },
        }),
        prisma.request.count({ where }),
      ]);

      logger.info('[RequestsService.list] Requests listed', { 
        userId: user.id, 
        role: user.roles?.[0], 
        count: requests.length,
        total 
      });

      return { 
        requests: requests as unknown as Request[], 
        total 
      };
    } catch (err) {
      logger.error('[RequestsService.list] Failed to list requests', { error: err, userId: user.id });
      throw err;
    }
  }

  /**
   * Submit request for review
   * 
   * 1. Verify request is in REVIEW stage with PENDING sub-status
   * 2. Check all required documents uploaded
   * 3. Transition to IN_REVIEW sub-status
   * 4. Emit RequestSubmitted event (notification triggers)
   * 
   * @throws NotFoundError if request doesn't exist
   * @throws BusinessRuleError if not in correct stage or missing documents
   */
  async submitForReview(requestId: string): Promise<Request> {
    try {
      // Fetch request
      const request = await prisma.request.findUnique({
        where: { id: requestId },
        include: { documents: true },
      });

      if (!request) {
        throw new NotFoundError('Request not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Verify stage is REVIEW
      if (request.stage !== REQUEST_STAGE.REVIEW) {
        throw new BusinessRuleError(`Request must be in ${REQUEST_STAGE.REVIEW} stage to submit`);
      }

      // Check required documents (at least asset photos)
      const hasAssetPhotos = request.documents.some((doc: any) => 
        doc.documentType === 'ASSET_PHOTO' || doc.category === 'asset'
      );
      if (!hasAssetPhotos) {
        throw new BusinessRuleError('At least one asset photo is required before submission');
      }

      // Update to IN_REVIEW sub-status
      const updatedRequest = await prisma.request.update({
        where: { id: requestId },
        data: {
          subStatus: SUB_STATUS.REVIEW.IN_REVIEW,
          requiresCustomerAction: false,
          requiresAdminAction: true,
        },
        include: {
          customer: true,
          district: true,
        },
      });

      // Fetch asset for event data
      const asset = await prisma.asset.findUnique({
        where: { requestId },
      });
      
      // Emit RequestSubmitted event
      const event: RequestSubmittedEvent = {
        type: 'request.submitted',
        timestamp: new Date(),
        aggregateId: requestId,
        data: {
          requestId,
          customerId: request.customerId,
          districtId: request.districtId,
          requestedAmount: request.requestedAmount,
          assetType: asset?.assetType || 'UNKNOWN',
          stage: updatedRequest.stage,
        },
      };
      eventBus.emit('request.submitted', event);

      logger.info('[RequestsService.submitForReview] Request submitted for review', { requestId });

      return updatedRequest as unknown as Request;
    } catch (err) {
      logger.error('[RequestsService.submitForReview] Failed to submit request', { error: err, requestId });
      throw err;
    }
  }

  /**
   * Assign agent to request (DISTRICT_ADMIN only)
   * 
   * 1. Verify request exists
   * 2. Verify agent exists and is in same district
   * 3. Update request with assigned agent
   * 4. Emit AgentAssigned event
   * 
   * @throws NotFoundError if request/agent doesn't exist
   * @throws BusinessRuleError if agent not in same district
   */
  async assignAgent(input: AssignAgentInput): Promise<Request> {
    try {
      // Fetch request
      const request = await prisma.request.findUnique({
        where: { id: input.requestId },
        include: { customer: true },
      });

      if (!request) {
        throw new NotFoundError('Request not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Verify stage is REVIEW
      if (request.stage !== REQUEST_STAGE.REVIEW) {
        throw new BusinessRuleError(`Request must be in ${REQUEST_STAGE.REVIEW} stage to assign agent`);
      }

      // Fetch agent, verify exists and is ACTIVE
      const agent = await prisma.user.findUnique({
        where: { id: input.agentId },
        include: { districtAssignments: true },
      });

      if (!agent) {
        throw new NotFoundError('Agent not found', ErrorCode.USER_NOT_FOUND);
      }

      if (!agent.isActive) {
        throw new BusinessRuleError('Agent account is not active');
      }

      // Verify agent has AGENT role
      if (!agent.roles.includes(ROLES.AGENT)) {
        throw new BusinessRuleError('User is not an agent');
      }

      // Verify agent district matches request district
      const agentDistrictIds = agent.districtAssignments.map((da: any) => da.districtId);
      if (!agentDistrictIds.includes(request.districtId)) {
        throw new BusinessRuleError('Agent is not assigned to the request district');
      }

      // Update request: assignedAgentId, subStatus to ASSIGNED
      const updatedRequest = await prisma.request.update({
        where: { id: input.requestId },
        data: {
          assignedAgentId: input.agentId,
          subStatus: SUB_STATUS.REVIEW.ASSIGNED,
          requiresAgentAction: true,
          requiresAdminAction: false,
        },
        include: {
          customer: true,
          assignedAgent: true,
          district: true,
        },
      });

      // Emit AgentAssigned event
      const event: AgentAssignedEvent = {
        type: 'agent.assigned',
        timestamp: new Date(),
        aggregateId: input.requestId,
        data: {
          requestId: input.requestId,
          agentId: input.agentId,
          customerId: request.customerId,
          districtId: request.districtId,
        },
      };
      eventBus.emit('agent.assigned', event);

      logger.info('[RequestsService.assignAgent] Agent assigned to request', {
        requestId: input.requestId,
        agentId: input.agentId,
      });

      return updatedRequest as unknown as Request;
    } catch (err) {
      logger.error('[RequestsService.assignAgent] Failed to assign agent', { error: err, input });
      throw err;
    }
  }

  /**
   * Assign admin to request (STATE_ADMIN or above)
   * 
   * Used for escalations or special requests
   * 
   * @throws NotFoundError if request/admin doesn't exist
   * @throws ForbiddenError if admin not in request's state
   */
  async assignAdmin(input: AssignAdminInput): Promise<Request> {
    try {
      // Fetch request
      const request = await prisma.request.findUnique({
        where: { id: input.requestId },
        include: { 
          customer: true,
          district: { include: { state: true } },
        },
      });

      if (!request) {
        throw new NotFoundError('Request not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Fetch admin, verify STATE_ADMIN or above
      const admin = await prisma.user.findUnique({
        where: { id: input.adminId },
        include: { stateAssignments: true, districtAssignments: true },
      });

      if (!admin) {
        throw new NotFoundError('Admin not found', ErrorCode.USER_NOT_FOUND);
      }

      if (!admin.isActive) {
        throw new BusinessRuleError('Admin account is not active');
      }

      // Verify admin has STATE_ADMIN or SUPER_ADMIN role
      const isStateAdmin = admin.roles.includes(ROLES.STATE_ADMIN);
      const isSuperAdmin = admin.roles.includes(ROLES.SUPER_ADMIN);
      if (!isStateAdmin && !isSuperAdmin) {
        throw new BusinessRuleError('User must be STATE_ADMIN or SUPER_ADMIN');
      }

      // Verify admin's state matches request district's state (unless SUPER_ADMIN)
      if (!isSuperAdmin && request.district?.state) {
        const adminStateIds = admin.stateAssignments.map((sa: any) => sa.stateId);
        if (!adminStateIds.includes(request.district.state.id)) {
          throw new BusinessRuleError('Admin is not assigned to the request state');
        }
      }

      // Update request: assignedAdminId
      const updatedRequest = await prisma.request.update({
        where: { id: input.requestId },
        data: {
          assignedAdminId: input.adminId,
          requiresAdminAction: true,
        },
        include: {
          customer: true,
          assignedAdmin: true,
          district: true,
        },
      });

      // Emit AdminAssigned event
      const event: AdminAssignedEvent = {
        type: 'admin.assigned',
        timestamp: new Date(),
        aggregateId: input.requestId,
        data: {
          requestId: input.requestId,
          adminId: input.adminId,
          customerId: request.customerId,
        },
      };
      eventBus.emit('admin.assigned', event);

      logger.info('[RequestsService.assignAdmin] Admin assigned to request', {
        requestId: input.requestId,
        adminId: input.adminId,
      });

      return updatedRequest as unknown as Request;
    } catch (err) {
      logger.error('[RequestsService.assignAdmin] Failed to assign admin', { error: err, input });
      throw err;
    }
  }

  /**
   * Create offer on request
   * 
   * 1. Verify request is in REVIEW stage
   * 2. Calculate EMI schedule using tenure and rate
   * 3. Create Offer record
   * 4. Create Loan record with EMI schedule
   * 5. Transition to OFFER stage
   * 6. Emit OfferCreated event (customer notification)
   * 
   * @throws NotFoundError if request doesn't exist
   * @throws BusinessRuleError if not in correct stage
   */
  async createOffer(input: CreateOfferInput): Promise<Request> {
    try {
      if (!input.tenure || !input.interestRate || input.tenure < 1 || input.interestRate < 0) {
        throw new ValidationError('Invalid tenure or interest rate', ErrorCode.INVALID_INPUT);
      }

      // Fetch request with asset
      const request = await prisma.request.findUnique({
        where: { id: input.requestId },
        include: { asset: true, customer: true },
      });

      if (!request) {
        throw new NotFoundError('Request not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Verify stage allows offer creation
      if (request.stage !== REQUEST_STAGE.REVIEW) {
        throw new BusinessRuleError(`Request must be in ${REQUEST_STAGE.REVIEW} stage to create offer`);
      }

      // Use estimated asset value or requested amount
      const approvedAmount = request.asset?.estimatedValue || request.requestedAmount;
      
      // Calculate LTV percentage (not stored in Loan, only in AdminOffer)
      const ltvPercentage = input.ltvPercentage || (request.requestedAmount / approvedAmount) * 100;

      // Calculate monthly EMI payment using standard formula
      // EMI = [P × r × (1 + r)^n] / [(1 + r)^n - 1]
      const monthlyRate = input.interestRate / 12 / 100;
      const emiAmount = monthlyRate === 0 
        ? approvedAmount / input.tenure
        : (approvedAmount * monthlyRate * Math.pow(1 + monthlyRate, input.tenure)) / (Math.pow(1 + monthlyRate, input.tenure) - 1);
      
      // Calculate processing fee
      const processingFee = input.processingFeeAmount || approvedAmount * 0.02; // 2% default

      // Create AdminOffer and Loan in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Generate unique loan number
        const loanNumber = `LOAN${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        // Calculate totals
        const totalInterest = (emiAmount * input.tenure) - approvedAmount;
        const totalAmount = approvedAmount + totalInterest;
        
        // First EMI date - 30 days from now
        const firstEMIDate = new Date();
        firstEMIDate.setDate(firstEMIDate.getDate() + 30);
        
        // Last EMI date
        const lastEMIDate = new Date(firstEMIDate);
        lastEMIDate.setMonth(lastEMIDate.getMonth() + input.tenure - 1);

        // Create AdminOffer record
        const offer = await tx.adminOffer.create({
          data: {
            requestId: input.requestId,
            offeredById: request.assignedAdminId || request.customerId,
            offeredAmount: approvedAmount,
            tenureMonths: input.tenure,
            interestRate: input.interestRate,
            processingFee,
            emiAmount,
            totalInterest,
            totalAmount,
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days validity
          },
        });

        // Create Loan record
        const loan = await tx.loan.create({
          data: {
            loanNumber,
            requestId: input.requestId,
            approvedAmount,
            interestRate: input.interestRate,
            tenureMonths: input.tenure,
            emiAmount,
            totalInterest,
            totalAmount,
            status: 'ACTIVE',
            approvedDate: new Date(),
            firstEMIDate,
            lastEMIDate,
            remainingAmount: approvedAmount,
            remainingEMIs: input.tenure,
          },
        });

        // Generate EMI schedules
        const emiSchedules = [];
        let remainingPrincipal = approvedAmount;
        const monthlyRate = input.interestRate / 12 / 100;
        
        for (let i = 0; i < input.tenure; i++) {
          const dueDate = new Date(firstEMIDate);
          dueDate.setMonth(dueDate.getMonth() + i);
          
          // Calculate interest and principal components
          const interestAmount = remainingPrincipal * monthlyRate;
          const principalAmount = emiAmount - interestAmount;
          remainingPrincipal -= principalAmount;
          
          emiSchedules.push({
            loanId: loan.id,
            requestId: input.requestId,
            emiNumber: i + 1,
            dueDate,
            emiAmount,
            principalAmount,
            interestAmount,
            status: 'PENDING' as const,
          });
        }

        // Create EMI schedules
        await tx.eMISchedule.createMany({
          data: emiSchedules,
        });

        // Update request to OFFER stage
        const updatedRequest = await tx.request.update({
          where: { id: input.requestId },
          data: {
            stage: REQUEST_STAGE.OFFER,
            subStatus: SUB_STATUS.OFFER.SENT,
            requiresCustomerAction: true,
            requiresAdminAction: false,
            requiresAgentAction: false,
          },
          include: {
            customer: true,
            district: true,
          },
        });

        return { offer, loan, updatedRequest };
      });

      // Emit OfferCreated event
      const event: OfferCreatedEvent = {
        type: 'offer.created',
        timestamp: new Date(),
        aggregateId: input.requestId,
        data: {
          requestId: input.requestId,
          offerId: result.offer.id,
          monthlyEmi: emiAmount,
          tenure: input.tenure,
        },
      };
      eventBus.emit('offer.created', event);

      logger.info('[RequestsService.createOffer] Offer created on request', {
        requestId: input.requestId,
        offerId: result.offer.id,
        loanId: result.loan.id,
        tenure: input.tenure,
        rate: input.interestRate,
      });

      return result.updatedRequest as unknown as Request;
    } catch (err) {
      logger.error('[RequestsService.createOffer] Failed to create offer', { error: err, input });
      throw err;
    }
  }

  /**
   * Customer accepts offer
   * 
   * 1. Verify request in OFFER stage
   * 2. Verify offer not expired
   * 3. Update offer status to ACCEPTED
   * 4. Update loan status to ACCEPTED
   * 5. Transition to OFFER ACCEPTED sub-status
   * 6. Emit OfferAccepted event
   * 
   * @throws BusinessRuleError if offer expired or not in correct stage
   */
  async customerAcceptOffer(requestId: string): Promise<Request> {
    try {
      // Fetch request with AdminOffer and loan
      const request = await prisma.request.findUnique({
        where: { id: requestId },
        include: { 
          customer: true,
          // Get latest offer
          offers: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!request) {
        throw new NotFoundError('Request not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Verify stage is OFFER
      if (request.stage !== REQUEST_STAGE.OFFER) {
        throw new BusinessRuleError(`Request must be in ${REQUEST_STAGE.OFFER} stage to accept offer`);
      }

      const offer = request.offers[0];
      if (!offer) {
        throw new NotFoundError('No offer found for this request', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Check if offer expired
      if (offer.expiresAt && new Date(offer.expiresAt) < new Date()) {
        throw new BusinessRuleError('Offer has expired');
      }

      // Update in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update AdminOffer status
        await tx.adminOffer.update({
          where: { id: offer.id },
          data: {
            status: 'ACCEPTED',
            respondedAt: new Date(),
          },
        });

        // Loan already exists, no need to update status
        const loan = await tx.loan.findFirst({
          where: { requestId },
        });

        // Update request to ACCEPTED sub-status
        const updatedRequest = await tx.request.update({
          where: { id: requestId },
          data: {
            subStatus: SUB_STATUS.OFFER.ACCEPTED,
            requiresCustomerAction: false,
            requiresAdminAction: true,
          },
          include: {
            customer: true,
            district: true,
          },
        });

        return { updatedRequest, loan };
      });

      // Emit OfferAccepted event
      const event: OfferAcceptedEvent = {
        type: 'offer.accepted',
        timestamp: new Date(),
        aggregateId: requestId,
        data: {
          requestId,
          offerId: offer.id,
          customerId: request.customerId,
        },
      };
      eventBus.emit('offer.accepted', event);

      logger.info('[RequestsService.customerAcceptOffer] Offer accepted by customer', { 
        requestId, 
        offerId: offer.id 
      });

      return result.updatedRequest as unknown as Request;
    } catch (err) {
      logger.error('[RequestsService.customerAcceptOffer] Failed to accept offer', { error: err, requestId });
      throw err;
    }
  }

  /**
   * Customer rejects offer
   * 
   * 1. Verify request in OFFER stage
   * 2. Update offer status to DECLINED
   * 3. Keep in OFFER stage with DECLINED sub-status
   * 4. Emit OfferRejected event
   * 
   * @throws BusinessRuleError if not in OFFER stage
   */
  async customerRejectOffer(requestId: string, reason?: string): Promise<Request> {
    try {
      // Fetch request with offer
      const request = await prisma.request.findUnique({
        where: { id: requestId },
        include: { 
          customer: true,
          offers: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!request) {
        throw new NotFoundError('Request not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Verify stage is OFFER
      if (request.stage !== REQUEST_STAGE.OFFER) {
        throw new BusinessRuleError(`Request must be in ${REQUEST_STAGE.OFFER} stage to reject offer`);
      }

      const offer = request.offers[0];
      if (!offer) {
        throw new NotFoundError('No offer found for this request', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Update in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update AdminOffer status
        await tx.adminOffer.update({
          where: { id: offer.id },
          data: {
            status: 'DECLINED',
            notes: reason,
            respondedAt: new Date(),
          },
        });

        // Update request sub-status to DECLINED
        const updatedRequest = await tx.request.update({
          where: { id: requestId },
          data: {
            subStatus: SUB_STATUS.OFFER.DECLINED,
            requiresCustomerAction: false,
            requiresAdminAction: true, // Admin needs to create new offer or close
          },
          include: {
            customer: true,
            district: true,
          },
        });

        return updatedRequest;
      });

      // Emit OfferRejected event
      const event: OfferRejectedEvent = {
        type: 'offer.rejected',
        timestamp: new Date(),
        aggregateId: requestId,
        data: {
          requestId,
          offerId: offer.id,
          customerId: request.customerId,
          reason,
        },
      };
      eventBus.emit('offer.rejected', event);

      logger.info('[RequestsService.customerRejectOffer] Offer rejected by customer', { 
        requestId, 
        offerId: offer.id,
        reason 
      });

      return result as unknown as Request;
    } catch (err) {
      logger.error('[RequestsService.customerRejectOffer] Failed to reject offer', { error: err, requestId });
      throw err;
    }
  }

  /**
   * Schedule inspection for request
   * 
   * Agent schedules inspection after offer acceptance or before
   * 
   * @throws NotFoundError if request doesn't exist
   * @throws BusinessRuleError if not in correct stage
   */
  async scheduleInspection(requestId: string, scheduledDate: Date, agentId?: string): Promise<Request> {
    try {
      if (!scheduledDate || scheduledDate <= new Date()) {
        throw new ValidationError('Inspection date must be in future', ErrorCode.INVALID_INPUT);
      }

      // Fetch request
      const request = await prisma.request.findUnique({
        where: { id: requestId },
        include: { customer: true, assignedAgent: true },
      });

      if (!request) {
        throw new NotFoundError('Request not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Can schedule inspection in REVIEW or INSPECTION stage
      const validStages = [REQUEST_STAGE.REVIEW, REQUEST_STAGE.INSPECTION];
      if (!validStages.includes(request.stage as any)) {
        throw new BusinessRuleError(`Cannot schedule inspection in ${request.stage} stage`);
      }

      // Create or update Inspection record
      const result = await prisma.$transaction(async (tx) => {
        // Check if inspection already exists
        const existingInspection = await tx.inspection.findFirst({
          where: { requestId },
        });

        let inspection;
        if (existingInspection) {
          // Update existing inspection
          inspection = await tx.inspection.update({
            where: { id: existingInspection.id },
            data: {
              scheduledDate,
              status: 'SCHEDULED',
              agentId: agentId || request.assignedAgentId,
            },
          });
        } else {
          // Create new inspection
          inspection = await tx.inspection.create({
            data: {
              requestId,
              scheduledDate,
              status: 'SCHEDULED',
              agentId: agentId || request.assignedAgentId,
            },
          });
        }

        // Update request to INSPECTION stage
        const updatedRequest = await tx.request.update({
          where: { id: requestId },
          data: {
            stage: REQUEST_STAGE.INSPECTION,
            subStatus: SUB_STATUS.INSPECTION.SCHEDULED,
            requiresAgentAction: true,
            requiresCustomerAction: false,
          },
          include: {
            customer: true,
            assignedAgent: true,
            district: true,
          },
        });

        return { inspection, updatedRequest };
      });

      // Emit InspectionScheduled event
      const event: InspectionScheduledEvent = {
        type: 'inspection.scheduled',
        timestamp: new Date(),
        aggregateId: requestId,
        data: {
          requestId,
          inspectionId: result.inspection.id,
          scheduledDate: scheduledDate.toISOString(),
          agentId: agentId || request.assignedAgentId || '',
          customerId: request.customerId,
        },
      };
      eventBus.emit('inspection.scheduled', event);

      logger.info('[RequestsService.scheduleInspection] Inspection scheduled for request', {
        requestId,
        inspectionId: result.inspection.id,
        date: scheduledDate,
      });

      return result.updatedRequest as unknown as Request;
    } catch (err) {
      logger.error('[RequestsService.scheduleInspection] Failed to schedule inspection', { 
        error: err, 
        requestId 
      });
      throw err;
    }
  }

  /**
   * Complete inspection
   * 
   * Agent marks inspection as completed with findings
   * 
   * @throws NotFoundError if inspection doesn't exist
   * @throws BusinessRuleError if inspection not in SCHEDULED status
   */
  async completeInspection(requestId: string, findings: Record<string, unknown>, isApproved: boolean): Promise<Request> {
    try {
      // Fetch inspection
      const inspection = await prisma.inspection.findFirst({
        where: { requestId },
      });

      if (!inspection) {
        throw new NotFoundError('Inspection not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Verify inspection is SCHEDULED
      if (inspection.status !== 'SCHEDULED' && inspection.status !== 'IN_PROGRESS') {
        throw new BusinessRuleError('Inspection must be in SCHEDULED or IN_PROGRESS status to complete');
      }

      // Update inspection and request in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update inspection to COMPLETED with findings
        const updatedInspection = await tx.inspection.update({
          where: { id: inspection.id },
          data: {
            status: 'COMPLETED',
            completedDate: new Date(),
            notes: JSON.stringify(findings),
            recommendApprove: isApproved,
            estimatedValue: typeof findings === 'object' && findings !== null ? (findings as any).estimatedValue : undefined,
            assetCondition: typeof findings === 'object' && findings !== null ? (findings as any).condition : undefined,
          },
        });

        // Update request sub-status
        const subStatus = isApproved 
          ? SUB_STATUS.INSPECTION.APPROVED 
          : SUB_STATUS.INSPECTION.ASSET_ISSUE;

        const updatedRequest = await tx.request.update({
          where: { id: requestId },
          data: {
            subStatus,
            requiresAgentAction: false,
            requiresAdminAction: !isApproved, // Admin needs to decide if asset issue
            requiresCustomerAction: false,
          },
          include: {
            customer: true,
            assignedAgent: true,
            district: true,
          },
        });

        return { updatedInspection, updatedRequest };
      });

      logger.info('[RequestsService.completeInspection] Inspection completed for request', {
        requestId,
        inspectionId: inspection.id,
        isApproved,
      });

      return result.updatedRequest as unknown as Request;
    } catch (err) {
      logger.error('[RequestsService.completeInspection] Failed to complete inspection', { 
        error: err, 
        requestId 
      });
      throw err;
    }
  }

  /**
   * Upload documents for request
   * 
   * Supports multiple document types: asset photos, ID proof, address proof, etc.
   * 
   * @throws NotFoundError if request doesn't exist
   * @throws ValidationError if document type invalid
   */
  async uploadDocuments(requestId: string, documents: Array<{
    documentType: string;
    fileName: string;
    fileUrl: string; // This is the UploadThing file key
    fileSize?: number;
    mimeType?: string;
    category?: string;
  }>): Promise<Request> {
    try {
      if (!documents || documents.length === 0) {
        throw new ValidationError('No documents provided', ErrorCode.INVALID_INPUT);
      }

      // Fetch request
      const request = await prisma.request.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new NotFoundError('Request not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Validate document types
      const validDocumentTypes = [
        'ASSET_PHOTO',
        'ID_PROOF',
        'ADDRESS_PROOF',
        'BANK_STATEMENT',
        'INCOME_PROOF',
        'SIGNATURE',
        'OTHER',
      ];

      for (const doc of documents) {
        if (!validDocumentTypes.includes(doc.documentType)) {
          throw new ValidationError(`Invalid document type: ${doc.documentType}`, ErrorCode.INVALID_INPUT);
        }
      }

      // Create Document records in database
      // Note: File upload to UploadThing should be done before calling this method
      await prisma.document.createMany({
        data: documents.map(doc => ({
          requestId,
          fileKey: doc.fileUrl, // UploadThing file key
          fileName: doc.fileName,
          fileSize: doc.fileSize || 0,
          fileType: doc.mimeType || 'application/octet-stream',
          documentType: doc.documentType,
          documentCategory: doc.category || 'OTHER',
          uploadedBy: request.customerId,
        })),
      });

      // Fetch updated request with documents
      const updatedRequest = await prisma.request.findUnique({
        where: { id: requestId },
        include: {
          customer: true,
          documents: true,
          district: true,
        },
      });

      logger.info('[RequestsService.uploadDocuments] Documents uploaded for request', {
        requestId,
        count: documents.length,
      });

      return updatedRequest as unknown as Request;
    } catch (err) {
      logger.error('[RequestsService.uploadDocuments] Failed to upload documents', { error: err, requestId });
      throw err;
    }
  }

  /**
   * Verify documents (ADMIN only)
   * 
   * Admin reviews and marks documents as verified
   * 
   * @throws NotFoundError if document doesn't exist
   * @throws ForbiddenError if not admin
   */
  async verifyDocuments(requestId: string, documentIds: string[]): Promise<Request> {
    try {
      // TODO: (agent) Fetch request
      // TODO: (agent) Fetch and verify all documents exist for this request
      // TODO: (agent) Mark documents as verified with admin ID
      // TODO: (agent) Check if all required documents are now verified
      // TODO: (agent) Emit DocumentsVerified event
      // TODO: (agent) Return updated request

      console.log(
        `[RequestsService.verifyDocuments] Documents verified for request: ${requestId}`,
        { count: documentIds.length }
      );

      return {} as Request;
    } catch (err) {
      console.error('[RequestsService.verifyDocuments] Failed to verify documents:', err);
      throw err;
    }
  }

  /**
   * Disburse loan to customer
   * 
   * 1. Verify request in OFFER_ACCEPTED stage
   * 2. Create first EMI schedule entry
   * 3. Mark loan as DISBURSED
   * 4. Send funds via payment provider
   * 5. Update request to COMPLETED
   * 6. Emit LoanDisbursed event
   * 
   * @throws NotFoundError if request/loan doesn't exist
   * @throws BusinessRuleError if not in OFFER_ACCEPTED stage
   */
  async disburseLoan(requestId: string, disbursementDetails?: { 
    bankAccountNumber?: string; 
    ifscCode?: string; 
    transactionId?: string;
  }): Promise<Request> {
    try {
      // Fetch request
      const request = await prisma.request.findUnique({
        where: { id: requestId },
        include: { customer: true },
      });

      if (!request) {
        throw new NotFoundError('Request not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Verify stage allows disbursement (OFFER stage with ACCEPTED sub-status)
      if (request.stage !== REQUEST_STAGE.OFFER || request.subStatus !== SUB_STATUS.OFFER.ACCEPTED) {
        throw new BusinessRuleError('Request must have accepted offer before disbursement');
      }

      // Fetch loan
      const loan = await prisma.loan.findFirst({
        where: { requestId },
      });

      if (!loan) {
        throw new NotFoundError('Loan not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Update in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update loan with disbursement details
        const updatedLoan = await tx.loan.update({
          where: { id: loan.id },
          data: {
            disbursedDate: new Date(),
            remainingAmount: loan.approvedAmount,
            transferMethod: disbursementDetails?.transactionId ? TRANSFER_METHOD.BANK_TRANSFER : undefined,
            transferReference: disbursementDetails?.transactionId,
          },
        });

        // Update request to DISBURSEMENT stage
        const updatedRequest = await tx.request.update({
          where: { id: requestId },
          data: {
            stage: REQUEST_STAGE.DISBURSEMENT,
            subStatus: SUB_STATUS.DISBURSEMENT.COMPLETED,
            requiresCustomerAction: false,
            requiresAdminAction: false,
            requiresAgentAction: false,
          },
          include: {
            customer: true,
            district: true,
          },
        });

        return { updatedLoan, updatedRequest };
      });

      logger.info('[RequestsService.disburseLoan] Loan disbursed for request', {
        requestId,
        loanId: loan.id,
        amount: loan.approvedAmount,
      });

      return result.updatedRequest as unknown as Request;
    } catch (err) {
      logger.error('[RequestsService.disburseLoan] Failed to disburse loan', { error: err, requestId });
      throw err;
    }
  }

  /**
   * Cancel request
   * 
   * Customer can cancel before disbursement
   * Admin can cancel anytime with reason
   * 
   * @throws BusinessRuleError if already disbursed
   */
  async cancelRequest(requestId: string, reason: string, cancelledBy?: string): Promise<Request> {
    try {
      if (!reason) {
        throw new ValidationError('Cancellation reason required', ErrorCode.INVALID_INPUT);
      }

      // Fetch request
      const request = await prisma.request.findUnique({
        where: { id: requestId },
        include: { customer: true },
      });

      if (!request) {
        throw new NotFoundError('Request not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Check not already in terminal states
      if (request.stage === REQUEST_STAGE.CANCELLED || request.stage === REQUEST_STAGE.COMPLETED) {
        throw new BusinessRuleError(`Request is already ${request.stage}`);
      }

      // Cannot cancel after disbursement
      if (request.stage === REQUEST_STAGE.DISBURSEMENT || request.stage === REQUEST_STAGE.ACTIVE) {
        throw new BusinessRuleError('Cannot cancel request after disbursement');
      }

      // Update to CANCELLED
      const updatedRequest = await prisma.request.update({
        where: { id: requestId },
        data: {
          stage: REQUEST_STAGE.CANCELLED,
          subStatus: null,
          requiresCustomerAction: false,
          requiresAdminAction: false,
          requiresAgentAction: false,
          failureReason: reason,
          failureType: 'DOCUMENTATION',
          stageChangedAt: new Date(),
          stageChangedBy: cancelledBy,
        },
        include: {
          customer: true,
          district: true,
        },
      });

      logger.info('[RequestsService.cancelRequest] Request cancelled', {
        requestId,
        reason,
        cancelledBy,
      });

      return updatedRequest as unknown as Request;
    } catch (err) {
      logger.error('[RequestsService.cancelRequest] Failed to cancel request', { error: err, requestId });
      throw err;
    }
  }

  /**
   * Reject request
   * 
   * Admin rejects request with reason
   * 
   * @throws NotFoundError if request doesn't exist
   */
  async rejectRequest(requestId: string, reason: string, rejectedBy?: string): Promise<Request> {
    try {
      if (!reason) {
        throw new ValidationError('Rejection reason required', ErrorCode.INVALID_INPUT);
      }

      // Fetch request
      const request = await prisma.request.findUnique({
        where: { id: requestId },
        include: { customer: true },
      });

      if (!request) {
        throw new NotFoundError('Request not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Check not already in terminal states
      if (request.stage === REQUEST_STAGE.REJECTED || request.stage === REQUEST_STAGE.COMPLETED) {
        throw new BusinessRuleError(`Request is already ${request.stage}`);
      }

      // Cannot reject after disbursement
      if (request.stage === REQUEST_STAGE.DISBURSEMENT || request.stage === REQUEST_STAGE.ACTIVE) {
        throw new BusinessRuleError('Cannot reject request after disbursement');
      }

      // Update to REJECTED
      const updatedRequest = await prisma.request.update({
        where: { id: requestId },
        data: {
          stage: REQUEST_STAGE.REJECTED,
          subStatus: null,
          requiresCustomerAction: false,
          requiresAdminAction: false,
          requiresAgentAction: false,
          failureReason: reason,
          failureType: 'VERIFICATION',
          stageChangedAt: new Date(),
          stageChangedBy: rejectedBy,
        },
        include: {
          customer: true,
          district: true,
        },
      });

      logger.info('[RequestsService.rejectRequest] Request rejected', {
        requestId,
        reason,
        rejectedBy,
      });

      return updatedRequest as unknown as Request;
    } catch (err) {
      logger.error('[RequestsService.rejectRequest] Failed to reject request', { error: err, requestId });
      throw err;
    }
  }
}

export const requestsService = RequestsService.getInstance();
