/**
 * Request Service
 * 
 * Business logic for loan request operations.
 * Handles CRUD, status transitions, assignments, and related workflows.
 */

import { prisma, EMIStatus } from '@fundifyhub/prisma';
import { 
  REQUEST_STAGE,
  SUB_STATUS,
  ROLES,
  AUDIT_ENTITY_TYPE,
  AUDIT_ACTION,
  REQUEST_HISTORY_ACTION,
  EMI_STATUS,
  OVERDUE_GRACE_PERIOD_DAYS,
  DEFAULT_PENALTY_PERCENTAGE,
  DEFAULT_LATE_FEE_PERCENTAGE,
  canViewRequestDetail,
  CLIENT_CONSTANTS,
} from '@fundifyhub/types';
import type { UserRole } from '@fundifyhub/types';
import { calculateEmiBreakdown, isEmiOverdue, type EMIBreakdown } from '@fundifyhub/utils';
import { generateSignedUrls } from '../../utils/uploadthing';
import logger from '../utils/logger';

const serviceLogger = logger.child('[RequestService]');

// ============================================
// Types
// ============================================

export interface UserContext {
  id: string;
  roles: string[];
  districts: string[];
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface RequestAccessContext {
  customerId: string;
  districtId: string;
  agentId: string | null;
  adminId: string | null;
}

export interface GetRequestDetailResult {
  success: boolean;
  request?: unknown;
  error?: string;
  statusCode: number;
}

export interface AssignAgentInput {
  requestId: string;
  agentId: string;
  inspectionDate?: string;
}

export interface AssignAgentResult {
  success: boolean;
  request?: unknown;
  error?: string;
  statusCode: number;
  fromStatus?: string;
  toStage?: string;
  toSubStatus?: string;
  agent?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

export interface SelfAssignAdminResult {
  success: boolean;
  request?: unknown;
  error?: string;
  statusCode: number;
  alreadyAssigned?: boolean;
}

// ============================================
// Request Detail Service
// ============================================

/**
 * Get detailed request information with all related data
 */
export async function getRequestDetail(
  requestIdOrNumber: string,
  user: UserContext
): Promise<GetRequestDetailResult> {
  try {
    // Allow lookup by DB id or by human-friendly requestNumber
    const request = await prisma.request.findFirst({
      where: { OR: [{ id: requestIdOrNumber }, { requestNumber: requestIdOrNumber }] },
      include: {
        documents: true,
        customer: { 
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            email: true, 
            phoneNumber: true, 
            address: true 
          } 
        },
        assignedAgent: { 
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            phoneNumber: true 
          } 
        },
        assignedAdmin: { 
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            email: true 
          } 
        },
        comments: { 
          select: { 
            id: true, 
            content: true, 
            createdAt: true, 
            authorId: true, 
            isInternal: true, 
            author: { 
              select: { 
                id: true, 
                firstName: true, 
                lastName: true, 
                roles: true 
              } 
            } 
          } 
        },
        loan: {
          include: {
            emisSchedule: {
              select: { 
                id: true, 
                emiNumber: true, 
                dueDate: true, 
                emiAmount: true, 
                principalAmount: true, 
                interestAmount: true, 
                status: true, 
                paidDate: true, 
                paidAmount: true, 
                lateFee: true 
              },
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
      return { success: false, error: 'Request not found', statusCode: 404 };
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
        districtId: request.districtId,
        agentId: request.assignedAgentId,
        adminId: request.assignedAdminId
      }
    );

    if (!canView) {
      return { success: false, error: 'Access denied to this request', statusCode: 403 };
    }

    // Process EMIs with breakdown calculations
    const processedRequest = await processRequestEmis(request);

    // Fetch and attach request history from audit logs
    const requestHistory = await getRequestHistory(request.id);
    (processedRequest as Record<string, unknown>).requestHistory = requestHistory;

    // Filter internal comments for customers
    if (Array.isArray((processedRequest as Record<string, unknown>).comments)) {
      const isCustomer = user.roles.includes(ROLES.CUSTOMER);
      if (isCustomer) {
        (processedRequest as Record<string, unknown>).comments = 
          ((processedRequest as Record<string, unknown>).comments as Array<{ isInternal: boolean }>)
            .filter((c) => !c.isInternal);
      }
    }

    // Generate signed URLs for documents
    await attachSignedUrls(processedRequest);

    return { success: true, request: processedRequest, statusCode: 200 };
  } catch (error) {
    serviceLogger.error('getRequestDetail error', error as Error);
    return { success: false, error: 'Failed to retrieve request', statusCode: 500 };
  }
}

/**
 * Process EMIs with breakdown calculations and lazy status updates
 */
async function processRequestEmis(request: Record<string, unknown>): Promise<Record<string, unknown>> {
  const loan = request.loan as Record<string, unknown> | null;
  if (!loan || !loan.emisSchedule) {
    return request;
  }

  const emis = loan.emisSchedule as Array<Record<string, unknown>>;
  const loanId = loan.id as string;
  const penaltyRate = (request.penaltyPercentage as number) || DEFAULT_PENALTY_PERCENTAGE;
  const lateFeeRate = (request.lateFeePercentage as number) || DEFAULT_LATE_FEE_PERCENTAGE;
  const emisToUpdate: Array<{ id: string; status: EMIStatus; lateFee: number }> = [];

  // Add breakdown data to each EMI
  loan.emisSchedule = emis.map((emi) => {
    let breakdown: EMIBreakdown | null = null;
    const dueDate = emi.dueDate as Date;
    const status = emi.status as string;

    // Check if EMI should be marked as overdue
    const shouldBeOverdue = status === EMI_STATUS.PENDING && 
      isEmiOverdue(dueDate.toISOString(), status, OVERDUE_GRACE_PERIOD_DAYS);

    // Calculate breakdown for pending or overdue EMIs
    if (status === EMI_STATUS.PENDING || status === EMI_STATUS.OVERDUE || shouldBeOverdue) {
      try {
        breakdown = calculateEmiBreakdown(
          {
            emiNumber: emi.emiNumber as number,
            emiAmount: emi.emiAmount as number,
            principalAmount: emi.principalAmount as number,
            interestAmount: emi.interestAmount as number,
            status: status,
            dueDate: dueDate.toISOString(),
          },
          emis.map((e) => ({
            emiNumber: e.emiNumber as number,
            status: e.status as string,
            emiAmount: e.emiAmount as number,
            lateFee: (e.lateFee as number) || 0,
            dueDate: (e.dueDate as Date).toISOString(),
          })),
          penaltyRate,
          lateFeeRate,
          new Date(),
          OVERDUE_GRACE_PERIOD_DAYS
        );

        // Queue for lazy update if status changed
        if (shouldBeOverdue && status !== String(EMI_STATUS.OVERDUE)) {
          emisToUpdate.push({
            id: emi.id as string,
            status: EMI_STATUS.OVERDUE as EMIStatus,
            lateFee: breakdown.lateFee
          });
        } else if (breakdown.lateFee !== ((emi.lateFee as number) || 0) && breakdown.lateFee > 0) {
          emisToUpdate.push({
            id: emi.id as string,
            status: (shouldBeOverdue ? EMI_STATUS.OVERDUE : status) as EMIStatus,
            lateFee: breakdown.lateFee
          });
        }
      } catch (err) {
        serviceLogger.error(`Failed to calculate EMI breakdown for EMI #${emi.emiNumber}`, err as Error);
      }
    }

    return {
      ...emi,
      breakdown,
      isOverdue: shouldBeOverdue || status === EMI_STATUS.OVERDUE,
      status: shouldBeOverdue ? EMI_STATUS.OVERDUE : status
    };
  });

  // Lazy update EMIs in background
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
        serviceLogger.info(`Lazy updated ${emisToUpdate.length} EMI(s) for loan ${loanId}`);
      } catch (err) {
        serviceLogger.error(`Failed to lazy update EMIs for loan ${loanId}`, err as Error);
      }
    });
  }

  return request;
}

/**
 * Get request history from audit logs
 */
async function getRequestHistory(requestId: string): Promise<Array<Record<string, unknown>>> {
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityId: requestId,
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

  return auditLogs.map(log => {
    let action = log.action;
    // Map audit actions to request history actions
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
      requestId: requestId,
      actorId: log.actorId || 'system',
      action: action,
      metadata: log.metadata || log.newValue || log.previousValue || {},
      createdAt: log.createdAt,
      actor: log.actor
    };
  });
}

/**
 * Attach signed URLs to documents
 */
async function attachSignedUrls(request: Record<string, unknown>): Promise<void> {
  const documents = request.documents as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(documents) || documents.length === 0) {
    return;
  }

  const fileKeys = documents.map((d) => d.fileKey as string).filter(Boolean);
  if (fileKeys.length === 0) {
    return;
  }

  try {
    const signedUrls = await generateSignedUrls(fileKeys, CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT);
    const urlMap = new Map(signedUrls.map(s => [s.fileKey, s.url]));
    request.documents = documents.map((d) => ({
      ...d,
      url: urlMap.get(d.fileKey as string) || null,
    }));
  } catch (err) {
    serviceLogger.warn('Failed to generate signed URLs for documents', { error: String(err) });
  }
}

// ============================================
// Assignment Services
// ============================================

/**
 * Assign an agent to a request
 */
export async function assignAgent(
  input: AssignAgentInput,
  user: UserContext
): Promise<AssignAgentResult> {
  try {
    const { requestId, agentId, inspectionDate } = input;

    // Find request
    const request = await prisma.request.findFirst({
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] }
    });

    if (!request) {
      return { success: false, error: 'Request not found', statusCode: 404 };
    }

    // Check authorization
    const isSuper = user.roles.includes(ROLES.SUPER_ADMIN);
    const isDistrictAdmin = user.roles.includes(ROLES.DISTRICT_ADMIN);
    
    if (!isSuper && !isDistrictAdmin) {
      return { success: false, error: 'Forbidden', statusCode: 403 };
    }

    if (!isSuper && !user.districts.includes(request.districtId)) {
      return { success: false, error: 'Forbidden', statusCode: 403 };
    }

    // Validate agent
    const agent = await prisma.user.findUnique({ 
      where: { id: agentId },
      include: { districtAssignments: { where: { deletedAt: null }, select: { districtId: true } } }
    });
    if (!agent || !Array.isArray(agent.roles) || !agent.roles.includes(ROLES.AGENT) || !agent.isActive) {
      return { success: false, error: 'Invalid agent', statusCode: 400 };
    }
    const agentDistrictIds = agent.districtAssignments.map(da => da.districtId);
    if (!agentDistrictIds.includes(request.districtId)) {
      return { success: false, error: 'Agent not available in request district', statusCode: 400 };
    }

    const fromStatus = request.stage;
    const toStage = REQUEST_STAGE.INSPECTION;
    const toSubStatus = SUB_STATUS.INSPECTION.SCHEDULED;

    // Build update data
    const updateData: Record<string, unknown> = {
      assignedAgentId: agentId,
      stage: toStage,
      subStatus: toSubStatus,
      requiresAgentAction: true,
      requiresCustomerAction: false,
      requiresAdminAction: false
    };

    if (inspectionDate) {
      try {
        updateData.inspectionScheduledAt = new Date(`${inspectionDate}T00:00:00.000Z`);
      } catch {
        updateData.inspectionScheduledAt = new Date(inspectionDate);
      }
    }

    // Update request
    await prisma.request.update({
      where: { id: request.id },
      data: updateData
    });

    // Fetch full request with relations
    const fullRequest = await prisma.request.findUnique({
      where: { id: request.id },
      include: {
        documents: true,
        customer: { 
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            email: true, 
            phoneNumber: true, 
            address: true 
          } 
        },
        comments: { 
          select: { 
            id: true, 
            content: true, 
            createdAt: true, 
            authorId: true, 
            isInternal: true, 
            author: { 
              select: { 
                id: true, 
                firstName: true, 
                lastName: true, 
                roles: true 
              } 
            } 
          } 
        },
      }
    });

    return {
      success: true,
      request: fullRequest,
      statusCode: 200,
      fromStatus,
      toStage,
      toSubStatus,
      agent: {
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email
      }
    };
  } catch (error) {
    serviceLogger.error('assignAgent error', error as Error);
    return { success: false, error: 'Failed to assign agent', statusCode: 500 };
  }
}

/**
 * Self-assign admin to a request
 */
export async function selfAssignAdmin(
  requestId: string,
  user: UserContext
): Promise<SelfAssignAdminResult> {
  try {
    // Find request
    const request = await prisma.request.findFirst({
      where: { OR: [{ id: requestId }, { requestNumber: requestId }] }
    });

    if (!request) {
      return { success: false, error: 'Request not found', statusCode: 404 };
    }

    // Check authorization
    const isSuper = user.roles.includes(ROLES.SUPER_ADMIN);
    const isDistrictAdmin = user.roles.includes(ROLES.DISTRICT_ADMIN);

    if (!isSuper && !isDistrictAdmin) {
      return { success: false, error: 'Only admins can self-assign to requests', statusCode: 403 };
    }

    if (!isSuper && !user.districts.includes(request.districtId)) {
      return { success: false, error: 'You do not have access to this district', statusCode: 403 };
    }

    // Check if already assigned to another admin
    if (request.assignedAdminId && request.assignedAdminId !== user.id) {
      return { success: false, error: 'Request is already assigned to another admin', statusCode: 400 };
    }

    // If already assigned to this admin, return success
    if (request.assignedAdminId === user.id) {
      const fullRequest = await getFullRequestWithRelations(request.id);
      return { success: true, request: fullRequest, statusCode: 200, alreadyAssigned: true };
    }

    // Assign admin
    await prisma.request.update({
      where: { id: request.id },
      data: { assignedAdminId: user.id }
    });

    const fullRequest = await getFullRequestWithRelations(request.id);
    return { success: true, request: fullRequest, statusCode: 200 };
  } catch (error) {
    serviceLogger.error('selfAssignAdmin error', error as Error);
    return { success: false, error: 'Failed to self-assign', statusCode: 500 };
  }
}

/**
 * Get full request with all relations
 */
async function getFullRequestWithRelations(requestId: string) {
  return prisma.request.findUnique({
    where: { id: requestId },
    include: {
      documents: true,
      customer: { 
        select: { 
          id: true, 
          firstName: true, 
          lastName: true, 
          email: true, 
          phoneNumber: true, 
          address: true 
        } 
      },
      assignedAgent: { 
        select: { 
          id: true, 
          firstName: true, 
          lastName: true, 
          phoneNumber: true 
        } 
      },
      assignedAdmin: { 
        select: { 
          id: true, 
          firstName: true, 
          lastName: true, 
          email: true 
        } 
      },
      comments: { 
        select: { 
          id: true, 
          content: true, 
          createdAt: true, 
          authorId: true, 
          isInternal: true, 
          author: { 
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              roles: true 
            } 
          } 
        } 
      },
    }
  });
}

// ============================================
// Available Users Services
// ============================================

/**
 * Get available agents for a district
 */
export async function getAvailableAgents(
  districtId: string,
  user: UserContext
): Promise<{ success: boolean; agents?: unknown[]; error?: string; statusCode: number }> {
  try {
    const isSuper = user.roles.includes(ROLES.SUPER_ADMIN);
    const isDistrictAdmin = user.roles.includes(ROLES.DISTRICT_ADMIN);

    if (!isSuper && !isDistrictAdmin) {
      return { success: false, error: 'Forbidden', statusCode: 403 };
    }

    if (!isSuper && !user.districts.includes(districtId)) {
      return { success: false, error: 'Forbidden', statusCode: 403 };
    }

    const agents = await prisma.user.findMany({
      where: {
        roles: { has: ROLES.AGENT },
        districtAssignments: {
          some: { districtId, deletedAt: null }
        },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        districtAssignments: {
          where: { deletedAt: null },
          select: { districtId: true, district: { select: { name: true } } }
        }
      }
    });

    return { success: true, agents, statusCode: 200 };
  } catch (error) {
    serviceLogger.error('getAvailableAgents error', error as Error);
    return { success: false, error: 'Failed to fetch agents', statusCode: 500 };
  }
}

/**
 * Get available district admins for a district
 */
export async function getAvailableAdmins(
  districtId: string,
  user: UserContext
): Promise<{ success: boolean; admins?: unknown[]; error?: string; statusCode: number }> {
  try {
    const isSuper = user.roles.includes(ROLES.SUPER_ADMIN);

    if (!isSuper) {
      return { success: false, error: 'Only super admin can view available admins', statusCode: 403 };
    }

    const admins = await prisma.user.findMany({
      where: {
        roles: { has: ROLES.DISTRICT_ADMIN },
        districtAssignments: {
          some: { districtId, deletedAt: null }
        },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        districtAssignments: {
          where: { deletedAt: null },
          select: { districtId: true, district: { select: { name: true } } }
        }
      }
    });

    return { success: true, admins, statusCode: 200 };
  } catch (error) {
    serviceLogger.error('getAvailableAdmins error', error as Error);
    return { success: false, error: 'Failed to fetch admins', statusCode: 500 };
  }
}
