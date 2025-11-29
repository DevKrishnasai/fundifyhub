import { Request, Response } from 'express';
import { prisma } from '@fundifyhub/prisma';
import baseLogger from '../../utils/logger';

const logger = baseLogger.child('[RequestsController]');
import { createRequestHistory } from '../../utils/history';
import { APIResponseType } from '../../types';
import { hasAnyRole, hasDistrictAccess } from '../../utils/rbac';
import { calculateEmiSchedule, calculateEmiBreakdown, isEmiOverdue, type EMIBreakdown } from '@fundifyhub/utils';
import { 
  ROLES, 
  DOCUMENT_UPLOADER_ROLE,
  DOCUMENT_TYPE,
  EMI_STATUS, 
  OVERDUE_GRACE_PERIOD_DAYS,
  REQUEST_STATUS, 
  AGENT_ACCESS_DENY_STATUSES,
  TEMPLATE_NAMES, 
  SERVICE_NAMES,
  CUSTOMER_ALLOWED_STATUSES,
  AGENT_ALLOWED_STATUSES,
  LOAN_CREATION_ALLOWED_STATUSES,
  ADMIN_AGENT_ROLES,
  DEFAULT_PENALTY_PERCENTAGE,
  DEFAULT_LATE_FEE_PERCENTAGE,
  REQUEST_HISTORY_ACTION
} from '@fundifyhub/types';
import config from '../../utils/config';
import { generateSignedUrl } from '../../utils/uploadthing';
import { CLIENT_CONSTANTS } from '@fundifyhub/types';
// Notifications are handled by a separate plan; queueClient usage removed here. TODO: integrate notifications

/**
 * GET /requests/:id
 * Returns request detail including documents and history.
 * Enforces RBAC: SUPER_ADMIN sees all; customer sees own requests; agent sees assigned requests; district admin sees requests in their districts.
 */
export async function getRequestDetailController(req: Request, res: Response): Promise<void> {
  try {
    const requestId = req.params.id;
    if (!requestId) {
      res.status(400).json({ success: false, message: 'request id required' } as APIResponseType);
      return;
    }

    // Allow lookup by DB id or by human-friendly requestNumber
    const request = await prisma.request.findFirst({
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] },
      include: {
        documents: true,
        requestHistory: { orderBy: { createdAt: 'asc' } },
  customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } },
        assignedAgent: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
        comments: { select: { id: true, content: true, createdAt: true, authorId: true, isInternal: true, author: { select: { id: true, firstName: true, lastName: true, roles: true } } } },
        loan: {
          include: {
            emisSchedule: {
              select: { id: true, emiNumber: true, dueDate: true, emiAmount: true, principalAmount: true, interestAmount: true, status: true, paidDate: true, paidAmount: true, lateFee: true },
              orderBy: { emiNumber: 'asc' }
            }
          }
        }
      }
    });

    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    try {
      const history = (request as any).requestHistory || [];
      const actorIds = Array.from(new Set(history.map((h: any) => h.actorId).filter(Boolean))) as string[];
      if (actorIds.length > 0) {
        const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, firstName: true, lastName: true, email: true, roles: true } });
        const actorMap: Record<string, any> = {};
        for (const a of actors) actorMap[a.id] = a;
        (request as any).requestHistory = history.map((h: any) => ({ ...h, actor: h.actorId ? actorMap[h.actorId] || null : null }));
      }
    } catch (e) {
      logger.error('Failed to enrich requestHistory with actor details', e as Error);
    }

    if ((request as any).loan && (request as any).loan.emisSchedule) {
      const emis = (request as any).loan.emisSchedule;
      const loanId = (request as any).loan.id;
      const penaltyRate = (request as any).penaltyPercentage || DEFAULT_PENALTY_PERCENTAGE;
      const lateFeeRate = (request as any).lateFeePercentage || DEFAULT_LATE_FEE_PERCENTAGE;
      const emisToUpdate: Array<{ id: string; status: string; lateFee: number }> = [];
      
      // Add breakdown data to each EMI
      (request as any).loan.emisSchedule = emis.map((emi: any) => {
        let breakdown: EMIBreakdown | null = null;
        
        // Check if EMI should be marked as overdue (crossed grace period)
        const shouldBeOverdue = emi.status === EMI_STATUS.PENDING && 
          isEmiOverdue(emi.dueDate.toISOString(), emi.status, OVERDUE_GRACE_PERIOD_DAYS);
        
        // Calculate breakdown only for pending or overdue EMIs
        if (emi.status === EMI_STATUS.PENDING || emi.status === EMI_STATUS.OVERDUE || shouldBeOverdue) {
          try {
            breakdown = calculateEmiBreakdown(
              {
                emiNumber: emi.emiNumber,
                emiAmount: emi.emiAmount,
                principalAmount: emi.principalAmount,
                interestAmount: emi.interestAmount,
                status: emi.status,
                dueDate: emi.dueDate.toISOString(),
              },
              emis.map((e: any) => ({
                emiNumber: e.emiNumber,
                status: e.status,
                emiAmount: e.emiAmount,
                lateFee: e.lateFee || 0,
                dueDate: e.dueDate.toISOString(),
              })),
              penaltyRate,
              lateFeeRate,
              new Date(), // Pass current date for days late calculation
              OVERDUE_GRACE_PERIOD_DAYS
            );
            
            // Lazy update: if status changed or lateFee changed, queue for DB update
            if (shouldBeOverdue && emi.status !== EMI_STATUS.OVERDUE) {
              emisToUpdate.push({
                id: emi.id,
                status: EMI_STATUS.OVERDUE,
                lateFee: breakdown.lateFee
              });
            } else if (breakdown.lateFee !== (emi.lateFee || 0) && breakdown.lateFee > 0) {
              // Update lateFee if it has changed
              emisToUpdate.push({
                id: emi.id,
                status: shouldBeOverdue ? EMI_STATUS.OVERDUE : emi.status,
                lateFee: breakdown.lateFee
              });
            }
          } catch (err) {
            logger.error(`Failed to calculate EMI breakdown for EMI #${emi.emiNumber}`, err as Error);
          }
        }
        
        return {
          ...emi,
          breakdown,
          isOverdue: shouldBeOverdue || emi.status === EMI_STATUS.OVERDUE,
          status: shouldBeOverdue ? EMI_STATUS.OVERDUE : emi.status
        };
      });
      
      if (emisToUpdate.length > 0) {
        setImmediate(async () => {
          try {
            await prisma.$transaction(
              emisToUpdate.map(({ id, status, lateFee }) =>
                prisma.eMISchedule.update({
                  where: { id },
                  data: { status, lateFee }
                })
              )
            );
            logger.info(`Lazy updated ${emisToUpdate.length} EMI(s) for loan ${loanId}`);
          } catch (err) {
            logger.error(`Failed to lazy update EMIs for loan ${loanId}`, err as Error);
          }
        });
      }
    }

  const user = req.user as any;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    const isSuper = Array.isArray(user.roles) && user.roles.includes(ROLES.SUPER_ADMIN);
    const isCustomer = request.customerId === user.id;
      const isAssignedAgent = request.assignedAgentId === user.id;
      // Agents should not retain UI access after bank details are submitted or later lifecycle statuses
      const isAssignedAgentAllowed = isAssignedAgent && !AGENT_ACCESS_DENY_STATUSES.includes(request.currentStatus as REQUEST_STATUS);
    const hasDistrictPermission = hasDistrictAccess(user, request.district);

    if (isSuper || isCustomer || isAssignedAgentAllowed || hasDistrictPermission) {
      if (isCustomer && Array.isArray((request as any).comments)) {
        (request as any).comments = (request as any).comments.filter((c: any) => !c.isInternal);
      }
      res.status(200).json({ success: true, message: 'Request retrieved', data: { request } } as APIResponseType);
      return;
    }

    res.status(403).json({ success: false, message: 'Access denied to this request' } as APIResponseType);
  } catch (error) {
    logger.error('getRequestDetailController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to retrieve request' } as APIResponseType);
  }
}

/**
 * POST /requests/:id/assign
 * Body: { agentId: string }
 * Only DISTRICT_ADMIN (for the district) or SUPER_ADMIN may assign agents.
 */
export async function assignAgentController(req: Request, res: Response): Promise<void> {
  try {
    const requestId = req.params.id;
  // Accept date-only string for inspection date: { inspectionDate: 'YYYY-MM-DD' }
  const { agentId, inspectionDate } = req.body as { agentId?: string; inspectionDate?: string };

    if (!requestId || !agentId) {
      res.status(400).json({ success: false, message: 'request id and agentId required' } as APIResponseType);
      return;
    }

    const user = req.user as any;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    // Allow lookup by DB id or by human-friendly requestNumber (like REQ1010)
    const request = await prisma.request.findFirst({ 
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] } 
    });
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    const isSuper = Array.isArray(user.roles) && user.roles.includes(ROLES.SUPER_ADMIN);
    if (!isSuper && !hasAnyRole(user, [ROLES.DISTRICT_ADMIN])) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    // If district admin, verify they have access to the request's district
    if (!isSuper && !hasDistrictAccess(user, request.district)) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    const agent = await prisma.user.findUnique({ where: { id: agentId } });
    if (!agent || !Array.isArray(agent.roles) || !agent.roles.includes(ROLES.AGENT) || !agent.isActive) {
      res.status(400).json({ success: false, message: 'Invalid agent' } as APIResponseType);
      return;
    }
    if (!Array.isArray(agent.district) || !agent.district.includes(request.district)) {
      res.status(400).json({ success: false, message: 'Agent not available in request district' } as APIResponseType);
      return;
    }

    const fromStatus = request.currentStatus;
    const toStatus = REQUEST_STATUS.INSPECTION_SCHEDULED;
    
    // Use the actual DB id (not requestNumber) for updates
    const dbId = request.id;

    const updateData: any = { 
      assignedAgentId: agentId, 
      currentStatus: toStatus 
    };
    
    // If date-only is passed, store as midnight UTC for that date.
    if (inspectionDate) {
      try {
        // Normalize to a full ISO instant at UTC midnight for the provided date
        updateData.inspectionScheduledAt = new Date(`${inspectionDate}T00:00:00.000Z`);
      } catch (e) {
        // Fallback: try plain Date parse
        updateData.inspectionScheduledAt = new Date(inspectionDate as string);
      }
    }

    // perform update and history creation atomically
    const [updatedRequest, historyEntry] = await prisma.$transaction(async (tx) => {
      const u = await tx.request.update({ where: { id: dbId }, data: updateData });
      const h = await createRequestHistory({
        client: tx,
        requestId: dbId,
        actorId: user.id,
        action: REQUEST_HISTORY_ACTION.ASSIGNED_AGENT,
        metadata: {
          fromStatus,
          toStatus,
          agentId,
          agentName: `${agent.firstName} ${agent.lastName}`,
          inspectionScheduledAt: inspectionDate || null,
        },
      });
      return [u, h];
    });

    // Fetch full request with relations so clients receive the complete audit trail
    const fullRequest = await prisma.request.findUnique({
      where: { id: dbId },
      include: {
        documents: true,
        requestHistory: { orderBy: { createdAt: 'asc' } },
  customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } },
        comments: { select: { id: true, content: true, createdAt: true, authorId: true, isInternal: true, author: { select: { id: true, firstName: true, lastName: true, roles: true } } } },
      }
    });

    // Enrich history actor details (best-effort)
    try {
      if (fullRequest) {
        const history = (fullRequest as any).requestHistory || [];
        const actorIds = Array.from(new Set(history.map((h: any) => h.actorId).filter(Boolean))) as string[];
        if (actorIds.length > 0) {
          const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, firstName: true, lastName: true, email: true, roles: true } });
          const actorMap: Record<string, any> = {};
          for (const a of actors) actorMap[a.id] = a;
          (fullRequest as any).requestHistory = history.map((h: any) => ({ ...h, actor: h.actorId ? actorMap[h.actorId] || null : null }));
        }
      }
    } catch (e) {
      logger.error('Failed to enrich requestHistory after assignAgentController', e as Error);
    }

    // TODO: enqueue assignment notification (kept as TODO per new plan)
    logger.info('TODO: enqueue assignment notification for agent assignment');

  res.status(200).json({ success: true, message: 'Agent assigned', data: { request: fullRequest, history: historyEntry } } as APIResponseType);
  } catch (error) {
    logger.error('assignAgentController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to assign agent' } as APIResponseType);
  }
}


/**
 * POST /requests/:id/status
 * Body: { status: string, note?: string }
 * Performs RBAC checks and writes RequestHistory.
 */
export async function updateRequestStatusController(req: Request, res: Response): Promise<void> {
  try {
    const requestId = req.params.id;
  const { status, note, requestedInspectionAt } = req.body as { status?: string; note?: string; requestedInspectionAt?: string };

    if (!requestId || !status) {
      res.status(400).json({ success: false, message: 'request id and status required' } as APIResponseType);
      return;
    }

    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    logger.info(`Status update: userId=${user.id}, requestId=${requestId}, status=${status}, roles=${JSON.stringify(user.roles)}`);

    const request = await prisma.request.findFirst({ 
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] } 
    });
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    // Role checks: allow if ANY of the user's roles permits the requested status update.
    // For multi-role users, check higher privilege roles first before applying agent restrictions
    const roles = Array.isArray(user.roles) ? user.roles : [];

    const isSuper = roles.includes(ROLES.SUPER_ADMIN);
    if (isSuper) {
      logger.info(`SUPER_ADMIN bypassing permission checks: userId=${user.id}`);
    } else {
      let permittedByAnyRole = false;

      // District admin: allowed if they have district access (broad admin permissions)
      if (roles.includes(ROLES.DISTRICT_ADMIN)) {
        if (hasDistrictAccess(user, request.district)) {
          permittedByAnyRole = true;
        }
      }

      // Customer: must be owner and status must be in CUSTOMER_ALLOWED_STATUSES
      if (!permittedByAnyRole && roles.includes(ROLES.CUSTOMER)) {
        const isOwner = String(request.customerId) === String(user.id);
        if (isOwner && CUSTOMER_ALLOWED_STATUSES.includes(status as REQUEST_STATUS)) {
          permittedByAnyRole = true;
        }
      }

      // Agent: must be assigned and the status must be allowed for agents
      // Only apply agent restrictions if user doesn't have higher privilege roles
      if (!permittedByAnyRole && roles.includes(ROLES.AGENT)) {
        const isAssigned = request.assignedAgentId === user.id;
        if (isAssigned && AGENT_ALLOWED_STATUSES.includes(status as REQUEST_STATUS)) {
          permittedByAnyRole = true;
        }
      }

      if (!permittedByAnyRole) {
        // Provide helpful messages for common failure modes
        if (roles.includes(ROLES.CUSTOMER) && String(request.customerId) !== String(user.id)) {
          res.status(403).json({ success: false, message: 'You can only update your own requests' } as APIResponseType);
          return;
        }
        if (roles.includes(ROLES.AGENT) && request.assignedAgentId !== user.id) {
          res.status(403).json({ success: false, message: 'You can only update assigned requests' } as APIResponseType);
          return;
        }
        if (roles.includes(ROLES.DISTRICT_ADMIN) && !hasDistrictAccess(user, request.district)) {
          res.status(403).json({ success: false, message: 'Access denied to this district' } as APIResponseType);
          return;
        }

        logger.warn(`User lacks required roles or permissions: userId=${user.id}, roles=${JSON.stringify(user.roles)}`);
        res.status(403).json({ success: false, message: 'Insufficient permissions' } as APIResponseType);
        return;
      }
    }

    const fromStatus = request.currentStatus;
    const toStatus = status;

    // Enforce mandatory notes for certain transitions
    const MANDATORY_NOTE_STATUSES = new Set([
      REQUEST_STATUS.MORE_INFO_REQUIRED,
      REQUEST_STATUS.REJECTED,
      REQUEST_STATUS.AMOUNT_DISBURSED,
      REQUEST_STATUS.PENDING_BANK_DETAILS,
      REQUEST_STATUS.PENDING_SIGNATURE,
      REQUEST_STATUS.OFFER_SENT,
    ]);

    if (MANDATORY_NOTE_STATUSES.has(toStatus as REQUEST_STATUS)) {
      const noteText = typeof note === 'string' ? note.trim() : '';
      if (!noteText) {
        res.status(400).json({ success: false, message: 'Note is required for this status change' } as APIResponseType);
        return;
      }
      if (noteText.length > 500) {
        res.status(400).json({ success: false, message: 'Note must be at most 500 characters' } as APIResponseType);
        return;
      }
    }

    // Use the actual DB id (not requestNumber) for updates
    const dbId = request.id;

    // Persist the status change and create a history entry using the target status as the action
    // This makes history entries explicit (e.g., 'OFFER_REJECTED', 'OFFER_ACCEPTED') instead of a generic 'STATUS_UPDATED'.
    // perform status update and history write atomically
    const [updatedRequest, historyEntry] = await prisma.$transaction(async (tx) => {
      // Prepare update payload. We only clear assignment when a reschedule is requested.
      // Historically we cleared assignedAgentId on CANCELLED/REJECTED; that removed the persisted association.
      // New behaviour: preserve assignedAgentId on CANCELLED/REJECTED (so assignment is auditable), but clear it when
      // a reschedule is requested (agent should be unassigned while customer picks a new date).
      const updatePayload: any = { currentStatus: toStatus };
      if (toStatus === REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED) {
        // Revoke assignment and clear scheduled date for reschedule requests
        updatePayload.assignedAgentId = null;
        updatePayload.inspectionScheduledAt = null;
      }

      // Persist update
      const u = await tx.request.update({ where: { id: dbId }, data: updatePayload });

      // Normalize metadata for MORE_INFO_REQUIRED to a structured AdminRequestedInfoMetadata
      let metadata: any = { fromStatus, toStatus };
  if (toStatus === REQUEST_STATUS.MORE_INFO_REQUIRED) {
        // Keep metadata minimal: who requested it and the note. Avoid storing role/fields/dueBy in shared metadata.
        metadata = {
          fromStatus,
          toStatus,
          requestedBy: user.id,
          requestedByName: `${(user.firstName || '')} ${(user.lastName || '')}`.trim() || null,
          note: typeof note === 'string' && note.trim() ? note.trim() : null,
          message: typeof note === 'string' && note.trim() ? note.trim() : null,
        };
      } else if (toStatus === REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED) {
        // Include the requested inspection date (date-only string) in metadata
        metadata = { fromStatus, toStatus, note, requestedInspectionAt: requestedInspectionAt || null };
      } else {
        metadata = { fromStatus, toStatus, note };
      }

      // Attach previous assigned agent for auditing when we clear it (reschedule flow)
      try {
        const prevAssigned = request.assignedAgentId || null;
        if (prevAssigned && toStatus === REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED) {
          metadata.previousAssignedAgentId = prevAssigned;
        }
      } catch (e) {
        // ignore metadata enrichment failures
      }

      const h = await createRequestHistory({
        client: tx,
        requestId: dbId,
        actorId: user.id,
        action: String(toStatus),
        metadata,
      });
      return [u, h];
    });

    let finalRequest = updatedRequest;
    if (toStatus === REQUEST_STATUS.APPROVED) {
      finalRequest = await prisma.request.update({ 
        where: { id: dbId }, 
        data: { currentStatus: REQUEST_STATUS.PENDING_SIGNATURE } 
      });
      
      // Use transaction helper to write follow-up history (best-effort outside primary tx)
      await createRequestHistory({
        requestId: dbId,
        actorId: user.id,
        action: REQUEST_STATUS.PENDING_SIGNATURE,
        metadata: { fromStatus: REQUEST_STATUS.APPROVED, toStatus: REQUEST_STATUS.PENDING_SIGNATURE, note: 'Auto-transitioned to signature collection' },
      });
    }

    // Return the full request including history/comments/documents so clients have the complete audit trail
    const fullRequest = await prisma.request.findUnique({
      where: { id: dbId },
      include: {
        documents: true,
        requestHistory: { orderBy: { createdAt: 'asc' } },
  customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } },
        comments: { select: { id: true, content: true, createdAt: true, authorId: true, isInternal: true, author: { select: { id: true, firstName: true, lastName: true, roles: true } } } },
      }
    });

    try {
      if (fullRequest) {
        const history = (fullRequest as any).requestHistory || [];
        const actorIds = Array.from(new Set(history.map((h: any) => h.actorId).filter(Boolean))) as string[];
        if (actorIds.length > 0) {
          const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, firstName: true, lastName: true, email: true, roles: true } });
          const actorMap: Record<string, any> = {};
          for (const a of actors) actorMap[a.id] = a;
          (fullRequest as any).requestHistory = history.map((h: any) => ({ ...h, actor: h.actorId ? actorMap[h.actorId] || null : null }));
        }
      }
    } catch (e) {
      logger.error('Failed to enrich requestHistory after updateRequestStatusController', e as Error);
    }
    // TODO: enqueue status change notification to customer (left as TODO per new plan)
    logger.info('TODO: enqueue status change notification for request status update');

    // Note: Loan + EMISchedule creation is deferred to the dedicated confirm endpoint
    // (POST /requests/:id/offers/:offerId/confirm) after inspection and e-sign are completed.

  res.status(200).json({ success: true, message: 'Status updated', data: { request: fullRequest, history: historyEntry } } as APIResponseType);
  } catch (error) {
    logger.error('updateRequestStatusController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to update status' } as APIResponseType);
  }
}

/**
 * POST /requests/:id/offer
 * Body: { amount: number, tenureMonths: number, interestRate: number, notes?: string }
 * Only DISTRICT_ADMIN (for the district) or SUPER_ADMIN may create offers.
 */
export async function createOfferController(req: Request, res: Response): Promise<void> {
  try {
    const requestId = req.params.id;
    const { amount, tenureMonths, interestRate, penaltyPercentage, lateFeePercentage, notes, processingFee } = req.body as { 
      amount?: number; 
      tenureMonths?: number; 
      interestRate?: number; 
      penaltyPercentage?: number;
      lateFeePercentage?: number;
      notes?: string;
      processingFee?: number;
    };

    if (!requestId || typeof amount !== 'number' || typeof tenureMonths !== 'number' || typeof interestRate !== 'number') {
      res.status(400).json({ success: false, message: 'request id, amount, tenureMonths, interestRate required' } as APIResponseType);
      return;
    }

    const user = req.user as any;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    // Allow lookup by DB id or by human-friendly requestNumber (like REQ1010)
    const request = await prisma.request.findFirst({ 
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] } 
    });
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    const isSuper = Array.isArray(user.roles) && user.roles.includes(ROLES.SUPER_ADMIN);
    if (!isSuper && !hasAnyRole(user, [ROLES.DISTRICT_ADMIN])) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    // If district admin, verify they have access to the request's district
    if (!isSuper && !hasDistrictAccess(user, request.district)) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    const fromStatus = request.currentStatus;
    const toStatus = REQUEST_STATUS.OFFER_SENT;

    // Use the actual DB id (not requestNumber) for updates
    const dbId = request.id;

    // compute EMI snapshot and persist as immutable JSON on the request for preview/audit
    const emiSnapshot = calculateEmiSchedule({ principal: amount, annualRate: interestRate, tenureMonths, firstPaymentDate: undefined });

    const penaltyRate = typeof penaltyPercentage === 'number' ? penaltyPercentage : DEFAULT_PENALTY_PERCENTAGE;
    const lateFeeRate = typeof lateFeePercentage === 'number' ? lateFeePercentage : DEFAULT_LATE_FEE_PERCENTAGE;

    // Create offer and history entry transactionally
    const [updatedRequest, historyEntry] = await prisma.$transaction(async (tx) => {
      const u = await (tx as any).request.update({
        where: { id: dbId },
        data: {
          adminOfferedAmount: amount,
          adminTenureMonths: tenureMonths,
          adminInterestRate: interestRate,
          penaltyPercentage: penaltyRate,
          lateFeePercentage: lateFeeRate,
          adminProcessingFee: typeof processingFee === 'number' ? processingFee : null,
          offerMadeDate: new Date(),
          currentStatus: toStatus,
          adminEmiSchedule: emiSnapshot,
        },
      });
      const h = await createRequestHistory({
        client: tx,
        requestId: dbId,
        actorId: user.id,
        action: REQUEST_STATUS.OFFER_SENT,
        metadata: {
          fromStatus,
          toStatus,
          amount,
          tenureMonths,
          interestRate,
          penaltyPercentage: penaltyRate,
          lateFeePercentage: lateFeeRate,
          notes,
          processingFee: typeof processingFee === 'number' ? processingFee : null,
        },
      });
      return [u, h];
    });

    // Return full request with relations so client sees the complete audit trail immediately
    const fullRequest = await prisma.request.findUnique({
      where: { id: dbId },
      include: {
        documents: true,
        requestHistory: { orderBy: { createdAt: 'asc' } },
  customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } },
        comments: { select: { id: true, content: true, createdAt: true, authorId: true, isInternal: true, author: { select: { id: true, firstName: true, lastName: true, roles: true } } } },
      }
    });

    try {
      if (fullRequest) {
        const history = (fullRequest as any).requestHistory || [];
        const actorIds = Array.from(new Set(history.map((h: any) => h.actorId).filter(Boolean))) as string[];
        if (actorIds.length > 0) {
          const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, firstName: true, lastName: true, email: true, roles: true } });
          const actorMap: Record<string, any> = {};
          for (const a of actors) actorMap[a.id] = a;
          (fullRequest as any).requestHistory = history.map((h: any) => ({ ...h, actor: h.actorId ? actorMap[h.actorId] || null : null }));
        }
      }
    } catch (e) {
      logger.error('Failed to enrich requestHistory after createOfferController', e as Error);
    }

    // TODO: enqueue offer notification to customer (left as TODO per new plan)
    logger.info('TODO: enqueue offer notification for customer');

  res.status(200).json({ success: true, message: 'Offer created', data: { request: fullRequest, history: historyEntry } } as APIResponseType);
  } catch (error) {
    logger.error('createOfferController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to create offer' } as APIResponseType);
  }
}

/**
 * GET /requests/:id/current-offer
 * Returns existing offer details for revision
 */
export async function getCurrentOfferController(req: Request, res: Response): Promise<void> {
  try {
    const requestId = req.params.id;
    if (!requestId) {
      res.status(400).json({ success: false, message: 'request id required' } as APIResponseType);
      return;
    }

    const user = req.user as any;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    // Fetch full request (select omitted to avoid client type mismatch until migration is applied)
    const request = await prisma.request.findFirst({ 
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] }
    });

    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    const isSuper = Array.isArray(user.roles) && user.roles.includes(ROLES.SUPER_ADMIN);
    if (!isSuper && !hasAnyRole(user, [ROLES.DISTRICT_ADMIN])) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    if (!isSuper && !hasDistrictAccess(user, request.district)) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    res.status(200).json({ 
      success: true, 
      message: 'Current offer retrieved', 
      data: {
        amount: (request as any).adminOfferedAmount || null,
        tenureMonths: (request as any).adminTenureMonths || null,
        interestRate: (request as any).adminInterestRate || null,
        penaltyPercentage: (request as any).penaltyPercentage || DEFAULT_PENALTY_PERCENTAGE,
        lateFeePercentage: (request as any).lateFeePercentage || DEFAULT_LATE_FEE_PERCENTAGE,
        processingFee: (request as any).adminProcessingFee || null,
      }
    } as APIResponseType);
  } catch (error) {
    logger.error('getCurrentOfferController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to retrieve current offer' } as APIResponseType);
  }
}

/**
 * GET /requests/:id/offer-preview
 * Query: ?amount=&tenureMonths=&interestRate=
 * Returns computed EMI schedule for given terms. RBAC: same as createOfferController (admins only).
 */
export async function offerPreviewController(req: Request, res: Response): Promise<void> {
  try {
    const requestId = req.params.id;
    const { amount: amountQ, tenureMonths: tenureQ, interestRate: rateQ } = req.query as any;

    const amount = Number(amountQ);
    const tenureMonths = Number(tenureQ);
    const interestRate = Number(rateQ);

    if (!requestId || Number.isNaN(amount) || Number.isNaN(tenureMonths) || Number.isNaN(interestRate)) {
      res.status(400).json({ success: false, message: 'request id, amount, tenureMonths, interestRate required' } as APIResponseType);
      return;
    }

    const user = req.user as any;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    // Allow lookup by DB id or by human-friendly requestNumber (like REQ1010)
    const request = await prisma.request.findFirst({ 
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] } 
    });
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    const isSuper = Array.isArray(user.roles) && user.roles.includes(ROLES.SUPER_ADMIN);
    if (!isSuper && !hasAnyRole(user, [ROLES.DISTRICT_ADMIN])) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    // If district admin, verify they have access to the request's district
    if (!isSuper && !hasDistrictAccess(user, request.district)) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    // compute EMI and return
    try {
      const emi = calculateEmiSchedule({ principal: amount, annualRate: interestRate, tenureMonths, firstPaymentDate: undefined });
      res.status(200).json({ success: true, message: 'EMI preview', data: emi } as APIResponseType);
      return;
    } catch (e) {
      res.status(400).json({ success: false, message: (e as Error).message || 'Failed to calculate EMI' } as APIResponseType);
      return;
    }
  } catch (error) {
    logger.error('offerPreviewController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to compute offer preview' } as APIResponseType);
  }
}

/**
 * POST /requests/:id/offers/:offerId/confirm
 * Finalize the offer: create canonical Loan and EMISchedule rows transactionally using the stored adminEmiSchedule.
 * RBAC: District admins for the district or SUPER_ADMIN may call this (or a system process).
 */
export async function confirmOfferController(req: Request, res: Response): Promise<void> {
  try {
    const requestId = req.params.id;
    // offerId param exists for forward-compat but offers are stored on Request as snapshot
    // const offerId = req.params.offerId;

    if (!requestId) {
      res.status(400).json({ success: false, message: 'request id required' } as APIResponseType);
      return;
    }

    const user = req.user as any;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    // Allow lookup by DB id or by human-friendly requestNumber (like REQ1010)
    const request = await prisma.request.findFirst({ 
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] } 
    });
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    const isSuper = Array.isArray(user.roles) && user.roles.includes(ROLES.SUPER_ADMIN);
    if (!isSuper && !hasAnyRole(user, [ROLES.DISTRICT_ADMIN])) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    // If district admin, verify they have access to the request's district
    if (!isSuper && !hasDistrictAccess(user, request.district)) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    const allowedStatuses = LOAN_CREATION_ALLOWED_STATUSES;
    if (!allowedStatuses.includes(request.currentStatus as REQUEST_STATUS)) {
      res.status(400).json({ success: false, message: `Cannot confirm loan in current status: ${request.currentStatus}` } as APIResponseType);
      return;
    }

    // Idempotency: if a loan already exists for this request, return it
    const existingLoan = await prisma.loan.findUnique({ where: { requestId: request.id } as any });
    if (existingLoan) {
      res.status(200).json({ success: true, message: 'Loan already exists', data: { loan: existingLoan } } as APIResponseType);
      return;
    }

    // Use stored snapshot or fall back to admin offer fields
    const snapshot = (request as any).adminEmiSchedule;
    let emiCalc: any;
    if (snapshot) emiCalc = snapshot;
    else if (request.adminOfferedAmount && request.adminInterestRate && request.adminTenureMonths) {
      emiCalc = calculateEmiSchedule({ principal: Number(request.adminOfferedAmount), annualRate: Number(request.adminInterestRate), tenureMonths: Number(request.adminTenureMonths) });
    } else {
      res.status(400).json({ success: false, message: 'No EMI snapshot or admin offer fields available to create loan' } as APIResponseType);
      return;
    }

    // Create loan and emis schedule transactionally
    let createdLoan: any = null;
    await prisma.$transaction(async (tx) => {
      createdLoan = await tx.loan.create({ data: {
        requestId: request.id,
        approvedAmount: Number(request.adminOfferedAmount) || Number((emiCalc).monthlyPayment * (emiCalc).emiSchedule.length),
        interestRate: Number(request.adminInterestRate) || 0,
        tenureMonths: Number(request.adminTenureMonths) || (emiCalc).emiSchedule.length,
        emiAmount: Number((emiCalc).monthlyPayment) || 0,
        totalInterest: Number((emiCalc).totalInterest) || 0,
        totalAmount: Number((emiCalc).totalPayment) || 0,
        firstEMIDate: (emiCalc).emiSchedule && (emiCalc).emiSchedule.length ? new Date((emiCalc).emiSchedule[0].paymentDate) : undefined,
        lastEMIDate: (emiCalc).emiSchedule && (emiCalc).emiSchedule.length ? new Date((emiCalc).emiSchedule[(emiCalc).emiSchedule.length - 1].paymentDate) : undefined,
      } });

      // Create EMI schedule entries
      for (const r of (emiCalc).emiSchedule) {
        await tx.eMISchedule.create({ data: {
          loanId: createdLoan.id,
          requestId: request.id,
          emiNumber: r.installment,
          dueDate: new Date(r.paymentDate),
          emiAmount: r.paymentAmount,
          principalAmount: r.principal,
          interestAmount: r.interest,
          status: EMI_STATUS.PENDING
        } });
      }

      // Note: Request status remains APPROVED until admin manually disburses amount
      // No automatic status change here

      // Create history entry (using helper with transaction client)
      await createRequestHistory({ client: tx, requestId: request.id, actorId: user.id, action: REQUEST_HISTORY_ACTION.LOAN_CREATED, metadata: { loanId: createdLoan.id } });
    });

    res.status(200).json({ success: true, message: 'Loan created', data: { loan: createdLoan } } as APIResponseType);
    return;
  } catch (error) {
    logger.error('confirmOfferController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to confirm offer and create loan' } as APIResponseType);
  }
}

/**
 * POST /requests/:id/create-loan
 * Create Loan and EMI Schedule entries from disbursed request
 * Called when admin activates the loan after disbursement
 * Uses adminEmiSchedule snapshot to create canonical Loan + EMISchedule records
 * RBAC: District admins for the district or SUPER_ADMIN
 */
export async function createLoanController(req: Request, res: Response): Promise<void> {
  try {
    const requestId = req.params.id;
    if (!requestId) {
      res.status(400).json({ success: false, message: 'request id required' } as APIResponseType);
      return;
    }

    const user = req.user as any;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    // Allow lookup by DB id or by human-friendly requestNumber
    const request = await prisma.request.findFirst({ 
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] },
      select: { 
        id: true, 
        district: true, 
        currentStatus: true,
        adminOfferedAmount: true,
        adminInterestRate: true,
        adminTenureMonths: true,
        adminEmiSchedule: true
      }
    });
    
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    const isSuper = Array.isArray(user.roles) && user.roles.includes(ROLES.SUPER_ADMIN);
    if (!isSuper && !hasAnyRole(user, [ROLES.DISTRICT_ADMIN])) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    // If district admin, verify they have access to the request's district
    if (!isSuper && !hasDistrictAccess(user, request.district)) {
      res.status(403).json({ success: false, message: 'Forbidden - No access to this district' } as APIResponseType);
      return;
    }

    if (request.currentStatus !== REQUEST_STATUS.AMOUNT_DISBURSED) {
      res.status(400).json({ 
        success: false, 
        message: 'Loan can only be created from AMOUNT_DISBURSED status',
        data: { currentStatus: request.currentStatus }
      } as APIResponseType);
      return;
    }

    // Idempotency: if a loan already exists for this request, return it
    const existingLoan = await prisma.loan.findUnique({ 
      where: { requestId: request.id } as any,
      include: { emisSchedule: { select: { id: true, emiNumber: true, dueDate: true, emiAmount: true, principalAmount: true, interestAmount: true, status: true, paidDate: true, paidAmount: true, lateFee: true }, orderBy: { emiNumber: 'asc' } } }
    });
    
    if (existingLoan) {
      res.status(200).json({ 
        success: true, 
        message: 'Loan already exists', 
        data: { loan: existingLoan } 
      } as APIResponseType);
      return;
    }

    // Use stored snapshot or fall back to admin offer fields
    const snapshot = (request as any).adminEmiSchedule;
    let emiCalc: any;
    
    if (snapshot) {
      emiCalc = snapshot;
    } else if (request.adminOfferedAmount && request.adminInterestRate && request.adminTenureMonths) {
      emiCalc = calculateEmiSchedule({ 
        principal: Number(request.adminOfferedAmount), 
        annualRate: Number(request.adminInterestRate), 
        tenureMonths: Number(request.adminTenureMonths) 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'No EMI snapshot or admin offer fields available to create loan' 
      } as APIResponseType);
      return;
    }

    // Create loan and EMI schedule transactionally
    let createdLoan: any = null;
    await prisma.$transaction(async (tx) => {
      // Create Loan record
      createdLoan = await tx.loan.create({ 
        data: {
          requestId: request.id,
          approvedAmount: Number(request.adminOfferedAmount) || Number((emiCalc).monthlyPayment * (emiCalc).emiSchedule.length),
          interestRate: Number(request.adminInterestRate) || 0,
          tenureMonths: Number(request.adminTenureMonths) || (emiCalc).emiSchedule.length,
          emiAmount: Number((emiCalc).monthlyPayment) || 0,
          totalInterest: Number((emiCalc).totalInterest) || 0,
          totalAmount: Number((emiCalc).totalPayment) || 0,
          status: 'ACTIVE',
          approvedDate: new Date(),
          disbursedDate: new Date(),
          firstEMIDate: (emiCalc).emiSchedule && (emiCalc).emiSchedule.length ? new Date((emiCalc).emiSchedule[0].paymentDate) : undefined,
          lastEMIDate: (emiCalc).emiSchedule && (emiCalc).emiSchedule.length ? new Date((emiCalc).emiSchedule[(emiCalc).emiSchedule.length - 1].paymentDate) : undefined,
          remainingAmount: Number((emiCalc).totalPayment) || 0,
          remainingEMIs: (emiCalc).emiSchedule.length,
        } 
      });

      // Create EMI schedule entries
      for (const r of (emiCalc).emiSchedule) {
        await tx.eMISchedule.create({ 
          data: {
            loanId: createdLoan.id,
            requestId: request.id,
            emiNumber: r.installment,
            dueDate: new Date(r.paymentDate),
            emiAmount: r.paymentAmount,
            principalAmount: r.principal,
            interestAmount: r.interest,
            status: EMI_STATUS.PENDING
          } 
        });
      }

      // Create history entry
      // Create history entry (use helper with transaction client)
      await createRequestHistory({ client: tx, requestId: request.id, actorId: user.id, action: REQUEST_HISTORY_ACTION.LOAN_CREATED, metadata: { loanId: createdLoan.id, emiCount: (emiCalc).emiSchedule.length, totalAmount: Number((emiCalc).totalPayment) } });
    });

    // Fetch the created loan with EMI schedule
    const loanWithSchedule = await prisma.loan.findUnique({
      where: { id: createdLoan.id },
      include: { 
        emisSchedule: { 
          select: { id: true, emiNumber: true, dueDate: true, emiAmount: true, principalAmount: true, interestAmount: true, status: true, paidDate: true, paidAmount: true, lateFee: true },
          orderBy: { emiNumber: 'asc' } 
        } 
      }
    });

    res.status(201).json({ 
      success: true, 
      message: 'Loan and EMI schedule created successfully', 
      data: { loan: loanWithSchedule } 
    } as APIResponseType);
    return;
  } catch (error) {
    logger.error('createLoanController error', error as Error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create loan and EMI schedule' 
    } as APIResponseType);
  }
}

/**
 * GET /requests/agents/:district
 * Get list of available agents in a specific district
 * Returns only active agents who have access to the specified district
 */
export async function getAvailableAgentsController(req: Request, res: Response): Promise<void> {
  try {
    const district = req.params.district;
    if (!district) {
      res.status(400).json({ success: false, message: 'District is required' } as APIResponseType);
      return;
    }

    const user = req.user as any;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    // Only admins can fetch agent lists
    const isSuper = Array.isArray(user.roles) && user.roles.includes(ROLES.SUPER_ADMIN);
    if (!isSuper && !hasAnyRole(user, [ROLES.DISTRICT_ADMIN])) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    // If district admin, verify they have access to this district
    if (!isSuper && !hasDistrictAccess(user, district)) {
      res.status(403).json({ success: false, message: 'Forbidden - No access to this district' } as APIResponseType);
      return;
    }

    // Fetch all active agents who have access to this district
    const agents = await prisma.user.findMany({
      where: {
        roles: { has: ROLES.AGENT },
        isActive: true,
        district: { has: district }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        district: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    res.status(200).json({ 
      success: true, 
      message: 'Agents fetched successfully', 
      data: { agents, district, count: agents.length } 
    } as APIResponseType);
  } catch (error) {
    logger.error('getAvailableAgentsController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to fetch available agents' } as APIResponseType);
  }
}

/**
 * GET /requests/:id/generate-agreement
 * Generate loan agreement PDF for a request in PENDING_SIGNATURE status
 * Returns PDF buffer that can be downloaded
 */
export async function generateAgreementController(req: Request, res: Response): Promise<void> {
  try {
    const requestId = req.params.id;
    if (!requestId) {
      res.status(400).json({ success: false, message: 'request id required' } as APIResponseType);
      return;
    }

    const user = req.user as any;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    // Fetch request with all necessary details
    const request = await prisma.request.findFirst({
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] },
      include: {
  customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } }
      }
    });

    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    // RBAC: Customer can only access their own request
    if (hasAnyRole(user, [ROLES.CUSTOMER])) {
      if (request.customerId !== user.id) {
        res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
        return;
      }
    }

    // District admin must have district access
    if (hasAnyRole(user, [ROLES.DISTRICT_ADMIN]) && !hasAnyRole(user, [ROLES.SUPER_ADMIN])) {
      if (!hasDistrictAccess(user, request.district)) {
        res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
        return;
      }
    }

    // Verify request is in correct status
    if (request.currentStatus !== REQUEST_STATUS.PENDING_SIGNATURE && request.currentStatus !== REQUEST_STATUS.APPROVED) {
      res.status(400).json({ 
        success: false, 
        message: 'Agreement can only be generated for approved requests awaiting signature' 
      } as APIResponseType);
      return;
    }

    // Prepare agreement data
    const agreementData = {
      requestNumber: request.requestNumber || request.id,
      customerName: `${request.customer?.firstName || ''} ${request.customer?.lastName || ''}`.trim() || 'Customer',
      customerEmail: request.customer?.email || '',
      customerPhone: request.customer?.phoneNumber || '',
      customerDistrict: request.district,
      
      assetType: request.assetType || 'Asset',
      assetBrand: request.assetBrand || undefined,
      assetModel: request.assetModel || undefined,
      
      approvedAmount: Number(request.adminOfferedAmount) || 0,
      tenureMonths: Number(request.adminTenureMonths) || 0,
      interestRate: Number(request.adminInterestRate) || 0,
      emiAmount: request.adminEmiSchedule ? Number((request.adminEmiSchedule as any).monthlyPayment) || 0 : 0,
      
      emiSchedule: request.adminEmiSchedule ? (request.adminEmiSchedule as any).emiSchedule : undefined,
      
      generatedDate: new Date().toISOString()
    };

    // Generate PDF (import at top of file: import { generateLoanAgreementPDF } from '../../utils/pdf-generator';)
    const { generateLoanAgreementPDF } = await import('../../utils/pdf-generator');
    const pdfBuffer = await generateLoanAgreementPDF(agreementData);

    // If the client requested a signed URL (preview/download via signed URL), upload to storage and return a signed URL
    if (String(req.query.signedUrl) === 'true') {
      try {
        const { UTApi } = await import('uploadthing/server');
        const utapi = new UTApi();

        // Upload generated PDF temporarily for preview/download
  // Node environment: construct a Blob/Buffer wrapped File-compatible object for uploadthing
  // uploadthing's UTApi.uploadFiles expects a File-like object in server Node environments; buffer is acceptable
  const nodeFile = new File([pdfBuffer as any], `loan-agreement-${request.requestNumber || request.id}.pdf`, { type: 'application/pdf' } as any);
  const uploadResult = await utapi.uploadFiles(nodeFile as any);
        if (uploadResult.error) {
          logger.error('UploadThing upload failed for agreement preview:', uploadResult.error as any);
          res.status(500).json({ success: false, message: 'Failed to prepare agreement preview' } as APIResponseType);
          return;
        }

        const uploadedFile = uploadResult.data;

        // Generate signed URL for short preview time
        const { url } = await generateSignedUrl(uploadedFile.key, CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT);

        // Record history (preview generated)
        try {
          await createRequestHistory({
            requestId: request.id,
            actorId: user.id,
            action: REQUEST_HISTORY_ACTION.AGREEMENT_GENERATED,
            metadata: {
              generatedBy: user.id,
              fileKey: uploadedFile.key,
              preview: true,
              fromStatus: request.currentStatus || null,
              toStatus: request.currentStatus || null,
            }
          });
        } catch (err) {
          logger.error('Failed to create history entry for agreement preview generation', err as Error);
        }

        res.status(200).json({ success: true, data: { url } } as APIResponseType);
        return;
      } catch (err) {
        logger.error('Failed to create signed URL for agreement preview', err as Error);
        res.status(500).json({ success: false, message: 'Failed to generate agreement preview' } as APIResponseType);
        return;
      }
    }

    // Record that an agreement PDF was generated for this request (admin/customer preview)
    try {
      await createRequestHistory({
        requestId: request.id,
        actorId: user.id,
        action: REQUEST_HISTORY_ACTION.AGREEMENT_GENERATED,
        metadata: {
          generatedBy: user.id,
          generatedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
          fromStatus: request.currentStatus || null,
          toStatus: request.currentStatus || null,
        }
      });
    } catch (err) {
      logger.error('Failed to create history entry for agreement generation', err as Error);
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="loan-agreement-${request.requestNumber || request.id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('generateAgreementController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to generate agreement' } as APIResponseType);
  }
}

/**
 * POST /requests/:id/sign-agreement
 * Body: { signatureDataUrl: string }
 * Digitally signs the loan agreement with customer's signature and system stamp
 */
export async function signAgreementController(req: Request, res: Response): Promise<void> {
  try {
    const requestId = req.params.id;
    const { signatureDataUrl } = req.body;
    const user = req.user as any;

    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    if (!signatureDataUrl) {
      res.status(400).json({ success: false, message: 'Signature data is required' } as APIResponseType);
      return;
    }

    // Fetch request with necessary details
    const request = await prisma.request.findFirst({
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } }
      }
    });

    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    // RBAC: Only customer can sign their own agreement
    if (hasAnyRole(user, [ROLES.CUSTOMER])) {
      if (request.customerId !== user.id) {
        res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
        return;
      }
    } else {
      res.status(403).json({ success: false, message: 'Only customers can sign agreements' } as APIResponseType);
      return;
    }

    // Verify request is in correct status
    if (request.currentStatus !== REQUEST_STATUS.PENDING_SIGNATURE) {
      res.status(400).json({
        success: false,
        message: 'Agreement can only be signed when status is PENDING_SIGNATURE'
      } as APIResponseType);
      return;
    }

    // Prepare agreement data (same as generateAgreementController)
    const agreementData = {
      requestNumber: request.requestNumber || request.id,
      customerName: `${request.customer?.firstName || ''} ${request.customer?.lastName || ''}`.trim() || 'Customer',
      customerEmail: request.customer?.email || '',
      customerPhone: request.customer?.phoneNumber || '',
      customerDistrict: request.district,

      assetType: request.assetType || 'Asset',
      assetBrand: request.assetBrand || undefined,
      assetModel: request.assetModel || undefined,

      approvedAmount: Number(request.adminOfferedAmount) || 0,
      tenureMonths: Number(request.adminTenureMonths) || 0,
      interestRate: Number(request.adminInterestRate) || 0,
      emiAmount: request.adminEmiSchedule ? Number((request.adminEmiSchedule as any).monthlyPayment) || 0 : 0,

      emiSchedule: request.adminEmiSchedule ? (request.adminEmiSchedule as any).emiSchedule : undefined,

      generatedDate: new Date().toISOString()
    };

    // Generate PDF
    const { generateLoanAgreementPDF } = await import('../../utils/pdf-generator');
    const pdfBuffer = await generateLoanAgreementPDF(agreementData);

    // Convert signature data URL to image buffer
    const signatureBase64 = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
    const signatureBuffer = Buffer.from(signatureBase64, 'base64');

    // Apply signature to PDF
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBuffer as Uint8Array);
    const signatureImage = await pdfDoc.embedPng(signatureBuffer);

    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Position signature at bottom right
    const signatureWidth = 200;
    const signatureHeight = 80;
    const x = width - signatureWidth - 50;
    const y = 100;

    lastPage.drawImage(signatureImage, {
      x,
      y,
      width: signatureWidth,
      height: signatureHeight,
    });

    // Apply system stamp if configured
    if (config.systemSignatureFileKey) {
      try {
        const { url: stampUrl } = await generateSignedUrl(config.systemSignatureFileKey, 300);
        const stampResp = await fetch(stampUrl);
        if (stampResp.ok) {
          const stampBuffer = Buffer.from(await stampResp.arrayBuffer());
          const stampImage = await pdfDoc.embedPng(stampBuffer);

          const maxStampWidth = 160;
          const scale = Math.min(1, maxStampWidth / stampImage.width);
          const stampWidth = stampImage.width * scale;
          const stampHeight = stampImage.height * scale;
          const stampX = Math.max(40, width - stampWidth - 40);
          const stampY = Math.max(40, 200);

          lastPage.drawImage(stampImage, {
            x: stampX,
            y: stampY,
            width: stampWidth,
            height: stampHeight,
            opacity: 0.95
          });
        }
      } catch (e) {
        logger.error('Failed to apply system stamp', e as Error);
      }
    }

    // Save the signed PDF
    const signedPdfBytes = await pdfDoc.save();
    const signedPdfBuffer = Buffer.from(signedPdfBytes);

    // Upload to UploadThing
    const { UTApi } = await import('uploadthing/server');
    const utapi = new UTApi();

    // Create a proper File object for UploadThing
    const signedPdfFile = new File([signedPdfBuffer as any], `signed-agreement-${request.requestNumber || request.id}.pdf`, { type: 'application/pdf' } as any);
    const uploadResult = await utapi.uploadFiles(signedPdfFile as any);
    if (uploadResult.error) {
      logger.error('UploadThing upload failed:', uploadResult.error as any);
      res.status(500).json({ success: false, message: 'Failed to upload signed agreement' } as APIResponseType);
      return;
    }

    const uploadedFile = uploadResult.data;

    // Save document record
    const document = await prisma.document.create({
      data: {
        requestId: request.id,
        fileKey: uploadedFile.key,
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        fileType: 'application/pdf',
        uploadedBy: user.id, // Customer initiated, but system processed
        uploaderRole: DOCUMENT_UPLOADER_ROLE.SYSTEM,
        documentType: DOCUMENT_TYPE.LOAN_AGREEMENT,
        description: 'Digitally signed loan agreement with customer signature and system stamp',
      }
    });

    // Generate signed URL for the client
    const { url: signedUrl } = await generateSignedUrl(uploadedFile.key, CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT);

    // Update request status to PENDING_BANK_DETAILS
    const fromStatus = request.currentStatus;
    const toStatus = REQUEST_STATUS.PENDING_BANK_DETAILS;

    await prisma.$transaction(async (tx) => {
      await tx.request.update({
        where: { id: request.id },
        data: { currentStatus: toStatus }
      });

      // System uploaded the signed document (with customer signature and system stamp)
      await createRequestHistory({
        client: tx,
        requestId: request.id,
        actorId: null, // System action
        action: REQUEST_HISTORY_ACTION.DOCUMENT_UPLOADED,
        metadata: {
          documentId: document.id,
          fileKey: document.fileKey,
          uploaderRole: DOCUMENT_UPLOADER_ROLE.SYSTEM,
          action: 'system_uploaded_file',
          description: 'System uploaded the digitally signed loan agreement with customer signature and system stamp',
          signedBy: user.id,
          signedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer'
        }
      });

      // System changed status to next step
      await createRequestHistory({
        client: tx,
        requestId: request.id,
        actorId: null, // System action
        action: REQUEST_HISTORY_ACTION.STATUS_UPDATED,
        metadata: {
          fromStatus,
          toStatus,
          action: 'system_status_change',
          description: 'System automatically transitioned to bank details collection after customer signature',
          triggeredBy: 'customer_signature_completed'
        }
      });
    });

    logger.info(`Agreement digitally signed for request ${request.id}`);

    res.status(200).json({
      success: true,
      message: 'Agreement signed successfully',
      data: {
        signedUrl,
        documentId: document.id,
        nextStatus: toStatus,
      }
    } as APIResponseType);

  } catch (error) {
    logger.error('signAgreementController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to sign agreement' } as APIResponseType);
  }
}
export async function uploadSignedAgreementController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { pdfBase64, fileName } = req.body;
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!pdfBase64 || !fileName) {
      res.status(400).json({ success: false, error: 'Missing PDF data or filename' });
      return;
    }

    // Fetch request with minimal data
    const request = await prisma.request.findUnique({
      where: { id: id },
      select: { 
        id: true, 
        customerId: true, 
        district: true,
        currentStatus: true 
      }
    });

    if (!request) {
      res.status(404).json({ success: false, error: 'Request not found' });
      return;
    }

    // Authorization check
    const isCustomer = user.roles.includes(ROLES.CUSTOMER);
    const isAdmin = user.roles.includes(ROLES.DISTRICT_ADMIN) || user.roles.includes(ROLES.SUPER_ADMIN);
    const isDistrictMatch = Array.isArray(user.districts)
      ? user.districts.includes(request.district)
      : false;

    if (isCustomer && request.customerId !== user.id) {
      res.status(403).json({ success: false, error: 'Not authorized to upload agreement for this request' });
      return;
    }

    if (isAdmin && !user.roles.includes(ROLES.SUPER_ADMIN) && !isDistrictMatch) {
      res.status(403).json({ success: false, error: 'Not authorized for this district' });
      return;
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Upload to UploadThing using UTApi
    const { UTApi } = await import('uploadthing/server');
    const utapi = new UTApi();

    logger.info(`Uploading signed agreement for request ${id}`);

  // Upload buffer directly — uploadthing server API accepts file-like data in Node; cast to any to satisfy TS
  const uploadResult = await utapi.uploadFiles(pdfBuffer as any);

    if (uploadResult.error) {
      logger.error('UploadThing upload failed:', uploadResult.error as any);
      res.status(500).json({ success: false, error: 'Failed to upload PDF to storage' });
      return;
    }

    const uploadedFile = uploadResult.data;

    // Determine uploaderRole based on user's roles
    let uploaderRole = 'USER_SUBMITTED';
    if (user.roles.includes(ROLES.SUPER_ADMIN) || user.roles.includes(ROLES.DISTRICT_ADMIN)) {
      uploaderRole = 'ADMIN_SUBMITTED';
    } else if (user.roles.includes(ROLES.AGENT)) {
      uploaderRole = 'AGENT_SUBMITTED';
    }

    // Save document record to database
    const document = await prisma.document.create({
      data: {
        requestId: id,
        fileKey: uploadedFile.key,
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        fileType: 'application/pdf',
        uploadedBy: user.id,
        uploaderRole,
        documentType: DOCUMENT_TYPE.LOAN_AGREEMENT,
        description: 'Digitally signed loan agreement',
      }
    });

    logger.info(`Signed agreement saved: ${document.id} for request ${id}`);

    // Create a request history entry for the uploaded customer-signed agreement
    try {
      await createRequestHistory({
        requestId: id,
        actorId: user.id,
        action: REQUEST_HISTORY_ACTION.SIGNED_AGREEMENT_UPLOADED,
        metadata: {
          documentId: document.id,
          fileKey: document.fileKey,
          fileName: document.fileName,
          fileSize: document.fileSize,
          fileType: document.fileType,
          documentType: document.documentType,
          uploaderId: user.id,
          uploaderRole,
          fromStatus: request.currentStatus || null,
          toStatus: request.currentStatus || null,
        }
      });
    } catch (err) {
      logger.error('Failed to create history for signed agreement upload', err as Error);
    }

    // --- Automatic system stamping (synchronous) ---
    // Attempt to synchronously apply the configured system stamp image to the uploaded PDF,
    // upload the stamped PDF as a SYSTEM document, create a history entry, and return a signed URL
    // for the stamped version to the client. If stamping fails, we still return the user-uploaded
    // document information but include no stamped URL.
    let stampedSignedUrl: string | null = null;
    let stampedDocumentId: string | null = null;
    let stampedFileKey: string | null = null;

    if (config.systemSignatureFileKey) {
      try {
        logger.info(`Attempting automatic system stamp (synchronous) for signed agreement requestId=${id} systemKey=${config.systemSignatureFileKey}`);

        const { url: stampUrl } = await generateSignedUrl(config.systemSignatureFileKey!, 300);
        const stampResp = await fetch(stampUrl);
        if (!stampResp.ok) throw new Error(`Failed to download system stamp image: ${stampResp.status}`);
        const stampBuffer = Buffer.from(await stampResp.arrayBuffer());

        const { PDFDocument } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(pdfBuffer as Uint8Array);

        const contentType = stampResp.headers.get('content-type') || '';
        let embeddedImage: any = null;
        if (contentType.includes('png')) {
          embeddedImage = await pdfDoc.embedPng(stampBuffer);
        } else {
          embeddedImage = await pdfDoc.embedJpg(stampBuffer);
        }

        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];
        const { width } = lastPage.getSize();

        const maxStampWidth = 160;
        const scale = Math.min(1, maxStampWidth / embeddedImage.width);
        const stampWidth = embeddedImage.width * scale;
        const stampHeight = embeddedImage.height * scale;
        const x = Math.max(40, width - stampWidth - 40);
        const y = Math.max(40, 80);

        lastPage.drawImage(embeddedImage, { x, y, width: stampWidth, height: stampHeight, opacity: 0.95 });

        const stampedBytes = await pdfDoc.save();
        const stampedBuffer = Buffer.from(stampedBytes);
        const stampedUpload = await utapi.uploadFiles(stampedBuffer as any);
        if (stampedUpload.error) throw new Error('Failed to upload stamped PDF');
        const stampedUploaded = stampedUpload.data;

        const systemDoc = await prisma.document.create({
          data: {
            requestId: id,
            fileKey: stampedUploaded.key,
            fileName: stampedUploaded.name,
            fileSize: stampedUploaded.size,
            fileType: 'application/pdf',
            uploadedBy: user.id,
            uploaderRole: DOCUMENT_UPLOADER_ROLE.SYSTEM,
            documentType: DOCUMENT_TYPE.LOAN_AGREEMENT,
            description: 'System-stamped signed loan agreement',
          }
        });
        // Record system-stamped document upload in history with detailed metadata about the stamp
        try {
          await createRequestHistory({
            requestId: id,
            actorId: null,
            action: REQUEST_HISTORY_ACTION.DOCUMENT_UPLOADED,
            metadata: {
              documentId: systemDoc.id,
              fileKey: systemDoc.fileKey,
              fileName: systemDoc.fileName,
              fileSize: systemDoc.fileSize,
              fileType: systemDoc.fileType,
              documentType: systemDoc.documentType,
              uploaderRole: DOCUMENT_UPLOADER_ROLE.SYSTEM,
              note: 'System applied digital stamp to customer-signed agreement',
              stamp: {
                systemStampFileKey: config.systemSignatureFileKey || null,
                appliedBy: 'SYSTEM',
                appliedAt: new Date().toISOString(),
                customerDocumentId: document.id,
                customerFileKey: document.fileKey,
              }
            }
          });
        } catch (e) {
          logger.error('Failed to create history for system stamped upload', e as Error);
        }

        try {
          const { url } = await generateSignedUrl(stampedUploaded.key, CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT);
          stampedSignedUrl = url;
          stampedDocumentId = systemDoc.id;
          stampedFileKey = stampedUploaded.key;
          logger.info(`System stamping completed successfully requestId=${id} systemDocumentId=${systemDoc.id}`);
        } catch (e) {
          logger.error('Failed to generate signed URL for stamped document', e as Error);
        }
      } catch (e) {
        logger.error('Synchronous automatic system stamping failed', e as Error);
      }
    }

    // After upload (and stamping if available), transition request to next status and record history
    try {
      const fromStatus = request.currentStatus || null;
      const toStatus = REQUEST_STATUS.PENDING_BANK_DETAILS;

      await prisma.$transaction(async (tx) => {
        // Update request status
        await tx.request.update({ where: { id: id }, data: { currentStatus: toStatus } });

        // Create history entry for automatic transition triggered by customer signature
        await createRequestHistory({
          client: tx,
          requestId: id,
          actorId: user.id,
          action: toStatus,
          metadata: {
            fromStatus,
            toStatus,
            triggeredBy: 'SIGNED_AGREEMENT_UPLOADED',
            customerDocumentId: document.id,
            customerFileKey: document.fileKey,
            systemDocumentId: stampedDocumentId,
            systemFileKey: stampedFileKey,
          }
        });
      });
    } catch (e) {
      logger.error('Failed to transition request status after signed agreement upload', e as Error);
    }

    // Return upload result and stamped URL (if any)
    res.status(200).json({
      success: true,
      message: 'Signed agreement uploaded successfully',
      data: {
        documentId: document.id,
        fileKey: document.fileKey,
        stampedDocumentId,
        stampedFileKey,
        stampedSignedUrl,
        nextStatus: REQUEST_STATUS.PENDING_BANK_DETAILS,
      }
    });

  } catch (error) {
    logger.error('Error uploading signed agreement:', error as Error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload signed agreement' 
    });
  }
}

/**
 * POST /requests/:id/inspections/complete
 * Body: { outcome: 'APPROVE' | 'REJECT', note?: string, documentIds?: string[], checklist?: Record<string, any> }
 * Finalizes an inspection: validates documents (if any), updates request status to INSPECTION_COMPLETED,
 * and creates an aggregated RequestHistory entry summarizing the outcome.
 */
export async function completeInspectionController(req: Request, res: Response): Promise<void> {
  try {
    const requestId = req.params.id;
    const { outcome, note, documentIds, checklist } = req.body as { outcome?: string; note?: string; documentIds?: string[]; checklist?: Record<string, any> };

    if (!requestId) {
      res.status(400).json({ success: false, message: 'request id required' } as APIResponseType);
      return;
    }

    const user = req.user as any;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    // Fetch request
    const request = await prisma.request.findFirst({ where: { OR: [{ id: requestId }, { requestNumber: requestId }] }, include: { documents: true } });
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    // Only assigned agent or admins may complete an inspection
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const isSuper = roles.includes(ROLES.SUPER_ADMIN);
    const isDistrictAdmin = roles.includes(ROLES.DISTRICT_ADMIN) && hasDistrictAccess(user, request.district);
    const isAssignedAgent = roles.includes(ROLES.AGENT) && request.assignedAgentId === user.id;

    if (!(isSuper || isDistrictAdmin || isAssignedAgent)) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    // Must be in inspection in progress
    if (request.currentStatus !== REQUEST_STATUS.INSPECTION_IN_PROGRESS) {
      res.status(400).json({ success: false, message: `Inspection can only be completed from status ${REQUEST_STATUS.INSPECTION_IN_PROGRESS}` } as APIResponseType);
      return;
    }

    // Outcome is optional here. If provided, normalize and validate; otherwise we'll record inspection completion
    let normalizedOutcome: string | null = null;
    if (typeof outcome !== 'undefined' && outcome !== null) {
      normalizedOutcome = String(outcome).toUpperCase();
      if (!['APPROVE', 'REJECT'].includes(normalizedOutcome)) {
        res.status(400).json({ success: false, message: 'Invalid outcome. If provided, must be APPROVE or REJECT' } as APIResponseType);
        return;
      }
    }

    // If documentIds provided, ensure they belong to this request
    if (Array.isArray(documentIds) && documentIds.length > 0) {
      const docs = await prisma.document.findMany({ where: { id: { in: documentIds } } });
      const invalid = docs.some(d => d.requestId !== request.id);
      if (invalid || docs.length !== documentIds.length) {
        res.status(400).json({ success: false, message: 'One or more documents are invalid or do not belong to this request' } as APIResponseType);
        return;
      }
    }

    const fromStatus = request.currentStatus;
    const toStatus = REQUEST_STATUS.INSPECTION_COMPLETED;

    // Persist update and create aggregated history entry
    const [updatedRequest, historyEntry] = await prisma.$transaction(async (tx) => {
      const u = await tx.request.update({ where: { id: request.id }, data: { currentStatus: toStatus } });

      const metadata: any = {
        fromStatus,
        toStatus,
        note: typeof note === 'string' && note.trim() ? note.trim() : null,
        documentIds: Array.isArray(documentIds) ? documentIds : [],
        checklist: checklist || null,
      };
      if (normalizedOutcome) metadata.outcome = normalizedOutcome;

      const h = await createRequestHistory({
        client: tx,
        requestId: request.id,
        actorId: user.id,
        action: REQUEST_HISTORY_ACTION.INSPECTION_COMPLETED,
        metadata,
      });

      return [u, h];
    });

    // Enrich history actor details (best-effort)
    try {
      const fullRequest = await prisma.request.findUnique({ where: { id: request.id }, include: { documents: true, requestHistory: { orderBy: { createdAt: 'asc' } }, customer: true, assignedAgent: true } });
      if (fullRequest) {
        const history = (fullRequest as any).requestHistory || [];
        const actorIds = Array.from(new Set(history.map((h: any) => h.actorId).filter(Boolean))) as string[];
        if (actorIds.length > 0) {
          const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, firstName: true, lastName: true, email: true, roles: true } });
          const actorMap: Record<string, any> = {};
          for (const a of actors) actorMap[a.id] = a;
          (fullRequest as any).requestHistory = history.map((h: any) => ({ ...h, actor: h.actorId ? actorMap[h.actorId] || null : null }));
        }
      }
    } catch (e) {
      logger.error('Failed to enrich requestHistory after completeInspectionController', e as Error);
    }

    // Return full updated request (client will re-fetch as needed)
    const finalRequest = await prisma.request.findUnique({ where: { id: request.id }, include: { documents: true, requestHistory: { orderBy: { createdAt: 'asc' } }, customer: true, assignedAgent: true } });

    res.status(200).json({ success: true, message: 'Inspection completed', data: { request: finalRequest, history: historyEntry } } as APIResponseType);
    return;
  } catch (error) {
    logger.error('completeInspectionController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to complete inspection' } as APIResponseType);
  }
}

/**
 * Update Bank Details Controller
 * Saves customer's bank details to the request
 */
export async function updateBankDetailsController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { bankAccountNumber, bankIfscCode, bankAccountName, upiId } = req.body;
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!bankAccountNumber || !bankIfscCode || !bankAccountName) {
      res.status(400).json({ success: false, error: 'Account number, IFSC code, and account name are required' });
      return;
    }

    // Fetch request - support both database ID and request number
    const request = await prisma.request.findFirst({
      where: { 
        OR: [
          { id: id }, 
          { requestNumber: id }
        ] 
      },
      select: { id: true, customerId: true, currentStatus: true }
    });

    if (!request) {
      res.status(404).json({ success: false, error: 'Request not found' });
      return;
    }

    // Only customer who owns the request can update bank details
    if (request.customerId !== user.id) {
      res.status(403).json({ success: false, error: 'Not authorized to update bank details for this request' });
      return;
    }

    // Update bank details using the database ID
    const updatedRequest = await prisma.request.update({
      where: { id: request.id },
      data: {
        bankAccountNumber,
        bankIfscCode,
        bankAccountName,
        upiId: upiId || null,
        bankDetailsSubmittedAt: new Date(),
        currentStatus: REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
      }
    });

    // Create history entry (best-effort)
    await createRequestHistory({
      requestId: request.id,
      actorId: user.id,
      action: REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
      metadata: {
        fromStatus: request.currentStatus,
        toStatus: REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
        bankAccountNumber: `***${bankAccountNumber.slice(-4)}`,
        bankIfscCode,
        hasUpi: !!upiId,
      }
    });

    logger.info(`Bank details updated for request ${id}`);

    res.status(200).json({
      success: true,
      message: 'Bank details submitted successfully',
      data: {
        requestId: updatedRequest.id,
        status: updatedRequest.currentStatus,
      }
    });

  } catch (error) {
    logger.error('Error updating bank details:', error as Error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update bank details' 
    });
  }
}

/**
 * GET /requests/assigned
 * Returns requests assigned to the logged-in agent.
 */
export async function getAgentAssignedRequestsController(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not found in token' });
      return;
    }

    // Check if user is an agent
    const userRoles = req.user?.roles || [];
    if (!userRoles.includes(ROLES.AGENT)) {
       logger.warn(`getAgentAssignedRequestsController blocked: user roles do not include AGENT; userId=${userId}, roles=${JSON.stringify(userRoles)}`)
       res.status(403).json({ success: false, message: 'Access denied. Agent role required.' });
       return;
    }

    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize ?? 10)));

    const where: any = { assignedAgentId: userId };

    // Agents should not see requests that have progressed past bank details submission
    // (these are considered completed for the agent's responsibilities)
    where.currentStatus = { notIn: AGENT_ACCESS_DENY_STATUSES };

    // Optional status filter
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    if (status) {
        where.currentStatus = status;
    }

    // Optional simple search
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    if (search && search.length > 0) {
      where.OR = [
        { id: { contains: search } },
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { assetBrand: { contains: search, mode: 'insensitive' } },
        { assetModel: { contains: search, mode: 'insensitive' } },
        // Also search by customer name if possible? 
        // Prisma doesn't support deep relation search in OR easily without full text search or multiple queries.
        // But I can search by customerId if I knew it.
        // For now, let's stick to request fields.
      ];
    }

    logger.info(`getAgentAssignedRequestsController: userId=${userId}, page=${page}, pageSize=${pageSize}, where=${JSON.stringify(where)}`);
    const [items, total] = await Promise.all([
      prisma.request.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, district: true, address: true } },
          assignedAgent: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
          loan: { select: { id: true, approvedAmount: true, status: true, disbursedDate: true, approvedDate: true } },
          _count: { select: { documents: true, comments: true, inspections: true } },
        },
      }),
      prisma.request.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Assigned requests fetched',
      data: { items, total, page, pageSize },
    });
  } catch (error) {
    logger.error('Get assigned requests error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to fetch assigned requests' });
  }
}

/**
 * POST /requests/:id/comments-enabled
 * Body: { enabled: boolean }
 * Admin-only: SUPER_ADMIN or DISTRICT_ADMIN (for the request district)
 * Toggles whether customers can post comments after a request is rejected.
 */
export async function updateCommentsEnabledController(req: Request, res: Response): Promise<void> {
  try {
    const requestId = req.params.id;
    const { enabled } = req.body as { enabled?: boolean };

    if (!requestId || typeof enabled !== 'boolean') {
      res.status(400).json({ success: false, message: 'request id and enabled boolean required' } as APIResponseType);
      return;
    }

    const user = req.user as any;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    const request = await prisma.request.findFirst({ where: { OR: [{ id: requestId }, { requestNumber: requestId }] } });
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    const isSuper = Array.isArray(user.roles) && user.roles.includes(ROLES.SUPER_ADMIN);
    if (!isSuper && !hasAnyRole(user, [ROLES.DISTRICT_ADMIN])) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    if (!isSuper && !hasDistrictAccess(user, request.district)) {
      res.status(403).json({ success: false, message: 'Forbidden - no access to this district' } as APIResponseType);
      return;
    }

    const dbId = request.id;
    const prev = (request as any).commentsEnabled;

    // Prisma client types may be out of sync until migration + client regenerate; use a typed-agnostic update here
    const updated = await (prisma as any).request.update({ where: { id: dbId }, data: { commentsEnabled: enabled } });

    // Create history entry recording the toggle
    try {
      await createRequestHistory({
        requestId: dbId,
        actorId: user.id,
        action: 'COMMENTS_PERMISSION_UPDATED',
        metadata: { previous: prev ?? null, enabled }
      });
    } catch (err) {
      logger.error('Failed to write history for commentsEnabled toggle', err as Error);
    }

    // Return full request with relations
    const fullRequest = await prisma.request.findUnique({
      where: { id: dbId },
      include: {
        documents: true,
        requestHistory: { orderBy: { createdAt: 'asc' } },
  customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } },
        comments: { select: { id: true, content: true, createdAt: true, authorId: true, isInternal: true, author: { select: { id: true, firstName: true, lastName: true, roles: true } } } },
      }
    });

    res.status(200).json({ success: true, message: 'Comment permissions updated', data: { request: fullRequest } } as APIResponseType);
    return;
  } catch (error) {
    logger.error('updateCommentsEnabledController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to update comment permissions' } as APIResponseType);
  }
}
