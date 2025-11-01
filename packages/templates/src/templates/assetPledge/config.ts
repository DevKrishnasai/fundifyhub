import { ServiceName } from '@fundifyhub/types';

export const config = {
  "name": "assetPledge",
  "supportedServices": [ServiceName.EMAIL],
  "requiredVariables": [
    "customerName",
    "assetName",
    "amount",
    "district",
    "supportUrl",
    "adminDashboardUrl",
    "companyName",
    "requestId",
    "timestamp"
  ],
  "optionalVariables": [],
  "defaults": { "priority": 2, "attempts": 2, "delay": 0 }
} as const;