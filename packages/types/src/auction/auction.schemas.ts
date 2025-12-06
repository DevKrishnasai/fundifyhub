/**
 * Auction Schemas
 * @module auction/auction.schemas
 */

import { z } from 'zod';
import { AUCTION_STATUS } from './auction.constants';

/**
 * Create auction input validation
 */
export const createAuctionSchema = z.object({
  loanId: z.string().min(1, 'Loan ID is required'),
  reservePrice: z.number().positive('Reserve price must be positive'),
  startPrice: z.number().positive('Start price must be positive'),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
  description: z.string().optional(),
}).refine(
  (data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end > start;
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
).refine(
  (data) => data.startPrice >= data.reservePrice,
  {
    message: 'Start price must be >= reserve price',
    path: ['startPrice'],
  }
);

export type CreateAuctionInput = z.infer<typeof createAuctionSchema>;

/**
 * Place bid input validation
 */
export const placeBidSchema = z.object({
  auctionId: z.string().min(1, 'Auction ID is required'),
  bidAmount: z.number().positive('Bid amount must be positive'),
});

export type PlaceBidInput = z.infer<typeof placeBidSchema>;

/**
 * Extend auction input validation
 */
export const extendAuctionSchema = z.object({
  newEndDate: z.string().datetime().or(z.date()),
});

export type ExtendAuctionInput = z.infer<typeof extendAuctionSchema>;

/**
 * Cancel auction input validation
 */
export const cancelAuctionSchema = z.object({
  reason: z.string().min(10, 'Cancellation reason must be at least 10 characters'),
});

export type CancelAuctionInput = z.infer<typeof cancelAuctionSchema>;

/**
 * List auctions query validation
 */
export const listAuctionsSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  pageSize: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  status: z.nativeEnum(AUCTION_STATUS).optional(),
  sortBy: z.enum(['createdAt', 'endDate', 'highestBid']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ListAuctionsInput = z.infer<typeof listAuctionsSchema>;

/**
 * Auction ID param validation
 */
export const auctionIdSchema = z.object({
  auctionId: z.string().min(1, 'Auction ID is required'),
});

export type AuctionIdParam = z.infer<typeof auctionIdSchema>;
