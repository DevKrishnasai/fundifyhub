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
import type { Request, ROLES } from '@fundifyhub/types';

export interface CreateRequestInput {
  customerId: string;
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
   * 3. Create request with CREATED stage
   * 4. Emit event for notification
   * 5. Return created request
   * 
   * @throws ValidationError if input invalid
   * @throws ForbiddenError if customer lacks district access
   */
  async create(customerId: string, input: CreateRequestInput): Promise<Request> {
    try {
      if (!input.assetDescription || !input.requestedAmount || !input.estimatedAssetValue) {
        throw new ValidationError('Missing required fields', ErrorCode.INVALID_INPUT);
      }

      if (input.requestedAmount <= 0 || input.estimatedAssetValue <= 0) {
        throw new ValidationError('Amounts must be positive', ErrorCode.INVALID_INPUT);
      }

      // TODO: (agent) Verify customer exists and is ACTIVE
      // TODO: (agent) Check customer's home district matches districtId
      // TODO: (agent) Create Request record with stage='CREATED', subStatus='PENDING_SUBMISSION'
      // TODO: (agent) Emit RequestCreated event
      // TODO: (agent) Return created request

      console.log(`[RequestsService.create] Request created by customer: ${customerId}`, {
        amount: input.requestedAmount,
        district: input.districtId,
      });

      return {} as Request;
    } catch (err) {
      console.error('[RequestsService.create] Request creation failed:', err);
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
  async getById(requestId: string, user: any): Promise<Request> {
    try {
      // TODO: (agent) Fetch request from database
      // TODO: (agent) Check user access permissions using RBAC
      // TODO: (agent) Return request with relations (customer, agent, admin, asset, documents)

      console.log(`[RequestsService.getById] Request retrieved: ${requestId}`);

      return {} as Request;
    } catch (err) {
      console.error(`[RequestsService.getById] Failed to get request ${requestId}:`, err);
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
  async list(user: any, input: ListRequestsInput): Promise<{ requests: Request[]; total: number }> {
    try {
      // TODO: (agent) Build WHERE clause based on user role
      // TODO: (agent) Apply stage/status filters if provided
      // TODO: (agent) Apply sorting
      // TODO: (agent) Apply pagination
      // TODO: (agent) Fetch from database
      // TODO: (agent) Return paginated results

      console.log('[RequestsService.list] Requests listed', { userId: user.id, role: user.roles?.[0] });

      return { requests: [], total: 0 };
    } catch (err) {
      console.error('[RequestsService.list] Failed to list requests:', err);
      throw err;
    }
  }

  /**
   * Submit request for review
   * 
   * 1. Verify request is in CREATED stage
   * 2. Check all required documents uploaded
   * 3. Transition to SUBMITTED stage
   * 4. Emit RequestSubmitted event (notification triggers)
   * 
   * @throws NotFoundError if request doesn't exist
   * @throws BusinessRuleError if not in CREATED stage or missing documents
   */
  async submitForReview(requestId: string): Promise<Request> {
    try {
      // TODO: (agent) Fetch request, verify stage is CREATED
      // TODO: (agent) Check required documents (at least asset photos)
      // TODO: (agent) Update to stage='SUBMITTED'
      // TODO: (agent) Update subStatus
      // TODO: (agent) Emit RequestSubmitted event
      // TODO: (agent) Return updated request

      console.log(`[RequestsService.submitForReview] Request submitted for review: ${requestId}`);

      return {} as Request;
    } catch (err) {
      console.error(`[RequestsService.submitForReview] Failed to submit request ${requestId}:`, err);
      throw err;
    }
  }

  /**
   * Assign agent to request (DISTRICT_ADMIN only)
   * 
   * 1. Verify request exists
   * 2. Verify agent exists and is in same district
   * 3. Transition to AGENT_ASSIGNED stage
   * 4. Emit AgentAssigned event
   * 
   * @throws NotFoundError if request/agent doesn't exist
   * @throws BusinessRuleError if agent not in same district
   */
  async assignAgent(input: AssignAgentInput): Promise<Request> {
    try {
      // TODO: (agent) Fetch request, verify stage is SUBMITTED
      // TODO: (agent) Fetch agent, verify exists and is ACTIVE
      // TODO: (agent) Verify agent district matches request district
      // TODO: (agent) Update request: assignedAgentId = agentId, stage='AGENT_ASSIGNED'
      // TODO: (agent) Emit AgentAssigned event with agent and customer info
      // TODO: (agent) Return updated request

      console.log(`[RequestsService.assignAgent] Agent assigned to request: ${input.requestId}`, {
        agent: input.agentId,
      });

      return {} as Request;
    } catch (err) {
      console.error('[RequestsService.assignAgent] Failed to assign agent:', err);
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
      // TODO: (agent) Fetch request
      // TODO: (agent) Fetch admin, verify STATE_ADMIN or above
      // TODO: (agent) Verify admin's state matches request district's state
      // TODO: (agent) Update request: assignedAdminId = adminId
      // TODO: (agent) Emit AdminAssigned event
      // TODO: (agent) Return updated request

      console.log(`[RequestsService.assignAdmin] Admin assigned to request: ${input.requestId}`, {
        admin: input.adminId,
      });

      return {} as Request;
    } catch (err) {
      console.error('[RequestsService.assignAdmin] Failed to assign admin:', err);
      throw err;
    }
  }

  /**
   * Create offer on request
   * 
   * 1. Verify request is AGENT_ASSIGNED stage
   * 2. Calculate EMI schedule using tenure and rate
   * 3. Create Offer record
   * 4. Create Loan record with EMI schedule
   * 5. Transition to OFFER_CREATED stage
   * 6. Emit OfferCreated event (customer notification)
   * 
   * @throws NotFoundError if request doesn't exist
   * @throws BusinessRuleError if not in AGENT_ASSIGNED stage
   */
  async createOffer(input: CreateOfferInput): Promise<Request> {
    try {
      if (!input.tenure || !input.interestRate || input.tenure < 1 || input.interestRate < 0) {
        throw new ValidationError('Invalid tenure or interest rate', ErrorCode.INVALID_INPUT);
      }

      // TODO: (agent) Fetch request, verify stage is AGENT_ASSIGNED
      // TODO: (agent) Fetch asset to get estimatedValue
      // TODO: (agent) Calculate EMI schedule using tenure and interestRate
      // TODO: (agent) Calculate monthly payment using EMI formula
      // TODO: (agent) Create Offer record
      // TODO: (agent) Create Loan record with emiSchedules
      // TODO: (agent) Update request stage to OFFER_CREATED
      // TODO: (agent) Emit OfferCreated event
      // TODO: (agent) Return updated request

      console.log(`[RequestsService.createOffer] Offer created on request: ${input.requestId}`, {
        tenure: input.tenure,
        rate: input.interestRate,
      });

      return {} as Request;
    } catch (err) {
      console.error('[RequestsService.createOffer] Failed to create offer:', err);
      throw err;
    }
  }

  /**
   * Customer accepts offer
   * 
   * 1. Verify request in OFFER_CREATED stage
   * 2. Verify offer not expired
   * 3. Create signed acceptance record
   * 4. Update loan status to ACCEPTED
   * 5. Transition to OFFER_ACCEPTED stage
   * 6. Emit OfferAccepted event
   * 
   * @throws BusinessRuleError if offer expired or not in correct stage
   */
  async customerAcceptOffer(requestId: string): Promise<Request> {
    try {
      // TODO: (agent) Fetch request, verify stage is OFFER_CREATED
      // TODO: (agent) Fetch offer, check not expired
      // TODO: (agent) Create acceptance record with timestamp
      // TODO: (agent) Update loan status to ACCEPTED
      // TODO: (agent) Update request to OFFER_ACCEPTED
      // TODO: (agent) Emit OfferAccepted event
      // TODO: (agent) Return updated request

      console.log(`[RequestsService.customerAcceptOffer] Offer accepted by customer: ${requestId}`);

      return {} as Request;
    } catch (err) {
      console.error('[RequestsService.customerAcceptOffer] Failed to accept offer:', err);
      throw err;
    }
  }

  /**
   * Customer rejects offer
   * 
   * 1. Verify request in OFFER_CREATED stage
   * 2. Update offer status to REJECTED
   * 3. Transition back to AGENT_ASSIGNED for new offer
   * 4. Emit OfferRejected event
   * 
   * @throws BusinessRuleError if not in OFFER_CREATED stage
   */
  async customerRejectOffer(requestId: string, reason?: string): Promise<Request> {
    try {
      // TODO: (agent) Fetch request, verify stage is OFFER_CREATED
      // TODO: (agent) Mark offer as REJECTED
      // TODO: (agent) Revert request to AGENT_ASSIGNED for new offer
      // TODO: (agent) Emit OfferRejected event with reason
      // TODO: (agent) Return updated request

      console.log(`[RequestsService.customerRejectOffer] Offer rejected by customer: ${requestId}`, {
        reason,
      });

      return {} as Request;
    } catch (err) {
      console.error('[RequestsService.customerRejectOffer] Failed to reject offer:', err);
      throw err;
    }
  }

  /**
   * Schedule inspection for request
   * 
   * Agent schedules inspection after offer acceptance
   * 
   * @throws NotFoundError if request doesn't exist
   * @throws BusinessRuleError if not in correct stage
   */
  async scheduleInspection(requestId: string, scheduledDate: Date): Promise<Request> {
    try {
      if (!scheduledDate || scheduledDate <= new Date()) {
        throw new ValidationError('Inspection date must be in future', ErrorCode.INVALID_INPUT);
      }

      // TODO: (agent) Fetch request
      // TODO: (agent) Create Inspection record with SCHEDULED status
      // TODO: (agent) Update request to include inspection
      // TODO: (agent) Emit InspectionScheduled event
      // TODO: (agent) Return updated request

      console.log(
        `[RequestsService.scheduleInspection] Inspection scheduled for request: ${requestId}`,
        { date: scheduledDate }
      );

      return {} as Request;
    } catch (err) {
      console.error('[RequestsService.scheduleInspection] Failed to schedule inspection:', err);
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
  async completeInspection(requestId: string, findings: Record<string, unknown>): Promise<Request> {
    try {
      // TODO: (agent) Fetch inspection, verify SCHEDULED
      // TODO: (agent) Update inspection to COMPLETED with findings
      // TODO: (agent) Update request stage to INSPECTION_COMPLETED
      // TODO: (agent) Emit InspectionCompleted event
      // TODO: (agent) Return updated request

      console.log(`[RequestsService.completeInspection] Inspection completed for request: ${requestId}`);

      return {} as Request;
    } catch (err) {
      console.error('[RequestsService.completeInspection] Failed to complete inspection:', err);
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
  async uploadDocuments(requestId: string, documents: any[]): Promise<Request> {
    try {
      if (!documents || documents.length === 0) {
        throw new ValidationError('No documents provided', ErrorCode.INVALID_INPUT);
      }

      // TODO: (agent) Validate document types
      // TODO: (agent) Store documents in external storage (UploadThing)
      // TODO: (agent) Create Document records in database
      // TODO: (agent) Emit DocumentsUploaded event
      // TODO: (agent) Return updated request

      console.log(
        `[RequestsService.uploadDocuments] Documents uploaded for request: ${requestId}`,
        { count: documents.length }
      );

      return {} as Request;
    } catch (err) {
      console.error('[RequestsService.uploadDocuments] Failed to upload documents:', err);
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
  async disburseLoan(requestId: string): Promise<Request> {
    try {
      // TODO: (agent) Fetch request, verify stage is OFFER_ACCEPTED
      // TODO: (agent) Fetch loan
      // TODO: (agent) Call payment adapter to disburse funds
      // TODO: (agent) Update loan status to DISBURSED
      // TODO: (agent) Mark first EMI as active if autostart enabled
      // TODO: (agent) Update request to COMPLETED
      // TODO: (agent) Emit LoanDisbursed event
      // TODO: (agent) Return updated request

      console.log(`[RequestsService.disburseLoan] Loan disbursed for request: ${requestId}`);

      return {} as Request;
    } catch (err) {
      console.error('[RequestsService.disburseLoan] Failed to disburse loan:', err);
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
  async cancelRequest(requestId: string, reason: string): Promise<Request> {
    try {
      if (!reason) {
        throw new ValidationError('Cancellation reason required', ErrorCode.INVALID_INPUT);
      }

      // TODO: (agent) Fetch request
      // TODO: (agent) Check not already COMPLETED or CANCELLED
      // TODO: (agent) Update to CANCELLED status
      // TODO: (agent) Emit RequestCancelled event
      // TODO: (agent) Return updated request

      console.log(`[RequestsService.cancelRequest] Request cancelled: ${requestId}`, { reason });

      return {} as Request;
    } catch (err) {
      console.error('[RequestsService.cancelRequest] Failed to cancel request:', err);
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
  async rejectRequest(requestId: string, reason: string): Promise<Request> {
    try {
      if (!reason) {
        throw new ValidationError('Rejection reason required', ErrorCode.INVALID_INPUT);
      }

      // TODO: (agent) Fetch request
      // TODO: (agent) Update to REJECTED status
      // TODO: (agent) Store rejection reason and rejectedBy
      // TODO: (agent) Emit RequestRejected event
      // TODO: (agent) Return updated request

      console.log(`[RequestsService.rejectRequest] Request rejected: ${requestId}`, { reason });

      return {} as Request;
    } catch (err) {
      console.error('[RequestsService.rejectRequest] Failed to reject request:', err);
      throw err;
    }
  }
}

export const requestsService = RequestsService.getInstance();
