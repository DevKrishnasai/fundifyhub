import bcrypt from "bcrypt";
import { randomUUID } from 'crypto';
import { prisma } from "../src/client";

// EMI Calculation utilities
function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
  const monthlyRate = annualRate / (12 * 100);
  const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) /
              (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return Math.round(emi * 100) / 100;
}

function calculateTotalInterest(principal: number, annualRate: number, tenureMonths: number): number {
  const emi = calculateEMI(principal, annualRate, tenureMonths);
  return Math.round((emi * tenureMonths - principal) * 100) / 100;
}

function calculatePrincipalInterestSplit(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  emiNumber: number
): { principal: number; interest: number } {
  const monthlyRate = annualRate / (12 * 100);
  const emi = calculateEMI(principal, annualRate, tenureMonths);

  const interest = Math.round((principal * monthlyRate) * 100) / 100;
  const principalPart = Math.round((emi - interest) * 100) / 100;

  return { principal: principalPart, interest };
}

// Constants
const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD || "Password123!";
const DEFAULT_PENALTY_PERCENTAGE = 4;
const DEFAULT_LATE_FEE_PERCENTAGE = 0.01;

async function main() {
  console.log("🌱 Starting comprehensive database seeding for testing...");

  // Initialize serial counters
  await prisma.serialCounter.upsert({
    where: { id: 'REQUEST' },
    update: {},
    create: { id: 'REQUEST', seq: 1000 }
  });
  await prisma.serialCounter.upsert({
    where: { id: 'LOAN' },
    update: {},
    create: { id: 'LOAN', seq: 1000 }
  });

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Helper functions
  async function nextSerial(id: string, startAt = 1000) {
    try {
      const updated = await prisma.serialCounter.update({
        where: { id },
        data: { seq: { increment: 1 } },
        select: { seq: true },
      });
      return updated.seq;
    } catch (err) {
      try {
        const created = await prisma.serialCounter.create({ data: { id, seq: startAt } });
        return created.seq;
      } catch (innerErr) {
        const existing = await prisma.serialCounter.findUnique({ where: { id } });
        return existing ? existing.seq : startAt;
      }
    }
  }

  // Test user data
  const testUsers = [
    // Customers with different districts
    {
      firstName: "Rahul", lastName: "Sharma", email: "rahul.sharma@test.com",
      phone: "+919810000001", district: ["Delhi"], city: "New Delhi", state: "Delhi"
    },
    {
      firstName: "Priya", lastName: "Patel", email: "priya.patel@test.com",
      phone: "+919810000002", district: ["Mumbai"], city: "Mumbai", state: "Maharashtra"
    },
    {
      firstName: "Amit", lastName: "Kumar", email: "amit.kumar@test.com",
      phone: "+919810000003", district: ["Bangalore"], city: "Bangalore", state: "Karnataka"
    },
    {
      firstName: "Sneha", lastName: "Singh", email: "sneha.singh@test.com",
      phone: "+919810000004", district: ["Chennai"], city: "Chennai", state: "Tamil Nadu"
    },
    {
      firstName: "Vikram", lastName: "Joshi", email: "vikram.joshi@test.com",
      phone: "+919810000005", district: ["Pune"], city: "Pune", state: "Maharashtra"
    },

    // Agents
    {
      firstName: "Rajesh", lastName: "Verma", email: "agent.delhi@fundifyhub.com",
      phone: "+919820000001", district: ["Delhi"], roles: ["AGENT"]
    },
    {
      firstName: "Kavita", lastName: "Shah", email: "agent.mumbai@fundifyhub.com",
      phone: "+919820000002", district: ["Mumbai"], roles: ["AGENT"]
    },
    {
      firstName: "Suresh", lastName: "Rao", email: "agent.bangalore@fundifyhub.com",
      phone: "+919820000003", district: ["Bangalore"], roles: ["AGENT"]
    },

    // District Admins
    {
      firstName: "Anita", lastName: "Gupta", email: "admin.delhi@fundifyhub.com",
      phone: "+919830000001", district: ["Delhi"], roles: ["DISTRICT_ADMIN"]
    },
    {
      firstName: "Mohan", lastName: "Desai", email: "admin.mumbai@fundifyhub.com",
      phone: "+919830000002", district: ["Mumbai"], roles: ["DISTRICT_ADMIN"]
    },

    // Super Admin
    {
      firstName: "Super", lastName: "Admin", email: "super.admin@fundifyhub.com",
      phone: "+919876543210", district: ["Delhi", "Mumbai", "Bangalore", "Chennai", "Pune"], roles: ["SUPER_ADMIN"]
    }
  ];

  // Create users
  const users = [];
  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phoneNumber: userData.phone,
        password: hashedPassword,
        roles: userData.roles || ["CUSTOMER"],
        district: userData.district,
        city: userData.city,
        state: userData.state,
        emailVerified: true,
        phoneVerified: true,
      },
    });
    users.push(user);
  }

  const customers = users.filter(u => u.roles.includes("CUSTOMER"));
  const agents = users.filter(u => u.roles.includes("AGENT"));
  const admins = users.filter(u => u.roles.includes("DISTRICT_ADMIN") || u.roles.includes("SUPER_ADMIN"));

  console.log(`✅ Created ${users.length} users (${customers.length} customers, ${agents.length} agents, ${admins.length} admins)`);

  // Test scenarios for comprehensive testing
  const testScenarios = [
    // Scenario 1: Brand new request
    {
      customer: customers[0],
      status: "PENDING",
      requestedAmount: 100000,
      district: "Delhi",
      assetType: "MOTORCYCLE",
      assetBrand: "Honda",
      assetModel: "CB300R",
      purchaseYear: 2022,
      condition: "EXCELLENT"
    },

    // Scenario 2: Under review with agent assigned
    {
      customer: customers[0],
      status: "UNDER_REVIEW",
      requestedAmount: 150000,
      district: "Delhi",
      assetType: "LAPTOP",
      assetBrand: "Dell",
      assetModel: "XPS 13",
      purchaseYear: 2021,
      condition: "GOOD",
      assignedAgent: agents.find(a => a.district.includes("Delhi"))
    },

    // Scenario 3: Offer sent but not accepted
    {
      customer: customers[1],
      status: "OFFER_SENT",
      requestedAmount: 200000,
      district: "Mumbai",
      assetType: "MOTORCYCLE",
      assetBrand: "Royal Enfield",
      assetModel: "Classic 350",
      purchaseYear: 2020,
      condition: "GOOD",
      offer: { amount: 180000, tenure: 24, interest: 12 },
      assignedAgent: agents.find(a => a.district.includes("Mumbai"))
    },

    // Scenario 4: Offer accepted, waiting for inspection
    {
      customer: customers[1],
      status: "OFFER_ACCEPTED",
      requestedAmount: 250000,
      district: "Mumbai",
      assetType: "JEWELRY",
      assetBrand: "Gold",
      assetModel: "Necklace Set",
      purchaseYear: 2023,
      condition: "EXCELLENT",
      offer: { amount: 225000, tenure: 18, interest: 10 },
      assignedAgent: agents.find(a => a.district.includes("Mumbai"))
    },

    // Scenario 5: Inspection scheduled
    {
      customer: customers[2],
      status: "INSPECTION_SCHEDULED",
      requestedAmount: 300000,
      district: "Bangalore",
      assetType: "MOTORCYCLE",
      assetBrand: "KTM",
      assetModel: "Duke 390",
      purchaseYear: 2022,
      condition: "EXCELLENT",
      offer: { amount: 270000, tenure: 36, interest: 14 },
      assignedAgent: agents.find(a => a.district.includes("Bangalore")),
      inspectionScheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
    },

    // Scenario 6: Inspection completed, approved
    {
      customer: customers[2],
      status: "APPROVED",
      requestedAmount: 180000,
      district: "Bangalore",
      assetType: "LAPTOP",
      assetBrand: "Apple",
      assetModel: "MacBook Pro 14",
      purchaseYear: 2021,
      condition: "GOOD",
      offer: { amount: 162000, tenure: 24, interest: 11 },
      assignedAgent: agents.find(a => a.district.includes("Bangalore"))
    },

    // Scenario 7: Amount disbursed, waiting for signature
    {
      customer: customers[3],
      status: "AMOUNT_DISBURSED",
      requestedAmount: 120000,
      district: "Chennai",
      assetType: "MOTORCYCLE",
      assetBrand: "Suzuki",
      assetModel: "Gixxer SF",
      purchaseYear: 2023,
      condition: "EXCELLENT",
      offer: { amount: 108000, tenure: 12, interest: 13 },
      assignedAgent: agents.find(a => a.district.includes("Chennai"))
    },

    // Scenario 8: ACTIVE loan - just disbursed, no EMIs due yet
    {
      customer: customers[3],
      status: "ACTIVE",
      requestedAmount: 80000,
      district: "Chennai",
      assetType: "ELECTRONICS",
      assetBrand: "Samsung",
      assetModel: "Galaxy S23",
      purchaseYear: 2023,
      condition: "EXCELLENT",
      offer: { amount: 72000, tenure: 12, interest: 12 },
      hasLoan: true,
      loanStatus: "ACTIVE",
      disbursedDaysAgo: 5
    },

    // Scenario 9: ACTIVE loan - some EMIs paid, some pending
    {
      customer: customers[4],
      status: "ACTIVE",
      requestedAmount: 500000,
      district: "Pune",
      assetType: "MOTORCYCLE",
      assetBrand: "BMW",
      assetModel: "G 310 R",
      purchaseYear: 2022,
      condition: "EXCELLENT",
      offer: { amount: 450000, tenure: 36, interest: 15 },
      hasLoan: true,
      loanStatus: "ACTIVE",
      disbursedDaysAgo: 120, // 4 months ago
      emisPaid: 4 // 4 EMIs paid out of 36
    },

    // Scenario 10: ACTIVE loan - with overdue EMIs
    {
      customer: customers[4],
      status: "ACTIVE",
      requestedAmount: 350000,
      district: "Pune",
      assetType: "LAPTOP",
      assetBrand: "HP",
      assetModel: "Pavilion 15",
      purchaseYear: 2021,
      condition: "GOOD",
      offer: { amount: 315000, tenure: 24, interest: 13 },
      hasLoan: true,
      loanStatus: "ACTIVE",
      disbursedDaysAgo: 200, // ~6 months ago
      emisPaid: 5, // 5 EMIs paid, 1 overdue
      hasOverdue: true
    },

    // Scenario 11: COMPLETED loan
    {
      customer: customers[0],
      status: "COMPLETED",
      requestedAmount: 60000,
      district: "Delhi",
      assetType: "MOTORCYCLE",
      assetBrand: "Hero",
      assetModel: "Splendor Plus",
      purchaseYear: 2020,
      condition: "FAIR",
      offer: { amount: 54000, tenure: 12, interest: 14 },
      hasLoan: true,
      loanStatus: "COMPLETED",
      disbursedDaysAgo: 400, // ~13 months ago
      emisPaid: 12 // All EMIs paid
    }
  ];

  // Create requests with comprehensive data
  const requests = [];
  for (const scenario of testScenarios) {
    const seq = await nextSerial('REQUEST', 1000);
    const requestNumber = `REQ${seq}`;

    const requestData: any = {
      requestNumber,
      customerId: scenario.customer.id,
      requestedAmount: scenario.requestedAmount,
      district: scenario.district,
      currentStatus: scenario.status,
      purchaseYear: scenario.purchaseYear,
      assetType: scenario.assetType,
      assetBrand: scenario.assetBrand,
      assetModel: scenario.assetModel,
      assetCondition: scenario.condition,
      AdditionalDescription: `Test scenario: ${scenario.status} - ${scenario.assetBrand} ${scenario.assetModel}`,
      assignedAgentId: scenario.assignedAgent?.id || null,
      penaltyPercentage: DEFAULT_PENALTY_PERCENTAGE,
      lateFeePercentage: DEFAULT_LATE_FEE_PERCENTAGE,
      adminProcessingFee: 0,
      inspectionScheduledAt: scenario.inspectionScheduledAt || null,
    };

    // Add offer data if present
    if (scenario.offer) {
      requestData.adminOfferedAmount = scenario.offer.amount;
      requestData.adminTenureMonths = scenario.offer.tenure;
      requestData.adminInterestRate = scenario.offer.interest;
      requestData.offerMadeDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      if (["OFFER_ACCEPTED", "INSPECTION_SCHEDULED", "INSPECTION_COMPLETED", "APPROVED", "AMOUNT_DISBURSED", "PENDING_SIGNATURE", "ACTIVE", "COMPLETED"].includes(scenario.status)) {
        requestData.offerResponseDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      }
    }

    // Add bank details for advanced statuses
    if (["AMOUNT_DISBURSED", "PENDING_SIGNATURE", "ACTIVE", "COMPLETED"].includes(scenario.status)) {
      requestData.bankAccountNumber = `ACC${Math.floor(Math.random() * 9000000000) + 1000000000}`;
      requestData.bankIfscCode = ["HDFC0000123", "ICIC0000456", "SBIN0000789", "AXIS0000987"][Math.floor(Math.random() * 4)];
      requestData.bankAccountName = `${scenario.customer.firstName} ${scenario.customer.lastName}`;
      requestData.upiId = `${scenario.customer.email.split('@')[0]}@paytm`;
      requestData.bankDetailsSubmittedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    }

    const request = await prisma.request.create({ data: requestData });
    requests.push({ ...request, scenario });
  }

  console.log(`✅ Created ${requests.length} test requests with comprehensive scenarios`);

  // ---------------------------------------
  // LOANS + EMI + PAYMENTS + PAYMENT ORDERS
  // ---------------------------------------
  const loans = [];
  const emis = [];
  const payments = [];
  const paymentOrders = [];

  for (const req of requests) {
    // Only create loans for ACTIVE and COMPLETED requests (loans are created after disbursement and signature)
    if (!['ACTIVE', 'COMPLETED'].includes(req.currentStatus)) continue;

    const approvedAmount = Math.max( Math.round((req.adminOfferedAmount || req.requestedAmount) * 0.95), 1000 );
    const interestRate = req.adminInterestRate || 12;
    const tenureMonths = req.adminTenureMonths || 6;
    const emiAmount = parseFloat(((approvedAmount * (1 + interestRate / 100)) / tenureMonths).toFixed(2));
    const totalInterest = Math.round(approvedAmount * (interestRate / 100));
    const totalAmount = approvedAmount + totalInterest;

    const loanSeq = await nextSerial('LOAN', 1000);
    const loanNumber = `LN${loanSeq}`;

    const loan = await prisma.loan.create({
      data: {
        loanNumber,
        requestId: req.id,
        approvedAmount,
        interestRate,
        tenureMonths,
        emiAmount,
        totalInterest,
        totalAmount,
        status: 'ACTIVE',
        approvedDate: new Date(),
        disbursedDate: new Date(),
        firstEMIDate: new Date(),
        lastEMIDate: new Date(Date.now() + tenureMonths * 30 * 24 * 60 * 60 * 1000),
        totalPaidAmount: 0,
        remainingAmount: totalAmount,
        paidEMIs: 0,
        remainingEMIs: tenureMonths,
        overdueEMIs: 0,
      },
    });
    loans.push(loan);

    // EMI Schedule - Create comprehensive EMI scenarios for testing
    for (let n = 1; n <= tenureMonths; n++) {
      const dueDate = new Date(Date.now() - (tenureMonths - n) * 30 * 24 * 60 * 60 * 1000); // Past dates for realism
      const daysLate = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / (24 * 60 * 60 * 1000)));

      let status = "PENDING";
      let paidDate = null;
      let paidAmount = null;
      let lateFee = 0;

      // For ACTIVE loans, create diverse payment scenarios
      if (req.currentStatus === 'ACTIVE') {
        if (n === 1) {
          // First EMI always paid
          status = "PAID";
          paidDate = new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000); // Paid 2 days after due
          paidAmount = emiAmount;
        } else if (n === 2 && daysLate > 5) {
          // Second EMI overdue with high penalty
          status = "OVERDUE";
          // Calculate late fees - high penalty scenario
          const dailyLateRate = DEFAULT_LATE_FEE_PERCENTAGE / 100;
          const dailyLateFee = Number((emiAmount * dailyLateRate * Math.max(0, daysLate - 30)).toFixed(2));
          const overduePenalty = daysLate > 30 ? Number((emiAmount * (DEFAULT_PENALTY_PERCENTAGE / 100)).toFixed(2)) : 0;
          lateFee = Math.round((dailyLateFee + overduePenalty) * 100) / 100;
        } else if (n === 3) {
          // Third EMI pending but approaching due date
          status = "PENDING";
          // No late fee yet
        } else if (n === 4 && req.scenario.customer.email === "john.customer@example.com") {
          // Special scenario: EMI with multiple payment attempts
          status = "OVERDUE";
          const overdueDays = Math.max(0, daysLate - 30);
          lateFee = Number((emiAmount * (DEFAULT_PENALTY_PERCENTAGE / 100 + overdueDays * DEFAULT_LATE_FEE_PERCENTAGE / 100)).toFixed(2));
        } else if (n <= Math.floor(tenureMonths * 0.7)) {
          // 70% of EMIs paid for active loans
          status = "PAID";
          paidDate = new Date(dueDate.getTime() + Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000);
          paidAmount = emiAmount;
        }
        // Rest remain pending
      } else if (req.currentStatus === 'COMPLETED') {
        // All EMIs paid for completed loans
        status = "PAID";
        paidDate = new Date(dueDate.getTime() + Math.floor(Math.random() * 15) * 24 * 60 * 60 * 1000);
        paidAmount = emiAmount;
      }

      const emi = await prisma.eMISchedule.create({
        data: {
          loanId: loan.id,
          requestId: req.id,
          emiNumber: n,
          dueDate,
          emiAmount,
          principalAmount: Math.round((approvedAmount / tenureMonths) * 100) / 100,
          interestAmount: Math.round((totalInterest / tenureMonths) * 100) / 100,
          status,
          paidDate,
          paidAmount,
          lateFee,
        },
      });
      emis.push(emi);

      // Create payment record for paid EMIs
      if (status === "PAID" && paidDate) {
        const payment = await prisma.payment.create({
          data: {
            loanId: loan.id,
            requestId: req.id,
            emiScheduleId: emi.id,
            amount: paidAmount!,
            paymentType: "EMI",
            paymentMethod: ["UPI", "BANK_TRANSFER", "CASH"][Math.floor(Math.random() * 3)],
            paymentReference: `TXN-${randomUUID()}`,
            processedBy: req.customerId,
          },
        });
        payments.push(payment);

        // Create payment order for ALL paid EMIs (successful payment)
        const paymentOrder = await prisma.paymentOrder.create({
          data: {
            razorpayOrderId: `order_${randomUUID()}`,
            loanId: loan.id,
            requestId: req.id,
            emiScheduleId: emi.id,
            customerId: req.customerId,
            emiAmount: emiAmount,
            penalty: lateFee || 0,
            totalAmount: emiAmount + (lateFee || 0),
            status: "PAID",
            attempts: 1,
            lastAttemptAt: paidDate,
            razorpayPaymentId: `pay_${randomUUID()}`,
            razorpaySignature: `signature_${randomUUID()}`,
            paymentMethod: ["card", "upi", "netbanking"][Math.floor(Math.random() * 3)],
            paidAt: paidDate,
            expiresAt: new Date(paidDate.getTime() + 30 * 60 * 1000), // 30 minutes from payment
            notes: {
              emi_number: n,
              customer_email: req.scenario.customer.email,
              test_scenario: `EMI ${n} successful payment`
            }
          },
        });
        paymentOrders.push(paymentOrder);
      }

      // Create Payment Orders for specific EMI scenarios (overdue/failed attempts)
      if (req.scenario.customer.email === "john.customer@example.com" && (n === 2 || n === 4)) {
        // Create payment orders for overdue EMIs to test payment flow
        const orderStatus = n === 2 ? "CREATED" : ["ATTEMPTED", "FAILED", "EXPIRED"][Math.floor(Math.random() * 4)];
        const attempts = orderStatus === "ATTEMPTED" ? Math.floor(Math.random() * 3) + 1 : 0;

        const paymentOrder = await prisma.paymentOrder.create({
          data: {
            razorpayOrderId: `order_${randomUUID()}`,
            loanId: loan.id,
            requestId: req.id,
            emiScheduleId: emi.id,
            customerId: req.customerId,
            emiAmount: emiAmount,
            penalty: lateFee,
            totalAmount: emiAmount + lateFee,
            status: orderStatus,
            attempts: attempts,
            lastAttemptAt: attempts > 0 ? new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000) : null,
            razorpayPaymentId: orderStatus === "PAID" ? `pay_${randomUUID()}` : null,
            razorpaySignature: orderStatus === "PAID" ? `signature_${randomUUID()}` : null,
            paymentMethod: orderStatus === "PAID" ? ["card", "upi", "netbanking"][Math.floor(Math.random() * 3)] : null,
            paidAt: orderStatus === "PAID" ? new Date() : null,
            failureReason: orderStatus === "FAILED" ? "Payment cancelled by user" : null,
            failureCode: orderStatus === "FAILED" ? "CANCELLED" : null,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
            notes: {
              emi_number: n,
              customer_email: req.scenario.customer.email,
              test_scenario: `EMI ${n} payment order`
            }
          },
        });
        paymentOrders.push(paymentOrder);

        // Create additional failed attempts for EMI 4
        if (n === 4 && orderStatus === "ATTEMPTED") {
          for (let attempt = 1; attempt <= attempts - 1; attempt++) {
            const failedOrder = await prisma.paymentOrder.create({
              data: {
                razorpayOrderId: `order_${randomUUID()}`,
                loanId: loan.id,
                requestId: req.id,
                emiScheduleId: emi.id,
                customerId: req.customerId,
                emiAmount: emiAmount,
                penalty: lateFee,
                totalAmount: emiAmount + lateFee,
                status: "FAILED",
                attempts: 1,
                lastAttemptAt: new Date(Date.now() - attempt * 24 * 60 * 60 * 1000),
                failureReason: ["Payment timeout", "Insufficient funds", "Card declined"][Math.floor(Math.random() * 3)],
                failureCode: ["TIMEOUT", "INSUFFICIENT_FUNDS", "DECLINED"][Math.floor(Math.random() * 3)],
                expiresAt: new Date(Date.now() - attempt * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
                notes: {
                  emi_number: n,
                  attempt_number: attempt,
                  failure_type: "test_failure"
                }
              },
            });
            paymentOrders.push(failedOrder);
          }
        }
      }
    }

    // Recalculate loan aggregate fields based on actual EMI statuses
    const allEmisForLoan = await prisma.eMISchedule.findMany({
      where: { loanId: loan.id }
    });

    const paidEmisCount = allEmisForLoan.filter(e => e.status === 'PAID').length;
    const totalPaidAmount = allEmisForLoan
      .filter(e => e.status === 'PAID')
      .reduce((sum, e) => sum + e.emiAmount + (e.lateFee || 0), 0);
    const remainingAmount = loan.totalAmount - totalPaidAmount;
    const remainingEmisCount = allEmisForLoan.filter(e => e.status !== 'PAID').length;
    const overdueEmisCount = allEmisForLoan.filter(e => e.status === 'OVERDUE').length;

    // Update loan with recalculated values
    await prisma.loan.update({
      where: { id: loan.id },
      data: {
        paidEMIs: paidEmisCount,
        totalPaidAmount,
        remainingAmount: Math.max(0, remainingAmount),
        remainingEMIs: remainingEmisCount,
        overdueEMIs: overdueEmisCount,
        status: paidEmisCount === loan.tenureMonths ? 'COMPLETED' : 'ACTIVE'
      }
    });
  }

  console.log(`✅ Created ${loans.length} loans, ${emis.length} EMIs, ${payments.length} payments, ${paymentOrders.length} payment orders`);

  // ---------------------------------------
  // BANK DETAILS (for requests with loans)
  // ---------------------------------------
  for (const req of requests) {
    if (['ACTIVE', 'COMPLETED'].includes(req.currentStatus)) {
      // Find the customer for this request
      const customer = customers.find(c => c.id === req.customerId);
      if (customer) {
        await prisma.request.update({
          where: { id: req.id },
          data: {
            bankAccountNumber: `ACC${Math.floor(Math.random() * 9000000000) + 1000000000}`,
            bankIfscCode: ["HDFC0000123", "ICIC0000456", "SBIN0000789", "AXIS0000987"][Math.floor(Math.random() * 4)],
            bankAccountName: customer.firstName + " " + customer.lastName,
            upiId: `${customer.email.split('@')[0]}@paytm`,
            bankDetailsSubmittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          },
        });
      }
    }
  }

  console.log(`✅ Updated bank details for ${loans.length} requests with loans`);

  // ---------------------------------------
  // DOCUMENTS
  // ---------------------------------------
  await Promise.all(
    requests.map((req, i) =>
      prisma.document.create({
        data: {
          requestId: req.id,
          fileKey: `demo-file-key-${req.id}-${i}`,
          fileName: `document-${req.id}-${i}.pdf`,
          fileSize: 1024000,
          fileType: "application/pdf",
          documentType: "id_proof",
          documentCategory: "KYC",
          uploadedBy: customers[0].id,
          isVerified: true,
          verifiedBy: admins[0].id,
          verifiedAt: new Date(),
        },
      })
    )
  );

  // ---------------------------------------
  // COMMENTS
  // ---------------------------------------
  await Promise.all(
    requests.map((req, i) =>
      prisma.comment.create({
        data: {
          requestId: req.id,
          authorId: admins[0].id,
          content: `This is a comment for request ${i + 1}`,
          commentType: "GENERAL",
        },
      })
    )
  );

  // ---------------------------------------
  // INSPECTIONS
  // ---------------------------------------
  await Promise.all(
    requests.map((req) =>
      prisma.inspection.create({
        data: {
          requestId: req.id,
          agentId: agents[0].id,
          scheduledDate: new Date(),
          completedDate: new Date(),
          status: "COMPLETED",
          assetCondition: "Good",
          estimatedValue: req.requestedAmount - 10000,
          recommendApprove: true,
        },
      })
    )
  );

  // ---------------------------------------
  // OTP VERIFICATIONS
  // ---------------------------------------
  // NOTE: Schema change: `maxAttempts` and `resendCount` were removed and
  // attempts/resend enforcement is performed via Redis sliding-window rate
  // limiters (Policy B). The audit row only stores the hashed code and
  // verification flags for seeded demo users below.
  await prisma.oTPVerification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      identifier: user.email,
      type: "EMAIL",
      code: "123456",
      expiresAt: new Date(Date.now() + 1000 * 60 * 10),
      // sessionId is required by the new schema — seed with a UUID per row
      sessionId: randomUUID(),
      // session-level attempts are tracked in Redis at runtime; seed the
      // audit row with isUsed/isVerified for demo convenience.
      isUsed: true,
      isVerified: true,
    })),
    skipDuplicates: true,
  });

  // Note: verification sessions are not seeded. OTP state is tracked at runtime using
  // Redis-backed sessions and audited in the `OTPVerification` table. The old
  // `VerificationSession` model was removed from the schema.

  // ---------------------------------------
  // SERVICE CONFIGS
  // ---------------------------------------
  const services = ["WHATSAPP", "EMAIL", "SMS"];
  await Promise.all(
    services.map((service) =>
      prisma.serviceConfig.upsert({
        where: { serviceName: service },
        update: {},
        create: {
          serviceName: service,
          isEnabled: true,
          isActive: true,
          connectionStatus: "CONNECTED",
          config: { apiKey: "demo-key", sender: "FundifyHub" },
          configuredBy: admins[0].id,
          configuredAt: new Date(),
        },
      })
    )
  );

  // ---------------------------------------
  // AGENT SPECIFIC SEED DATA (Mumbai Agent)
  // ---------------------------------------
  const mumbaiAgent = agents.find(a => a.email === 'agent.mumbai@fundifyhub.com');
  const mumbaiCustomer = customers.find(c => c.email === 'john.customer@example.com');

  if (mumbaiAgent && mumbaiCustomer) {
    console.log("Creating specific agent test data...");
    
    const agentScenarios = [
      { status: "INSPECTION_SCHEDULED", count: 3 },
      { status: "INSPECTION_IN_PROGRESS", count: 2 },
      { status: "INSPECTION_COMPLETED", count: 2 },
    ];

    for (const scenario of agentScenarios) {
      for (let i = 0; i < scenario.count; i++) {
        const seq = await nextSerial('REQUEST', 1000);
        const requestNumber = `REQ${seq}`;
        
        await prisma.request.create({
          data: {
            requestNumber,
            customerId: mumbaiCustomer.id,
            requestedAmount: 75000 + Math.floor(Math.random() * 50000),
            district: 'Mumbai',
            currentStatus: scenario.status,
            purchaseYear: 2020,
            assetType: 'ELECTRONICS',
            assetBrand: 'Apple',
            assetModel: `iPhone 1${i + 3} Pro`,
            assetCondition: 'GOOD',
            AdditionalDescription: `Agent Test Data: ${scenario.status} ${i+1}`,
            assignedAgentId: mumbaiAgent.id,
            penaltyPercentage: DEFAULT_PENALTY_PERCENTAGE,
            lateFeePercentage: DEFAULT_LATE_FEE_PERCENTAGE,
            adminProcessingFee: 0,
            inspectionScheduledAt: scenario.status === 'INSPECTION_SCHEDULED' ? new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000) : undefined,
            // Add offer details as these statuses imply an offer was accepted
            adminOfferedAmount: 70000,
            adminTenureMonths: 12,
            adminInterestRate: 12,
            offerMadeDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            offerResponseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          }
        });
      }
    }
  }

  console.log("✅ Seeding completed");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
