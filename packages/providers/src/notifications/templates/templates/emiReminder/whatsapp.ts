import { EMIReminderPayload } from '@fundifyhub/types';

/**
 * Render WhatsApp message for EMI reminder notification
 * This is also used for IN_APP notifications as a fallback
 */
export const renderEMIReminderWhatsApp = (vars: EMIReminderPayload): string => {
  const {
    customerName,
    loanNumber,
    emiNumber,
    emiAmount,
    dueDate,
    daysUntilDue,
    totalOutstanding,
    paymentUrl,
    companyName = 'FundifyHub',
  } = vars;

  const daysText = daysUntilDue !== undefined
    ? daysUntilDue === 0
      ? 'due today'
      : daysUntilDue === 1
        ? 'due tomorrow'
        : `due in ${daysUntilDue} days`
    : '';

  return `*${companyName} - EMI Reminder*

Hi ${customerName || 'Customer'},

This is a reminder for your upcoming EMI payment.

*Loan:* ${loanNumber}
*EMI #:* ${emiNumber}
*Amount:* ₹${emiAmount.toLocaleString('en-IN')}
*Due Date:* ${dueDate}${daysText ? ` (${daysText})` : ''}
${totalOutstanding ? `*Outstanding:* ₹${totalOutstanding.toLocaleString('en-IN')}\n` : ''}
${paymentUrl ? `Pay Now: ${paymentUrl}\n` : ''}
Please ensure timely payment to avoid late fees.

Thank you for choosing ${companyName}!`;
};

export default renderEMIReminderWhatsApp;
