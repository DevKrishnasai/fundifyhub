import { Job } from 'bullmq';
import { BaseWorker } from '../utils/base-worker-class';
import { prisma } from '@fundifyhub/prisma';
import { SimpleLogger } from '@fundifyhub/logger';
import { 
  EMI_STATUS, 
  LOAN_STATUS,
  QUEUE_NAMES, 
  OVERDUE_GRACE_PERIOD_DAYS, 
  REQUEST_HISTORY_ACTION,
  REQUEST_STATUS,
  DEFAULT_PENALTY_PERCENTAGE,
  DEFAULT_LATE_FEE_PERCENTAGE,
} from '@fundifyhub/types';
import { calculateEmiBreakdown } from '@fundifyhub/utils';

/**
 * EMI Status Worker
 * -----------------
 * Periodic job that runs every 6 hours to:
 * 1. Mark PENDING EMIs as OVERDUE when past grace period
 * 2. Calculate and apply late fees/penalties
 * 3. Update loan statistics (overdueEMIs count)
 * 4. Mark loans as DEFAULTED if too many overdue EMIs
 * 
 * Note: Notifications are handled separately by the notification system
 */

// Number of consecutive overdue EMIs before loan is marked DEFAULTED
const DEFAULT_THRESHOLD_EMIS = 3;

interface EMIStatusJobData {
  type: 'UPDATE_OVERDUE_EMIS';
  triggeredAt: string;
}

interface JobResult {
  success: boolean;
  checked: number;
  markedOverdue: number;
  penaltiesApplied: number;
  loansDefaulted: number;
  error?: string;
}

export class EMIStatusWorker extends BaseWorker<EMIStatusJobData> {
  constructor(queueName: QUEUE_NAMES, logger: SimpleLogger) {
    super(queueName, logger);
  }

  protected async processJob(job: Job<EMIStatusJobData>): Promise<JobResult> {
    const log = this.logger.child(`[EMI-Cron][Job ${job.id}]`);

    try {
      log.info('Starting EMI status update job...');

      // Calculate cutoff date (today - grace period)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - OVERDUE_GRACE_PERIOD_DAYS);
      cutoffDate.setHours(0, 0, 0, 0);

      log.info(`Cutoff date for overdue: ${cutoffDate.toISOString()}`);

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
              requestId: true,
              status: true,
              request: {
                select: {
                  penaltyPercentage: true,
                  lateFeePercentage: true,
                }
              }
            }
          }
        }
      });

      if (overdueEmis.length === 0) {
        log.info('No EMIs to mark as overdue');
        return { success: true, checked: 0, markedOverdue: 0, penaltiesApplied: 0, loansDefaulted: 0 };
      }

      log.info(`Found ${overdueEmis.length} EMI(s) to process`);

      let markedOverdue = 0;
      let penaltiesApplied = 0;
      let loansDefaulted = 0;

      // Process each EMI
      await prisma.$transaction(async (tx) => {
        for (const emi of overdueEmis) {
          // Get all EMIs for this loan to calculate correct penalty
          const allEmis = await tx.eMISchedule.findMany({
            where: { loanId: emi.loanId },
            orderBy: { emiNumber: 'asc' }
          });

          // Calculate breakdown for late fee
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
            emi.loan.request.penaltyPercentage || DEFAULT_PENALTY_PERCENTAGE,
            emi.loan.request.lateFeePercentage || DEFAULT_LATE_FEE_PERCENTAGE
          );

          const daysOverdue = Math.floor(
            (Date.now() - emi.dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Update EMI status and late fee
          await tx.eMISchedule.update({
            where: { id: emi.id },
            data: { 
              status: EMI_STATUS.OVERDUE,
              lateFee: breakdown.penalty,
            }
          });

          markedOverdue++;
          if (breakdown.penalty > 0) {
            penaltiesApplied++;
          }

          // Log to request history
          await tx.requestHistory.create({
            data: {
              requestId: emi.loan.requestId,
              actorId: 'system',
              action: REQUEST_HISTORY_ACTION.EMI_MARKED_OVERDUE,
              metadata: {
                emiId: emi.id,
                emiNumber: emi.emiNumber,
                daysOverdue,
                lateFee: breakdown.penalty,
              }
            }
          });
        }

        // Group by loan and update statistics
        const loanIds = [...new Set(overdueEmis.map(e => e.loanId))];

        for (const loanId of loanIds) {
          // Count overdue EMIs for this loan
          const overdueCount = await tx.eMISchedule.count({
            where: { loanId, status: EMI_STATUS.OVERDUE }
          });

          // Update loan overdue count
          await tx.loan.update({
            where: { id: loanId },
            data: { overdueEMIs: overdueCount }
          });

          // Check if loan should be marked DEFAULTED
          const loan = await tx.loan.findUnique({
            where: { id: loanId },
            select: { status: true, requestId: true }
          });

          if (loan && loan.status === LOAN_STATUS.ACTIVE && overdueCount >= DEFAULT_THRESHOLD_EMIS) {
            await tx.loan.update({
              where: { id: loanId },
              data: { status: LOAN_STATUS.DEFAULTED }
            });

            await tx.request.update({
              where: { id: loan.requestId },
              data: { currentStatus: REQUEST_STATUS.DEFAULTED }
            });

            await tx.requestHistory.create({
              data: {
                requestId: loan.requestId,
                actorId: 'system',
                action: REQUEST_HISTORY_ACTION.LOAN_MARKED_DEFAULTED,
                metadata: {
                  loanId,
                  overdueEmiCount: overdueCount,
                  threshold: DEFAULT_THRESHOLD_EMIS,
                  defaultedAt: new Date().toISOString(),
                }
              }
            });

            loansDefaulted++;
            log.warn(`Loan ${loanId} marked as DEFAULTED (${overdueCount} overdue EMIs)`);
          }
        }
      });

      log.info(`✅ Job completed - Marked: ${markedOverdue}, Penalties: ${penaltiesApplied}, Defaulted: ${loansDefaulted}`);

      return { 
        success: true, 
        checked: overdueEmis.length,
        markedOverdue,
        penaltiesApplied,
        loansDefaulted,
      };

    } catch (error) {
      log.error('EMI status job failed:', error as Error);
      return { 
        success: false, 
        checked: 0,
        markedOverdue: 0,
        penaltiesApplied: 0,
        loansDefaulted: 0,
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  protected getConcurrency(): number {
    return 1; // One job at a time for cron
  }
}
