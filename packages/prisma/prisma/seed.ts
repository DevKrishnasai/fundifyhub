import { PrismaClient, User } from "@prisma/client";
import bcrypt from "bcrypt";
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting full database seeding...");

  const defaultPassword = process.env.SEED_USER_PASSWORD || "Password123!";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // ---------------------------------------
  // USERS
  // ---------------------------------------
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "customer@example.com" },
      update: {},
      create: {
        firstName: "John",
        lastName: "Customer",
        email: "customer@example.com",
        phoneNumber: "+919876543210",
        password: hashedPassword,
        roles: ["CUSTOMER"],
        district: "Mumbai",
        emailVerified: true,
        phoneVerified: true,
        city: "Mumbai",
        state: "Maharashtra",
      },
    }),
    prisma.user.upsert({
      where: { email: "agent@fundifyhub.com" },
      update: {},
      create: {
        firstName: "Field",
        lastName: "Agent",
        email: "agent@fundifyhub.com",
        phoneNumber: "+919876543202",
        password: hashedPassword,
        roles: ["AGENT"],
        district: "Mumbai",
        emailVerified: true,
        phoneVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: "admin@fundifyhub.com" },
      update: {},
      create: {
        firstName: "System",
        lastName: "Admin",
        email: "admin@fundifyhub.com",
        phoneNumber: "+919876543204",
        password: hashedPassword,
        roles: ["ADMIN"],
        district:"Ahmedabad"
      },
    }),
    prisma.user.upsert({
      where: { email: "super.admin@fundifyhub.com" },
      update: {},
      create: {
        firstName: "Super",
        lastName: "Admin",
        email: "super.admin@fundifyhub.com",
        phoneNumber: "+919876543203",
        password: hashedPassword,
        roles: ["SUPER_ADMIN", "ADMIN", "AGENT", "CUSTOMER"],
        district:"Ahmedabad"
      },
    }),
  ]);

  const customer = users.find((u: User) => u.roles.includes("CUSTOMER"))!;
  const agent = users.find((u: User) => u.roles.includes("AGENT"))!;
  const admin = users.find((u: User) => u.roles.includes("ADMIN"))!;

  console.log(`✅ Created ${users.length} users`);

  // ---------------------------------------
  // REQUESTS
  // ---------------------------------------
  const requestStatuses = ["PENDING", "ACTIVE", "REJECTED", "CLOSED"];
  const requests: any[] = [];

  for (const status of requestStatuses) {
    const count = status === "ACTIVE" ? 4 : 2; // 4 active, 2 each for others

    for (let i = 0; i < count; i++) {
      const req = await prisma.request.create({
        data: {
          customerId: customer.id,
          requestedAmount: 100000 + Math.floor(Math.random() * 50000),
          district: "Mumbai",
          currentStatus: status,
          purchaseYear: 2018 + i,
          assetType: "Vehicle",
          assetBrand: ["Honda", "Tata", "Suzuki", "Hyundai"][Math.floor(Math.random() * 4)],
          assetModel: `${status}-Model-${i + 1}`,
          assetCondition: ["Excellent", "Good", "Fair"][Math.floor(Math.random() * 3)],
          AdditionalDescription: `Demo ${status} asset ${i + 1} for testing`,
          assignedAgentId: agent.id,
        },
      });
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
    // Only create loans for ACTIVE and CLOSED requests
    if (req.currentStatus === "PENDING" || req.currentStatus === "REJECTED") continue;

    const approvedAmount = req.requestedAmount - 5000;
    const interestRate = 12;
    const tenureMonths = 6;
    const emiAmount = parseFloat(((approvedAmount * (1 + interestRate / 100)) / tenureMonths).toFixed(2));
    const totalInterest = approvedAmount * (interestRate / 100);
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
        status: req.currentStatus,
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
