/**
 * Asset-related constants and enums
 * Aligned with Prisma schema
 */

export enum AssetCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  DAMAGED = 'DAMAGED',
}

export const ASSET_CONDITIONS = Object.values(AssetCondition);

export enum AssetStatus {
  PLEDGED = 'PLEDGED',
  RELEASED = 'RELEASED',
  IN_AUCTION = 'IN_AUCTION',
  FORFEITED = 'FORFEITED',
  AUCTIONED = 'AUCTIONED',
  SOLD = 'SOLD',
}

export const ASSET_STATUSES = Object.values(AssetStatus);

export enum MovementType {
  INTAKE = 'INTAKE',
  TRANSFER = 'TRANSFER',
  AUCTION = 'AUCTION',
  RELEASE = 'RELEASE',
  DISPOSAL = 'DISPOSAL',
}

export const MOVEMENT_TYPES = Object.values(MovementType);
