import { ServiceName } from '@fundifyhub/types';

export const config ={
  "name": "welcome",
  "supportedServices": [ServiceName.EMAIL, ServiceName.WHATSAPP],
  requiredVariables: ["customerName","supportUrl","companyUrl","companyName"],
  "optionalVariables": [],
  "defaults": { "priority": 2, "attempts": 2, "delay": 0 }
} as const;