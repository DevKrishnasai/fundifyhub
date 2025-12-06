/**
 * Realtime Hook
 *
 * Provides realtime communication functionality.
 *
 * @module hooks/useRealtime
 */
import { useEffect } from 'react'
import { realtimeAdapter } from '../lib/adapters'
import type { ServerEvent } from '@fundifyhub/types'

export function useRealtime<TPayload = unknown>(event: ServerEvent | string, callback: (payload: TPayload) => void) {
  useEffect(() => {
    const unsubscribe = realtimeAdapter.on<TPayload>(event, callback)
    return () => {
      if (unsubscribe) {
        unsubscribe()
      } else {
        realtimeAdapter.off<TPayload>(event, callback)
      }
    }
  }, [event, callback])
}
