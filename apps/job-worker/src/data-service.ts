// Real job processing functions for the job worker
import { prisma } from '@fundifyhub/prisma';
import { createLogger } from '@fundifyhub/logger';

const logger = createLogger({ serviceName: 'job-worker-data-service' });

export interface PaymentJobData {
  paymentId: string;
  userId: string;
  amount: number;
  type: 'PROCESS_PAYMENT' | 'REFUND_PAYMENT' | 'UPDATE_WALLET';
}

export interface NotificationJobData {
  userId: string;
  title: string;
  message: string;
  type: 'PAYMENT' | 'INVESTMENT' | 'KYC' | 'FUND_REQUEST' | 'INFO';
}

// Process payment jobs with real database operations
export async function processPaymentJob(job: { id: string; data: PaymentJobData }): Promise<any> {
  const { paymentId, userId, amount, type } = job.data;
  
  try {
    logger.info(`Processing payment job ${job.id} - Type: ${type}, PaymentId: ${paymentId}`);
    
    switch (type) {
      case 'PROCESS_PAYMENT':
        return await processPayment(paymentId, userId, amount);
      case 'REFUND_PAYMENT':
        return await processRefund(paymentId, userId, amount);
      case 'UPDATE_WALLET':
        return await updateWalletBalance(userId, amount);
      default:
        throw new Error(`Unknown payment job type: ${type}`);
    }
  } catch (error) {
    logger.error(`Payment job ${job.id} failed:`, error as Error);
    throw error;
  }
}

async function processPayment(paymentId: string, userId: string, amount: number) {
  logger.info(`Processing payment: ${paymentId} for user: ${userId}, amount: ${amount}`);
  
  const result = await prisma.$transaction(async (tx) => {
    // Update payment status to PROCESSING
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: { 
        status: 'PROCESSING',
        updatedAt: new Date()
      }
    });
    
    // Create payment event
    await tx.paymentEvent.create({
      data: {
        paymentId,
        eventType: 'PAYMENT_PROCESSING_STARTED',
        eventData: { timestamp: new Date().toISOString(), amount }
      }
    });
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update payment to COMPLETED
    const completedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: { 
        status: 'COMPLETED',
        updatedAt: new Date()
      }
    });
    
    // Create completion event
    await tx.paymentEvent.create({
      data: {
        paymentId,
        eventType: 'PAYMENT_COMPLETED',
        eventData: { 
          timestamp: new Date().toISOString(), 
          amount,
          finalStatus: 'COMPLETED'
        }
      }
    });
    
    // Update user's wallet if they have one
    const wallet = await tx.wallet.findFirst({
      where: { userId, currency: 'INR' }
    });
    
    if (wallet) {
      const newBalance = wallet.balance.toNumber() + amount;
      
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance }
      });
      
      // Create transaction record
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          paymentId,
          type: 'CREDIT',
          amount,
          description: `Payment credited from ${paymentId}`,
          balanceAfter: newBalance
        }
      });
      
      logger.info(`Wallet updated for user ${userId}: new balance ${newBalance}`);
    }
    
    return completedPayment;
  });
  
  logger.info(`Payment ${paymentId} processed successfully`);
  return { success: true, payment: result };
}

async function processRefund(paymentId: string, userId: string, refundAmount: number) {
  logger.info(`Processing refund: ${paymentId} for user: ${userId}, amount: ${refundAmount}`);
  
  const result = await prisma.$transaction(async (tx) => {
    // Update payment with refund information
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        refundAmount,
        refundedAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    // Create refund event
    await tx.paymentEvent.create({
      data: {
        paymentId,
        eventType: 'PAYMENT_REFUNDED',
        eventData: { 
          timestamp: new Date().toISOString(), 
          refundAmount,
          originalAmount: payment.amount.toNumber()
        }
      }
    });
    
    // Deduct from wallet if user has one
    const wallet = await tx.wallet.findFirst({
      where: { userId, currency: 'INR' }
    });
    
    if (wallet) {
      const newBalance = wallet.balance.toNumber() - refundAmount;
      
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: Math.max(0, newBalance) } // Prevent negative balance
      });
      
      // Create transaction record
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          paymentId,
          type: 'DEBIT',
          amount: refundAmount,
          description: `Refund for payment ${paymentId}`,
          balanceAfter: Math.max(0, newBalance)
        }
      });
      
      logger.info(`Wallet debited for user ${userId}: new balance ${Math.max(0, newBalance)}`);
    }
    
    return payment;
  });
  
  logger.info(`Refund ${paymentId} processed successfully`);
  return { success: true, refund: result };
}

async function updateWalletBalance(userId: string, amount: number) {
  logger.info(`Updating wallet balance for user: ${userId}, amount: ${amount}`);
  
  const result = await prisma.$transaction(async (tx) => {
    // Find or create wallet for user
    let wallet = await tx.wallet.findFirst({
      where: { userId, currency: 'INR' }
    });
    
    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          userId,
          balance: amount,
          currency: 'INR'
        }
      });
      logger.info(`New wallet created for user ${userId}`);
    } else {
      const newBalance = wallet.balance.toNumber() + amount;
      wallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance }
      });
    }
    
    // Create transaction record
    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: amount > 0 ? 'CREDIT' : 'DEBIT',
        amount: Math.abs(amount),
        description: `Wallet ${amount > 0 ? 'credit' : 'debit'} - job processing`,
        balanceAfter: wallet.balance.toNumber()
      }
    });
    
    return wallet;
  });
  
  logger.info(`Wallet balance updated for user ${userId}: ${result.balance}`);
  return { success: true, wallet: result };
}

// Process notification jobs
export async function processNotificationJob(job: { id: string; data: NotificationJobData }): Promise<any> {
  const { userId, title, message, type } = job.data;
  
  try {
    logger.info(`Processing notification job ${job.id} for user: ${userId}`);
    
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        metadata: {
          jobId: job.id,
          createdByJob: true,
          timestamp: new Date().toISOString()
        }
      }
    });
    
    logger.info(`Notification created: ${notification.id} for user: ${userId}`);
    return { success: true, notification };
  } catch (error) {
    logger.error(`Notification job ${job.id} failed:`, error as Error);
    throw error;
  }
}

// Get job processing statistics
export async function getJobStats() {
  try {
    const [pendingPayments, completedPayments, unreadNotifications] = await Promise.all([
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'COMPLETED' } }),
      prisma.notification.count({ where: { isRead: false } })
    ]);
    
    return {
      success: true,
      stats: {
        pendingPayments,
        completedPayments,
        unreadNotifications,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error('Failed to get job stats:', error as Error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}