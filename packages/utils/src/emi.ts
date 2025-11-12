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

export default calculateEmiSchedule;
