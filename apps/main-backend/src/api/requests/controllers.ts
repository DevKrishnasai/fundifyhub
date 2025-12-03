import { Request, Response } from 'express';
import { prisma, EMIStatus, Prisma, RequestStatus } from '@fundifyhub/prisma';
import baseLogger from '../../utils/logger';

const logger = baseLogger.child('[RequestsController]');
import { generateLoanNumber } from '../../utils/serial';
import { 
  APIResponseType, 
  isAuthenticated, 
  type CommentWithAuthor, 
  type DocumentWithUrl,
  type RequestDetailWithLoan,
  type EMIScheduleItem,
  type EMIWithBreakdown,
  type AdminEmiScheduleSnapshot,
  type NormalizedEmiData,
  isAdminEmiScheduleSnapshot,
  normalizeAdminSnapshot,
  normalizeEmiCalcResult
} from '../../types';
import { hasAnyRole, hasDistrictAccess } from '../../utils/rbac';
import { calculateEmiSchedule, calculateEmiBreakdown, isEmiOverdue, type EMIBreakdown } from '@fundifyhub/utils';
import { auditRequest, auditInspection, auditOffer, createAuditLog } from '../../utils/audit';
import { sendRequestStatusNotification } from '../../utils/notifications';
import { emitRequestStatusChanged, emitRequestUpdated, emitUserNotification, emitRequestCommentAdded, emitRequestDocumentUploaded } from '../../utils/socket-client';
import { 
  ROLES, 
  DOCUMENT_UPLOADER_ROLE,
  DOCUMENT_TYPE,
  DOCUMENT_CATEGORY,
  DOCUMENT_TYPE_TO_CATEGORY,
  EMI_STATUS,
  OVERDUE_GRACE_PERIOD_DAYS,
  REQUEST_STATUS, 
  AGENT_ACCESS_DENY_STATUSES,
  CUSTOMER_ALLOWED_STATUSES,
  AGENT_ALLOWED_STATUSES,
  LOAN_CREATION_ALLOWED_STATUSES,
  DEFAULT_PENALTY_PERCENTAGE,
  DEFAULT_LATE_FEE_PERCENTAGE,
  AUDIT_ENTITY_TYPE,
  AUDIT_ACTION,
  REQUEST_HISTORY_ACTION,
  canViewRequestDetail,
  type UserRole
} from '@fundifyhub/types';
import config from '../../utils/config';
import { generateSignedUrl, generateSignedUrls } from '../../utils/uploadthing';
import { CLIENT_CONSTANTS } from '@fundifyhub/types';

/**
 * GET /requests/:id
 * Returns request detail including documents.
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
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } },
        assignedAgent: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
        assignedAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
        comments: { select: { id: true, content: true, createdAt: true, authorId: true, isInternal: true, author: { select: { id: true, firstName: true, lastName: true, roles: true } } } },
        loan: {
          include: {
            emisSchedule: {
              select: { id: true, emiNumber: true, dueDate: true, emiAmount: true, principalAmount: true, interestAmount: true, status: true, paidDate: true, paidAmount: true, lateFee: true },
              orderBy: { emiNumber: 'asc' }
            },
            paymentOrders: {
              select: { 
                id: true, 
                razorpayOrderId: true, 
                emiScheduleId: true, 
                emiAmount: true,
                penalty: true,
                totalAmount: true,
                status: true, 
                razorpayPaymentId: true,
                failureReason: true,
                failureCode: true,
                attempts: true,
                createdAt: true, 
                updatedAt: true,
                paidAt: true
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    // Build the response with optional EMI breakdown calculations
    let responseRequest = request as typeof request & { 
      requestHistory?: typeof requestHistory;
      loan?: typeof request.loan & { emisSchedule?: EMIWithBreakdown[] };
    };

    if (request.loan && request.loan.emisSchedule) {
      const emis = request.loan.emisSchedule;
      const loanId = request.loan.id;
      const penaltyRate = request.penaltyPercentage ?? DEFAULT_PENALTY_PERCENTAGE;
      const lateFeeRate = request.lateFeePercentage ?? DEFAULT_LATE_FEE_PERCENTAGE;
      const emisToUpdate: Array<{ id: string; status: EMIStatus; lateFee: number }> = [];
      
      // Add breakdown data to each EMI
      const emisWithBreakdown = emis.map((emi: EMIScheduleItem) => {
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
              emis.map((e: EMIScheduleItem) => ({
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
                status: EMI_STATUS.OVERDUE as EMIStatus,
                lateFee: breakdown.lateFee
              });
            } else if (breakdown.lateFee !== (emi.lateFee || 0) && breakdown.lateFee > 0) {
              // Update lateFee if it has changed
              emisToUpdate.push({
                id: emi.id,
                status: (shouldBeOverdue ? EMI_STATUS.OVERDUE : emi.status) as EMIStatus,
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
        } as EMIWithBreakdown;
      });

      // Update the response with EMI breakdowns
      responseRequest = {
        ...request,
        loan: {
          ...request.loan,
          emisSchedule: emisWithBreakdown
        }
      };
      
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

    // Fetch audit logs and map to request history
    // Include REQUEST, OFFER, and INSPECTION entity types for complete history
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityId: request.id,
        entityType: {
          in: [AUDIT_ENTITY_TYPE.REQUEST, AUDIT_ENTITY_TYPE.OFFER, AUDIT_ENTITY_TYPE.INSPECTION]
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            roles: true
          }
        }
      }
    });

    // Map audit logs to request history
    const requestHistory = auditLogs.map(log => {
      let action = log.action;
      // Map audit actions to request history actions where they differ
      if (log.action === AUDIT_ACTION.REQUEST_STATUS_CHANGED) action = REQUEST_HISTORY_ACTION.STATUS_UPDATED;
      else if (log.action === AUDIT_ACTION.AGENT_ASSIGNED) action = REQUEST_HISTORY_ACTION.ASSIGNED_AGENT;
      else if (log.action === AUDIT_ACTION.ADMIN_ASSIGNED) action = REQUEST_HISTORY_ACTION.ADMIN_ASSIGNED;
      else if (log.action === AUDIT_ACTION.OFFER_CREATED) action = REQUEST_HISTORY_ACTION.OFFER_CREATED;
      else if (log.action === AUDIT_ACTION.OFFER_ACCEPTED) action = 'OFFER_ACCEPTED';
      else if (log.action === AUDIT_ACTION.OFFER_DECLINED) action = 'OFFER_DECLINED';
      else if (log.action === AUDIT_ACTION.DOCUMENT_UPLOADED) action = REQUEST_HISTORY_ACTION.DOCUMENT_UPLOADED;
      else if (log.action === AUDIT_ACTION.INSPECTION_SCHEDULED) action = 'INSPECTION_SCHEDULED';
      else if (log.action === AUDIT_ACTION.INSPECTION_COMPLETED) action = REQUEST_HISTORY_ACTION.INSPECTION_COMPLETED;
      
      return {
        id: log.id,
        requestId: request.id,
        actorId: log.actorId || 'system',
        action: action,
        metadata: log.metadata || log.newValue || log.previousValue || {},
        createdAt: log.createdAt,
        actor: log.actor
      };
    });

    // Add request history to the response object
    const requestWithHistory = request as typeof request & { requestHistory?: typeof requestHistory };
    requestWithHistory.requestHistory = requestHistory;

    const user = req.user;
    if (!isAuthenticated(user)) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    // Check if user can view this request
    const canView = canViewRequestDetail(
      {
        id: user.id,
        roles: user.roles as UserRole[],
        districts: user.districts
      },
      {
        customerId: request.customerId,
        district: request.district,
        agentId: request.assignedAgentId,
        adminId: request.assignedAdminId
      },
      request.currentStatus as REQUEST_STATUS
    );

    if (!canView) {
      res.status(403).json({ success: false, message: 'Access denied to this request' } as APIResponseType);
      return;
    }

    // Build final response - start with the base response
    // We'll construct an enriched response object for the API
    const finalResponse: Record<string, unknown> = { ...responseRequest };

    // Filter internal comments for customers
    if (request.comments) {
      const isCustomer = user.roles.includes(ROLES.CUSTOMER);
      if (isCustomer) {
        finalResponse.comments = request.comments.filter((c) => !c.isInternal);
      }
    }
      
    // Generate signed URLs for documents
    if (request.documents && request.documents.length > 0) {
      const docs = request.documents;
      const fileKeys = docs.map((d) => d.fileKey).filter(Boolean);
      if (fileKeys.length > 0) {
        try {
          const signedUrls = await generateSignedUrls(fileKeys, CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT);
          const urlMap = new Map(signedUrls.map(s => [s.fileKey, s.url]));
          const docsWithUrls: DocumentWithUrl[] = docs.map((d) => ({
            id: d.id,
            fileKey: d.fileKey,
            fileName: d.fileName,
            fileType: d.fileType,
            fileSize: d.fileSize,
            documentType: d.documentType,
            documentCategory: d.documentCategory,
            url: urlMap.get(d.fileKey) || null,
          }));
          finalResponse.documents = docsWithUrls;
        } catch (err) {
          logger.warn('Failed to generate signed URLs for documents', { error: String(err) });
          // Continue without URLs if signing fails
        }
      }
    }

    // Add request history
    finalResponse.requestHistory = requestHistory;
      
    res.status(200).json({ success: true, message: 'Request retrieved', data: { request: finalResponse } } as APIResponseType);
    return;
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

    const user = req.user;
    if (!isAuthenticated(user)) {
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

    const updateData: Prisma.RequestUpdateInput = { 
      assignedAgent: { connect: { id: agentId } }, 
      currentStatus: toStatus 
    };
    
    // If date-only is passed, store as midnight UTC for that date.
    if (inspectionDate) {
      try {
        // Normalize to a full ISO instant at UTC midnight for the provided date
        updateData.inspectionScheduledAt = new Date(`${inspectionDate}T00:00:00.000Z`);
      } catch {
        // Fallback: try plain Date parse
        updateData.inspectionScheduledAt = new Date(inspectionDate);
      }
    }

    // perform update atomically
    const updatedRequest = await prisma.request.update({ where: { id: dbId }, data: updateData });

    // Fetch full request with relations
    const fullRequest = await prisma.request.findUnique({
      where: { id: dbId },
      include: {
        documents: true,
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } },
        comments: { select: { id: true, content: true, createdAt: true, authorId: true, isInternal: true, author: { select: { id: true, firstName: true, lastName: true, roles: true } } } },
      }
    });

    // Send notification to customer about inspection scheduling
    if (fullRequest?.customer) {
      sendRequestStatusNotification(
        {
          userId: fullRequest.customer.id,
          email: fullRequest.customer.email || undefined,
          phoneNumber: fullRequest.customer.phoneNumber || undefined,
          name: fullRequest.customer.firstName || undefined,
        },
        {
          requestId: fullRequest.requestNumber || dbId,
          currentStatus: toStatus,
          previousStatus: fromStatus,
          header: 'Inspection Scheduled',
          description: `Your loan request has been assigned to an agent. The inspection has been scheduled${inspectionDate ? ` for ${inspectionDate}` : ''}.`,
          footer: 'Our agent will contact you soon.',
        }
      ).catch(err => logger.error('Failed to send inspection scheduled notification', err as Error));
    }

    // Audit the agent assignment
    auditInspection.agentAssigned(req, dbId, agentId, agent.email).catch(() => {});

    // Emit socket event for real-time update
    // Use requestNumber for the room name since frontend joins using that
    emitRequestStatusChanged({
      requestId: fullRequest?.requestNumber || dbId,
      previousStatus: fromStatus as REQUEST_STATUS,
      newStatus: toStatus,
      changedBy: {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin',
        role: user.roles?.[0] || 'ADMIN',
      },
      reason: `Agent ${agent.firstName || ''} ${agent.lastName || ''} assigned`,
    });

    // Notify customer about inspection scheduling
    if (fullRequest?.customer) {
      emitUserNotification({
        userId: fullRequest.customer.id,
        type: 'info',
        title: 'Inspection Scheduled',
        message: `Your loan request has been assigned to an agent.${inspectionDate ? ` Inspection scheduled for ${inspectionDate}.` : ''}`,
        data: { requestId: fullRequest.requestNumber || dbId },
      });
    }

  res.status(200).json({ success: true, message: 'Agent assigned', data: { request: fullRequest } } as APIResponseType);
  } catch (error) {
    logger.error('assignAgentController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to assign agent' } as APIResponseType);
  }
}

/**
 * POST /requests/:id/self-assign
 * District admin self-assigns to a request in their district.
 * Only works if request is not already assigned to another admin.
 */
export async function selfAssignAdminController(req: Request, res: Response): Promise<void> {
  try {
    const requestId = req.params.id;

    if (!requestId) {
      res.status(400).json({ success: false, message: 'request id required' } as APIResponseType);
      return;
    }

    const user = req.user;
    if (!isAuthenticated(user)) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    // Allow lookup by DB id or by human-friendly requestNumber
    const request = await prisma.request.findFirst({ 
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] } 
    });
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    // Only DISTRICT_ADMIN or SUPER_ADMIN can self-assign
    const isSuper = user.roles.includes(ROLES.SUPER_ADMIN);
    const isDistrictAdmin = user.roles.includes(ROLES.DISTRICT_ADMIN);
    
    if (!isSuper && !isDistrictAdmin) {
      res.status(403).json({ success: false, message: 'Only admins can self-assign to requests' } as APIResponseType);
      return;
    }

    // District admin must have access to the request's district
    if (!isSuper && !hasDistrictAccess(user, request.district)) {
      res.status(403).json({ success: false, message: 'You do not have access to this district' } as APIResponseType);
      return;
    }

    // Check if request is already assigned to another admin
    if (request.assignedAdminId && request.assignedAdminId !== user.id) {
      res.status(400).json({ success: false, message: 'Request is already assigned to another admin' } as APIResponseType);
      return;
    }

    // If already assigned to this admin, just return success
    if (request.assignedAdminId === user.id) {
      const fullRequest = await prisma.request.findUnique({
        where: { id: request.id },
        include: {
          documents: true,
          customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } },
          assignedAgent: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
          assignedAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
          comments: { select: { id: true, content: true, createdAt: true, authorId: true, isInternal: true, author: { select: { id: true, firstName: true, lastName: true, roles: true } } } },
        }
      });
      res.status(200).json({ success: true, message: 'Already assigned to you', data: { request: fullRequest } } as APIResponseType);
      return;
    }

    // Self-assign the request
    const dbId = request.id;
    await prisma.request.update({ 
      where: { id: dbId }, 
      data: { assignedAdminId: user.id } 
    });

    // Fetch full request with relations
    const fullRequest = await prisma.request.findUnique({
      where: { id: dbId },
      include: {
        documents: true,
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } },
        assignedAgent: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
        assignedAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
        comments: { select: { id: true, content: true, createdAt: true, authorId: true, isInternal: true, author: { select: { id: true, firstName: true, lastName: true, roles: true } } } },
      }
    });

    // Audit the self-assignment
    createAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRoles: user.roles,
      action: AUDIT_ACTION.ADMIN_ASSIGNED || 'ADMIN_ASSIGNED',
      entityType: AUDIT_ENTITY_TYPE.REQUEST,
      entityId: request.id,
      description: `Admin self-assigned to request`,
      metadata: {
        adminId: user.id,
        adminEmail: user.email,
        requestNumber: request.requestNumber,
      },
    }).catch(() => {});

    // Emit real-time update
    emitRequestUpdated({
      requestId: fullRequest?.requestNumber || dbId,
      field: 'assignedAdminId',
      oldValue: null,
      newValue: user.id,
      message: `Admin ${user.firstName || ''} ${user.lastName || ''} assigned to request`,
      updatedBy: {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin',
        role: user.roles?.[0] || 'ADMIN',
      },
    });

    logger.info(`Admin ${user.id} self-assigned to request ${request.requestNumber}`);

    res.status(200).json({ success: true, message: 'Successfully assigned to request', data: { request: fullRequest } } as APIResponseType);
  } catch (error) {
    logger.error('selfAssignAdminController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to self-assign to request' } as APIResponseType);
  }
}

/**
 * POST /requests/:id/assign-admin
 * Body: { adminId: string }
 * Super admin assigns a district admin to handle a request.
 * Only SUPER_ADMIN can use this endpoint.
 */
export async function assignAdminController(req: Request, res: Response): Promise<void> {
  try {
    const requestId = req.params.id;
    const { adminId } = req.body as { adminId?: string };

    if (!requestId || !adminId) {
      res.status(400).json({ success: false, message: 'request id and adminId required' } as APIResponseType);
      return;
    }

    const user = req.user;
    if (!isAuthenticated(user)) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    // Only SUPER_ADMIN can assign admins
    const isSuper = user.roles.includes(ROLES.SUPER_ADMIN);
    if (!isSuper) {
      res.status(403).json({ success: false, message: 'Only super admins can assign district admins' } as APIResponseType);
      return;
    }

    // Fetch request
    const request = await prisma.request.findFirst({ 
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] } 
    });
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    // Validate the admin being assigned
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || !Array.isArray(admin.roles) || !admin.roles.includes(ROLES.DISTRICT_ADMIN) || !admin.isActive) {
      res.status(400).json({ success: false, message: 'Invalid admin or admin is not active' } as APIResponseType);
      return;
    }

    // Check that admin has access to the request's district
    if (!Array.isArray(admin.district) || !admin.district.includes(request.district)) {
      res.status(400).json({ success: false, message: 'Admin does not have access to this district' } as APIResponseType);
      return;
    }

    // Assign the admin
    const dbId = request.id;
    await prisma.request.update({ 
      where: { id: dbId }, 
      data: { assignedAdminId: adminId } 
    });

    // Fetch full request with relations
    const fullRequest = await prisma.request.findUnique({
      where: { id: dbId },
      include: {
        documents: true,
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } },
        assignedAgent: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
        assignedAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
        comments: { select: { id: true, content: true, createdAt: true, authorId: true, isInternal: true, author: { select: { id: true, firstName: true, lastName: true, roles: true } } } },
      }
    });

    // Audit the assignment
    createAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRoles: user.roles,
      action: AUDIT_ACTION.ADMIN_ASSIGNED || 'ADMIN_ASSIGNED',
      entityType: AUDIT_ENTITY_TYPE.REQUEST,
      entityId: request.id,
      description: `Admin assigned to request by super admin`,
      metadata: {
        adminId,
        adminEmail: admin.email,
        requestNumber: request.requestNumber,
        assignedBy: user.id,
      },
    }).catch(() => {});

    // Emit real-time update
    emitRequestUpdated({
      requestId: fullRequest?.requestNumber || dbId,
      field: 'assignedAdminId',
      oldValue: request.assignedAdminId || null,
      newValue: adminId,
      message: `Admin ${admin.firstName || ''} ${admin.lastName || ''} assigned to request`,
      updatedBy: {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Super Admin',
        role: ROLES.SUPER_ADMIN,
      },
    });

    logger.info(`Super admin ${user.id} assigned admin ${adminId} to request ${request.requestNumber}`);

    res.status(200).json({ success: true, message: 'Admin assigned successfully', data: { request: fullRequest } } as APIResponseType);
  } catch (error) {
    logger.error('assignAdminController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to assign admin' } as APIResponseType);
  }
}

/**
 * GET /requests/admins/:district
 * Get list of available district admins in a specific district
 * Returns only active district admins who have access to the specified district
 * Only SUPER_ADMIN can use this endpoint.
 */
export async function getAvailableAdminsController(req: Request, res: Response): Promise<void> {
  try {
    const district = req.params.district;
    if (!district) {
      res.status(400).json({ success: false, message: 'District is required' } as APIResponseType);
      return;
    }

    const user = req.user;
    if (!isAuthenticated(user)) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    // Only super admins can fetch admin lists for assignment
    const isSuper = user.roles.includes(ROLES.SUPER_ADMIN);
    if (!isSuper) {
      res.status(403).json({ success: false, message: 'Only super admins can view district admin lists' } as APIResponseType);
      return;
    }

    // Fetch all active district admins who have access to this district
    const admins = await prisma.user.findMany({
      where: {
        roles: { has: ROLES.DISTRICT_ADMIN },
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
      message: 'Admins fetched successfully', 
      data: { admins, district, count: admins.length } 
    } as APIResponseType);
  } catch (error) {
    logger.error('getAvailableAdminsController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to fetch available admins' } as APIResponseType);
  }
}


/**
 * POST /requests/:id/status
 * Body: { status: string, note?: string }
 * Updates request status and logs to AuditLog.
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

    // Persist the status change
    // perform status update atomically
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Prepare update payload. We only clear assignment when a reschedule is requested.
      // Historically we cleared assignedAgentId on CANCELLED/REJECTED; that removed the persisted association.
      // New behaviour: preserve assignedAgentId on CANCELLED/REJECTED (so assignment is auditable), but clear it when
      // a reschedule is requested (agent should be unassigned while customer picks a new date).
      const updatePayload: Prisma.RequestUpdateInput = { currentStatus: toStatus as RequestStatus };
      if (toStatus === REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED) {
        // Revoke assignment and clear scheduled date for reschedule requests
        updatePayload.assignedAgent = { disconnect: true };
        updatePayload.inspectionScheduledAt = null;
      }

      // Persist update
      const u = await tx.request.update({ where: { id: dbId }, data: updatePayload });

      // Normalize metadata for MORE_INFO_REQUIRED to a structured AdminRequestedInfoMetadata
      interface StatusChangeMetadata {
        fromStatus: string;
        toStatus: string;
        requestedBy?: string;
        requestedByName?: string | null;
        note?: string | null;
        message?: string | null;
        requestedInspectionAt?: string | null;
        previousAssignedAgentId?: string | null;
      }
      let metadata: StatusChangeMetadata = { fromStatus, toStatus };
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
      } catch {
        // ignore metadata enrichment failures
      }

      return u;
    });

    let finalRequest = updatedRequest;
    if (toStatus === REQUEST_STATUS.APPROVED) {
      finalRequest = await prisma.request.update({ 
        where: { id: dbId }, 
        data: { currentStatus: REQUEST_STATUS.PENDING_SIGNATURE } 
      });
    }

    // Return the full request including comments/documents
    const fullRequest = await prisma.request.findUnique({
      where: { id: dbId },
      include: {
        documents: true,
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } },
        comments: { select: { id: true, content: true, createdAt: true, authorId: true, isInternal: true, author: { select: { id: true, firstName: true, lastName: true, roles: true } } } },
      }
    });

    // Send status change notification to customer
    if (fullRequest?.customer) {
      const statusMessages: Record<string, { header: string; description: string; footer: string }> = {
        [REQUEST_STATUS.MORE_INFO_REQUIRED]: {
          header: 'More Information Required',
          description: `We need additional information for your loan request. ${note || 'Please check the request details.'}`,
          footer: 'Please provide the requested information to proceed.',
        },
        [REQUEST_STATUS.REJECTED]: {
          header: 'Request Rejected',
          description: `Your loan request has been rejected. ${note || ''}`,
          footer: 'Contact support for more information.',
        },
        [REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED]: {
          header: 'Inspection Reschedule Requested',
          description: 'You have requested to reschedule the inspection. We will contact you soon with new options.',
          footer: 'Thank you for your patience.',
        },
        [REQUEST_STATUS.OFFER_ACCEPTED]: {
          header: 'Offer Accepted',
          description: 'You have accepted the loan offer. The next step is to complete the inspection.',
          footer: 'Thank you for choosing FundifyHub.',
        },
        [REQUEST_STATUS.OFFER_DECLINED]: {
          header: 'Offer Declined',
          description: 'You have declined the loan offer.',
          footer: 'You can submit a new request anytime.',
        },
      };

      const msg = statusMessages[toStatus] || {
        header: 'Request Status Updated',
        description: `Your request status has changed from ${fromStatus} to ${toStatus}.${note ? ` Note: ${note}` : ''}`,
        footer: 'Check your dashboard for details.',
      };

      sendRequestStatusNotification(
        {
          userId: fullRequest.customer.id,
          email: fullRequest.customer.email || undefined,
          phoneNumber: fullRequest.customer.phoneNumber || undefined,
          name: fullRequest.customer.firstName || undefined,
        },
        {
          requestId: fullRequest.requestNumber || dbId,
          currentStatus: toStatus,
          previousStatus: fromStatus,
          header: msg.header,
          description: msg.description,
          footer: msg.footer,
          updatedBy: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin',
        }
      ).catch(err => logger.error('Failed to send status change notification', err as Error));
    }

    // Audit the status change
    auditRequest.statusChanged(req, dbId, fromStatus, toStatus, note).catch(() => {});

    // Emit socket event for real-time update
    // Use requestNumber for the room name since frontend joins using that
    emitRequestStatusChanged({
      requestId: fullRequest?.requestNumber || dbId,
      previousStatus: fromStatus as REQUEST_STATUS,
      newStatus: toStatus as REQUEST_STATUS,
      changedBy: {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
        role: user.roles?.[0] || 'USER',
      },
      reason: note,
    });

    // Send real-time notification to customer if they're not the one making the change
    if (fullRequest?.customer && fullRequest.customer.id !== user.id) {
      emitUserNotification({
        userId: fullRequest.customer.id,
        type: 'info',
        title: 'Request Status Updated',
        message: `Your request status has changed from ${fromStatus} to ${toStatus}.`,
        data: { requestId: dbId, status: toStatus },
      });
    }

    // Note: Loan + EMISchedule creation is deferred to the dedicated confirm endpoint
    // (POST /requests/:id/offers/:offerId/confirm) after inspection and e-sign are completed.

  res.status(200).json({ success: true, message: 'Status updated', data: { request: fullRequest } } as APIResponseType);
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

    const user = req.user;
    if (!isAuthenticated(user)) {
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

    const isSuper = user.roles.includes(ROLES.SUPER_ADMIN);
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

    // Create offer entry transactionally
    const updatedRequest = await prisma.$transaction(async (tx) => {
      const u = await tx.request.update({
        where: { id: dbId },
        data: {
          adminOfferedAmount: amount,
          adminTenureMonths: tenureMonths,
          adminInterestRate: interestRate,
          penaltyPercentage: penaltyRate,
          lateFeePercentage: lateFeeRate,
          adminProcessingFee: typeof processingFee === 'number' ? processingFee : 0,
          offerMadeDate: new Date(),
          currentStatus: toStatus,
          adminEmiSchedule: emiSnapshot,
        },
      });
      return u;
    });

    // Return full request with relations so client sees the complete audit trail immediately
    const fullRequest = await prisma.request.findUnique({
      where: { id: dbId },
      include: {
        documents: true,
  customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } },
        comments: { select: { id: true, content: true, createdAt: true, authorId: true, isInternal: true, author: { select: { id: true, firstName: true, lastName: true, roles: true } } } },
      }
    });

    // Send offer notification to customer
    if (fullRequest?.customer) {
      sendRequestStatusNotification(
        {
          userId: fullRequest.customer.id,
          email: fullRequest.customer.email || undefined,
          phoneNumber: fullRequest.customer.phoneNumber || undefined,
          name: fullRequest.customer.firstName || undefined,
        },
        {
          requestId: fullRequest.requestNumber || dbId,
          currentStatus: toStatus,
          previousStatus: fromStatus,
          header: 'Loan Offer Received',
          description: `Congratulations! We have sent you a loan offer of ₹${amount.toLocaleString('en-IN')} at ${interestRate}% interest for ${tenureMonths} months.`,
          footer: 'Please review the offer and respond within 7 days.',
        }
      ).catch(err => logger.error('Failed to send offer notification', err as Error));

      // Emit socket events for real-time updates
      // Use requestNumber for the room name since frontend joins using that
      emitRequestStatusChanged({
        requestId: fullRequest.requestNumber || dbId,
        previousStatus: fromStatus as REQUEST_STATUS,
        newStatus: toStatus,
        changedBy: {
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin',
          role: user.roles?.[0] || 'ADMIN',
        },
        reason: notes,
      });

      emitUserNotification({
        userId: fullRequest.customer.id,
        type: 'success',
        title: 'New Loan Offer!',
        message: `You have received a loan offer of ₹${amount.toLocaleString('en-IN')} at ${interestRate}% interest.`,
        data: { requestId: fullRequest.requestNumber || dbId, amount, tenureMonths, interestRate },
      });
    }

    // Audit the offer creation
    auditOffer.created(req, dbId, {
      amount,
      tenureMonths,
      interestRate,
      penaltyPercentage: penaltyRate,
      lateFeePercentage: lateFeeRate,
      processingFee: processingFee || 0,
      fromStatus,
      toStatus,
    }).catch(() => {});

  res.status(200).json({ success: true, message: 'Offer created', data: { request: fullRequest } } as APIResponseType);
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

    const user = req.user;
    if (!isAuthenticated(user)) {
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

    const isSuper = user.roles.includes(ROLES.SUPER_ADMIN);
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
        amount: request.adminOfferedAmount ?? null,
        tenureMonths: request.adminTenureMonths ?? null,
        interestRate: request.adminInterestRate ?? null,
        penaltyPercentage: request.penaltyPercentage ?? DEFAULT_PENALTY_PERCENTAGE,
        lateFeePercentage: request.lateFeePercentage ?? DEFAULT_LATE_FEE_PERCENTAGE,
        processingFee: request.adminProcessingFee ?? null,
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
    const { amount: amountQ, tenureMonths: tenureQ, interestRate: rateQ } = req.query as Record<string, string | undefined>;

    const amount = Number(amountQ);
    const tenureMonths = Number(tenureQ);
    const interestRate = Number(rateQ);

    if (!requestId || Number.isNaN(amount) || Number.isNaN(tenureMonths) || Number.isNaN(interestRate)) {
      res.status(400).json({ success: false, message: 'request id, amount, tenureMonths, interestRate required' } as APIResponseType);
      return;
    }

    const user = req.user;
    if (!isAuthenticated(user)) {
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

    const isSuper = user.roles.includes(ROLES.SUPER_ADMIN);
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

    const user = req.user;
    if (!isAuthenticated(user)) {
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

    const isSuper = user.roles.includes(ROLES.SUPER_ADMIN);
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
    const existingLoan = await prisma.loan.findUnique({ where: { requestId: request.id } });
    if (existingLoan) {
      res.status(200).json({ success: true, message: 'Loan already exists', data: { loan: existingLoan } } as APIResponseType);
      return;
    }

    // Use stored snapshot or fall back to admin offer fields - normalize to common format
    let emiData: NormalizedEmiData;
    if (isAdminEmiScheduleSnapshot(request.adminEmiSchedule)) {
      emiData = normalizeAdminSnapshot(request.adminEmiSchedule);
    } else if (request.adminOfferedAmount && request.adminInterestRate && request.adminTenureMonths) {
      const calcResult = calculateEmiSchedule({ principal: Number(request.adminOfferedAmount), annualRate: Number(request.adminInterestRate), tenureMonths: Number(request.adminTenureMonths) });
      emiData = normalizeEmiCalcResult(calcResult);
    } else {
      res.status(400).json({ success: false, message: 'No EMI snapshot or admin offer fields available to create loan' } as APIResponseType);
      return;
    }

    // Create loan and emis schedule transactionally
    const createdLoan = await prisma.$transaction(async (tx) => {
      // Generate loan number
      const loanNumber = await generateLoanNumber(tx);
      
      const loan = await tx.loan.create({ data: {
        requestId: request.id,
        loanNumber,
        approvedAmount: Number(request.adminOfferedAmount) || Number(emiData.monthlyPayment * emiData.emiSchedule.length),
        interestRate: Number(request.adminInterestRate) || 0,
        tenureMonths: Number(request.adminTenureMonths) || emiData.emiSchedule.length,
        emiAmount: Number(emiData.monthlyPayment) || 0,
        totalInterest: Number(emiData.totalInterest) || 0,
        totalAmount: Number(emiData.totalPayment) || 0,
        remainingAmount: Number(emiData.totalPayment) || 0,
        remainingEMIs: emiData.emiSchedule.length,
        approvedDate: new Date(),
        firstEMIDate: emiData.emiSchedule.length ? new Date(emiData.emiSchedule[0].paymentDate) : new Date(),
        lastEMIDate: emiData.emiSchedule.length ? new Date(emiData.emiSchedule[emiData.emiSchedule.length - 1].paymentDate) : new Date(),
      } });

      // Create EMI schedule entries
      for (const r of emiData.emiSchedule) {
        await tx.eMISchedule.create({ data: {
          loanId: loan.id,
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
      return loan;
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

    const user = req.user;
    if (!isAuthenticated(user)) {
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

    const isSuper = user.roles.includes(ROLES.SUPER_ADMIN);
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
      where: { requestId: request.id },
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

    // Use stored snapshot or fall back to admin offer fields - normalize to common format
    let emiData: NormalizedEmiData;
    
    if (isAdminEmiScheduleSnapshot(request.adminEmiSchedule)) {
      emiData = normalizeAdminSnapshot(request.adminEmiSchedule);
    } else if (request.adminOfferedAmount && request.adminInterestRate && request.adminTenureMonths) {
      const calcResult = calculateEmiSchedule({ 
        principal: Number(request.adminOfferedAmount), 
        annualRate: Number(request.adminInterestRate), 
        tenureMonths: Number(request.adminTenureMonths) 
      });
      emiData = normalizeEmiCalcResult(calcResult);
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'No EMI snapshot or admin offer fields available to create loan' 
      } as APIResponseType);
      return;
    }

    // Create loan and EMI schedule transactionally
    const createdLoan = await prisma.$transaction(async (tx) => {
      // Generate loan number
      const loanNumber = await generateLoanNumber(tx);
      
      // Create Loan record
      const loan = await tx.loan.create({ 
        data: {
          requestId: request.id,
          loanNumber,
          approvedAmount: Number(request.adminOfferedAmount) || Number(emiData.monthlyPayment * emiData.emiSchedule.length),
          interestRate: Number(request.adminInterestRate) || 0,
          tenureMonths: Number(request.adminTenureMonths) || emiData.emiSchedule.length,
          emiAmount: Number(emiData.monthlyPayment) || 0,
          totalInterest: Number(emiData.totalInterest) || 0,
          totalAmount: Number(emiData.totalPayment) || 0,
          status: 'ACTIVE',
          approvedDate: new Date(),
          disbursedDate: new Date(),
          firstEMIDate: emiData.emiSchedule.length ? new Date(emiData.emiSchedule[0].paymentDate) : new Date(),
          lastEMIDate: emiData.emiSchedule.length ? new Date(emiData.emiSchedule[emiData.emiSchedule.length - 1].paymentDate) : new Date(),
          remainingAmount: Number(emiData.totalPayment) || 0,
          remainingEMIs: emiData.emiSchedule.length,
        } 
      });

      // Create EMI schedule entries
      for (const r of emiData.emiSchedule) {
        await tx.eMISchedule.create({ 
          data: {
            loanId: loan.id,
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
      
      return loan;
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

    const user = req.user;
    if (!isAuthenticated(user)) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    // Only admins can fetch agent lists
    const isSuper = user.roles.includes(ROLES.SUPER_ADMIN);
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

    const user = req.user;
    if (!isAuthenticated(user)) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    // Fetch request with all necessary details
    const request = await prisma.request.findFirst({
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } },
        asset: true
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
    // Map adminEmiSchedule to LoanAgreementData format (field name translation)
    const emiSchedule = isAdminEmiScheduleSnapshot(request.adminEmiSchedule)
      ? request.adminEmiSchedule.emiSchedule.map(emi => ({
          installment: emi.emiNumber,
          paymentDate: emi.dueDate,
          paymentAmount: emi.emiAmount,
          principal: emi.principalAmount,
          interest: emi.interestAmount,
          balance: emi.outstandingPrincipal,
        }))
      : undefined;
    
    const agreementData = {
      requestNumber: request.requestNumber || request.id,
      customerName: `${request.customer?.firstName || ''} ${request.customer?.lastName || ''}`.trim() || 'Customer',
      customerEmail: request.customer?.email || '',
      customerPhone: request.customer?.phoneNumber || '',
      customerDistrict: request.district,
      
      assetType: request.asset?.assetType || 'Asset',
      assetBrand: request.asset?.brand,
      assetModel: request.asset?.model,
      
      approvedAmount: Number(request.adminOfferedAmount) || 0,
      tenureMonths: Number(request.adminTenureMonths) || 0,
      interestRate: Number(request.adminInterestRate) || 0,
      emiAmount: isAdminEmiScheduleSnapshot(request.adminEmiSchedule) ? Number(request.adminEmiSchedule.monthlyPayment) || 0 : 0,
      
      emiSchedule,
      
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
        // uploadthing's UTApi.uploadFiles expects a File-like object in server Node environments
        // Note: Buffer requires cast for File constructor in Node environment
        const nodeFile = new File([pdfBuffer as unknown as BlobPart], `loan-agreement-${request.requestNumber || request.id}.pdf`, { type: 'application/pdf' });
        const uploadResult = await utapi.uploadFiles(nodeFile);
        if (uploadResult.error) {
          logger.error('UploadThing upload failed for agreement preview:', { error: JSON.stringify(uploadResult.error) });
          res.status(500).json({ success: false, message: 'Failed to prepare agreement preview' } as APIResponseType);
          return;
        }

        const uploadedFile = uploadResult.data;

        // Generate signed URL for short preview time
        const { url } = await generateSignedUrl(uploadedFile.key, CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT);

        res.status(200).json({ success: true, data: { url } } as APIResponseType);
        return;
      } catch (err) {
        logger.error('Failed to create signed URL for agreement preview', err as Error);
        res.status(500).json({ success: false, message: 'Failed to generate agreement preview' } as APIResponseType);
        return;
      }
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
    const user = req.user;

    if (!isAuthenticated(user)) {
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
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } },
        asset: true
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
    // Map adminEmiSchedule to LoanAgreementData format (field name translation)
    const emiScheduleForAgreement = isAdminEmiScheduleSnapshot(request.adminEmiSchedule)
      ? request.adminEmiSchedule.emiSchedule.map(emi => ({
          installment: emi.emiNumber,
          paymentDate: emi.dueDate,
          paymentAmount: emi.emiAmount,
          principal: emi.principalAmount,
          interest: emi.interestAmount,
          balance: emi.outstandingPrincipal,
        }))
      : undefined;
    
    const agreementData = {
      requestNumber: request.requestNumber || request.id,
      customerName: `${request.customer?.firstName || ''} ${request.customer?.lastName || ''}`.trim() || 'Customer',
      customerEmail: request.customer?.email || '',
      customerPhone: request.customer?.phoneNumber || '',
      customerDistrict: request.district,

      assetType: request.asset?.assetType || 'Asset',
      assetBrand: request.asset?.brand,
      assetModel: request.asset?.model,

      approvedAmount: Number(request.adminOfferedAmount) || 0,
      tenureMonths: Number(request.adminTenureMonths) || 0,
      interestRate: Number(request.adminInterestRate) || 0,
      emiAmount: isAdminEmiScheduleSnapshot(request.adminEmiSchedule) ? Number(request.adminEmiSchedule.monthlyPayment) || 0 : 0,

      emiSchedule: emiScheduleForAgreement,

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
    // Note: Buffer requires cast for File constructor in Node environment
    const signedPdfFile = new File([signedPdfBuffer as unknown as BlobPart], `signed-agreement-${request.requestNumber || request.id}.pdf`, { type: 'application/pdf' });
    const uploadResult = await utapi.uploadFiles(signedPdfFile);
    if (uploadResult.error) {
      logger.error('UploadThing upload failed:', { error: JSON.stringify(uploadResult.error) });
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

    await prisma.request.update({
      where: { id: request.id },
      data: { currentStatus: toStatus }
    });

    // Emit real-time event
    emitRequestStatusChanged({
      requestId: request.requestNumber,
      previousStatus: fromStatus as REQUEST_STATUS,
      newStatus: toStatus,
      changedBy: {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
        role: user.roles?.[0] || 'USER',
      },
      reason: 'Agreement signed',
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
    const user = req.user;

    if (!isAuthenticated(user)) {
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
        requestNumber: true,
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

    // Upload buffer - create File object for UploadThing
    const pdfFile = new File([pdfBuffer as unknown as BlobPart], `signed-agreement-${id}.pdf`, { type: 'application/pdf' });
    const uploadResult = await utapi.uploadFiles(pdfFile);

    if (uploadResult.error) {
      logger.error('UploadThing upload failed:', { error: JSON.stringify(uploadResult.error) });
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
        // pdf-lib embedPng/embedJpg returns PDFImage type
        const embeddedImage = contentType.includes('png')
          ? await pdfDoc.embedPng(stampBuffer)
          : await pdfDoc.embedJpg(stampBuffer);

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
        const stampedFile = new File([stampedBuffer as unknown as BlobPart], `stamped-agreement-${id}.pdf`, { type: 'application/pdf' });
        const stampedUpload = await utapi.uploadFiles(stampedFile);
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

    // After upload (and stamping if available), transition request to next status
    try {
      const fromStatus = request.currentStatus;
      const toStatus = REQUEST_STATUS.PENDING_BANK_DETAILS;

      await prisma.request.update({ where: { id: id }, data: { currentStatus: toStatus } });

      // Emit real-time event
      emitRequestStatusChanged({
        requestId: request.requestNumber,
        previousStatus: fromStatus as REQUEST_STATUS,
        newStatus: toStatus,
        changedBy: {
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
          role: user.roles?.[0] || 'USER',
        },
        reason: 'Signed agreement uploaded',
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

    const user = req.user;
    if (!isAuthenticated(user)) {
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
    const roles = user.roles;
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
    const updatedRequest = await prisma.$transaction(async (tx) => {
      const u = await tx.request.update({ where: { id: request.id }, data: { currentStatus: toStatus } });
      // createRequestHistory is now a stub - audit logging is done via auditInspection below
      return u;
    });

    // Emit real-time event
    emitRequestStatusChanged({
      requestId: request.requestNumber,
      previousStatus: fromStatus as REQUEST_STATUS,
      newStatus: toStatus,
      changedBy: {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
        role: user.roles?.[0] || 'USER',
      },
      reason: note || 'Inspection completed',
    });

    // Return full updated request
    const finalRequest = await prisma.request.findUnique({ 
      where: { id: request.id }, 
      include: { 
        documents: true, 
        customer: true, 
        assignedAgent: true 
      } 
    });

    res.status(200).json({ success: true, message: 'Inspection completed', data: { request: finalRequest } } as APIResponseType);
    return;
  } catch (error) {
    logger.error('completeInspectionController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to complete inspection' } as APIResponseType);
  }
}

/**
 * Update Bank Details Controller
 * Saves customer's bank details to the request
 * Creates or updates a BankDetails record and links it to the request
 */
export async function updateBankDetailsController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { bankAccountNumber, bankIfscCode, bankAccountName, upiId } = req.body;
    const user = req.user;

    if (!isAuthenticated(user)) {
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

    // Create or update bank details for the user
    // Use upsert to find existing account or create new one
    const bankDetails = await prisma.bankDetails.upsert({
      where: {
        userId_accountNumber: {
          userId: user.id,
          accountNumber: bankAccountNumber,
        }
      },
      create: {
        userId: user.id,
        accountNumber: bankAccountNumber,
        ifscCode: bankIfscCode,
        accountName: bankAccountName,
        upiId: upiId || null,
        isPrimary: true, // First bank details for a request is primary
      },
      update: {
        ifscCode: bankIfscCode,
        accountName: bankAccountName,
        upiId: upiId || null,
      }
    });

    // Update bank details using the database ID
    const fromStatus = request.currentStatus;
    const toStatus = REQUEST_STATUS.BANK_DETAILS_SUBMITTED;

    const updatedRequest = await prisma.request.update({
      where: { id: request.id },
      data: {
        disbursementAccountId: bankDetails.id,
        bankDetailsSubmittedAt: new Date(),
        currentStatus: toStatus,
      }
    });

    // Emit real-time event
    emitRequestStatusChanged({
      requestId: updatedRequest.requestNumber,
      previousStatus: fromStatus as REQUEST_STATUS,
      newStatus: toStatus,
      changedBy: {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
        role: user.roles?.[0] || 'USER',
      },
      reason: 'Bank details submitted',
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

    const where: Prisma.RequestWhereInput = { assignedAgentId: userId };

    // Agents should not see requests that have progressed past bank details submission
    // (these are considered completed for the agent's responsibilities)
    where.currentStatus = { notIn: AGENT_ACCESS_DENY_STATUSES };

    // Optional status filter
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    if (status) {
        where.currentStatus = status as RequestStatus;
    }

    // Optional simple search
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    if (search && search.length > 0) {
      where.OR = [
        { id: { contains: search } },
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { asset: { brand: { contains: search, mode: 'insensitive' } } },
        { asset: { model: { contains: search, mode: 'insensitive' } } },
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

    const user = req.user;
    if (!isAuthenticated(user)) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    const request = await prisma.request.findFirst({ where: { OR: [{ id: requestId }, { requestNumber: requestId }] } });
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    const isSuper = user.roles.includes(ROLES.SUPER_ADMIN);
    if (!isSuper && !hasAnyRole(user, [ROLES.DISTRICT_ADMIN])) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    if (!isSuper && !hasDistrictAccess(user, request.district)) {
      res.status(403).json({ success: false, message: 'Forbidden - no access to this district' } as APIResponseType);
      return;
    }

    const dbId = request.id;
    const prev = request.commentsEnabled;

    // Update comment permissions
    const updated = await prisma.request.update({ where: { id: dbId }, data: { commentsEnabled: enabled } });

    // Return full request with relations
    const fullRequest = await prisma.request.findUnique({
      where: { id: dbId },
      include: {
        documents: true,
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

/**
 * POST /requests/:id/comments
 * Body: { content: string, isInternal?: boolean }
 * Adds a comment to the request.
 */
export async function addCommentController(req: Request, res: Response): Promise<void> {
  try {
    const requestId = req.params.id;
    const { content, isInternal } = req.body as { content?: string; isInternal?: boolean };

    if (!requestId || !content || !content.trim()) {
      res.status(400).json({ success: false, message: 'request id and content required' } as APIResponseType);
      return;
    }

    const user = req.user;
    if (!isAuthenticated(user)) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    const request = await prisma.request.findFirst({ 
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] } 
    });
    
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    // Permission check
    const roles = user.roles;
    const isSuper = roles.includes(ROLES.SUPER_ADMIN);
    let allowed = false;

    if (isSuper) {
      allowed = true;
    } else if (roles.includes(ROLES.DISTRICT_ADMIN)) {
      if (hasDistrictAccess(user, request.district)) {
        allowed = true;
      }
    } else if (roles.includes(ROLES.AGENT)) {
      if (request.assignedAgentId === user.id) {
        allowed = true;
      }
    } else if (roles.includes(ROLES.CUSTOMER)) {
      if (request.customerId === user.id) {
        // Customers can comment if request is not rejected, OR if comments are explicitly enabled
        if (request.currentStatus !== REQUEST_STATUS.REJECTED || request.commentsEnabled) {
          allowed = true;
        }
      }
    }

    if (!allowed) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        requestId: request.id,
        authorId: user.id,
        content: content.trim(),
        isInternal: !!isInternal && !roles.includes(ROLES.CUSTOMER), // Customers cannot make internal comments
      }
    });

    // Emit real-time event
    emitRequestCommentAdded({
      requestId: request.requestNumber,
      comment: {
        id: comment.id,
        content: comment.content,
        isInternal: comment.isInternal,
        createdAt: comment.createdAt.toISOString(),
      },
      author: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: roles[0] || 'USER',
      },
    });

    // Return full request with updated comments
    const fullRequest = await prisma.request.findUnique({
      where: { id: request.id },
      include: {
        documents: true,
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, address: true } },
        comments: { 
          select: { 
            id: true, 
            content: true, 
            createdAt: true, 
            authorId: true, 
            isInternal: true, 
            author: { select: { id: true, firstName: true, lastName: true, roles: true } } 
          },
          orderBy: { createdAt: 'asc' }
        },
      }
    });

    // Filter internal comments for customers
    if (roles.includes(ROLES.CUSTOMER) && fullRequest && Array.isArray(fullRequest.comments)) {
      fullRequest.comments = fullRequest.comments.filter((c) => !c.isInternal);
    }

    // Audit log for comment added - log to REQUEST entity so it shows in timeline
    createAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRoles: user.roles,
      action: AUDIT_ACTION.COMMENT_ADDED,
      entityType: AUDIT_ENTITY_TYPE.REQUEST,
      entityId: request.id,
      description: `Comment added${comment.isInternal ? ' (internal)' : ''}`,
      metadata: {
        commentId: comment.id,
        isInternal: comment.isInternal,
        contentPreview: content.trim().substring(0, 100),
      },
    }).catch(() => {});

    res.status(200).json({ success: true, message: 'Comment added', data: { request: fullRequest } } as APIResponseType);
  } catch (error) {
    logger.error('addCommentController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to add comment' } as APIResponseType);
  }
}

/**
 * POST /requests/:id/documents
 * Body: { fileKey: string, fileName: string, fileSize: number, fileType: string, category: string, description?: string }
 * Adds a document record to the request.
 */
export async function addDocumentController(req: Request, res: Response): Promise<void> {
  try {
    const requestId = req.params.id;
    const { fileKey, fileName, fileSize, fileType, category, description } = req.body;

    if (!requestId || !fileKey || !fileName || !category) {
      res.status(400).json({ success: false, message: 'Missing required fields' } as APIResponseType);
      return;
    }

    const user = req.user;
    if (!isAuthenticated(user)) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    const request = await prisma.request.findFirst({ 
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] } 
    });
    
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' } as APIResponseType);
      return;
    }

    // Permission check
    const roles = user.roles;
    const isSuper = roles.includes(ROLES.SUPER_ADMIN);
    let allowed = false;
    let uploaderRole = DOCUMENT_UPLOADER_ROLE.USER_SUBMITTED;

    if (isSuper) {
      allowed = true;
      uploaderRole = DOCUMENT_UPLOADER_ROLE.ADMIN_SUBMITTED;
    } else if (roles.includes(ROLES.DISTRICT_ADMIN)) {
      if (hasDistrictAccess(user, request.district)) {
        allowed = true;
        uploaderRole = DOCUMENT_UPLOADER_ROLE.ADMIN_SUBMITTED;
      }
    } else if (roles.includes(ROLES.AGENT)) {
      if (request.assignedAgentId === user.id) {
        allowed = true;
        uploaderRole = DOCUMENT_UPLOADER_ROLE.AGENT_SUBMITTED;
      }
    } else if (roles.includes(ROLES.CUSTOMER)) {
      if (request.customerId === user.id) {
        // Customers can upload if status allows (e.g. PENDING, MORE_INFO_REQUIRED)
        // or if it's a specific category like RECEIPT
        allowed = true; 
        uploaderRole = DOCUMENT_UPLOADER_ROLE.USER_SUBMITTED;
      }
    }

    if (!allowed) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    // Validate and derive category from document type
    const documentType = category as DOCUMENT_TYPE;
    const documentCategory = DOCUMENT_TYPE_TO_CATEGORY[documentType] || DOCUMENT_CATEGORY.OTHER;

    // Create document
    const document = await prisma.document.create({
      data: {
        requestId: request.id,
        fileKey,
        fileName,
        fileSize: Number(fileSize) || 0,
        fileType: fileType || 'application/octet-stream',
        documentType,
        documentCategory,
        uploadedBy: user.id,
        uploaderRole,
        description: description || undefined,
      }
    });

    // Emit real-time event
    emitRequestDocumentUploaded({
      requestId: request.requestNumber,
      document: {
        id: document.id,
        type: document.documentType,
        fileName: document.fileName,
        uploadedAt: document.createdAt.toISOString(),
      },
      uploadedBy: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: roles[0] || 'USER',
      },
    });

    // Audit log for request history - log to REQUEST entity so it shows in timeline
    createAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRoles: user.roles,
      action: AUDIT_ACTION.DOCUMENT_UPLOADED,
      entityType: AUDIT_ENTITY_TYPE.REQUEST,
      entityId: request.id,
      description: `Document uploaded: ${fileName}`,
      metadata: {
        fileName,
        category: documentType,
        documentId: document.id,
        fileType: fileType || 'application/octet-stream',
      },
    }).catch(() => {});

    res.status(200).json({ success: true, message: 'Document added', data: { document } } as APIResponseType);
  } catch (error) {
    logger.error('addDocumentController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to add document' } as APIResponseType);
  }
}


