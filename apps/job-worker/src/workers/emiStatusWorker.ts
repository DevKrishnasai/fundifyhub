import { Job } from 'bullmq';
import { BaseWorker } from '../utils/base-worker-class';
import { prisma } from '@fundifyhub/prisma';
import { SimpleLogger } from '@fundifyhub/logger';
import { EMI_STATUS, QUEUE_NAMES, OVERDUE_GRACE_PERIOD_DAYS, TEMPLATE_NAMES } from '@fundifyhub/types';
import { calculateEmiBreakdown } from '@fundifyhub/utils';
import { createEnqueueClient } from '@fundifyhub/utils/src/enqueue';
import config from '../utils/config';

/**
 * EMI Status Worker
 * -----------------
 * Periodically updates EMI statuses from PENDING to OVERDUE
 * when they pass the grace period (30 days by default).
 * 
 * This worker is triggered by a repeatable job every 6 hours.
 * It processes all eligible EMIs in a single job execution.
 */

interface EMIStatusJobData {
  type: 'UPDATE_OVERDUE_EMIS';
  triggeredAt: string;
}

export class EMIStatusWorker extends BaseWorker<EMIStatusJobData> {
  constructor(queueName: QUEUE_NAMES, logger: SimpleLogger) {
    super(queueName, logger);
  }

  /**
   * Process EMI status update job
   * Finds all PENDING EMIs past grace period and marks them OVERDUE
   */
  protected async processJob(job: Job<EMIStatusJobData>): Promise<{ 
    success: boolean; 
    updated: number;
    penaltiesCalculated: number;
    notificationsSent: number;
    checked: number;
    error?: string; 
  }> {
    const contextLogger = this.logger.child(`[Job ${job.id}] [${this.queueName}]`);

    try {
      contextLogger.info('Starting EMI status update...');

      // Calculate cutoff date (today - grace period)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - OVERDUE_GRACE_PERIOD_DAYS);
      cutoffDate.setHours(0, 0, 0, 0); // Start of day

      contextLogger.info(`Checking EMIs with due date before ${cutoffDate.toISOString()}`);

      // Also check for EMIs due in 3 days for reminders
      const reminderCutoffDate = new Date();
      reminderCutoffDate.setDate(reminderCutoffDate.getDate() + 3);
      reminderCutoffDate.setHours(23, 59, 59, 999); // End of day

      contextLogger.info(`Checking EMIs due before ${reminderCutoffDate.toISOString()} for reminders`);

      // Find EMIs for reminders (due in next 3 days, still pending)
      const reminderEmis = await prisma.eMISchedule.findMany({
        where: {
          status: EMI_STATUS.PENDING,
          dueDate: { lte: reminderCutoffDate, gte: new Date() }
        },
        include: {
          loan: {
            select: {
              id: true,
              loanNumber: true,
              request: {
                select: {
                  requestNumber: true,
                  customer: {
                    select: {
                      firstName: true,
                      lastName: true,
                      phoneNumber: true,
                      email: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      contextLogger.info(`Found ${reminderEmis.length} EMIs for reminders`);

      // Find all PENDING EMIs past grace period
      const overdueEmis = await prisma.eMISchedule.findMany({
        where: {
          status: EMI_STATUS.PENDING,
          dueDate: { lt: cutoffDate }
        },
        include: {
          loan: {
            select: {
              id: true,
              loanNumber: true,
              request: {
                select: {
                  requestNumber: true,
                  penaltyPercentage: true,
                  LateFeePercentage: true,
                  customer: {
                    select: {
                      firstName: true,
                      lastName: true,
                      phoneNumber: true,
                      email: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      const checkedCount = overdueEmis.length;

      if (overdueEmis.length === 0) {
        contextLogger.info('No EMIs found to update');
        return { success: true, updated: 0, penaltiesCalculated: 0, notificationsSent: 0, checked: 0 };
      }

      contextLogger.info(`Found ${overdueEmis.length} EMIs to mark as OVERDUE`);

      // Initialize enqueue client for notifications
      const enqueueClient = createEnqueueClient({
        host: config.redis.host,
        port: config.redis.port
      });

      let penaltiesCalculated = 0;
      let notificationsSent = 0;

      // Update all EMIs to OVERDUE status and calculate penalties in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update EMI statuses and calculate penalties
        const updatePromises = overdueEmis.map(async (emi) => {
          // Get all EMIs for this loan to calculate penalties
          const allEmis = await tx.eMISchedule.findMany({
            where: { loanId: emi.loanId },
            orderBy: { emiNumber: 'asc' }
          });

          // Calculate breakdown to get late fee
          const breakdown = calculateEmiBreakdown(
            {
              emiNumber: emi.emiNumber,
              emiAmount: emi.emiAmount,
              principalAmount: emi.principalAmount,
              interestAmount: emi.interestAmount,
              status: emi.status,
              dueDate: emi.dueDate.toISOString()
            },
            allEmis.map(e => ({
              emiNumber: e.emiNumber,
              status: e.status,
              emiAmount: e.emiAmount,
              lateFee: e.lateFee,
              dueDate: e.dueDate.toISOString()
            })),
            emi.loan.request.penaltyPercentage || 4,
            emi.loan.request.LateFeePercentage || 0.01
          );

          // Update EMI with OVERDUE status and calculated late fee
          await tx.eMISchedule.update({
            where: { id: emi.id },
            data: { 
              status: EMI_STATUS.OVERDUE,
              lateFee: breakdown.lateFee,
              updatedAt: new Date()
            }
          });

          penaltiesCalculated++;
          return breakdown.lateFee;
        });

        await Promise.all(updatePromises);

        // Group EMIs by loan for statistics update
        const loanGroups = new Map<string, typeof overdueEmis>();
        for (const emi of overdueEmis) {
          const existing = loanGroups.get(emi.loanId) || [];
          existing.push(emi);
          loanGroups.set(emi.loanId, existing);
        }

        // Update loan statistics
        for (const [loanId, emis] of loanGroups) {
          const overdueCount = await tx.eMISchedule.count({
            where: { loanId, status: EMI_STATUS.OVERDUE }
          });

          await tx.loan.update({
            where: { id: loanId },
            data: { 
              overdueEMIs: overdueCount,
              updatedAt: new Date()
            }
          });

          contextLogger.info(
            `Updated loan ${emis[0].loan.loanNumber}: ${emis.length} EMI(s) marked OVERDUE (total overdue: ${overdueCount})`
          );
        }

        return overdueEmis.length;
      });

      contextLogger.info(`✅ Successfully updated ${result} EMI(s) to OVERDUE status`);
      contextLogger.info(`✅ Calculated penalties for ${penaltiesCalculated} EMI(s)`);

      // Send notifications for overdue EMIs
      for (const emi of overdueEmis) {
        const customer = emi.loan.request.customer;
        const customerName = `${customer?.firstName} ${customer?.lastName}`;

        try {
          await enqueueClient.addAJob(TEMPLATE_NAMES.EMI_OVERDUE, {
            customerName,
            email: customer?.email || '',
            phoneNumber: customer?.phoneNumber || '',
            loanNumber: emi.loan.loanNumber || '',
            emiNumber: emi.emiNumber,
            emiAmount: emi.emiAmount,
            dueDate: emi.dueDate.toISOString().split('T')[0],
            daysOverdue: Math.floor((new Date().getTime() - emi.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
            lateFee: emi.lateFee,
            totalDue: emi.emiAmount + emi.lateFee,
            overdueCount: 1, // For this EMI, could aggregate if needed
            paymentUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/requests/${emi.loan.request.requestNumber}`,
            companyName: 'FundifyHub'
          });

          notificationsSent++;
          contextLogger.info(
            `📧 Sent overdue notification for EMI #${emi.emiNumber} to ${customerName}`
          );
        } catch (error) {
          contextLogger.error(
            `Failed to send overdue notification for EMI #${emi.emiNumber}:`,
            error as Error
          );
        }
      }

      contextLogger.info(`📧 Sent ${notificationsSent} overdue notifications`);

      // Send reminder notifications for EMIs due in 3 days
      for (const emi of reminderEmis) {
        const customer = emi.loan.request.customer;
        const customerName = `${customer?.firstName} ${customer?.lastName}`;
        const daysUntilDue = Math.ceil((emi.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

        try {
          await enqueueClient.addAJob(TEMPLATE_NAMES.EMI_REMINDER, {
            customerName,
            email: customer?.email || '',
            phoneNumber: customer?.phoneNumber || '',
            loanNumber: emi.loan.loanNumber || '',
            emiNumber: emi.emiNumber,
            emiAmount: emi.emiAmount,
            dueDate: emi.dueDate.toISOString().split('T')[0],
            daysUntilDue,
            totalOutstanding: 0, // Could calculate if needed
            paymentUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/requests/${emi.loan.request.requestNumber}`,
            companyName: 'FundifyHub'
          });

          notificationsSent++;
          contextLogger.info(
            `📧 Sent reminder notification for EMI #${emi.emiNumber} to ${customerName} (${daysUntilDue} days left)`
          );
        } catch (error) {
          contextLogger.error(
            `Failed to send reminder notification for EMI #${emi.emiNumber}:`,
            error as Error
          );
        }
      }

      contextLogger.info(`📧 Sent ${notificationsSent} total notifications (${reminderEmis.length} reminders)`);

      return { 
        success: true, 
        updated: result,
        penaltiesCalculated,
        notificationsSent,
        checked: checkedCount
      };

    } catch (error) {
      contextLogger.error('Error updating EMI statuses:', error as Error);
      return { 
        success: false, 
        updated: 0,
        penaltiesCalculated: 0,
        notificationsSent: 0,
        checked: 0,
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Lower concurrency for cron jobs (one at a time)
   */
  protected getConcurrency(): number {
    return 1;
  }
}
