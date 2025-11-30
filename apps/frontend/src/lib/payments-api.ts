import { getWithResult, postWithResult } from "./api-client";
import { BACKEND_API_CONFIG } from "./urls";

/**
 * Calculate EMI payment breakdown with late fees and penalties
 */
export async function calculateEMIBreakdown(emiId: string) {
  return getWithResult(
    `${BACKEND_API_CONFIG.BASE_URL}${BACKEND_API_CONFIG.ENDPOINTS.PAYMENTS.BASE}/emi/${emiId}/breakdown`
  );
}

/**
 * Create a Razorpay payment order for EMI payment
 */
export async function createRazorpayOrder(loanId: string, emiId: string, amount: number) {
  return postWithResult(
    `${BACKEND_API_CONFIG.BASE_URL}${BACKEND_API_CONFIG.ENDPOINTS.PAYMENTS.RAZORPAY_CREATE_ORDER}`,
    { loanId, emiId, amount }
  );
}

/**
 * Get payment attempt history for an EMI
 */
export async function getEMIPaymentHistory(emiId: string) {
  return getWithResult(
    `${BACKEND_API_CONFIG.BASE_URL}${BACKEND_API_CONFIG.ENDPOINTS.PAYMENTS.EMI_HISTORY(emiId)}`
  );
}