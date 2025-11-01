import { ServiceName } from '@fundifyhub/types';

export const config ={
  "name": "otpVerification",
  "supportedServices": [ServiceName.EMAIL, ServiceName.WHATSAPP],
  requiredVariables: ["otpCode","expiresInMinutes","companyName","supportUrl","verifyUrl","logoUrl","companyUrl"],
  "optionalVariables": [],
  "defaults": { "priority": 2, "attempts": 2, "delay": 0 }
} as const;