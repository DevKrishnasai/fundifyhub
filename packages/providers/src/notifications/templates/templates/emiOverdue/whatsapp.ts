import { EMIOverduePayload } from '@fundifyhub/types';

/**
 * Render WhatsApp message for EMI overdue notification
 * This is also used for IN_APP notifications as a fallback
 */
export const renderEMIOverdueWhatsApp = (vars: EMIOverduePayload): string => {
  const {
    customerName,
    loanNumber,
    emiNumber,
    emiAmount,
    dueDate,
    daysOverdue,
    lateFee,
    totalDue,
    overdueCount,
    paymentUrl,
    companyName = 'FundifyHub',
  } = vars;

  const urgencyText = daysOverdue > 15
    ? '⚠️ *URGENT: Immediate Action Required*'
    : '⚠️ *Payment Overdue*';

  return `*${companyName} - EMI Overdue Notice*

${urgencyText}

Hi ${customerName || 'Customer'},

Your EMI payment is overdue. Please clear the dues immediately to avoid further penalties.

*Loan:* ${loanNumber}
*EMI #:* ${emiNumber}
*Original Amount:* ₹${emiAmount.toLocaleString('en-IN')}
*Due Date:* ${dueDate}
*Days Overdue:* ${daysOverdue}
*Late Fee:* ₹${lateFee.toLocaleString('en-IN')}
*Total Due:* ₹${totalDue.toLocaleString('en-IN')}
${overdueCount > 1 ? `*Overdue EMIs:* ${overdueCount}\n` : ''}
${paymentUrl ? `Pay Now: ${paymentUrl}\n` : ''}
Please make the payment at your earliest to avoid loan default status.

Contact us if you need assistance.`;
};

export default renderEMIOverdueWhatsApp;
