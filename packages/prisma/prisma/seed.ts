import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

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

  // Create sample requests with inline asset details
  const request = await prisma.request.create({
    data: {
      customerId: customer.id,
      requestedAmount: 50000,
      purpose: "Personal expenses",
      district: "Mumbai",
      currentStatus: "PENDING",
      
      // Asset details (inline)
      assetName: "iPhone 14 Pro",
      assetType: "ELECTRONICS",
      assetBrand: "Apple",
      assetModel: "iPhone 14 Pro",
      assetCondition: "GOOD",
      assetValue: 100000,
      
      // Admin offer (example)
      adminOfferedAmount: 45000,
      adminTenureMonths: 24,
      adminInterestRate: 12.5,
      
      // Assignment
      assignedAgentId: agent.id,
    },
  });

  // Create sample documents
  await prisma.document.create({
    data: {
      requestId: request.id,
      fileName: "iphone_photo.jpg",
      filePath: "/uploads/documents/iphone_photo.jpg",
      fileSize: 2048576,
      mimeType: "image/jpeg",
      documentType: "asset_photo",
      documentCategory: "ASSET",
      uploadedBy: customer.id,
      isVerified: true,
      verifiedBy: agent.id,
      verifiedAt: new Date(),
      description: "Front photo of iPhone 14 Pro",
    },
  });

  // Create sample comments
  await prisma.comment.create({
    data: {
      requestId: request.id,
      authorId: districtAdmin.id,
      content: "Request looks good. Asset verification completed. Proceeding with loan approval.",
      isInternal: false,
      commentType: "ADMIN_REQUEST",
    },
  });

  // Create sample inspection
  await prisma.inspection.create({
    data: {
      requestId: request.id,
      agentId: agent.id,
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      status: "SCHEDULED",
      assetCondition: "GOOD",
      estimatedValue: 95000,
      notes: "Asset is in excellent condition. Market value confirmed.",
      recommendApprove: true,
    },
  });



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