import type { Prisma, PrismaClient as GeneratedPrismaClient } from '@fundifyhub/prisma'

// Typed delegate for the serialCounter model on the Prisma client. Using the
// generated PrismaClient type ensures we have the correct delegate shape.
type SerialDelegate = GeneratedPrismaClient['serialCounter']

/**
 * Generate a global incrementing serial for Request and Loan prefixed values.
 * Format: PREFIX + number (starting from 1000), e.g. REQ1000, LOAN1000.
 * Implementation uses a `SerialCounter` row and performs an atomic increment inside
 * the provided transaction client. A few retries are attempted to handle
 * rare race conditions during counter initialization.
 */
async function incrementCounter(tx: Prisma.TransactionClient, id: string, startAt = 1000) {
  // Attempt to increment existing counter; if not present, create it with seq = startAt
  // We'll try a couple of times to handle races between concurrent creators.
  const maxAttempts = 3
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Try updating existing row with atomic increment
      const updated = await (tx as unknown as { serialCounter: SerialDelegate }).serialCounter.update({
        where: { id },
        data: { seq: { increment: 1 } },
        select: { seq: true },
      })
      return updated.seq
    } catch (err: any) {
      // If not found (Prisma will throw), create a new row with seq = startAt
      // If creation fails due to unique constraint (race), retry the loop
      try {
  await (tx as unknown as { serialCounter: SerialDelegate }).serialCounter.create({ data: { id, seq: startAt } })
        return startAt
      } catch (createErr: any) {
        // If creation failed because another tx created it, loop and try update again
        if (attempt === maxAttempts) throw createErr
        // small backoff not necessary inside tx - retry
      }
    }
  }
  throw new Error('Failed to increment counter')
}

export async function generateRequestNumber(tx: Prisma.TransactionClient) {
  const next = await incrementCounter(tx, 'REQUEST', 1000)
  return `REQ${next}`
}

export async function generateLoanNumber(tx: Prisma.TransactionClient) {
  const next = await incrementCounter(tx, 'LOAN', 1000)
  return `LOAN${next}`
}
