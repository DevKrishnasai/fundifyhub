/**
 * Asset-related types
 */

import type { AssetCondition, AssetStatus, MovementType } from '../constants/asset';

export interface AssetDTO {
  id: string;
  requestId: string;
  assetType: string;
  brand: string;
  model: string;
  condition: AssetCondition;
  purchaseYear: number;
  description: string;
  estimatedValue?: number | null;
  inspectedValue?: number | null;
  depreciationRate?: number | null;
  lastValuationDate?: Date | string | null;
  currentMarketValue?: number | null;
  status: AssetStatus;
  warehouseId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AssetMovementDTO {
  id: string;
  assetId: string;
  movementType: MovementType;
  fromWarehouseId?: string | null;
  toWarehouseId?: string | null;
  movementDate: Date | string;
  movedBy: string;
  notes?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}
