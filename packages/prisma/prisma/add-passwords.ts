import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../../.env" });

const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Adding passwords to existing users...");

  const defaultPassword = "password123"; // Simple password for testing
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

  // Update all users with the hashed password (including those who already have passwords for testing)
  const result = await prisma.user.updateMany({
    data: {
      password: hashedPassword,
    },
  });

  console.log(`✅ Updated ${result.count} users with password`);
  
  // List all users with their roles for reference
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
    },
  });

  console.log("\n📋 Available test users:");
  users.forEach(user => {
    console.log(`- ${user.email} (${user.role}) - ${user.firstName} ${user.lastName}`);
  });

  console.log(`\n🔑 Default password for all users: "${defaultPassword}"`);
  console.log("\n🎯 Recommended test accounts:");

  console.log("- Customer: customer@example.com");
  console.log("- Agent: agent@fundifyhub.com");
  console.log("- District Admin: district.admin@fundifyhub.com");
  console.log("- Admin (Worker Config): admin@fundifyhub.com");
  console.log("- Super Admin: super.admin@fundifyhub.com");
}

main()
  .catch((e) => {
    console.error("❌ Error adding passwords:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });