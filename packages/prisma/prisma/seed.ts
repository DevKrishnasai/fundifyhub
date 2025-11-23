import { PrismaClient, User } from "@prisma/client";
import bcrypt from "bcrypt";
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting full database seeding...");

  const defaultPassword = process.env.SEED_USER_PASSWORD || "Password123!";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  // Penalty (one-time) and Late Fee (daily percentage) defaults used by the seed
  const DEFAULT_PENALTY_PERCENTAGE = 4; // 4% penalty
  const DEFAULT_LATE_FEE_PERCENTAGE = 1; // 1% late fee per day

  // Helper to increment/get serial counters in a safe way
  async function nextSerial(id: string, startAt = 1000) {
    try {
      const updated = await prisma.serialCounter.update({
        where: { id },
        data: { seq: { increment: 1 } },
        select: { seq: true },
      });
      return updated.seq;
    } catch (err) {
      // not found: create
      try {
        const created = await prisma.serialCounter.create({ data: { id, seq: startAt } });
        return created.seq;
      } catch (innerErr) {
        // If creation fails due to race, fallback to reading existing
        const existing = await prisma.serialCounter.findUnique({ where: { id } });
        return existing ? existing.seq : startAt;
      }
    }
  }

  // Check if RequestHistory table exists (some deployments/migrations may differ)
  let hasRequestHistory = false;
  try {
    // to_regclass returns null if table not present
  // raw result shape varies by Prisma runtime
  // @ts-ignore
  const rh = await prisma.$queryRaw`SELECT to_regclass('public.request_history') as name`;
    // rh may be an array or object depending on client; normalize
    if (rh) {
      const name = Array.isArray(rh) ? rh[0]?.name : (rh as any).name;
      hasRequestHistory = !!name;
    }
  } catch (err) {
    // silently continue; we'll skip creating history rows if not available
    hasRequestHistory = false;
  }

  // ---------------------------------------
  // USERS (more realistic demo set)
  // ---------------------------------------
  const users = await Promise.all([
    // Customers
    prisma.user.upsert({
      where: { email: "john.customer@example.com" },
      update: {},
      create: {
        firstName: "John",
        lastName: "Doe",
        email: "john.customer@example.com",
        phoneNumber: "+919810000001",
        password: hashedPassword,
        roles: ["CUSTOMER"],
        district: ["Mumbai"],
        emailVerified: true,
        phoneVerified: true,
        city: "Mumbai",
        state: "Maharashtra",
      },
    }),
    prisma.user.upsert({
      where: { email: "meena.k@example.com" },
      update: {},
      create: {
        firstName: "Meena",
        lastName: "Krishna",
        email: "meena.k@example.com",
        phoneNumber: "+919810000002",
        password: hashedPassword,
        roles: ["CUSTOMER"],
        district: ["Delhi"],
        emailVerified: true,
        phoneVerified: true,
        city: "New Delhi",
        state: "Delhi",
      },
    }),
    prisma.user.upsert({
      where: { email: "arjun.r@example.com" },
      update: {},
      create: {
        firstName: "Arjun",
        lastName: "Rao",
        email: "arjun.r@example.com",
        phoneNumber: "+919810000003",
        password: hashedPassword,
        roles: ["CUSTOMER"],
        district: ["Bangalore"],
        emailVerified: true,
        phoneVerified: true,
        city: "Bangalore",
        state: "Karnataka",
      },
    }),

    // Agents
    prisma.user.upsert({
      where: { email: "agent.mumbai@fundifyhub.com" },
      update: {},
      create: {
        firstName: "Ramesh",
        lastName: "Patel",
        email: "agent.mumbai@fundifyhub.com",
        phoneNumber: "+919820000001",
        password: hashedPassword,
        roles: ["AGENT"],
        district: ["Mumbai"],
        emailVerified: true,
        phoneVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: "agent.delhi@fundifyhub.com" },
      update: {},
      create: {
        firstName: "Asha",
        lastName: "Verma",
        email: "agent.delhi@fundifyhub.com",
        phoneNumber: "+919820000002",
        password: hashedPassword,
        roles: ["AGENT"],
        district: ["Delhi"],
        emailVerified: true,
        phoneVerified: true,
      },
    }),

    // District admins
    prisma.user.upsert({
      where: { email: "admin.mumbai@fundifyhub.com" },
      update: {},
      create: {
        firstName: "Priya",
        lastName: "Shah",
        email: "admin.mumbai@fundifyhub.com",
        phoneNumber: "+919830000001",
        password: hashedPassword,
        roles: ["DISTRICT_ADMIN"],
        district: ["Mumbai"],
        emailVerified: true,
        phoneVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: "admin.delhi@fundifyhub.com" },
      update: {},
      create: {
        firstName: "Vikram",
        lastName: "Singh",
        email: "admin.delhi@fundifyhub.com",
        phoneNumber: "+919830000002",
        password: hashedPassword,
        roles: ["DISTRICT_ADMIN"],
        district: ["Delhi"],
        emailVerified: true,
        phoneVerified: true,
      },
    }),

    // Super admin
    prisma.user.upsert({
      where: { email: "super.admin@fundifyhub.com" },
      update: {},
      create: {
        firstName: "Super",
        lastName: "Admin",
        email: "super.admin@fundifyhub.com",
        phoneNumber: "+919876543203",
        password: hashedPassword,
        roles: ["SUPER_ADMIN"],
        district: ["Mumbai", "Delhi", "Bangalore"],
        emailVerified: true,
        phoneVerified: true,
      },
    }),
  ]);

  const customers = users.filter((u: User) => Array.isArray(u.roles) && u.roles.includes("CUSTOMER"));
  const agents = users.filter((u: User) => Array.isArray(u.roles) && u.roles.includes("AGENT"));
  const districtAdmins = users.filter((u: User) => Array.isArray(u.roles) && u.roles.includes("DISTRICT_ADMIN"));
  const superAdmin = users.find((u: User) => Array.isArray(u.roles) && u.roles.includes("SUPER_ADMIN"));

  const customer = customers[0]!;
  const agent = agents[0]!;
  const admin = districtAdmins[0] || superAdmin || users[0];

  console.log(`✅ Created ${users.length} users`);

  // ---------------------------------------
  // REQUESTS
  // ---------------------------------------
  // ---------------------------------------
  // REQUESTS (per-customer across districts and statuses)
  // ---------------------------------------
  // REQUESTS (with proper workflow progression)
  // ---------------------------------------
  const statuses = [
    "PENDING",
    "UNDER_REVIEW",
    "OFFER_SENT",
    "OFFER_ACCEPTED",
    "INSPECTION_SCHEDULED",
    "INSPECTION_COMPLETED",
    "APPROVED",
    "AMOUNT_DISBURSED",
    "PENDING_SIGNATURE",
    "ACTIVE",
    "COMPLETED"
  ];
  const requests: any[] = [];

  // Create specific test scenarios
  const testScenarios = [
    // Scenario 1: New request, no offer yet
    { status: "PENDING", hasOffer: false, hasLoan: false },
    // Scenario 2: Under review
    { status: "UNDER_REVIEW", hasOffer: false, hasLoan: false },
    // Scenario 3: Offer sent but not accepted
    { status: "OFFER_SENT", hasOffer: true, hasLoan: false },
    // Scenario 4: Offer accepted, waiting for inspection
    { status: "OFFER_ACCEPTED", hasOffer: true, hasLoan: false },
    // Scenario 5: Inspection scheduled
    { status: "INSPECTION_SCHEDULED", hasOffer: true, hasLoan: false },
    // Scenario 6: Inspection completed, approved
    { status: "APPROVED", hasOffer: true, hasLoan: false },
    // Scenario 7: Amount disbursed, waiting for signature
    { status: "AMOUNT_DISBURSED", hasOffer: true, hasLoan: false },
    // Scenario 8: Pending signature
    { status: "PENDING_SIGNATURE", hasOffer: true, hasLoan: false },
    // Scenario 9: ACTIVE loan with EMI schedules (ready for payment)
    { status: "ACTIVE", hasOffer: true, hasLoan: true },
    // Scenario 10: Completed loan
    { status: "COMPLETED", hasOffer: true, hasLoan: true },
  ];

  for (const cust of customers) {
    // Create one request per test scenario for the first customer
    if (cust.email === "john.customer@example.com") {
      for (let i = 0; i < testScenarios.length; i++) {
        const scenario = testScenarios[i];
        const seq = await nextSerial('REQUEST', 1000);
        const requestNumber = `REQ${seq}`;

        const district = Array.isArray(cust.district) && cust.district.length ? cust.district[0] : 'Mumbai';
        const brandPool = ['Honda', 'Tata', 'Suzuki', 'Hyundai', 'Royal Enfield'];
        const assetBrand = brandPool[Math.floor(Math.random() * brandPool.length)];

        // Find an available agent for this district
        // For Mumbai, specifically pick the Mumbai agent to ensure they have assigned requests
        let assigned = agents.find((a) => Array.isArray(a.district) && a.district.includes(district));
        if (district === 'Mumbai') {
             assigned = agents.find(a => a.email === 'agent.mumbai@fundifyhub.com');
        }

        const req = await prisma.request.create({
          data: {
            requestNumber,
            customerId: cust.id,
            requestedAmount: 50000 + Math.floor(Math.random() * 200000),
            district,
            currentStatus: scenario.status,
            purchaseYear: 2018 + Math.floor(Math.random() * 7),
            assetType: Math.random() > 0.7 ? 'JEWELRY' : 'MOTORCYCLE',
            assetBrand,
            assetModel: `${assetBrand}-Model-${i + 1}`,
            assetCondition: ['EXCELLENT', 'GOOD', 'FAIR'][Math.floor(Math.random() * 3)],
            AdditionalDescription: `Test scenario ${i + 1}: ${scenario.status}`,
            assignedAgentId: assigned ? assigned.id : null,
            penaltyPercentage: DEFAULT_PENALTY_PERCENTAGE,
            lateFeePercentage: DEFAULT_LATE_FEE_PERCENTAGE,
            inspectionScheduledAt: scenario.status === 'INSPECTION_SCHEDULED' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined,
          },
        });

        // Create offer if scenario requires it
        if (scenario.hasOffer) {
          const offerAmount = Math.round(req.requestedAmount * (0.7 + Math.random() * 0.25));
          const tenure = [6, 12, 18, 24][Math.floor(Math.random() * 4)];
          const interest = [10, 12, 14, 16][Math.floor(Math.random() * 4)];

          const updatedReq = await prisma.request.update({
            where: { id: req.id },
            data: {
              adminOfferedAmount: offerAmount,
              adminTenureMonths: tenure,
              adminInterestRate: interest,
              offerMadeDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
              offerResponseDate: scenario.status === 'OFFER_ACCEPTED' ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) : null,
            },
          });

          requests.push(updatedReq);
        } else {
          requests.push(req);
        }
      }
    } else {
      // For other customers, create 1-2 random requests
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const seq = await nextSerial('REQUEST', 1000);
        const requestNumber = `REQ${seq}`;

        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const district = Array.isArray(cust.district) && cust.district.length ? cust.district[0] : 'Mumbai';
        const brandPool = ['Honda', 'Tata', 'Suzuki', 'Hyundai', 'Royal Enfield'];
        const assetBrand = brandPool[Math.floor(Math.random() * brandPool.length)];

        const assigned = agents.find((a) => Array.isArray(a.district) && a.district.includes(district));

        const req = await prisma.request.create({
          data: {
            requestNumber,
            customerId: cust.id,
            requestedAmount: 20000 + Math.floor(Math.random() * 150000),
            district,
            currentStatus: status,
            purchaseYear: 2015 + Math.floor(Math.random() * 10),
            assetType: Math.random() > 0.7 ? 'JEWELRY' : 'MOTORCYCLE',
            assetBrand,
            assetModel: `${assetBrand}-Model-${i + 1}`,
            assetCondition: ['EXCELLENT', 'GOOD', 'FAIR'][Math.floor(Math.random() * 3)],
            AdditionalDescription: `Demo asset ${i + 1} for ${cust.firstName}`,
            assignedAgentId: assigned ? assigned.id : null,
            penaltyPercentage: DEFAULT_PENALTY_PERCENTAGE,
            lateFeePercentage: DEFAULT_LATE_FEE_PERCENTAGE,
          },
        });

        requests.push(req);
      }
    }
  }

  console.log(`✅ Created ${requests.length} requests across all statuses`);

  // ---------------------------------------
  // LOANS + EMI + PAYMENTS
  // ---------------------------------------
  const loans = [];
  const emis = [];
  const payments = [];

  for (const req of requests) {
    // Only create loans for ACTIVE and COMPLETED requests (loans are created after disbursement and signature)
    if (!['ACTIVE', 'COMPLETED'].includes(req.currentStatus)) continue;

    const approvedAmount = Math.max( Math.round((req.adminOfferedAmount || req.requestedAmount) * 0.95), 1000 );
    const interestRate = req.adminInterestRate || 12;
    const tenureMonths = req.adminTenureMonths || 6;
    const emiAmount = parseFloat(((approvedAmount * (1 + interestRate / 100)) / tenureMonths).toFixed(2));
    const totalInterest = Math.round(approvedAmount * (interestRate / 100));
    const totalAmount = approvedAmount + totalInterest;

    const loan = await prisma.loan.create({
      data: {
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
        totalPaidAmount: 0
      },
    });
    loans.push(loan);

    // EMI Schedule - Create realistic EMI statuses for testing
    for (let n = 1; n <= tenureMonths; n++) {
      const dueDate = new Date(Date.now() - (tenureMonths - n) * 30 * 24 * 60 * 60 * 1000); // Past dates for realism
      const daysLate = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / (24 * 60 * 60 * 1000)));

      let status = "PENDING";
      let paidDate = null;
      let paidAmount = null;
      let lateFee = 0;

      // For ACTIVE loans, create realistic payment scenarios
      if (req.currentStatus === 'ACTIVE') {
        if (n === 1) {
          // First EMI always paid
          status = "PAID";
          paidDate = new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000); // Paid 2 days after due
          paidAmount = emiAmount;
        } else if (n === 2 && daysLate > 5) {
          // Second EMI overdue
          status = "OVERDUE";
          // Calculate late fees
          const dailyLateRate = DEFAULT_LATE_FEE_PERCENTAGE / 100;
          const dailyLateFee = Number((emiAmount * dailyLateRate * Math.max(0, daysLate - 30)).toFixed(2));
          const overduePenalty = daysLate > 30 ? Number((emiAmount * (DEFAULT_PENALTY_PERCENTAGE / 100)).toFixed(2)) : 0;
          lateFee = Math.round((dailyLateFee + overduePenalty) * 100) / 100;
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
          },
        });
        payments.push(payment);
      }
    }
  }

  console.log(`✅ Created ${loans.length} loans, ${emis.length} EMIs, ${payments.length} payments`);

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
          fileKey: `demo-file-key-${req.id}`,
          fileName: `document-${req.id}.pdf`,
          fileSize: 1024000,
          fileType: "application/pdf",
          documentType: "id_proof",
          documentCategory: "KYC",
          uploadedBy: customer.id,
          isVerified: true,
          verifiedBy: admin.id,
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
          authorId: admin.id,
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
          agentId: agent.id,
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
          configuredBy: admin.id,
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
