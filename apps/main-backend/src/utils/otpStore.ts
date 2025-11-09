import { createHmac, randomUUID } from 'crypto'
import redis from './redis'
import { prisma } from '@fundifyhub/prisma'
import logger from './logger'
import config from './config'
import { checkAndIncrementAttempts } from './rateLimiter'

type OtpCreateResult = { sessionId: string; expiresAt: number }
type VerifyResult =
  | { status: 'expired' }
  | { status: 'already_used' }
  | { status: 'too_many_attempts'; attempts: number; retryAfterMs?: number }
  | { status: 'invalid'; attempts: number }
  | { status: 'verified' }

const OTP_HMAC_SECRET = config.jwt.secret;

function hashOtp(otp: string): string {
  return createHmac('sha256', OTP_HMAC_SECRET).update(otp).digest('hex')
}

/**
 * Create an OTP session in Redis and write an audit row in the DB (code is hashed).
 */
export async function createOtpSession({ identifier, type, otp, ttlSeconds = 600 }: { identifier: string; type: 'EMAIL' | 'PHONE'; otp: string; ttlSeconds?: number }): Promise<OtpCreateResult> {
  const identifierKey = `otp:identifier:${identifier}`
  // Policy B: every send (including resends) counts as an attempt. Enforce attempts window here.
  try {
    const attemptsRes = await checkAndIncrementAttempts(identifier)
    if (!attemptsRes.ok) {
      // Throw a structured object so callers can access retryAfterMs
      throw { name: 'TooManyAttempts', retryAfterMs: attemptsRes.retryAfterMs }
    }
  } catch (err) {
    if (err && typeof err === 'object' && (err as any).name === 'TooManyAttempts') throw err
    // If rate limiter failed unexpectedly, log and continue to avoid blocking legitimate flows
    logger.warn(`Attempt sliding-window check failed for ${identifier}: ${String(err)}`)
  }
  // Check if there's an active session for this identifier (resend case)
  try {
    const existingSessionId = await redis.get(identifierKey)
    if (existingSessionId) {
      const existingKey = `otp:session:${existingSessionId}`
      const existing = await redis.hgetall(existingKey)
      if (existing && Object.keys(existing).length > 0) {
        const isUsed = existing.isUsed === '1'
        const existingExpires = Number(existing.expiresAt || '0')
        if (!isUsed && existingExpires > Date.now()) {
          // Reuse this sessionId: update the session and the audit row (resend)
          const codeHash = hashOtp(otp)
          const sessionId = existingSessionId
          const sessionKey = existingKey
          const expiresAt = Date.now() + ttlSeconds * 1000

          await redis.hset(sessionKey, {
            codeHash,
            attempts: '0',
            isUsed: '0',
            isVerified: '0',
            type,
            identifier,
            expiresAt: String(expiresAt),
          })
          await redis.expire(sessionKey, ttlSeconds)

          // If we stored an audit id on the session, update that audit row (resendCount removed; attempts tracked via Redis)
          try {
            // Use upsert keyed by sessionId to make audit write idempotent and avoid duplicates
            const upserted = await prisma.oTPVerification.upsert({
              where: { sessionId: existingSessionId },
              update: {
                code: codeHash,
                expiresAt: new Date(expiresAt),
                attempts: 0,
                isUsed: false,
                isVerified: false,
                resendCount: { increment: 1 },
              },
              create: {
                sessionId: existingSessionId,
                identifier,
                type,
                code: codeHash,
                expiresAt: new Date(expiresAt),
                attempts: 0,
                isUsed: false,
                isVerified: false,
                resendCount: 1,
              },
            })
            // store auditId on session for future resends
            if (upserted && upserted.id) {
              await redis.hset(sessionKey, { auditId: upserted.id })
            }
          } catch (err) {
            logger.error(`Failed to upsert OTP audit row on resend for ${identifier}: ${String(err)}`)
          }

          // Refresh the identifier -> session mapping TTL
          await redis.set(identifierKey, sessionId, 'EX', ttlSeconds)
          return { sessionId, expiresAt }
        }
      }
    }
  } catch (err) {
    logger.warn(`Failed to check existing OTP session for ${identifier}: ${String(err)}`)
    // continue to create a new session below
  }

  // No reusable session found: create a new one
  const sessionId = randomUUID()
  const sessionKey = `otp:session:${sessionId}`
  const codeHash = hashOtp(otp)
  const expiresAt = Date.now() + ttlSeconds * 1000

  try {
    await redis.hset(sessionKey, {
      codeHash,
      attempts: '0',
      isUsed: '0',
      isVerified: '0',
      type,
      identifier,
      expiresAt: String(expiresAt),
    })
    await redis.expire(sessionKey, ttlSeconds)
  } catch (err) {
    logger.warn(`Failed to write OTP session to Redis for ${identifier}: ${String(err)}`)
    throw err
  }

  // Write an audit row (store hashed code, not raw OTP)
  try {
    // Upsert by sessionId to avoid duplicate audit rows if this operation races
    const upserted = await prisma.oTPVerification.upsert({
      where: { sessionId },
      update: {
        code: codeHash,
        expiresAt: new Date(expiresAt),
        attempts: 0,
        isUsed: false,
        isVerified: false,
      },
      create: {
        sessionId,
        identifier,
        type,
        code: codeHash,
        expiresAt: new Date(expiresAt),
        attempts: 0,
        isUsed: false,
        isVerified: false,
        resendCount: 0,
      },
    })
    // store audit id and identifier->session mapping for future resends
    try {
      if (upserted && upserted.id) {
        await redis.hset(sessionKey, { auditId: upserted.id })
      }
      await redis.set(identifierKey, sessionId, 'EX', ttlSeconds)
    } catch (err) {
      logger.warn(`Failed to store auditId/session mapping in Redis for ${identifier}: ${String(err)}`)
    }
  } catch (err) {
    // Audit write failure should not block OTP delivery; log and continue
    logger.error(`Failed to write OTP audit row for ${identifier}: ${String(err)}`)
  }

  return { sessionId, expiresAt }
}

// Lua script for atomic verify: returns
// 0 => expired/not found
// 1 attempts incremented, not yet max (returns attempts)
// 3 attempts reached or exceeded (returns attempts)
// 2 verified
const VERIFY_LUA = `
local key = KEYS[1]
local submitted = ARGV[1]
if redis.call('EXISTS', key) == 0 then return {0} end
local isUsed = redis.call('HGET', key, 'isUsed')
if isUsed == '1' then return {4} end
local attempts = tonumber(redis.call('HGET', key, 'attempts') or '0')
local stored = redis.call('HGET', key, 'codeHash')
if stored == submitted then
  redis.call('HSET', key, 'isUsed', '1', 'isVerified', '1')
  return {2}
else
  attempts = attempts + 1
  redis.call('HSET', key, 'attempts', tostring(attempts))
  return {1, attempts}
end
`

export async function verifyOtpSession(sessionId: string, otp: string): Promise<VerifyResult> {
  const sessionKey = `otp:session:${sessionId}`
  const submittedHash = hashOtp(otp)

  try {
    const res = await redis.eval(VERIFY_LUA, 1, sessionKey, submittedHash)
    // res is an array like ['2'] or ['1', '2'] depending on branch
    if (!res) return { status: 'expired' }
    const first = Number((res as any)[0])
    if (first === 0) return { status: 'expired' }
    if (first === 4) return { status: 'already_used' }
    if (first === 2) {
      // update audit rows: mark matching codeHash rows as verified/used
      try {
        await prisma.oTPVerification.updateMany({
          where: { identifier: (await redis.hget(sessionKey, 'identifier')) as string, code: submittedHash, isUsed: false },
          data: { isUsed: true, isVerified: true },
        })
      } catch (err) {
        logger.error(`Failed to update OTP audit row after verification for session ${sessionId}: ${String(err)}`)
      }
      return { status: 'verified' }
    }
    if (first === 1) {
      const attempts = Number((res as any)[1] || 0)
      // Persist the failed attempt to the audit row (prefer auditId stored on session)
      try {
        const auditId = await redis.hget(sessionKey, 'auditId')
        if (auditId) {
          await prisma.oTPVerification.update({ where: { id: auditId }, data: { attempts: { increment: 1 } } })
        } else {
          // Fallback: update by sessionId (unique) if present; otherwise fall back to identifier+code
          try {
            await prisma.oTPVerification.updateMany({ where: { sessionId }, data: { attempts: { increment: 1 } } })
          } catch (e) {
            const identifier = (await redis.hget(sessionKey, 'identifier')) as string
            const codeHashStored = (await redis.hget(sessionKey, 'codeHash')) as string
            if (identifier && codeHashStored) {
              await prisma.oTPVerification.updateMany({ where: { identifier, code: codeHashStored }, data: { attempts: { increment: 1 } } })
            }
          }
        }
      } catch (err) {
        logger.warn(`Failed to persist failed OTP attempt to DB for session ${sessionId}: ${String(err)}`)
      }
      // Increment global attempts sliding-window (counts resends + failed verifies)
      try {
        const identifier = (await redis.hget(sessionKey, 'identifier')) as string
        if (identifier) {
          const { ok, count, retryAfterMs } = await checkAndIncrementAttempts(identifier)
          if (!ok) return { status: 'too_many_attempts', attempts: count ?? attempts, retryAfterMs }
        }
      } catch (err) {
        logger.warn(`Failed to update attempts sliding-window on verify for session ${sessionId}: ${String(err)}`)
      }
      return { status: 'invalid', attempts }
    }
    return { status: 'expired' }
  } catch (err) {
    logger.error(`OTP verify failed for session ${sessionId}: ${String(err)}`)
    // As a conservative fallback, return expired so frontend forces resend.
    return { status: 'expired' }
  }
}

export default { createOtpSession, verifyOtpSession }
