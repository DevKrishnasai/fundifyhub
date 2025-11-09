import redis from './redis'
import logger from './logger'
import config from './config'

type LimitResult = {
  ok: boolean
  reason?: 'minute' | 'hour'
}

// In-process fallback map (conservative). Not shared between instances.
type RLEntry = {
  minuteWindowStart: number
  minuteCount: number
  hourWindowStart: number
  hourCount: number
}

const localMap = new Map<string, RLEntry>()

// Lua script implementing sliding window using sorted sets (ZSET).
// The script atomically adds a member with the current timestamp, removes
// entries older than the window, counts members, and sets an expiry.
const SLIDING_WINDOW_LUA = `
local minuteKey = KEYS[1]
local hourKey = KEYS[2]
local now = tonumber(ARGV[1])
local minuteWindow = tonumber(ARGV[2])
local hourWindow = tonumber(ARGV[3])
local expireSeconds = tonumber(ARGV[4])
local member = ARGV[5]

redis.call('ZADD', minuteKey, now, member)
redis.call('ZREMRANGEBYSCORE', minuteKey, 0, now - minuteWindow)
local minuteCount = redis.call('ZCARD', minuteKey)
redis.call('EXPIRE', minuteKey, expireSeconds)

redis.call('ZADD', hourKey, now, member)
redis.call('ZREMRANGEBYSCORE', hourKey, 0, now - hourWindow)
local hourCount = redis.call('ZCARD', hourKey)
redis.call('EXPIRE', hourKey, expireSeconds)

return {minuteCount, hourCount}
`

// Simple sliding-window Lua for a single window (used for attempts tracking)
// Returns two values: count and minScore (oldest member score) so caller can compute retry time
const ATTEMPT_WINDOW_LUA = `
-- Args: now, window, expireSeconds, member, limit
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local expireSeconds = tonumber(ARGV[3])
local member = ARGV[4]
local limit = tonumber(ARGV[5])

-- Remove expired entries first
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)

-- compute current oldest score
local items = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local minScore = now
if items and #items >= 2 then
  minScore = tonumber(items[2])
end

if count >= limit then
  -- Do not add a new member if we're already at/over the limit. Return count, minScore and added=0
  redis.call('EXPIRE', key, expireSeconds)
  return {count, minScore, 0}
else
  -- Add member and return the updated values with added=1
  redis.call('ZADD', key, now, member)
  redis.call('EXPIRE', key, expireSeconds)
  local newCount = redis.call('ZCARD', key)
  local items2 = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local minScore2 = now
  if items2 and #items2 >= 2 then
    minScore2 = tonumber(items2[2])
  end
  return {newCount, minScore2, 1}
end
`

/**
 * Check and increment OTP rate limiter for an identifier using a sliding window.
 * Tries Redis first; on Redis error falls back to an in-memory counter and emits a metric/log.
 */
export async function checkAndIncrementOtpRate(identifier: string): Promise<LimitResult> {
  const minuteKey = `otp:rl:${identifier}:m.z`
  const hourKey = `otp:rl:${identifier}:h.z`
  const now = Date.now()
  const minuteWindowMs = 60 * 1000
  const hourWindowMs = 60 * 60 * 1000
  const expireSeconds = 60 * 60 * 2 // keep for 2 hours
  const member = `${now}:${Math.random().toString(36).slice(2, 10)}`

  try {
    // Eval the Lua script with 2 keys
    // ioredis eval signature: eval(script, numKeys, key1, key2, ...args)
    const result = await redis.eval(
      SLIDING_WINDOW_LUA,
      2,
      minuteKey,
      hourKey,
      now,
      minuteWindowMs,
      hourWindowMs,
      expireSeconds,
      member
    )

    // result is [minuteCount, hourCount]
    const minuteCount = Number((result as any)[0])
    const hourCount = Number((result as any)[1])

    if (minuteCount > 3) return { ok: false, reason: 'minute' }
    if (hourCount > 10) return { ok: false, reason: 'hour' }
    return { ok: true }
  } catch (err) {
    // Log a metric/alert: Redis unavailable or script failure. Use warn level.
    logger.warn(`Redis sliding-window limiter failed for ${identifier}, falling back to in-memory limiter: ${String(err)}`)

    // Fallback to local in-memory limiter (best-effort)
    const nowTs = Date.now()
    const entry = localMap.get(identifier) || { minuteWindowStart: nowTs, minuteCount: 0, hourWindowStart: nowTs, hourCount: 0 }

    if (nowTs - entry.minuteWindowStart > minuteWindowMs) {
      entry.minuteWindowStart = nowTs
      entry.minuteCount = 0
    }
    if (nowTs - entry.hourWindowStart > hourWindowMs) {
      entry.hourWindowStart = nowTs
      entry.hourCount = 0
    }

    if (entry.minuteCount >= 3) return { ok: false, reason: 'minute' }
    if (entry.hourCount >= 10) return { ok: false, reason: 'hour' }

    entry.minuteCount += 1
    entry.hourCount += 1
    localMap.set(identifier, entry)
    return { ok: true }
  }
}

/**
 * Check and increment OTP attempts for an identifier using a sliding window.
 * This is used for "Policy B" where resends and failed verifies count toward a single attempts limit.
 */
export async function checkAndIncrementAttempts(identifier: string, limit?: number, windowMs?: number): Promise<{ ok: boolean; count?: number; retryAfterMs?: number }> {
  const key = `otp:attempts:${identifier}:z`
  const now = Date.now()
  const expireSeconds = Math.ceil((windowMs || Number(config.otp.attemptsWindowMs || 3600000)) / 1000) + 60
  const member = `${now}:${Math.random().toString(36).slice(2, 10)}`
  const lim = limit ?? Number(config.otp.attemptsLimit ?? 5)
  const window = windowMs ?? Number(config.otp.attemptsWindowMs ?? 60 * 60 * 1000)

  try {
    // Pass limit into the script; script will NOT add a new member when already over limit
    const result = await redis.eval(ATTEMPT_WINDOW_LUA, 1, key, now, window, expireSeconds, member, String(lim))
    // result is [count, minScore, addedFlag]
    const count = Number((result as any)[0])
    const minScore = Number((result as any)[1] ?? now)
    // const added = Number((result as any)[2] ?? 0)
    if (count >= lim) {
      const elapsed = now - minScore
      const retryAfterMs = Math.max(0, window - elapsed)
      return { ok: false, count, retryAfterMs }
    }
    return { ok: true, count }
  } catch (err) {
    logger.warn(`Redis sliding-window (attempts) failed for ${identifier}, falling back to in-memory limiter: ${String(err)}`)

    // Fallback: use the same in-memory map but under a different key.
    const mapKey = `attempts:${identifier}`
    const entry = localMap.get(mapKey) || { minuteWindowStart: now, minuteCount: 0, hourWindowStart: now, hourCount: 0 }
    const windowMsLocal = window
    if (now - entry.hourWindowStart > windowMsLocal) {
      entry.hourWindowStart = now
      entry.hourCount = 0
    }
    if (entry.hourCount >= lim) {
      const elapsed = now - entry.hourWindowStart
      const retryAfterMs = Math.max(0, window - elapsed)
      return { ok: false, count: entry.hourCount, retryAfterMs }
    }
    entry.hourCount += 1
    localMap.set(mapKey, entry)
    return { ok: true, count: entry.hourCount }
  }
}

