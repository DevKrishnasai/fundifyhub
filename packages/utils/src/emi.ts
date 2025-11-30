/**
 * EMI calculation utility
 * Returns amortizing EMI schedule and summary
 */
export type EMIScheduleRow = {
  installment: number;
  paymentDate: string; // ISO
  paymentAmount: number;
  principal: number;
  interest: number;
  remainingBalance: number;
};

export type EMICalcResult = {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  emiSchedule: EMIScheduleRow[];
};

function roundTo(amount: number, decimals = 2) {
  const p = Math.pow(10, decimals);
  return Math.round(amount * p) / p;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Handle month rollovers (e.g., Jan 31 + 1 month -> Feb 28/29)
  if (d.getDate() !== day) {
    d.setDate(0); // last day of previous month
  }
  return d;
}

export function calculateEmiSchedule(opts: {
  principal: number;
  annualRate: number; // percent
  tenureMonths: number;
  firstPaymentDate?: string; // ISO
  decimals?: number;
}): EMICalcResult {
  const { principal, annualRate, tenureMonths, firstPaymentDate, decimals = 2 } = opts;
  if (principal <= 0) throw new Error('principal must be > 0');
  if (tenureMonths <= 0) throw new Error('tenureMonths must be > 0');

  const monthlyRate = annualRate / 100 / 12; // e.g., 12% => 0.12/12
  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = principal / tenureMonths;
  } else {
    const r = monthlyRate;
    const n = tenureMonths;
    monthlyPayment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  const monthlyPaymentRounded = roundTo(monthlyPayment, decimals);

  const schedule: EMIScheduleRow[] = [];
  let remaining = principal;
  let totalInterest = 0;
  const startDate = firstPaymentDate ? new Date(firstPaymentDate) : addMonths(new Date(), 1);

  for (let i = 1; i <= tenureMonths; i++) {
    const interest = remaining * monthlyRate;
    const principalComponent = monthlyPayment - interest;
    // rounding
    const interestRounded = roundTo(interest, decimals);
    let principalRounded = roundTo(principalComponent, decimals);

    // For last installment, adjust principal to clear balance to avoid rounding drift
    if (i === tenureMonths) {
      principalRounded = roundTo(remaining, decimals);
    }

    const paymentAmount = roundTo(principalRounded + interestRounded, decimals);
    remaining = roundTo(remaining - principalRounded, decimals);

    schedule.push({
      installment: i,
      paymentDate: addMonths(startDate, i - 1).toISOString(),
      paymentAmount,
      principal: principalRounded,
      interest: interestRounded,
      remainingBalance: remaining
    });

    totalInterest += interestRounded;
  }

  const totalPayment = roundTo(principal + totalInterest, decimals);

  return {
    monthlyPayment: monthlyPaymentRounded,
    totalInterest: roundTo(totalInterest, decimals),
    totalPayment,
    emiSchedule: schedule
  };
}

/**
 * EMI Breakdown with penalty details
 */
export type EMIBreakdown = {
  principal: number;         // Principal component of current EMI
  interest: number;          // Interest component of current EMI
  overdue: number;           // Total overdue amount (sum of unpaid EMIs from previous months)
  overdueEmiPenalty: number; // Penalty on overdue EMIs (4% × EMI × months overdue - industry standard)
  monthsOverdue: number;     // Number of months overdue for current EMI
  daysLate: number;          // Number of days late for current EMI payment
  latePaymentPenalty: number; // Daily penalty on current EMI (0.01% per day × days late)
  penalty: number;           // Total penalty (overdueEmiPenalty + latePaymentPenalty)
  totalDue: number;          // Total amount customer must pay (principal + interest + penalty)
  emiAmount: number;         // Original EMI amount (principal + interest)
  lateFee: number;           // Same as penalty (for database field)
};

/**
 * Calculate total overdue amount from unpaid EMIs
 * @param emis - Array of EMI records with status and amounts
 * @param currentEmiNumber - Current EMI number to exclude
 * @returns Total overdue amount
 */
export function calculateOverdueAmount(
  emis: Array<{
    emiNumber: number;
    status: string;
    emiAmount: number;
    lateFee: number;
  }>,
  currentEmiNumber: number
): number {
  // Sum all unpaid EMIs before current EMI (including their late fees)
  const overdueAmount = emis
    .filter(emi => 
      emi.emiNumber < currentEmiNumber && 
      (emi.status === 'PENDING' || emi.status === 'OVERDUE')
    )
    .reduce((sum, emi) => sum + emi.emiAmount + emi.lateFee, 0);
  
  return roundTo(overdueAmount, 2);
}

/**
 * Calculate penalty (percentage of EMI amount per month - industry standard)
 * @param emiAmount - EMI amount (principal + interest)
 * @param monthsOverdue - Number of months overdue
 * @param penaltyRate - Monthly penalty rate (default 4%)
 * @returns Penalty amount
 */
export function calculatePenalty(
  emiAmount: number,
  monthsOverdue: number,
  penaltyRate: number = 4
): number {
  if (emiAmount <= 0 || monthsOverdue <= 0) return 0;
  // Industry standard: penaltyRate% × EMI × months overdue
  const penalty = (emiAmount * penaltyRate * monthsOverdue) / 100;
  return roundTo(penalty, 2);
}

/**
 * Calculate late payment penalty based on days late
 * @param emiAmount - Current EMI amount
 * @param daysLate - Number of days late
 * @param dailyRate - Daily penalty rate (default 0.01%)
 * @returns Late payment penalty amount
 */
export function calculateLatePaymentPenalty(
  emiAmount: number,
  daysLate: number,
  dailyRate: number = 0.01
): number {
  if (daysLate <= 0 || emiAmount <= 0) return 0;
  const penalty = (emiAmount * dailyRate * daysLate) / 100;
  return roundTo(penalty, 2);
}

/**
 * Calculate number of days late for an EMI (for late fee calculation - no grace period)
 * @param dueDate - EMI due date (ISO string)
 * @param paymentDate - Payment date (ISO string or Date, defaults to today)
 * @returns Number of days late (0 if not late)
 */
export function calculateDaysLate(
  dueDate: string,
  paymentDate: string | Date = new Date()
): number {
  const due = new Date(dueDate);
  const payment = typeof paymentDate === 'string' ? new Date(paymentDate) : paymentDate;
  
  // Reset time to start of day for accurate date comparison
  due.setHours(0, 0, 0, 0);
  payment.setHours(0, 0, 0, 0);
  
  const diffMs = payment.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays); // Return 0 if not late
}

/**
 * Calculate number of months overdue (for penalty calculation)
 * @param dueDate - EMI due date (ISO string)
 * @param paymentDate - Payment date (ISO string or Date, defaults to today)
 * @param gracePeriodDays - Grace period in days before penalty applies (default 30)
 * @returns Number of full months overdue (0 if within grace period)
 */
export function calculateMonthsOverdue(
  dueDate: string,
  paymentDate: string | Date = new Date(),
  gracePeriodDays: number = 30
): number {
  const due = new Date(dueDate);
  const payment = typeof paymentDate === 'string' ? new Date(paymentDate) : paymentDate;
  
  // Reset time to start of day for accurate date comparison
  due.setHours(0, 0, 0, 0);
  payment.setHours(0, 0, 0, 0);
  
  const diffMs = payment.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Only count days after grace period
  const daysAfterGrace = diffDays - gracePeriodDays;
  
  if (daysAfterGrace <= 0) return 0;
  
  // Calculate months (ceiling to charge for partial month)
  const monthsOverdue = Math.ceil(daysAfterGrace / 30);
  
  return monthsOverdue;
}

/**
 * Calculate number of days overdue after grace period (for penalty calculation)
 * @param dueDate - EMI due date (ISO string)
 * @param paymentDate - Payment date (ISO string or Date, defaults to today)
 * @param gracePeriodDays - Grace period in days before penalty applies (default 30)
 * @returns Number of days overdue after grace period (0 if within grace period)
 */
export function calculateDaysOverdue(
  dueDate: string,
  paymentDate: string | Date = new Date(),
  gracePeriodDays: number = 30
): number {
  const due = new Date(dueDate);
  const payment = typeof paymentDate === 'string' ? new Date(paymentDate) : paymentDate;
  
  // Reset time to start of day for accurate date comparison
  due.setHours(0, 0, 0, 0);
  payment.setHours(0, 0, 0, 0);
  
  const diffMs = payment.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Only count days after grace period
  const daysAfterGrace = diffDays - gracePeriodDays;
  
  return Math.max(0, daysAfterGrace); // Return 0 if within grace period or not late
}

/**
 * Calculate complete EMI breakdown including penalty
 * 
 * PAYMENT LOGIC:
 * - Customer MUST pay EMIs sequentially (enforced at API level)
 * - When paying EMI #N, they pay ONLY for EMI #N (not previous skipped EMIs)
 * - However, penalty includes overdue penalty based on months overdue
 * 
 * PENALTY CALCULATION (Industry Standard):
 * - Overdue Penalty: 4% × EMI Amount × Months Overdue (per-month compounding)
 * - Late Fee: 0.01% per day from day 1 (no grace period) on current EMI only
 * - Total Due = Current EMI + Late Fee + Overdue Penalty
 * 
 * @param currentEmi - Current EMI details
 * @param allEmis - All EMI records for the loan
 * @param penaltyRate - Monthly overdue penalty rate (default 4%)
 * @param dailyPenaltyRate - Daily penalty rate (default 0.01%)
 * @param paymentDate - Payment date for calculating days late (defaults to today)
 * @param gracePeriodDays - Grace period before penalties apply (default 30)
 * @returns Complete EMI breakdown
 */
export function calculateEmiBreakdown(
  currentEmi: {
    emiNumber: number;
    emiAmount: number;
    principalAmount: number;
    interestAmount: number;
    status: string;
    dueDate: string;
  },
  allEmis: Array<{
    emiNumber: number;
    status: string;
    emiAmount: number;
    lateFee: number;
    dueDate: string;
  }>,
  penaltyRate: number = 4,
  dailyPenaltyRate: number = 0.01,
  paymentDate: string | Date = new Date(),
  gracePeriodDays: number = 30
): EMIBreakdown {
  const currentDate = typeof paymentDate === 'string' ? new Date(paymentDate) : paymentDate;
  
  // Calculate months overdue for CURRENT EMI (industry standard per-month penalty)
  const monthsOverdue = calculateMonthsOverdue(currentEmi.dueDate, currentDate, gracePeriodDays);
  
  // Calculate overdue penalty: 4% × EMI × months overdue
  // Example: EMI ₹10,500, 3 months overdue = 4% × ₹10,500 × 3 = ₹1,260
  const overdueEmiPenalty = calculatePenalty(currentEmi.emiAmount, monthsOverdue, penaltyRate);
  
  // Calculate total overdue amount from ALL unpaid EMIs before current (for reference)
  let overdueAmount = 0;
  
  for (const emi of allEmis) {
    if (emi.emiNumber >= currentEmi.emiNumber) continue;
    if (emi.status !== 'PENDING' && emi.status !== 'OVERDUE') continue;
    
    const daysOverdue = calculateDaysOverdue(emi.dueDate, currentDate, gracePeriodDays);
    if (daysOverdue > 0) {
      overdueAmount += emi.emiAmount;
    }
  }
  
  // Calculate days late for CURRENT EMI (from due date, no grace period for daily charges)
  const daysLate = calculateDaysLate(currentEmi.dueDate, paymentDate);
  
  // Calculate late payment penalty (0.01% per day on current EMI only)
  // Example: ₹10,500 × 0.01% × 30 days = ₹31.50
  const latePaymentPenalty = calculateLatePaymentPenalty(
    currentEmi.emiAmount,
    daysLate,
    dailyPenaltyRate
  );
  
  // Total penalty = Overdue penalty (per month) + Late fee (per day)
  const totalPenalty = roundTo(overdueEmiPenalty + latePaymentPenalty, 2);
  
  // Total amount customer must pay for CURRENT EMI
  const totalDue = roundTo(
    currentEmi.principalAmount + currentEmi.interestAmount + totalPenalty,
    2
  );

  return {
    principal: roundTo(currentEmi.principalAmount, 2),
    interest: roundTo(currentEmi.interestAmount, 2),
    overdue: roundTo(overdueAmount, 2),
    overdueEmiPenalty: roundTo(overdueEmiPenalty, 2),
    monthsOverdue,
    daysLate,
    latePaymentPenalty: roundTo(latePaymentPenalty, 2),
    penalty: totalPenalty,
    totalDue,
    emiAmount: roundTo(currentEmi.emiAmount, 2),
    lateFee: totalPenalty,
  };
}

/**
 * Check if EMI is overdue
 * @param dueDate - EMI due date (ISO string)
 * @param status - Current EMI status
 * @param gracePeriodDays - Grace period in days (default 0)
 * @returns true if EMI is overdue
 */
export function isEmiOverdue(
  dueDate: string,
  status: string,
  gracePeriodDays: number = 0
): boolean {
  if (status === 'PAID') return false;
  
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  const gracePeriodMs = gracePeriodDays * 24 * 60 * 60 * 1000;
  const overdueThreshold = new Date(due.getTime() + gracePeriodMs);
  
  return today > overdueThreshold;
}

export default calculateEmiSchedule;
