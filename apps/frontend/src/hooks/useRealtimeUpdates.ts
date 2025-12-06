/**
 * Realtime Updates Hook
 *
 * Listens for realtime events and invalidates React Query caches.
 *
 * @module hooks/useRealtimeUpdates
 */
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { realtimeAdapter } from '../lib/adapters'
import { useNotificationsStore } from '../lib/state/notifications.store'
import { requestKeys, auctionKeys, loanKeys } from './queries'

export function useRealtimeUpdates() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationsStore()

  useEffect(() => {
    const requestUpdateOff = realtimeAdapter.onRequestUpdate(() => {
      queryClient.invalidateQueries({ queryKey: requestKeys.all })
    })

    const loanUpdateOff = realtimeAdapter.onLoanUpdate(() => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all })
    })

    const auctionBidOff = realtimeAdapter.onAuctionBidPlaced(() => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.all })
    })

    const auctionExtendedOff = realtimeAdapter.onAuctionExtended(() => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.all })
    })

    const auctionEndedOff = realtimeAdapter.onAuctionEnded(() => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.all })
    })

    const auctionWonOff = realtimeAdapter.onAuctionWon(() => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.all })
    })

    const newNotificationOff = realtimeAdapter.onNewNotification((notification) => {
      addNotification(notification)
    })

    return () => {
      requestUpdateOff()
      loanUpdateOff()
      auctionBidOff()
      auctionExtendedOff()
      auctionEndedOff()
      auctionWonOff()
      newNotificationOff()
    }
  }, [queryClient, addNotification])
}
