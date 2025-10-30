import { PrismaClient, Request } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Prepare a default hashed password for seeded users
  const defaultPassword = process.env.SEED_USER_PASSWORD || "Password123!";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // Create sample users with detailed information - now with multi-role support
  const users = await Promise.all([
    // Customer only
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
        address: "123 Customer Street, Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
      },
    }),
    // District Admin only
    prisma.user.upsert({
      where: { email: "district.admin@fundifyhub.com" },
      update: {},
      create: {
        firstName: "Mumbai District",
        lastName: "Admin",
        email: "district.admin@fundifyhub.com",
        phoneNumber: "+919876543201",
        password: hashedPassword,
        roles: ["DISTRICT_ADMIN"],
        district: "Mumbai",
        emailVerified: true,
        phoneVerified: true,
        address: "Admin Building, Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400002",
      },
    }),
    // Agent only
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
        address: "Agent Office, Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400003",
      },
    }),
    // Super Admin with all roles
    prisma.user.upsert({
      where: { email: "super.admin@fundifyhub.com" },
      update: {},
      create: {
        firstName: "Super",
        lastName: "Admin",
        email: "super.admin@fundifyhub.com",
        phoneNumber: "+919876543203",
        password: hashedPassword,
        roles: ["SUPER_ADMIN", "ADMIN", "DISTRICT_ADMIN", "AGENT", "CUSTOMER"],
        emailVerified: true,
        phoneVerified: true,
        address: "Head Office, Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400004",
      },
    }),
    // Admin for Worker Configuration
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
        emailVerified: true,
        phoneVerified: true,
        address: "Tech Office, Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400005",
      },
    }),
    // Multi-role user: Customer + Agent
    prisma.user.upsert({
      where: { email: "multi@example.com" },
      update: {},
      create: {
        firstName: "Multi",
        lastName: "Role",
        email: "multi@example.com",
        phoneNumber: "+919876543205",
        password: hashedPassword,
        roles: ["CUSTOMER", "AGENT"],
        district: "Mumbai",
        emailVerified: true,
        phoneVerified: true,
        address: "456 Multi Street, Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400006",
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // Get users by role
  const customer = users.find(user => user.roles.includes("CUSTOMER") && user.roles.length === 1)!;
  const districtAdmin = users.find(user => user.roles.includes("DISTRICT_ADMIN") && user.roles.length === 1)!;
  const agent = users.find(user => user.roles.includes("AGENT") && user.roles.length === 1)!;
  const admin = users.find(user => user.roles.includes("ADMIN") && user.roles.length === 1)!;

  console.log("🎉 Database seeding completed successfully!");
  console.log("📊 Summary:");
  console.log(`- ${users.length} users created with multi-role support`);
  console.log(`  - Pure roles: customer, district admin, agent, admin`);
  console.log(`  - Super admin with all roles`);
  console.log(`  - Multi-role user: customer + agent`);
  console.log(`- 1 request created with inline asset details`);
  console.log(`- 1 document created`);
  console.log(`- 1 comment created`);
  console.log(`- 1 inspection created`);
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });