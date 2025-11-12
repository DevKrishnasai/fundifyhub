import { Request, Response } from 'express';
import { prisma } from '@fundifyhub/prisma';
import logger from '../../utils/logger';
import { APIResponseType } from '../../types';
import { hasAnyRole, hasDistrictAccess } from '../../utils/rbac';
import { calculateEmiSchedule } from '@fundifyhub/utils';
import { ROLES } from '@fundifyhub/types';
import { REQUEST_STATUS, TEMPLATE_NAMES, SERVICE_NAMES } from '@fundifyhub/types';
import queueClient from '../../utils/queues';

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
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
        assignedAgent: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
        comments: { select: { id: true, content: true, createdAt: true, authorId: true, isInternal: true, author: { select: { id: true, firstName: true, lastName: true, roles: true } } } },
      }
    });

    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    // Attach actor details to requestHistory entries for better UI display (avoid extra client roundtrips)
    try {
      const history = (request as any).requestHistory || [];
      const actorIds = Array.from(new Set(history.map((h: any) => h.actorId).filter(Boolean))) as string[];
      if (actorIds.length > 0) {
        // include roles so frontend can categorize actor (ADMIN/AGENT/CUSTOMER)
        const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, firstName: true, lastName: true, email: true, roles: true } });
        const actorMap: Record<string, any> = {};
        for (const a of actors) actorMap[a.id] = a;
        (request as any).requestHistory = history.map((h: any) => ({ ...h, actor: h.actorId ? actorMap[h.actorId] || null : null }));
      }
    } catch (e) {
      // non-fatal, continue returning request without actor enrichment
      logger.error('Failed to enrich requestHistory with actor details', e as Error);
    }

  const user = req.user as any;
    const isSuper = Array.isArray(user?.roles) && user.roles.includes(ROLES.SUPER_ADMIN);

    // Customer can view their own request
    if (user && request.customerId === user.id) {
      // Customers should not see internal comments
      if (Array.isArray((request as any).comments)) {
        (request as any).comments = (request as any).comments.filter((c: any) => !c.isInternal);
      }
      res.status(200).json({ success: true, message: 'Request retrieved', data: { request } } as APIResponseType);
      return;
    }

    // Agent can view if assigned
    if (user && Array.isArray(user.roles) && user.roles.includes(ROLES.AGENT)) {
      if (request.assignedAgentId && user.id === request.assignedAgentId) {
        res.status(200).json({ success: true, message: 'Request retrieved', data: { request } } as APIResponseType);
        return;
      }
    }

    // District admin can view if they have district access
    if (!isSuper && user && Array.isArray(user.roles) && user.roles.includes(ROLES.DISTRICT_ADMIN)) {
      if (hasDistrictAccess(user, request.district)) {
        res.status(200).json({ success: true, message: 'Request retrieved', data: { request } } as APIResponseType);
        return;
      }
    }

    if (isSuper) {
      res.status(200).json({ success: true, message: 'Request retrieved', data: { request } } as APIResponseType);
      return;
    }
    // For other roles (e.g., district admin, agent), allow internal comments; for non-admins they've been filtered above.
    res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
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
    const { agentId, inspectionDateTime } = req.body as { agentId?: string; inspectionDateTime?: string };

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

    // Verify agent exists and is active and has AGENT role and belongs to the request district
    const agent = await prisma.user.findUnique({ where: { id: agentId } });
    if (!agent || !Array.isArray(agent.roles) || !agent.roles.includes(ROLES.AGENT) || !agent.isActive) {
      res.status(400).json({ success: false, message: 'Invalid agent' } as APIResponseType);
      return;
    }
    if (!Array.isArray(agent.district) || !agent.district.includes(request.district)) {
      res.status(400).json({ success: false, message: 'Agent not available in request district' } as APIResponseType);
      return;
    }

    // Transaction: update request and create history
    const fromStatus = request.currentStatus;
    const toStatus = 'INSPECTION_SCHEDULED';
    
    // Use the actual DB id (not requestNumber) for updates
    const dbId = request.id;

    const updateData: any = { 
      assignedAgentId: agentId, 
      currentStatus: toStatus 
    };
    
    // If inspection date/time provided, store it
    if (inspectionDateTime) {
      updateData.inspectionScheduledAt = new Date(inspectionDateTime);
    }

    const [updatedRequest, historyEntry] = await prisma.$transaction([
      prisma.request.update({ where: { id: dbId }, data: updateData }),
      prisma.requestHistory.create({ 
        data: { 
          requestId: dbId, 
          actorId: user.id, 
          action: 'ASSIGNED_AGENT', 
          metadata: { 
            fromStatus, 
            toStatus, 
            agentId, 
            agentName: `${agent.firstName} ${agent.lastName}`,
            inspectionScheduledAt: inspectionDateTime || null
          } 
        } 
      })
    ]);

    // Fetch full request with relations so clients receive the complete audit trail
    const fullRequest = await prisma.request.findUnique({
      where: { id: dbId },
      include: {
        documents: true,
        requestHistory: { orderBy: { createdAt: 'asc' } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
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

    // Notify the agent via available channels
    try {
      await queueClient.addAJob(TEMPLATE_NAMES.LOGIN_ALERT, {
        email: agent.email || '',
        phoneNumber: agent.phoneNumber || '',
        customerName: `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Agent',
        device: 'Assignment',
        location: request.district,
        time: new Date().toISOString(),
        supportUrl: 'https://fundifyhub.example/support',
        resetPasswordUrl: 'https://fundifyhub.example/support',
        companyName: 'FundifyHub'
      }, { services: [SERVICE_NAMES.WHATSAPP, SERVICE_NAMES.EMAIL] });
    } catch (e) {
      logger.error('Failed to enqueue assignment notification', e as Error);
    }

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
    const { status, note } = req.body as { status?: string; note?: string };

    if (!requestId || !status) {
      res.status(400).json({ success: false, message: 'request id and status required' } as APIResponseType);
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

    // Customers can accept/reject offers and cancel their own requests
    if (Array.isArray(user.roles) && user.roles.includes(ROLES.CUSTOMER)) {
      if (request.customerId !== user.id) {
        res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
        return;
      }
      // Only allow these customer transitions (accept, decline, withdraw/cancel, reschedule)
      const allowed = [
        'OFFER_ACCEPTED', 
        'OFFER_DECLINED', 
        'CANCELLED',  // Withdraw request
        'PENDING',    // Submit additional info when MORE_INFO_REQUIRED
        'INSPECTION_SCHEDULED',  // Request reschedule (stays in same status)
        'INSPECTION_RESCHEDULE_REQUESTED',  // Request reschedule (new status)
      ];
      if (!allowed.includes(status)) {
        res.status(403).json({ success: false, message: 'Customers cannot perform this status change' } as APIResponseType);
        return;
      }
    }

    // Agents can update inspection-related statuses only for assigned requests
    if (Array.isArray(user.roles) && user.roles.includes(ROLES.AGENT)) {
      if (request.assignedAgentId !== user.id) {
        res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
        return;
      }
      // Agents can perform these status changes (all inspection-related)
      const allowed = [
        'INSPECTION_IN_PROGRESS',
        'INSPECTION_COMPLETED',
        'INSPECTION_SCHEDULED',  // Reschedule
        'CUSTOMER_NOT_AVAILABLE',
        'ASSET_MISMATCH',
        'AGENT_NOT_AVAILABLE',
        'APPROVED',
        'REJECTED',
      ];
      if (!allowed.includes(status) && !isSuper) {
        res.status(403).json({ success: false, message: 'Agents cannot perform this status change' } as APIResponseType);
        return;
      }
    }

    // District admin can update most workflow statuses if they have district access
    if (Array.isArray(user.roles) && user.roles.includes(ROLES.DISTRICT_ADMIN) && !isSuper) {
      if (!hasDistrictAccess(user, request.district)) {
        res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
        return;
      }
    }

    // If none of the above and not super-admin, forbid
    if (!isSuper && !(Array.isArray(user.roles) && (user.roles.includes(ROLES.CUSTOMER) || user.roles.includes(ROLES.AGENT) || user.roles.includes(ROLES.DISTRICT_ADMIN)))) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    const fromStatus = request.currentStatus;
    const toStatus = status;

    // Use the actual DB id (not requestNumber) for updates
    const dbId = request.id;

    // Persist the status change and create a history entry using the target status as the action
    // This makes history entries explicit (e.g., 'OFFER_REJECTED', 'OFFER_ACCEPTED') instead of a generic 'STATUS_UPDATED'.
    const [updatedRequest, historyEntry] = await prisma.$transaction([
      prisma.request.update({ where: { id: dbId }, data: { currentStatus: toStatus } }),
      prisma.requestHistory.create({ data: { requestId: dbId, actorId: user.id, action: String(toStatus), metadata: { fromStatus, toStatus, note } } })
    ]);

    // Return the full request including history/comments/documents so clients have the complete audit trail
    const fullRequest = await prisma.request.findUnique({
      where: { id: dbId },
      include: {
        documents: true,
        requestHistory: { orderBy: { createdAt: 'asc' } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
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
    // Notify customer about status change (best-effort)
    try {
      const customer = await prisma.user.findUnique({ where: { id: updatedRequest.customerId } });
      if (customer) {
        await queueClient.addAJob(TEMPLATE_NAMES.LOGIN_ALERT, {
          email: customer.email || '',
          phoneNumber: customer.phoneNumber || '',
          customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer',
          device: `Request status updated to ${toStatus}`,
          location: updatedRequest.district,
          time: new Date().toISOString(),
          supportUrl: 'https://fundifyhub.example/support',
          resetPasswordUrl: 'https://fundifyhub.example/support',
          companyName: 'FundifyHub'
        }, { services: [SERVICE_NAMES.EMAIL, SERVICE_NAMES.WHATSAPP] });
      }
    } catch (e) {
      logger.error('Failed to enqueue status notification', e as Error);
    }

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
    const { amount, tenureMonths, interestRate, notes } = req.body as { amount?: number; tenureMonths?: number; interestRate?: number; notes?: string };

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

    const [updatedRequest, historyEntry] = await prisma.$transaction([
      prisma.request.update({ where: { id: dbId }, data: { adminOfferedAmount: amount, adminTenureMonths: tenureMonths, adminInterestRate: interestRate, offerMadeDate: new Date(), currentStatus: toStatus, adminEmiSchedule: emiSnapshot } }),
      prisma.requestHistory.create({ data: { requestId: dbId, actorId: user.id, action: 'OFFER_CREATED', metadata: { fromStatus, toStatus, amount, tenureMonths, interestRate, notes } } })
    ]);

    // Return full request with relations so client sees the complete audit trail immediately
    const fullRequest = await prisma.request.findUnique({
      where: { id: dbId },
      include: {
        documents: true,
        requestHistory: { orderBy: { createdAt: 'asc' } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
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

    // Notify customer about the offer (best-effort)
    try {
      const customer = await prisma.user.findUnique({ where: { id: updatedRequest.customerId } });
      if (customer) {
        const assetName = `${updatedRequest.assetBrand || ''} ${updatedRequest.assetModel || ''}`.trim() || updatedRequest.assetType || 'Asset';
        await queueClient.addAJob(TEMPLATE_NAMES.ASSET_PLEDGE, {
          customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer',
          assetName,
          amount: Number(amount),
          district: updatedRequest.district,
          requestId: updatedRequest.id,
          companyName: 'FundifyHub',
          timestamp: new Date().toISOString(),
          email: customer.email || undefined,
          phoneNumber: customer.phoneNumber || undefined,
          adminDashboardUrl: 'https://admin.fundifyhub.example/requests/' + updatedRequest.id,
          supportUrl: 'https://fundifyhub.example/support'
        }, { services: [SERVICE_NAMES.EMAIL] });
      }
    } catch (e) {
      logger.error('Failed to enqueue offer notification', e as Error);
    }

  res.status(200).json({ success: true, message: 'Offer created', data: { request: fullRequest, history: historyEntry } } as APIResponseType);
  } catch (error) {
    logger.error('createOfferController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to create offer' } as APIResponseType);
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

    // Validate status: require offer accepted and inspection/signature flows completed.
    // For flexibility allow confirmation when status is OFFER_ACCEPTED, INSPECTION_COMPLETED, or APPROVED
    const allowedStatuses = [REQUEST_STATUS.OFFER_ACCEPTED, REQUEST_STATUS.INSPECTION_COMPLETED, REQUEST_STATUS.APPROVED];
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

      // create EMISchedule rows
      for (const r of (emiCalc).emiSchedule) {
        await tx.eMISchedule.create({ data: {
          loanId: createdLoan.id,
          requestId: request.id,
          emiNumber: r.installment,
          dueDate: new Date(r.paymentDate),
          emiAmount: r.paymentAmount,
          principalAmount: r.principal,
          interestAmount: r.interest,
          status: 'PENDING'
        } });
      }

      // Update request status to PROCESSING_LOAN (or APPROVED depending on business rules)
      await tx.request.update({ where: { id: request.id }, data: { currentStatus: REQUEST_STATUS.PROCESSING_LOAN } });

      // Create history entry
      await tx.requestHistory.create({ data: { requestId: request.id, actorId: user.id, action: 'LOAN_CREATED', metadata: { loanId: createdLoan.id } } });
    });

    res.status(200).json({ success: true, message: 'Loan created', data: { loan: createdLoan } } as APIResponseType);
    return;
  } catch (error) {
    logger.error('confirmOfferController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to confirm offer and create loan' } as APIResponseType);
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
