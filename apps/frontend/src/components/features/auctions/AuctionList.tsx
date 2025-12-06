import React from 'react'
import type { AuctionListing } from '@/hooks/queries/useAuctions'

type AuctionListProps = {
  auctions?: AuctionListing[]
};

export function AuctionList({ auctions = [] }: AuctionListProps) {
  if (!auctions.length) {
    return <div className="text-sm text-muted-foreground">No auctions available.</div>
  }

  return (
    <div className="grid gap-4">
      {auctions.map((auction) => (
        <div key={auction.id} className="rounded-lg border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Listing #{auction.listingNumber}</p>
              <h3 className="text-lg font-semibold">{auction.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{auction.description || 'No description provided.'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Current High Bid</p>
              <p className="text-xl font-bold">₹{auction.currentHighBid?.toLocaleString('en-IN') ?? '0'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
