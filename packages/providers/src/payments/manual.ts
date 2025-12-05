/**
 * Manual Payment Provider
 * 
 * Implements IPaymentProvider interface for manual payments:
 * - Cash payments
 * - Cheque payments
 * - Bank transfers
 * - UPI payments (recorded manually)
 * 
 * @module providers/payments/manual
 */

import {
  IPaymentProvider,
  PaymentProviderType,
  CreatePaymentOrderInput,
  CreatePaymentOrderResult,
  RecordManualPaymentInput,
  ManualPaymentMethod,
} from '@fundifyhub/types';

/**
 * Manual payment provider configuration
 */
export interface ManualPaymentProviderConfig {
  /** Whether manual payments are enabled */
  enabled?: boolean;
  /** Allowed payment methods */
  allowedMethods?: ManualPaymentMethod[];
}

/**
 * Default allowed methods
 */
const DEFAULT_ALLOWED_METHODS: ManualPaymentMethod[] = [
  ManualPaymentMethod.CASH,
  ManualPaymentMethod.CHEQUE,
  ManualPaymentMethod.BANK_TRANSFER,
  ManualPaymentMethod.UPI,
];

/**
 * Manual Payment Provider Implementation
 * 
 * Unlike online providers, this doesn't interact with external gateways.
 * It creates internal payment records that need to be verified by admins.
 */
export class ManualPaymentProvider implements IPaymentProvider {
  public readonly type = PaymentProviderType.MANUAL;
  public readonly name = 'Manual Payment';
  
  private readonly config: ManualPaymentProviderConfig;
  private readonly allowedMethods: ManualPaymentMethod[];

  constructor(config: ManualPaymentProviderConfig = {}) {
    this.config = config;
    this.allowedMethods = config.allowedMethods ?? DEFAULT_ALLOWED_METHODS;
  }

  /**
   * Check if provider is enabled
   */
  isConfigured(): boolean {
    return this.config.enabled !== false;
  }

  /**
   * Check if a payment method is allowed
   */
  isMethodAllowed(method: ManualPaymentMethod): boolean {
    return this.allowedMethods.includes(method);
  }

  /**
   * Get allowed payment methods
   */
  getAllowedMethods(): ManualPaymentMethod[] {
    return [...this.allowedMethods];
  }

  /**
   * Create a manual payment order
   * 
   * For manual payments, this just validates the input and returns success.
   * The actual payment recording happens via recordPayment().
   */
  async createOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult> {
    // Validate input
    if (!input.loanId || !input.emiId) {
      return {
        success: false,
        error: 'Loan ID and EMI ID are required',
      };
    }

    if (input.amount.totalAmount <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than 0',
      };
    }

    // For manual payments, we don't create an external order
    // Return success with the payment details
    return {
      success: true,
      providerOrderId: `MANUAL_${Date.now()}_${input.emiId}`,
      amountInSmallestUnit: Math.round(input.amount.totalAmount * 100),
      currency: input.currency ?? 'INR',
      providerData: {
        allowedMethods: this.allowedMethods,
        loanId: input.loanId,
        emiId: input.emiId,
        emiNumber: input.emiNumber,
        amount: input.amount,
      },
    };
  }

  /**
   * Validate manual payment input
   */
  validatePaymentInput(input: RecordManualPaymentInput): { valid: boolean; error?: string } {
    if (!input.loanId || !input.emiId) {
      return { valid: false, error: 'Loan ID and EMI ID are required' };
    }

    if (input.amount <= 0) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }

    if (!this.isMethodAllowed(input.method)) {
      return { 
        valid: false, 
        error: `Payment method ${input.method} is not allowed. Allowed methods: ${this.allowedMethods.join(', ')}` 
      };
    }

    if (input.method === ManualPaymentMethod.CHEQUE && !input.referenceNumber) {
      return { valid: false, error: 'Cheque number is required for cheque payments' };
    }

    if (input.method === ManualPaymentMethod.BANK_TRANSFER && !input.referenceNumber) {
      return { valid: false, error: 'UTR/Reference number is required for bank transfers' };
    }

    if (!input.collectedBy) {
      return { valid: false, error: 'Collector ID is required' };
    }

    return { valid: true };
  }

  /**
   * Format payment method for display
   */
  formatPaymentMethod(method: ManualPaymentMethod): string {
    switch (method) {
      case ManualPaymentMethod.CASH:
        return 'Cash';
      case ManualPaymentMethod.CHEQUE:
        return 'Cheque';
      case ManualPaymentMethod.BANK_TRANSFER:
        return 'Bank Transfer';
      case ManualPaymentMethod.UPI:
        return 'UPI';
      default:
        return method;
    }
  }
}

/**
 * Create a Manual Payment provider instance
 */
export function createManualPaymentProvider(
  config: ManualPaymentProviderConfig = {}
): ManualPaymentProvider {
  return new ManualPaymentProvider(config);
}
