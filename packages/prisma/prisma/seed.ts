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
  const statuses = ["PENDING", "UNDER_REVIEW", "OFFER_SENT", "OFFER_ACCEPTED", "INSPECTION_SCHEDULED", "INSPECTION_IN_PROGRESS", "APPROVED", "REJECTED"];
  const requests: any[] = [];

  for (const cust of customers) {
    // create 2-4 requests per customer
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const seq = await nextSerial('REQUEST', 1000);
      const requestNumber = `REQ${seq}`;

      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const district = Array.isArray(cust.district) && cust.district.length ? cust.district[0] : 'Mumbai';
      const brandPool = ['Honda', 'Tata', 'Suzuki', 'Hyundai', 'Royal Enfield'];
      const assetBrand = brandPool[Math.floor(Math.random() * brandPool.length)];

      // try to find an available agent for this district
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
          LateFeePercentage: DEFAULT_LATE_FEE_PERCENTAGE,
        },
      });

      // initial history entry (best-effort)
      if (hasRequestHistory) {
        try {
          await prisma.requestHistory.create({ data: { requestId: req.id, actorId: cust.id, action: 'REQUEST_CREATED', metadata: { createdBy: cust.email } } });
        } catch (err) {
          console.warn('Skipping requestHistory insert (create) -', (err as Error).message);
        }
      }

      // For some requests, create an offer
      if (['UNDER_REVIEW', 'OFFER_SENT'].includes(status) && Math.random() > 0.4) {
        const offerAmount = Math.round(req.requestedAmount * (0.6 + Math.random() * 0.3));
        const tenure = [6, 9, 12][Math.floor(Math.random() * 3)];
        const interest = [10, 12, 14][Math.floor(Math.random() * 3)];
        const toStatus = 'OFFER_SENT';
        // perform update and then best-effort history insert
        const updatedReq = await prisma.request.update({ where: { id: req.id }, data: { adminOfferedAmount: offerAmount, adminTenureMonths: tenure, adminInterestRate: interest, offerMadeDate: new Date(), currentStatus: toStatus } });
        // Set penalty and late fee percentages on the request if DB and Prisma client support it.
        // Use the module-level constants for consistency
        const defaultPenaltyPercentage = DEFAULT_PENALTY_PERCENTAGE; // one-time after grace period
        const defaultLateFeePercentage = DEFAULT_LATE_FEE_PERCENTAGE; // per day
        try {
          // Try typed update (works if Prisma client was regenerated and schema applied)
          // Cast to any to avoid TypeScript errors in dev environments where the schema has not yet been applied
          // @ts-ignore
          await prisma.request.update({ where: { id: req.id }, data: { penaltyPercentage: defaultPenaltyPercentage, LateFeePercentage: defaultLateFeePercentage } as any });
        } catch (err) {
          // Fallback: use raw SQL to set columns directly (works even if prisma client doesn't have fields yet)
          try {
            await prisma.$executeRawUnsafe(`UPDATE "requests" SET "penaltyPercentage" = $1, "LateFeePercentage" = $2 WHERE "id" = $3`, defaultPenaltyPercentage, defaultLateFeePercentage, req.id);
          } catch (rawErr) {
            // Best-effort: if the DB uses snake_case or lowercased columns, try lowercase names
            try {
              await prisma.$executeRawUnsafe(`UPDATE requests SET penaltypercentage = $1, latefeepercentage = $2 WHERE id = $3`, defaultPenaltyPercentage, defaultLateFeePercentage, req.id);
            } catch (e) {
              // Ignore if update fails; this seed remains best-effort until migrations are applied
            }
          }
        }
        if (hasRequestHistory) {
          try {
            await prisma.requestHistory.create({ data: { requestId: req.id, actorId: admin.id, action: 'OFFER_CREATED', metadata: { amount: offerAmount, tenure, interest } } });
          } catch (err) {
            console.warn('Skipping requestHistory insert (offer) -', (err as Error).message);
          }
        }
        requests.push(updatedReq);
        continue;
      }

      requests.push(req);
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
    // Only create loans for requests that look approved or offer accepted
    if (!['OFFER_ACCEPTED', 'APPROVED', 'AMOUNT_DISBURSED', 'ACTIVE', 'COMPLETED'].includes(req.currentStatus)) continue;

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

    // EMI Schedule
    for (let n = 1; n <= tenureMonths; n++) {
      const emi = await prisma.eMISchedule.create({
        data: {
          loanId: loan.id,
          requestId: req.id,
          emiNumber: n,
          dueDate: new Date(Date.now() + n * 30 * 24 * 60 * 60 * 1000),
          emiAmount,
          principalAmount: approvedAmount / tenureMonths,
          interestAmount: totalInterest / tenureMonths,
          status: n === 1 ? "PAID" : "PENDING",
          paidDate: n === 1 ? new Date() : null,
          paidAmount: n === 1 ? emiAmount : null,
        },
      });
      emis.push(emi);
      // Seed late fees for overdue EMIs (best-effort demo values)
      try {
        const dueMs = new Date(emi.dueDate as Date).getTime();
        const nowMs = Date.now();
        const daysLate = Math.max(0, Math.floor((nowMs - dueMs) / (24 * 60 * 60 * 1000)));
        if (daysLate > 0 && emi.status !== 'PAID') {
          const dailyLateRate = DEFAULT_LATE_FEE_PERCENTAGE / 100;
          const dailyLateFee = Number((emi.emiAmount * dailyLateRate * daysLate).toFixed(2));
          const overduePenalty = daysLate > 30 ? Number((emi.emiAmount * (DEFAULT_PENALTY_PERCENTAGE / 100)).toFixed(2)) : 0;
          const totalLateFee = Math.round((dailyLateFee + overduePenalty) * 100) / 100;
          if (totalLateFee > 0) {
            await prisma.eMISchedule.update({ where: { id: emi.id }, data: { lateFee: totalLateFee } });
          }
        }
      } catch (err) { /* best-effort: ignore */ }

      if (n === 1) {
        const payment = await prisma.payment.create({
          data: {
            loanId: loan.id,
            requestId: req.id,
            emiScheduleId: emi.id,
            amount: emiAmount,
            paymentType: "EMI",
            paymentMethod: "UPI",
            paymentReference: `TXN-${randomUUID()}`,
          },
        });
        payments.push(payment);
      }
    }
  }

  console.log(`✅ Created ${loans.length} loans, ${emis.length} EMIs, ${payments.length} payments`);

  // ---------------------------------------
  // DOCUMENTS
  // ---------------------------------------
  await Promise.all(
    requests.map((req, i) =>
      prisma.document.create({
        data: {
          requestId: req.id,
          fileKey: `demo-file-key-${i + 1}`,
          fileName: `document-${i + 1}.pdf`,
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

  console.log("✅ All demo data successfully seeded!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
