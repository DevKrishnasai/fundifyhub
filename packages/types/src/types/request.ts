/**
 * Request-related types
 */

import type { RequestStage, OfferStatus, InspectionStatus } from '../constants/request';

export interface RequestListItem {
  id: string;
  requestNumber: string;
  customerId: string;
  customerName: string;
  requestedAmount: number;
  stage: RequestStage;
  subStatus?: string | null;
  districtName: string;
  requiresCustomerAction: boolean;
  requiresAdminAction: boolean;
  requiresAgentAction: boolean;
  isBlocked: boolean;
  submittedDate: Date | string;
  stageChangedAt?: Date | string | null;
}

export interface RequestDetail {
  id: string;
  requestNumber: string;
  customerId: string;
  requestedAmount: number;
  districtId: string;
  stage: RequestStage;
  subStatus?: string | null;
  requiresCustomerAction: boolean;
  requiresAdminAction: boolean;
  requiresAgentAction: boolean;
  isBlocked: boolean;
  failureReason?: string | null;
  failureType?: string | null;
  stageChangedAt?: Date | string | null;
  stageChangedBy?: string | null;
  
  // Offer fields
  activeOfferId?: string | null;
  adminOfferedAmount?: number | null;
  adminTenureMonths?: number | null;
  adminInterestRate?: number | null;
  adminProcessingFee: number;
  offerMadeDate?: Date | string | null;
  offerResponseDate?: Date | string | null;
  penaltyPercentage: number;
  lateFeePercentage: number;
  
  // Other fields
  adminRequestedInfo?: string | null;
  disbursementAccountId?: string | null;
  bankDetailsSubmittedAt?: Date | string | null;
  assignedAgentId?: string | null;
  assignedAdminId?: string | null;
  inspectionScheduledAt?: Date | string | null;
  commentsEnabled: boolean;
  
  submittedDate: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Relations (optional, loaded as needed)
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  district?: {
    id: string;
    name: string;
  };
  asset?: {
    id: string;
    assetType: string;
    brand: string;
    model: string;
  };
}

export interface RequestStageUpdate {
  stage: RequestStage;
  subStatus?: string | null;
  failureReason?: string | null;
  failureType?: string | null;
  requiresCustomerAction?: boolean;
  requiresAdminAction?: boolean;
  requiresAgentAction?: boolean;
  isBlocked?: boolean;
}

export interface AdminOfferDTO {
  id: string;
  requestId: string;
  offeredById: string;
  offeredAmount: number;
  tenureMonths: number;
  interestRate: number;
  processingFee: number;
  emiAmount?: number | null;
  totalInterest?: number | null;
  totalAmount?: number | null;
  status: OfferStatus;
  expiresAt?: Date | string | null;
  respondedAt?: Date | string | null;
  revision: number;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface InspectionDTO {
  id: string;
  requestId: string;
  agentId?: string | null;
  scheduledDate?: Date | string | null;
  completedDate?: Date | string | null;
  status: InspectionStatus;
  assetCondition?: string | null;
  estimatedValue?: number | null;
  notes?: string | null;
  recommendApprove?: boolean | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DocumentDTO {
  id: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  documentType: string;
  documentCategory: string;
  uploadedBy: string;
  uploaderRole?: string | null;
  isPublic: boolean;
  description?: string | null;
  createdAt: Date | string;
}

export interface CommentDTO {
  id: string;
  requestId: string;
  authorId: string;
  authorName: string;
  content: string;
  isInternal: boolean;
  commentType: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
