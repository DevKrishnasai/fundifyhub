import { AUCTION_STATUS, BID_STATUS, MOVEMENT_TYPE } from './enums';

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
