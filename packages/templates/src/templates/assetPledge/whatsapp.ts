import { AssetPledgePayloadType } from '@fundifyhub/types';

/**
 * Render WhatsApp message for asset pledge notification
 * This is also used for IN_APP notifications as a fallback
 */
export const renderAssetPledgeWhatsApp = (vars: AssetPledgePayloadType): string => {
  const {
    customerName,
    assetName,
    amount,
    district,
    requestId,
    companyName = 'FundifyHub',
    timestamp,
    adminDashboardUrl,
  } = vars;

  return `*${companyName} - New Asset Pledge*

A new asset pledge request has been submitted.

*Customer:* ${customerName || 'Customer'}
*Asset:* ${assetName}
*Amount:* ₹${amount.toLocaleString('en-IN')}
*District:* ${district}
*Request ID:* ${requestId}
*Submitted:* ${timestamp || new Date().toLocaleString()}

${adminDashboardUrl ? `View Details: ${adminDashboardUrl}` : ''}

Please review this request at your earliest convenience.`;
};

export default renderAssetPledgeWhatsApp;
