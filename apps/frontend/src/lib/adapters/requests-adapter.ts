/**
 * Requests Adapter
 *
 * Abstraction layer for loan requests API calls.
 *
 * @module lib/adapters/requests
 */

import { getWithResult, postWithResult, putWithResult } from '../api-client';
import { BACKEND_API_CONFIG } from '../urls';
import type { RequestType, AdminOfferType, CommentType, UserType } from '@fundifyhub/types';

/**
 * Request list filters
 */
export interface RequestListFilters {
  page?: number;
  limit?: number;
  status?: string;
  stage?: string;
  district?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  isUser?: boolean; // Filter for user's own requests
  assigned?: boolean; // Filter for requests assigned to the user
}

/**
 * Request list response
 */
export interface RequestListResponse {
  requests: RequestType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create request payload
 */
export interface CreateRequestPayload {
  requestedAmount: number;
  district: string;
  assetId: string;
}

/**
 * Create offer payload
 */
export interface CreateOfferPayload {
  offeredAmount: number;
  tenureMonths: number;
  interestRate: number;
  processingFee?: number;
  penaltyPercentage?: number;
  lateFeePercentage?: number;
  adminRequestedInfo?: string;
}

/**
 * Offer preview response
 */
export interface OfferPreviewResponse {
  offeredAmount: number;
  tenureMonths: number;
  interestRate: number;
  emiAmount: number;
  totalInterest: number;
  totalAmount: number;
  processingFee: number;
  schedule: Array<{
    emiNumber: number;
    dueDate: string;
    emiAmount: number;
    principalAmount: number;
    interestAmount: number;
  }>;
}

/**
 * Update status payload
 */
export interface UpdateStatusPayload {
  status: string;
  reason?: string;
}

/**
 * Assign agent payload
 */
export interface AssignAgentPayload {
  agentId: string;
}

/**
 * Bank details payload
 */
export interface BankDetailsPayload {
  bankAccountNumber: string;
  bankIfscCode: string;
  bankAccountName: string;
  upiId?: string;
}

/**
 * Add comment payload
 */
export interface AddCommentPayload {
  content: string;
  isInternal?: boolean;
}

export const requestsAdapter = {
  /**
   * List requests with filters
   */
  async list(filters: RequestListFilters = {}) {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.status) params.append('status', filters.status);
    if (filters.stage) params.append('stage', filters.stage);
    if (filters.district) params.append('district', filters.district);
    if (filters.search) params.append('search', filters.search);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.isUser) params.append('isUser', String(filters.isUser));
    if (filters.assigned) params.append('assigned', String(filters.assigned));

    const url = `${BACKEND_API_CONFIG.ENDPOINTS.USER.LIST_REQUESTS}?${params.toString()}`;
    return getWithResult<RequestListResponse>(url);
  },

  /**
   * Get requests assigned to current user
   */
  async getAssigned(filters?: RequestListFilters) {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.status) params.append('status', filters.status);

    const url = `${BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.ASSIGNED_REQUESTS}?${params.toString()}`;
    return getWithResult<RequestListResponse>(url);
  },

  /**
   * Get request by ID
   */
  async getById(id: string) {
    return getWithResult<RequestType>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_BY_ID(id)
    );
  },

  /**
   * Get request by identifier (for user endpoint)
   */
  async getByIdentifier(identifier: string) {
    return getWithResult<RequestType>(
      BACKEND_API_CONFIG.ENDPOINTS.USER.GET_REQUEST_BY_IDENTIFIER(identifier)
    );
  },

  /**
   * Create a new request
   */
  async create(payload: CreateRequestPayload) {
    return postWithResult<RequestType, CreateRequestPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.USER.LIST_REQUESTS,
      payload
    );
  },

  /**
   * Update request status
   */
  async updateStatus(id: string, payload: UpdateStatusPayload) {
    return putWithResult<RequestType, UpdateStatusPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.UPDATE_STATUS(id),
      payload
    );
  },

  /**
   * Get agents by district
   */
  async getAgentsByDistrict(district: string) {
    return getWithResult<UserType[]>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_AGENTS_BY_DISTRICT(district)
    );
  },

  /**
   * Get admins by district
   */
  async getAdminsByDistrict(district: string) {
    return getWithResult<UserType[]>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_ADMINS_BY_DISTRICT(district)
    );
  },

  /**
   * Assign agent to request
   */
  async assignAgent(id: string, payload: AssignAgentPayload) {
    return postWithResult<RequestType, AssignAgentPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.ASSIGN_AGENT(id),
      payload
    );
  },

  /**
   * Self-assign request to district admin
   */
  async selfAssignAdmin(id: string) {
    return postWithResult<RequestType>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.SELF_ASSIGN_ADMIN(id)
    );
  },

  /**
   * Assign district admin to request
   */
  async assignAdmin(id: string, payload: { adminId: string }) {
    return postWithResult<RequestType, { adminId: string }>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.ASSIGN_ADMIN(id),
      payload
    );
  },

  /**
   * Create offer for request
   */
  async createOffer(id: string, payload: CreateOfferPayload) {
    return postWithResult<AdminOfferType, CreateOfferPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.CREATE_OFFER(id),
      payload
    );
  },

  /**
   * Get current offer for request
   */
  async getCurrentOffer(id: string) {
    return getWithResult<AdminOfferType>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.CURRENT_OFFER(id)
    );
  },

  /**
   * Preview offer calculation
   */
  async previewOffer(id: string, amount: number, tenureMonths: number, interestRate: number) {
    return getWithResult<OfferPreviewResponse>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.OFFER_PREVIEW(id, amount, tenureMonths, interestRate)
    );
  },

  /**
   * Confirm admin offer (customer action)
   */
  async confirmOffer(id: string) {
    return postWithResult<RequestType>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.CONFIRM_OFFER(id)
    );
  },

  /**
   * Update bank details
   */
  async updateBankDetails(id: string, payload: BankDetailsPayload) {
    return putWithResult<RequestType, BankDetailsPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.UPDATE_BANK_DETAILS(id),
      payload
    );
  },

  /**
   * Update comments enabled status
   */
  async updateCommentsEnabled(id: string, enabled: boolean) {
    return putWithResult<RequestType, { enabled: boolean }>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.UPDATE_COMMENTS_ENABLED(id),
      { enabled }
    );
  },

  /**
   * Add comment to request
   */
  async addComment(id: string, payload: AddCommentPayload) {
    return postWithResult<CommentType, AddCommentPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.ADD_COMMENT(id),
      payload
    );
  },

  /**
   * Generate agreement
   */
  async generateAgreement(id: string) {
    return postWithResult<{ agreementUrl: string }>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GENERATE_AGREEMENT(id)
    );
  },

  /**
   * Sign agreement
   */
  async signAgreement(id: string, signature: string) {
    return postWithResult<RequestType, { signature: string }>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.SIGN_AGREEMENT(id),
      { signature }
    );
  },

  /**
   * Upload signed agreement
   */
  async uploadSignedAgreement(id: string, fileKey: string) {
    return postWithResult<RequestType, { fileKey: string }>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.UPLOAD_SIGNED_AGREEMENT(id),
      { fileKey }
    );
  },

  /**
   * Complete inspection
   */
  async completeInspection(id: string, payload: { notes?: string; verified: boolean }) {
    return postWithResult<RequestType>(
      BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.COMPLETE_INSPECTION(id),
      payload
    );
  },
};
