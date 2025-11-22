import { Job } from 'bullmq';
import { BaseWorker } from '../utils/base-worker-class';
import { prisma } from '@fundifyhub/prisma';
import { SimpleLogger } from '@fundifyhub/logger';
import { EMI_STATUS, QUEUE_NAMES, OVERDUE_GRACE_PERIOD_DAYS } from '@fundifyhub/types';

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
        return { success: true, updated: 0, checked: 0 };
      }

      contextLogger.info(`Found ${overdueEmis.length} EMIs to mark as OVERDUE`);

      // Update all EMIs to OVERDUE status in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update EMI statuses
        const updateResult = await tx.eMISchedule.updateMany({
          where: {
            id: { in: overdueEmis.map(e => e.id) }
          },
          data: { 
            status: EMI_STATUS.OVERDUE,
            updatedAt: new Date()
          }
        });

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

        return updateResult.count;
      });

      contextLogger.info(`✅ Successfully updated ${result} EMI(s) to OVERDUE status`);

      // Log customer details for follow-up (notifications will be handled separately)
      for (const emi of overdueEmis) {
        const customer = emi.loan.request.customer;
        contextLogger.info(
          `EMI #${emi.emiNumber} - ${customer?.firstName} ${customer?.lastName} (${customer?.phoneNumber}) - Loan: ${emi.loan.loanNumber}`
        );
      }

      return { 
        success: true, 
        updated: result,
        checked: checkedCount
      };

    } catch (error) {
      contextLogger.error('Error updating EMI statuses:', error as Error);
      return { 
        success: false, 
        updated: 0,
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
