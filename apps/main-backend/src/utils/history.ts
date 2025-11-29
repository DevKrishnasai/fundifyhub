import { prisma } from '@fundifyhub/prisma';
import baseLogger from './logger';

const logger = baseLogger.child('[history]');

/**
 * Create a request history entry. Best-effort: failures are logged and do not throw.
 * Accepts an optional prisma client (transaction client) so callers can include this in transactions.
 */
export async function createRequestHistory({
  requestId,
  actorId,
  action,
  metadata,
  client,
}: {
  requestId: string;
  actorId?: string | null;
  action: string;
  metadata?: any;
  client?: any;
}): Promise<any | null> {
  const db = client || prisma;
  try {
    const entry = await db.requestHistory.create({
      data: {
        requestId,
        actorId: actorId || null,
        action,
        metadata: metadata || null,
      },
    });
    return entry;
  } catch (err) {
    logger.error('createRequestHistory failed', err as Error);
    // Best-effort: return null on failure so callers can continue
    return null;
  }
}

export default createRequestHistory;
