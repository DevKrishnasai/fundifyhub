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
