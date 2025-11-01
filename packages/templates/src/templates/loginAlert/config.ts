import { ServiceName } from '@fundifyhub/types';

export const config ={
  "name": "loginAlert",
  "supportedServices": [ServiceName.EMAIL, ServiceName.WHATSAPP],
  requiredVariables: ["customerName","device","location","time","supportUrl","resetPasswordUrl","companyName"],
  "optionalVariables": [],
  "defaults": { "priority": 2, "attempts": 2, "delay": 0 }
} as const;