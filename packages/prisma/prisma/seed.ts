/**
 * Database seed script for FundifyHub
 * Creates test users and sample data for E2E testing
 *
 * Users:
 * 1. Krishna Sai - Super Admin (all roles)
 * 2. Vishal - District Admin (all roles except Super Admin)
 * 3. Kiran Kumar - Customer only
 */

import { 
  PrismaClient, 
  RequestStatus, 
  LoanStatus, 
  EMIStatus,
  InspectionStatus,
  DocumentStatus,
  AssetStatus
} from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcrypt"
import { randomUUID } from "crypto"

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

// Telangana Districts
const TELANGANA_DISTRICTS = [
  "Hyderabad",
  "Warangal",
  "Nizamabad",
  "Karimnagar",
  "Khammam",
  "Rangareddy",
  "Sangareddy",
  "Siddipet",
  "Medchal-Malkajgiri",
]

// User Data
const USERS = [
  {
    firstName: "Krishna",
    lastName: "Sai",
    email: "kambati855@gmail.com",
    phoneNumber: "6281839951",
    roles: ["CUSTOMER", "AGENT", "DISTRICT_ADMIN", "SUPER_ADMIN"],
    district: TELANGANA_DISTRICTS, // Super Admin has access to all districts
    password: "Admin@123",
  },
  {
    firstName: "Vishal",
    lastName: "AKS",
    email: "aks.daytoday@gmail.com",
    phoneNumber: "6301564827",
    roles: ["CUSTOMER", "AGENT", "DISTRICT_ADMIN"],
    district: ["Hyderabad", "Warangal", "Rangareddy"], // District Admin for specific districts
    password: "Admin@123",
  },
  {
    firstName: "Kiran",
    lastName: "Kumar",
    email: "aks.randm@gmail.com",
    phoneNumber: "9299998626",
    roles: ["CUSTOMER"],
    district: ["Hyderabad"], // Customer in Hyderabad
    password: "Customer@123",
  },
]

// Asset types for loan requests
const ASSET_TYPES = ["Two Wheeler", "Four Wheeler", "Machinery", "Electronics"]
const ASSET_BRANDS = {
  "Two Wheeler": ["Honda", "TVS", "Bajaj", "Hero", "Royal Enfield"],
  "Four Wheeler": ["Maruti", "Hyundai", "Tata", "Mahindra", "Honda"],
  Machinery: ["JCB", "Caterpillar", "Komatsu", "Volvo"],
  Electronics: ["Samsung", "LG", "Sony", "Apple"],
}
const ASSET_CONDITIONS = ["EXCELLENT", "GOOD", "FAIR", "POOR"]

/**
 * Generate a unique request number
 */
function generateRequestNumber(sequence: number): string {
  const year = new Date().getFullYear().toString().slice(-2)
  const month = String(new Date().getMonth() + 1).padStart(2, "0")
  return `REQ${year}${month}${String(sequence).padStart(5, "0")}`
}

/**
 * Generate a unique loan number
 */
function generateLoanNumber(sequence: number): string {
  const year = new Date().getFullYear().toString().slice(-2)
  const month = String(new Date().getMonth() + 1).padStart(2, "0")
  return `LN${year}${month}${String(sequence).padStart(5, "0")}`
}

/**
 * Calculate EMI using flat rate method
 */
function calculateEMI(principal: number, annualRate: number, tenureMonths: number) {
  const monthlyRate = annualRate / 12 / 100
  const totalInterest = principal * monthlyRate * tenureMonths
  const totalAmount = principal + totalInterest
  const emiAmount = totalAmount / tenureMonths

  return {
    emiAmount: Math.round(emiAmount * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  }
}

/**
 * Generate EMI schedule for a loan
 */
function generateEMISchedule(
  loanId: string,
  requestId: string,
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDate: Date
): Array<{
  id: string;
  loanId: string;
  requestId: string;
  emiNumber: number;
  dueDate: Date;
  emiAmount: number;
  principalAmount: number;
  interestAmount: number;
  status: EMIStatus;
  lateFee: number;
}> {
  const { emiAmount, totalInterest } = calculateEMI(principal, annualRate, tenureMonths)
  const monthlyInterest = totalInterest / tenureMonths
  const monthlyPrincipal = principal / tenureMonths
  const schedules = []

  for (let i = 1; i <= tenureMonths; i++) {
    const dueDate = new Date(startDate)
    dueDate.setMonth(dueDate.getMonth() + i)

    schedules.push({
      id: randomUUID(),
      loanId,
      requestId,
      emiNumber: i,
      dueDate,
      emiAmount,
      principalAmount: Math.round(monthlyPrincipal * 100) / 100,
      interestAmount: Math.round(monthlyInterest * 100) / 100,
      status: EMIStatus.PENDING,
      lateFee: 0,
    })
  }

  return schedules
}

async function main() {
  console.log("🌱 Starting database seed...")

  // Clear existing data in correct order (respecting foreign keys)
  console.log("🧹 Clearing existing data...")
  await prisma.payment.deleteMany()
  await prisma.paymentOrder.deleteMany()
  await prisma.eMISchedule.deleteMany()
  await prisma.loan.deleteMany()
  await prisma.inspection.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.document.deleteMany()
  await prisma.inAppNotification.deleteMany()
  await prisma.notificationPreference.deleteMany()
  await prisma.notificationLog.deleteMany()
  await prisma.oTPVerification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.adminOffer.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.request.deleteMany()
  await prisma.bankDetails.deleteMany()
  await prisma.user.deleteMany()
  await prisma.serviceConfig.deleteMany()
  await prisma.serialCounter.deleteMany()

  // Create users
  console.log("👤 Creating users...")
  const createdUsers: Record<string, string> = {}

  for (const userData of USERS) {
    const hashedPassword = await bcrypt.hash(userData.password, 12)
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        password: hashedPassword,
        roles: userData.roles,
        district: userData.district,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        address: "Hyderabad, Telangana",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500001",
      },
    })
    createdUsers[userData.email] = user.id
    console.log(`  ✅ Created user: ${userData.firstName} ${userData.lastName} (${userData.email})`)
  }

  // Initialize serial counters
  console.log("🔢 Initializing serial counters...")
  await prisma.serialCounter.createMany({
    data: [
      { id: "REQUEST", seq: 0 },
      { id: "LOAN", seq: 0 },
    ],
  })

  // Create sample requests for Kiran Kumar (Customer)
  console.log("📝 Creating sample loan requests...")
  const customerId = createdUsers["aks.randm@gmail.com"]
  const agentId = createdUsers["aks.daytoday@gmail.com"]
  const adminId = createdUsers["kambati855@gmail.com"]

  // Create bank details for the customer
  console.log("🏦 Creating bank details for customer...")
  const customerBankDetails = await prisma.bankDetails.create({
    data: {
      userId: customerId,
      accountNumber: "1234567890",
      ifscCode: "HDFC0001234",
      accountName: "Kiran Kumar",
      bankName: "HDFC Bank",
      branchName: "Hyderabad Main",
      isPrimary: true,
      isVerified: true,
      verifiedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Verified 60 days ago
    },
  })
  console.log(`  ✅ Created bank details for customer: ${customerBankDetails.accountNumber}`)

  let requestSeq = 0
  let loanSeq = 0

  // Request 1: Pending Request (just submitted)
  requestSeq++
  const request1 = await prisma.request.create({
    data: {
      requestNumber: generateRequestNumber(requestSeq),
      customerId,
      requestedAmount: 50000,
      district: "Hyderabad",
      currentStatus: RequestStatus.PENDING,
      asset: {
        create: {
          assetType: "Two Wheeler",
          brand: "Honda",
          model: "Activa 6G",
          condition: "GOOD",
          purchaseYear: 2022,
          description: "Well maintained scooter with all service records",
          estimatedValue: 50000,
          status: AssetStatus.PLEDGED,
        }
      }
    },
  })
  console.log(`  ✅ Created request: ${request1.requestNumber} (PENDING)`)

  // Request 2: Offer Made - awaiting customer response
  requestSeq++
  const request2 = await prisma.request.create({
    data: {
      requestNumber: generateRequestNumber(requestSeq),
      customerId,
      requestedAmount: 150000,
      district: "Hyderabad",
      currentStatus: RequestStatus.OFFER_SENT,
      adminOfferedAmount: 120000,
      adminTenureMonths: 12,
      adminInterestRate: 18,
      adminProcessingFee: 2000,
      offerMadeDate: new Date(),
      asset: {
        create: {
          assetType: "Four Wheeler",
          brand: "Maruti",
          model: "Swift VXI",
          condition: "EXCELLENT",
          purchaseYear: 2021,
          description: "Single owner car with comprehensive insurance",
          estimatedValue: 150000,
          status: AssetStatus.PLEDGED,
        }
      }
    },
  })
  console.log(`  ✅ Created request: ${request2.requestNumber} (OFFER_SENT)`)

  // Request 3: Agent Assigned - pending inspection
  requestSeq++
  const request3 = await prisma.request.create({
    data: {
      requestNumber: generateRequestNumber(requestSeq),
      customerId,
      requestedAmount: 80000,
      district: "Rangareddy",
      currentStatus: RequestStatus.INSPECTION_SCHEDULED,
      adminOfferedAmount: 70000,
      adminTenureMonths: 6,
      adminInterestRate: 15,
      adminProcessingFee: 1000,
      offerMadeDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      offerResponseDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      assignedAgentId: agentId,
      inspectionScheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      asset: {
        create: {
          assetType: "Two Wheeler",
          brand: "Royal Enfield",
          model: "Classic 350",
          condition: "GOOD",
          purchaseYear: 2020,
          description: "Classic bike with custom accessories",
          estimatedValue: 80000,
          status: AssetStatus.PLEDGED,
        }
      }
    },
  })
  console.log(`  ✅ Created request: ${request3.requestNumber} (INSPECTION_SCHEDULED)`)

  // Create inspection for request3
  await prisma.inspection.create({
    data: {
      requestId: request3.id,
      agentId,
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: InspectionStatus.SCHEDULED,
    },
  })

  // Request 4: Active Loan with EMI schedule
  requestSeq++
  loanSeq++
  const disbursedDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago

  const request4 = await prisma.request.create({
    data: {
      requestNumber: generateRequestNumber(requestSeq),
      customerId,
      requestedAmount: 200000,
      district: "Hyderabad",
      currentStatus: RequestStatus.AMOUNT_DISBURSED,
      adminOfferedAmount: 90000,
      adminTenureMonths: 6,
      adminInterestRate: 12,
      adminProcessingFee: 1500,
      offerMadeDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      offerResponseDate: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000),
      assignedAgentId: agentId,
      disbursementAccountId: customerBankDetails.id,
      bankDetailsSubmittedAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
      asset: {
        create: {
          assetType: "Electronics",
          brand: "Apple",
          model: "MacBook Pro M2",
          condition: "EXCELLENT",
          purchaseYear: 2020,
          description: "Laptop for freelance work",
          estimatedValue: 200000,
          inspectedValue: 95000,
          status: AssetStatus.PLEDGED,
        }
      }
    },
  })
  console.log(`  ✅ Created request: ${request4.requestNumber} (AMOUNT_DISBURSED)`)

  // Create completed inspection for request4
  await prisma.inspection.create({
    data: {
      requestId: request4.id,
      agentId,
      scheduledDate: new Date(Date.now() - 33 * 24 * 60 * 60 * 1000),
      completedDate: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
      status: InspectionStatus.COMPLETED,
      assetCondition: "EXCELLENT",
      estimatedValue: 95000,
      notes: "Asset verified. Condition matches description. Recommend approval.",
      recommendApprove: true,
    },
  })

  // Create loan for request4
  const loanAmount = 90000
  const loanRate = 12
  const loanTenure = 6
  const { emiAmount, totalInterest, totalAmount } = calculateEMI(loanAmount, loanRate, loanTenure)

  const loan4 = await prisma.loan.create({
    data: {
      loanNumber: generateLoanNumber(loanSeq),
      requestId: request4.id,
      approvedAmount: loanAmount,
      interestRate: loanRate,
      tenureMonths: loanTenure,
      emiAmount,
      totalInterest,
      totalAmount,
      status: LoanStatus.ACTIVE,
      approvedDate: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      disbursedDate,
      firstEMIDate: new Date(disbursedDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      lastEMIDate: new Date(disbursedDate.getTime() + loanTenure * 30 * 24 * 60 * 60 * 1000),
      totalPaidAmount: emiAmount, // One EMI paid
      remainingAmount: totalAmount - emiAmount,
      paidEMIs: 1,
      remainingEMIs: loanTenure - 1,
      overdueEMIs: 0,
      transferMethod: "BANK_TRANSFER",
      transferReference: "TXN" + Date.now().toString().slice(-10),
    },
  })
  console.log(`  ✅ Created loan: ${loan4.loanNumber} (ACTIVE)`)

  // Create EMI schedule for loan4
  const emiSchedules = generateEMISchedule(
    loan4.id,
    request4.id,
    loanAmount,
    loanRate,
    loanTenure,
    disbursedDate
  )

  // Mark first EMI as paid
  emiSchedules[0].status = EMIStatus.PAID
  const firstEmiPaidDate = new Date(emiSchedules[0].dueDate)
  firstEmiPaidDate.setDate(firstEmiPaidDate.getDate() - 2) // Paid 2 days before due

  for (const schedule of emiSchedules) {
    await prisma.eMISchedule.create({
      data: {
        ...schedule,
        paidDate: schedule.status === EMIStatus.PAID ? firstEmiPaidDate : null,
        paidAmount: schedule.status === EMIStatus.PAID ? schedule.emiAmount : null,
      },
    })
  }
  console.log(`  ✅ Created ${emiSchedules.length} EMI schedules for loan ${loan4.loanNumber}`)

  // Create payment record for first EMI
  await prisma.payment.create({
    data: {
      loanId: loan4.id,
      requestId: request4.id,
      emiScheduleId: emiSchedules[0].id,
      amount: emiAmount,
      paymentType: "EMI",
      paymentMethod: "UPI",
      paymentReference: "UPI" + Date.now().toString().slice(-10),
      paidDate: firstEmiPaidDate,
      processedBy: customerId,
      remarks: "First EMI payment",
    },
  })

  // Request 5: Completed/Closed loan (for history)
  requestSeq++
  loanSeq++
  const completedStartDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000) // ~6.5 months ago

  const request5 = await prisma.request.create({
    data: {
      requestNumber: generateRequestNumber(requestSeq),
      customerId,
      requestedAmount: 30000,
      district: "Hyderabad",
      currentStatus: RequestStatus.COMPLETED,
      adminOfferedAmount: 25000,
      adminTenureMonths: 3,
      adminInterestRate: 15,
      adminProcessingFee: 500,
      offerMadeDate: completedStartDate,
      offerResponseDate: new Date(completedStartDate.getTime() + 1 * 24 * 60 * 60 * 1000),
      assignedAgentId: agentId,
      disbursementAccountId: customerBankDetails.id,
      bankDetailsSubmittedAt: new Date(completedStartDate.getTime() + 3 * 24 * 60 * 60 * 1000),
      asset: {
        create: {
          assetType: "Two Wheeler",
          brand: "TVS",
          model: "Jupiter",
          condition: "GOOD",
          purchaseYear: 2022,
          description: "Regular commute vehicle",
          estimatedValue: 30000,
          inspectedValue: 28000,
          status: AssetStatus.RELEASED, // Completed loan - asset released
        }
      }
    },
  })
  console.log(`  ✅ Created request: ${request5.requestNumber} (COMPLETED)`)

  // Create completed inspection for request5
  await prisma.inspection.create({
    data: {
      requestId: request5.id,
      agentId,
      scheduledDate: new Date(completedStartDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      completedDate: new Date(completedStartDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      status: InspectionStatus.COMPLETED,
      assetCondition: "GOOD",
      estimatedValue: 28000,
      notes: "Asset verified and approved",
      recommendApprove: true,
    },
  })

  // Create closed loan for request5
  const closedLoanAmount = 25000
  const closedLoanRate = 15
  const closedLoanTenure = 3
  const closedCalc = calculateEMI(closedLoanAmount, closedLoanRate, closedLoanTenure)

  const loan5 = await prisma.loan.create({
    data: {
      loanNumber: generateLoanNumber(loanSeq),
      requestId: request5.id,
      approvedAmount: closedLoanAmount,
      interestRate: closedLoanRate,
      tenureMonths: closedLoanTenure,
      emiAmount: closedCalc.emiAmount,
      totalInterest: closedCalc.totalInterest,
      totalAmount: closedCalc.totalAmount,
      status: LoanStatus.COMPLETED,
      approvedDate: new Date(completedStartDate.getTime() + 4 * 24 * 60 * 60 * 1000),
      disbursedDate: new Date(completedStartDate.getTime() + 5 * 24 * 60 * 60 * 1000),
      firstEMIDate: new Date(completedStartDate.getTime() + 35 * 24 * 60 * 60 * 1000),
      lastEMIDate: new Date(completedStartDate.getTime() + 95 * 24 * 60 * 60 * 1000),
      totalPaidAmount: closedCalc.totalAmount,
      remainingAmount: 0,
      paidEMIs: closedLoanTenure,
      remainingEMIs: 0,
      overdueEMIs: 0,
      transferMethod: "BANK_TRANSFER",
      transferReference: "TXN" + (Date.now() - 100000000).toString().slice(-10),
      closedDate: new Date(completedStartDate.getTime() + 100 * 24 * 60 * 60 * 1000),
      closureType: "NORMAL",
    },
  })
  console.log(`  ✅ Created loan: ${loan5.loanNumber} (CLOSED)`)

  // Create EMI schedules for closed loan (all paid)
  const closedEmiSchedules = generateEMISchedule(
    loan5.id,
    request5.id,
    closedLoanAmount,
    closedLoanRate,
    closedLoanTenure,
    new Date(completedStartDate.getTime() + 5 * 24 * 60 * 60 * 1000)
  )

  for (let i = 0; i < closedEmiSchedules.length; i++) {
    const schedule = closedEmiSchedules[i]
    const paidDate = new Date(schedule.dueDate)
    paidDate.setDate(paidDate.getDate() - 1) // Paid 1 day before due

    await prisma.eMISchedule.create({
      data: {
        ...schedule,
        status: EMIStatus.PAID,
        paidDate,
        paidAmount: schedule.emiAmount,
      },
    })

    // Create payment record
    await prisma.payment.create({
      data: {
        loanId: loan5.id,
        requestId: request5.id,
        emiScheduleId: schedule.id,
        amount: schedule.emiAmount,
        paymentType: "EMI",
        paymentMethod: "UPI",
        paymentReference: "UPI" + (Date.now() - (i + 1) * 10000000).toString().slice(-10),
        paidDate,
        processedBy: customerId,
        remarks: `EMI ${i + 1} payment`,
      },
    })
  }
  console.log(`  ✅ Created ${closedEmiSchedules.length} paid EMI schedules for loan ${loan5.loanNumber}`)

  // Request 6: Rejected request
  requestSeq++
  const request6 = await prisma.request.create({
    data: {
      requestNumber: generateRequestNumber(requestSeq),
      customerId,
      requestedAmount: 200000,
      district: "Warangal",
      currentStatus: RequestStatus.REJECTED,
      asset: {
        create: {
          assetType: "Four Wheeler",
          brand: "Tata",
          model: "Nano",
          condition: "POOR",
          purchaseYear: 2018,
          description: "Old car with multiple issues",
          estimatedValue: 200000,
          status: AssetStatus.RELEASED, // Rejected - no loan, asset not held
        }
      }
    },
  })
  console.log(`  ✅ Created request: ${request6.requestNumber} (REJECTED)`)

  // Add a comment for rejected request
  await prisma.comment.create({
    data: {
      requestId: request6.id,
      authorId: adminId,
      content: "Asset condition too poor for lending. Vehicle has significant rust and mechanical issues.",
      isInternal: false,
      commentType: "ADMIN_REQUEST",
    },
  })

  // Create service configurations
  console.log("⚙️ Creating service configurations...")
  await prisma.serviceConfig.createMany({
    data: [
      {
        serviceName: "EMAIL",
        isEnabled: true,
        isActive: true,
        connectionStatus: "CONNECTED",
        configuredBy: adminId,
        configuredAt: new Date(),
      },
      {
        serviceName: "WHATSAPP",
        isEnabled: false,
        isActive: false,
        connectionStatus: "DISCONNECTED",
        configuredBy: adminId,
      },
      {
        serviceName: "SMS",
        isEnabled: false,
        isActive: false,
        connectionStatus: "DISCONNECTED",
        configuredBy: adminId,
      },
    ],
  })

  // Update serial counters
  await prisma.serialCounter.update({
    where: { id: "REQUEST" },
    data: { seq: requestSeq },
  })
  await prisma.serialCounter.update({
    where: { id: "LOAN" },
    data: { seq: loanSeq },
  })

  console.log("\n✨ Database seeded successfully!")
  console.log("\n📋 Summary:")
  console.log("  Users created: 3")
  console.log(`  Requests created: ${requestSeq}`)
  console.log(`  Loans created: ${loanSeq}`)
  console.log("\n🔑 Login credentials:")
  console.log("  Krishna Sai (Super Admin): kambati855@gmail.com / Admin@123")
  console.log("  Vishal (District Admin): aks.daytoday@gmail.com / Admin@123")
  console.log("  Kiran Kumar (Customer): aks.randm@gmail.com / Customer@123")
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
