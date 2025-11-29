import { postWithResult } from "./api-client";
import { BACKEND_API_CONFIG } from "./urls";

/**
 * Calculate EMI payment breakdown
 */
export async function calculateEMIBreakdown(emiId: string) {
  return postWithResult(`${BACKEND_API_CONFIG.BASE_URL}${BACKEND_API_CONFIG.ENDPOINTS.PAYMENTS.EMI_PAY}`, {
    emiId,
  });
}