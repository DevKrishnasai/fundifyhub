import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Create sample users with detailed information for all 4 roles
  const users = await Promise.all([
    // Customer
    prisma.user.upsert({
      where: { email: "customer@example.com" },
      update: {},
      create: {
        name: "John Customer",
        email: "customer@example.com",
        phone: "+919876543210",
        role: "CUSTOMER",
        district: "Mumbai",
        emailVerified: true,
        phoneVerified: true,
        address: "123 Customer Street, Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
      },
    }),
    // District Admin
    prisma.user.upsert({
      where: { email: "district.admin@fundifyhub.com" },
      update: {},
      create: {
        name: "Mumbai District Admin",
        email: "district.admin@fundifyhub.com",
        phone: "+919876543201",
        role: "DISTRICT_ADMIN",
        district: "Mumbai",
        emailVerified: true,
        phoneVerified: true,
        address: "Admin Building, Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400002",
      },
    }),
    // Agent
    prisma.user.upsert({
      where: { email: "agent@fundifyhub.com" },
      update: {},
      create: {
        name: "Field Agent",
        email: "agent@fundifyhub.com",
        phone: "+919876543202",
        role: "AGENT",
        district: "Mumbai",
        emailVerified: true,
        phoneVerified: true,
        address: "Agent Office, Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400003",
      },
    }),
    // Super Admin
    prisma.user.upsert({
      where: { email: "super.admin@fundifyhub.com" },
      update: {},
      create: {
        name: "Super Admin",
        email: "super.admin@fundifyhub.com",
        phone: "+919876543203",
        role: "SUPER_ADMIN",
        emailVerified: true,
        phoneVerified: true,
        address: "Head Office, Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400004",
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // Get users by role
  const customer = users.find(user => user.role === "CUSTOMER")!;
  const districtAdmin = users.find(user => user.role === "DISTRICT_ADMIN")!;
  const agent = users.find(user => user.role === "AGENT")!;

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

  console.log("Created sample request with documents, comments, and inspection");

  console.log("🎉 Database seeding completed successfully!");
  console.log("📊 Summary:");
  console.log(`- ${users.length} users created (1 customer, 1 district admin, 1 agent, 1 super admin)`);
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