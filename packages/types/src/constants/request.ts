/**
 * Request-related constants and enums
 * Aligned with Prisma schema
 */

export enum RequestStage {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  OFFER = 'OFFER',
  INSPECTION = 'INSPECTION',
  DOCUMENTATION = 'DOCUMENTATION',
  DISBURSEMENT = 'DISBURSEMENT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export const REQUEST_STAGES = Object.values(RequestStage);

export enum OfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  REVISED = 'REVISED',
  CANCELLED = 'CANCELLED',
}

export const OFFER_STATUSES = Object.values(OfferStatus);

export enum InspectionStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const INSPECTION_STATUSES = Object.values(InspectionStatus);

export enum DocumentStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export const DOCUMENT_STATUSES = Object.values(DocumentStatus);
