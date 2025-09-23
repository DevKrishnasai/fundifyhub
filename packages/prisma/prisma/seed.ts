import { PrismaClient } from "@prisma/client";
import { validateConfig } from "@fundifyhub/utils";

validateConfig();

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Create sample users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "john.doe@example.com" },
      update: {},
      create: {
        email: "john.doe@example.com",
        firstName: "John",
        lastName: "Doe",
        passwordHash: "$2b$10$example.hash", // In real app, use proper bcrypt hash
        phone: "+919876543210",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        pincode: "400001",
        kycStatus: "APPROVED",
        emailVerified: true,
        phoneVerified: true,
        role: "USER",
      },
    }),
    prisma.user.upsert({
      where: { email: "jane.smith@example.com" },
      update: {},
      create: {
        email: "jane.smith@example.com",
        firstName: "Jane",
        lastName: "Smith",
        passwordHash: "$2b$10$example.hash",
        phone: "+919876543211",
        city: "Bangalore",
        state: "Karnataka",
        country: "India",
        pincode: "560001",
        kycStatus: "PENDING",
        emailVerified: true,
        phoneVerified: false,
        role: "USER",
      },
    }),
    prisma.user.upsert({
      where: { email: "admin@fundifyhub.com" },
      update: {},
      create: {
        email: "admin@fundifyhub.com",
        firstName: "Admin",
        lastName: "User",
        passwordHash: "$2b$10$example.hash",
        phone: "+919876543212",
        city: "Delhi",
        state: "Delhi",
        country: "India",
        pincode: "110001",
        kycStatus: "APPROVED",
        emailVerified: true,
        phoneVerified: true,
        role: "ADMIN",
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // Create wallets for each user
  const wallets = await Promise.all(
    users.map((user) =>
      prisma.wallet.upsert({
        where: {
          userId_currency: {
            userId: user.id,
            currency: "INR",
          },
        },
        update: {},
        create: {
          userId: user.id,
          balance: Math.floor(Math.random() * 10000),
          currency: "INR",
        },
      })
    )
  );

  console.log(`Created ${wallets.length} wallets`);

  // Create sample payments
  const payments = [];
  for (const user of users) {
    for (let i = 0; i < 3; i++) {
      const payment = await prisma.payment.create({
        data: {
          userId: user.id,
          amount: Math.floor(Math.random() * 5000) + 100,
          currency: "INR",
          status: ["COMPLETED", "PENDING", "FAILED"][Math.floor(Math.random() * 3)] as any,
          paymentMethod: ["UPI", "CARD", "NET_BANKING"][Math.floor(Math.random() * 3)],
          description: `Sample payment ${i + 1} for ${user.firstName}`,
          purpose: ["WALLET_TOPUP", "INVESTMENT"][Math.floor(Math.random() * 2)],
          razorpayPaymentId: `rzp_test_${Math.random().toString(36).substr(2, 14)}`,
          razorpayOrderId: `order_${Math.random().toString(36).substr(2, 14)}`,
        },
      });
      payments.push(payment);
    }
  }

  console.log(`Created ${payments.length} payments`);

  // Create transactions for completed payments
  let transactionCount = 0;
  for (const payment of payments) {
    if (payment.status === "COMPLETED") {
      const wallet = wallets.find((w) => w.userId === payment.userId);
      if (wallet) {
        await prisma.transaction.create({
          data: {
            walletId: wallet.id,
            paymentId: payment.id,
            type: "CREDIT",
            amount: payment.amount,
            description: `Credit from payment ${payment.id}`,
            balanceAfter: wallet.balance.toNumber() + payment.amount.toNumber(),
          },
        });
        transactionCount++;
      }
    }
  }

  console.log(`Created ${transactionCount} transactions`);

  // Create sample fund requests
  const fundRequests = [];
  for (let i = 0; i < 2; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const fundRequest = await prisma.fundRequest.create({
      data: {
        userId: user.id,
        amount: Math.floor(Math.random() * 100000) + 10000,
        purpose: ["Business Expansion", "Education", "Medical Emergency", "Home Renovation"][i % 4],
        description: `Sample fund request ${i + 1} from ${user.firstName}`,
        status: ["PENDING", "APPROVED", "REJECTED"][Math.floor(Math.random() * 3)] as any,
        interestRate: 12.5,
        tenure: 12 + (i * 6), // 12, 18 months
      },
    });
    fundRequests.push(fundRequest);
  }
  console.log(`Created ${fundRequests.length} fund requests`);

  // Create sample investments
  let investmentCount = 0;
  for (const fundRequest of fundRequests) {
    if (fundRequest.status === "APPROVED") {
      // Create 2-3 investments per approved fund request
      const investorCount = Math.floor(Math.random() * 2) + 2; // 2-3 investors
      for (let i = 0; i < investorCount; i++) {
        const investor = users[Math.floor(Math.random() * users.length)];
        if (investor.id !== fundRequest.userId) { // Investor can't be the borrower
          await prisma.investment.create({
            data: {
              userId: investor.id,
              fundRequestId: fundRequest.id,
              amount: Math.floor(fundRequest.amount.toNumber() / investorCount),
              status: "ACTIVE",
              expectedReturn: Math.floor((fundRequest.amount.toNumber() / investorCount) * 1.125), // 12.5% return
              maturityDate: new Date(Date.now() + fundRequest.tenure * 30 * 24 * 60 * 60 * 1000), // tenure in months
            },
          });
          investmentCount++;
        }
      }
    }
  }
  console.log(`Created ${investmentCount} investments`);

  // Create sample notifications
  let notificationCount = 0;
  for (const user of users) {
    // Create 2-3 notifications per user
    const notifications = [
      {
        title: "Welcome to FundifyHub!",
        message: "Your account has been created successfully. Complete your KYC to start investing.",
        type: "INFO" as any,
      },
      {
        title: "Payment Successful",
        message: "Your wallet has been topped up successfully.",
        type: "SUCCESS" as any,
      },
      {
        title: "KYC Status Update",
        message: user.kycStatus === "APPROVED" ? "Your KYC has been approved!" : "Your KYC is under review.",
        type: user.kycStatus === "APPROVED" ? "SUCCESS" : "WARNING" as any,
      },
    ];

    for (const notif of notifications) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          isRead: Math.random() > 0.5, // Randomly mark some as read
          readAt: Math.random() > 0.5 ? new Date() : null,
        },
      });
      notificationCount++;
    }
  }
  console.log(`Created ${notificationCount} notifications`);

  console.log("🎉 Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });