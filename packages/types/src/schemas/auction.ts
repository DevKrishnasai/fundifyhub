/**
 * Auction validation schemas
 */

import { z } from 'zod';
import { AuctionStatus, BidStatus } from '../constants/auction';

export const CreateAuctionListingSchema = z.object({
  assetId: z.string().min(1, 'Asset ID required'),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  startingPrice: z.number().positive('Starting price must be positive'),
  reservePrice: z.number().positive('Reserve price must be positive').optional(),
  minimumBidIncrement: z.number().positive('Minimum bid increment must be positive'),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  imageUrls: z.array(z.string().url()).optional(),
  termsAndConditions: z.string().optional(),
}).refine(
  (data) => data.endTime > data.startTime,
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
).refine(
  (data) => !data.reservePrice || data.reservePrice >= data.startingPrice,
  {
    message: 'Reserve price must be greater than or equal to starting price',
    path: ['reservePrice'],
  }
);

export type CreateAuctionListingInput = z.infer<typeof CreateAuctionListingSchema>;

export const UpdateAuctionListingSchema = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(10).optional(),
  startingPrice: z.number().positive().optional(),
  reservePrice: z.number().positive().optional(),
  minimumBidIncrement: z.number().positive().optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  imageUrls: z.array(z.string().url()).optional(),
  termsAndConditions: z.string().optional(),
  status: z.nativeEnum(AuctionStatus).optional(),
  cancellationReason: z.string().optional(),
});

export type UpdateAuctionListingInput = z.infer<typeof UpdateAuctionListingSchema>;

export const PlaceBidSchema = z.object({
  auctionListingId: z.string().min(1, 'Auction listing ID required'),
  bidAmount: z.number().positive('Bid amount must be positive'),
  remarks: z.string().optional(),
});

export type PlaceBidInput = z.infer<typeof PlaceBidSchema>;

export const UpdateBidStatusSchema = z.object({
  bidId: z.string().min(1, 'Bid ID required'),
  status: z.nativeEnum(BidStatus),
  adminRemarks: z.string().optional(),
});

export type UpdateBidStatusInput = z.infer<typeof UpdateBidStatusSchema>;

export const AcceptBidSchema = z.object({
  bidId: z.string().min(1, 'Bid ID required'),
  adminRemarks: z.string().optional(),
});

export type AcceptBidInput = z.infer<typeof AcceptBidSchema>;

export const ListAuctionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(AuctionStatus).optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  assetCategory: z.string().optional(),
  sortBy: z.enum(['startTime', 'endTime', 'startingPrice', 'currentBid']).default('startTime'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListAuctionsQuery = z.infer<typeof ListAuctionsQuerySchema>;
