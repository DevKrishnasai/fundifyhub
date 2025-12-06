/**
 * Auction constants
 * @module auction/auction.constants
 */

export enum AUCTION_STATUS {
  DRAFT = 'DRAFT', // Listing being prepared
  SCHEDULED = 'SCHEDULED', // Auction scheduled for future
  ACTIVE = 'ACTIVE', // Bidding is open
  EXTENDED = 'EXTENDED', // Bidding extended due to last-minute activity
  ENDED = 'ENDED', // Bidding closed, winner determined
  SOLD = 'SOLD', // Payment received, asset transferred
  UNSOLD = 'UNSOLD', // No valid bids received
  CANCELLED = 'CANCELLED', // Auction cancelled by admin
}

export enum BID_STATUS {
  ACTIVE = 'ACTIVE', // Valid, active bid
  OUTBID = 'OUTBID', // Superseded by higher bid
  WINNING = 'WINNING', // Currently the highest bid
  WON = 'WON', // Won the auction
  WITHDRAWN = 'WITHDRAWN', // Bidder withdrew the bid
  REJECTED = 'REJECTED', // Bid rejected by admin (suspicious activity)
  CANCELLED = 'CANCELLED', // Bid cancelled when auction is cancelled
}

export enum MOVEMENT_TYPE {
  INTAKE = 'INTAKE', // Asset received from customer
  TRANSFER = 'TRANSFER', // Moved between warehouses
  AUCTION = 'AUCTION', // Moved for auction
  RELEASE = 'RELEASE', // Returned to customer
  DISPOSAL = 'DISPOSAL', // Asset disposed/scrapped
}

// Auction status display labels
export const AUCTION_STATUS_LABELS: Record<AUCTION_STATUS, string> = {
  [AUCTION_STATUS.DRAFT]: 'Draft',
  [AUCTION_STATUS.SCHEDULED]: 'Scheduled',
  [AUCTION_STATUS.ACTIVE]: 'Active',
  [AUCTION_STATUS.EXTENDED]: 'Extended',
  [AUCTION_STATUS.ENDED]: 'Ended',
  [AUCTION_STATUS.SOLD]: 'Sold',
  [AUCTION_STATUS.UNSOLD]: 'Unsold',
  [AUCTION_STATUS.CANCELLED]: 'Cancelled',
};

// Auction status colors for UI
export const AUCTION_STATUS_COLORS: Record<
  AUCTION_STATUS,
  { bg: string; text: string; border: string }
> = {
  [AUCTION_STATUS.DRAFT]: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-400',
    border: 'border-gray-300',
  },
  [AUCTION_STATUS.SCHEDULED]: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300',
  },
  [AUCTION_STATUS.ACTIVE]: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-300',
  },
  [AUCTION_STATUS.EXTENDED]: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-300',
  },
  [AUCTION_STATUS.ENDED]: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-300',
  },
  [AUCTION_STATUS.SOLD]: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-300',
  },
  [AUCTION_STATUS.UNSOLD]: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-300',
  },
  [AUCTION_STATUS.CANCELLED]: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-300',
  },
};

// Bid status labels
export const BID_STATUS_LABELS: Record<BID_STATUS, string> = {
  [BID_STATUS.ACTIVE]: 'Active',
  [BID_STATUS.OUTBID]: 'Outbid',
  [BID_STATUS.WINNING]: 'Winning',
  [BID_STATUS.WON]: 'Won',
  [BID_STATUS.WITHDRAWN]: 'Withdrawn',
  [BID_STATUS.REJECTED]: 'Rejected',
  [BID_STATUS.CANCELLED]: 'Cancelled',
};

// Movement type labels
export const MOVEMENT_TYPE_LABELS: Record<MOVEMENT_TYPE, string> = {
  [MOVEMENT_TYPE.INTAKE]: 'Received from Customer',
  [MOVEMENT_TYPE.TRANSFER]: 'Warehouse Transfer',
  [MOVEMENT_TYPE.AUCTION]: 'Moved to Auction',
  [MOVEMENT_TYPE.RELEASE]: 'Released to Customer',
  [MOVEMENT_TYPE.DISPOSAL]: 'Disposed',
};
