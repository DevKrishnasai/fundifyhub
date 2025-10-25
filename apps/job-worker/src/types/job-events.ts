// Types for job events and event emission in job-worker

export type JobType = 'OTP' | 'SERVICE_CONTROL' | 'EMAIL' | 'WHATSAPP';

export type OTPEvent =
  | { type: 'OTP_SENT'; data: { userId: string; recipient: string; otp: string; templateType?: string } }
  | { type: 'OTP_FAILED'; data: { userId: string; recipient: string; error: string } };

export type WhatsAppEvent =
  | { type: 'QR_CODE'; data: { qrCode: string; message?: string } }
  | { type: 'AUTHENTICATED'; data: { message?: string } }
  | { type: 'READY'; data: { message?: string } }
  | { type: 'DISCONNECTED'; data: { message?: string; reason?: string } }
  | { type: 'AUTH_FAILURE'; data: { message?: string; error?: string } }
  | { type: 'STATUS'; data: { connectionStatus: string; message?: string } };

export type EmailEvent =
  | { type: 'EMAIL_SENT'; data: { userId: string; recipient: string; templateType?: string } }
  | { type: 'EMAIL_FAILED'; data: { userId: string; recipient: string; error: string } }
  | { type: 'EMAIL_VERIFIED'; data: { message?: string } };

export type ServiceControlEvent =
  | { type: 'INITIALIZE'; data: { serviceName: string; timestamp: Date } }
  | { type: 'DESTROY'; data: { serviceName: string; timestamp: Date } };

export type JobWorkerEvent = OTPEvent | WhatsAppEvent | EmailEvent | ServiceControlEvent;
