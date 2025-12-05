/**
 * Minimal domain model interfaces used by backend services.
 * These mirror Prisma models loosely to keep strict typing without pulling Prisma types.
 */

export interface Request {
  id: string;
  customerId?: string;
  districtId?: string;
  assignedAgentId?: string | null;
  assignedAdminId?: string | null;
  stage?: string;
  status?: string;
  subStatus?: string;
  requiresCustomerAction?: boolean;
  requiresAdminAction?: boolean;
  requiresAgentAction?: boolean;
  isBlocked?: boolean;
}

export interface Loan {
  id: string;
  requestId?: string;
  customerId?: string;
  status?: string;
  principalAmount?: number;
  interestRate?: number;
  tenureMonths?: number;
  emiAmount?: number;
  emisSchedule?: EMISchedule[];
  emiSchedules?: EMISchedule[];
  payments?: Payment[];
  request?: Request;
}

export interface EMISchedule {
  id: string;
  loanId?: string;
  dueDate?: Date | string;
  amount?: number;
  status?: string;
  principalComponent?: number;
  interestComponent?: number;
  paidAt?: Date | string | null;
  paymentId?: string | null;
}

export interface Payment {
  id: string;
  loanId?: string;
  emiScheduleId?: string | null;
  amount?: number;
  status?: string;
  method?: string;
  referenceId?: string | null;
  createdAt?: Date | string;
}

export interface Auction {
  id: string;
  loanId?: string;
  status?: string;
  startTime?: Date | string;
  endTime?: Date | string;
}

export interface Bid {
  id: string;
  auctionId?: string;
  bidderId?: string;
  amount?: number;
  status?: string;
}

export interface InAppNotification {
  id: string;
  userId?: string;
  title?: string;
  body?: string;
  readAt?: Date | string | null;
  createdAt?: Date | string;
}
