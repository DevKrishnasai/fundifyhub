/**
 * Asset validation schemas
 */

import { z } from 'zod';
import { AssetCondition, AssetStatus, MovementType } from '../constants/asset';

export const CreateAssetFromRequestSchema = z.object({
  requestId: z.string().min(1, 'Request ID required'),
  currentWarehouseId: z.string().min(1, 'Warehouse ID required'),
  itemCategory: z.string().min(2, 'Item category required'),
  itemDescription: z.string().min(5, 'Item description required'),
  estimatedValue: z.number().positive('Estimated value must be positive'),
  condition: z.nativeEnum(AssetCondition),
  conditionRemarks: z.string().optional(),
  serialNumbers: z.string().optional(),
  invoiceNumber: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
});

export type CreateAssetFromRequestInput = z.infer<typeof CreateAssetFromRequestSchema>;

export const UpdateAssetSchema = z.object({
  currentWarehouseId: z.string().optional(),
  itemCategory: z.string().min(2).optional(),
  itemDescription: z.string().min(5).optional(),
  estimatedValue: z.number().positive().optional(),
  condition: z.nativeEnum(AssetCondition).optional(),
  conditionRemarks: z.string().optional(),
  serialNumbers: z.string().optional(),
  status: z.nativeEnum(AssetStatus).optional(),
});

export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;

export const RecordAssetMovementSchema = z.object({
  assetId: z.string().min(1, 'Asset ID required'),
  movementType: z.nativeEnum(MovementType),
  fromWarehouseId: z.string().optional(),
  toWarehouseId: z.string().optional(),
  reason: z.string().min(5, 'Reason required'),
  remarks: z.string().optional(),
  performedById: z.string().min(1, 'Performer ID required'),
});

export type RecordAssetMovementInput = z.infer<typeof RecordAssetMovementSchema>;

export const TransferAssetSchema = z.object({
  assetId: z.string().min(1, 'Asset ID required'),
  toWarehouseId: z.string().min(1, 'Destination warehouse required'),
  reason: z.string().min(5, 'Transfer reason required'),
  remarks: z.string().optional(),
});

export type TransferAssetInput = z.infer<typeof TransferAssetSchema>;
