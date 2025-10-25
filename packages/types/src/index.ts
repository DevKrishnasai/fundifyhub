// User related types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

// Payment related types
export interface PaymentEvent {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  razorpayPaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: Date;
}

export interface PaymentUpdateMessage extends WebSocketMessage {
  type: "payment_update";
  payload: {
    paymentId: string;
    status: PaymentStatus;
    userId: string;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Job types
export interface PaymentJob {
  paymentId: string;
  userId: string;
  amount: number;
  currency: string;
}

// Export all loan application enums and types
export * from "./loan-enums";

// Export all queue job types
export * from "./queue-types";