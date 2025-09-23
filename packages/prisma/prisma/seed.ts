import { PrismaClient } from "@prisma/client";

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
        emailVerified: true,
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
        emailVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: "bob.wilson@example.com" },
      update: {},
      create: {
        email: "bob.wilson@example.com",
        firstName: "Bob",
        lastName: "Wilson",
        passwordHash: "$2b$10$example.hash",
        emailVerified: false,
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
          description: `Sample payment ${i + 1} for ${user.firstName}`,
          razorpayPaymentId: `rzp_test_${Math.random().toString(36).substr(2, 14)}`,
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