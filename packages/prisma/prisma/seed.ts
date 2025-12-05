/**
 * Database seed script for FundifyHub
 * Creates test users and sample data for E2E testing
 *
 * Users:
 * 1. Krishna Sai - Super Admin
 * 2. Vishal - District Admin
 * 3. Kiran Kumar - Customer only
 */

import { 
  PrismaClient, 
  RequestStage, 
  LoanStatus, 
  EMIStatus,
  InspectionStatus,
  AssetStatus,
  UserRole,
  AssetCondition,
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

// User Data - Multiple roles supported
const USERS = [
  {
    firstName: "Krishna",
    lastName: "Sai",
    email: "kambati855@gmail.com",
    phoneNumber: "6281839951",
    roles: [UserRole.SUPER_ADMIN, UserRole.CUSTOMER],
    password: "Admin@123",
  },
  {
    firstName: "Vishal",
    lastName: "AKS",
    email: "aks.daytoday@gmail.com",
    phoneNumber: "6301564827",
    roles: [UserRole.DISTRICT_ADMIN, UserRole.CUSTOMER],
    password: "Admin@123",
  },
  {
    firstName: "Agent",
    lastName: "Kumar",
    email: "agent@fundifyhub.com",
    phoneNumber: "9876543210",
    roles: [UserRole.AGENT],
    password: "Agent@123",
  },
  {
    firstName: "Kiran",
    lastName: "Kumar",
    email: "aks.randm@gmail.com",
    phoneNumber: "9299998626",
    roles: [UserRole.CUSTOMER],
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
  await prisma.auctionBid.deleteMany()
  await prisma.auctionListing.deleteMany()
  await prisma.assetMovement.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.request.deleteMany()
  await prisma.bankDetails.deleteMany()
  await prisma.session.deleteMany()
  await prisma.userDistrictAssignment.deleteMany()
  await prisma.userStateAssignment.deleteMany()
  await prisma.user.deleteMany()
  await prisma.warehouse.deleteMany()
  await prisma.district.deleteMany()
  await prisma.state.deleteMany()
  await prisma.country.deleteMany()
  await prisma.serviceConfig.deleteMany()
  await prisma.serialCounter.deleteMany()

  // Create Geography Hierarchy
  console.log("🌍 Creating geography hierarchy...")
  
  // Create India
  const india = await prisma.country.create({
    data: {
      name: "India",
      code: "IN",
      isActive: true,
    },
  })
  console.log(`  ✅ Created country: ${india.name}`)

  // Create Telangana state
  const telangana = await prisma.state.create({
    data: {
      name: "Telangana",
      code: "TG",
      countryId: india.id,
      isActive: true,
    },
  })
  console.log(`  ✅ Created state: ${telangana.name}`)

  // Create districts
  const districtData = [
    { name: "Hyderabad", code: "HYD" },
    { name: "Warangal", code: "WGL" },
    { name: "Nizamabad", code: "NZB" },
    { name: "Karimnagar", code: "KMN" },
    { name: "Khammam", code: "KHM" },
    { name: "Rangareddy", code: "RNG" },
    { name: "Sangareddy", code: "SGR" },
    { name: "Siddipet", code: "SDP" },
    { name: "Medchal-Malkajgiri", code: "MCL" },
  ]

  const createdDistricts: Record<string, string> = {}
  for (const dist of districtData) {
    const district = await prisma.district.create({
      data: {
        name: dist.name,
        code: dist.code,
        stateId: telangana.id,
        isActive: true,
      },
    })
    createdDistricts[dist.name] = district.id
    console.log(`  ✅ Created district: ${district.name}`)
  }

  // Create a warehouse in Hyderabad
  const warehouse = await prisma.warehouse.create({
    data: {
      name: "Hyderabad Central Warehouse",
      code: "HYD-WH-001",
      districtId: createdDistricts["Hyderabad"],
      address: "Plot 123, Industrial Area, Uppal, Hyderabad",
      latitude: 17.4065,
      longitude: 78.5595,
      contactPerson: "Warehouse Manager",
      contactPhone: "9876543210",
      capacity: 500,
      currentCount: 0,
      isActive: true,
    },
  })
  console.log(`  ✅ Created warehouse: ${warehouse.name}`)

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
        homeDistrictId: createdDistricts["Hyderabad"], // All users home district is Hyderabad
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
    console.log(`  ✅ Created user: ${userData.firstName} ${userData.lastName} (${userData.roles.join(", ")})`)
  }

  // Create district assignments for District Admin
  const vishalId = createdUsers["aks.daytoday@gmail.com"]
  const hyderabadId = createdDistricts["Hyderabad"]
  const warangalId = createdDistricts["Warangal"]
  const rangareddyId = createdDistricts["Rangareddy"]

  await prisma.userDistrictAssignment.createMany({
    data: [
      { userId: vishalId, districtId: hyderabadId, isPrimary: true },
      { userId: vishalId, districtId: warangalId, isPrimary: false },
      { userId: vishalId, districtId: rangareddyId, isPrimary: false },
    ],
  })
  console.log(`  ✅ Created district assignments for Vishal (District Admin)`)

  // Initialize serial counters
  console.log("🔢 Initializing serial counters...")
  await prisma.serialCounter.createMany({
    data: [
      { id: "REQUEST", seq: 0 },
      { id: "LOAN", seq: 0 },
      { id: "AUCTION", seq: 0 },
    ],
  })

  // Create sample requests for Kiran Kumar (Customer)
  console.log("📝 Creating sample loan requests...")
  const customerId = createdUsers["aks.randm@gmail.com"]
  const agentId = createdUsers["agent@fundifyhub.com"]
  const adminId = createdUsers["kambati855@gmail.com"]

  // Create district assignment for Agent
  await prisma.userDistrictAssignment.createMany({
    data: [
      { userId: agentId, districtId: hyderabadId, isPrimary: true },
      { userId: agentId, districtId: warangalId, isPrimary: false },
    ],
  })
  console.log(`  ✅ Created district assignments for Agent Kumar`)

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

  // Request 1: Pending Request (just submitted) - in REVIEW stage, waiting for admin
  requestSeq++
  const request1 = await prisma.request.create({
    data: {
      requestNumber: generateRequestNumber(requestSeq),
      customerId,
      requestedAmount: 50000,
      districtId: hyderabadId,
      stage: RequestStage.REVIEW,
      subStatus: 'PENDING',
      requiresAdminAction: true,
      asset: {
        create: {
          assetType: "Two Wheeler",
          brand: "Honda",
          model: "Activa 6G",
          condition: AssetCondition.GOOD,
          purchaseYear: 2022,
          description: "Well maintained scooter with all service records",
          estimatedValue: 50000,
          status: AssetStatus.PLEDGED,
          warehouseId: warehouse.id,
        }
      }
    },
  })
  console.log(`  ✅ Created request: ${request1.requestNumber} (REVIEW/PENDING)`)

  // Request 2: Offer Made - awaiting customer response
  requestSeq++
  const request2 = await prisma.request.create({
    data: {
      requestNumber: generateRequestNumber(requestSeq),
      customerId,
      requestedAmount: 150000,
      districtId: hyderabadId,
      stage: RequestStage.OFFER,
      subStatus: 'PENDING_CUSTOMER_RESPONSE',
      requiresCustomerAction: true,
      requiresAdminAction: false,
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
          condition: AssetCondition.EXCELLENT,
          purchaseYear: 2021,
          description: "Single owner car with comprehensive insurance",
          estimatedValue: 150000,
          status: AssetStatus.PLEDGED,
        }
      }
    },
  })
  console.log(`  ✅ Created request: ${request2.requestNumber} (OFFER/PENDING_CUSTOMER_RESPONSE)`)

  // Request 3: Agent Assigned - pending inspection
  requestSeq++
  const request3 = await prisma.request.create({
    data: {
      requestNumber: generateRequestNumber(requestSeq),
      customerId,
      requestedAmount: 80000,
      districtId: rangareddyId,
      stage: RequestStage.INSPECTION,
      subStatus: 'SCHEDULED',
      requiresAgentAction: true,
      requiresAdminAction: false,
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
          condition: AssetCondition.GOOD,
          purchaseYear: 2020,
          description: "Classic bike with custom accessories",
          estimatedValue: 80000,
          status: AssetStatus.PLEDGED,
        }
      }
    },
  })
  console.log(`  ✅ Created request: ${request3.requestNumber} (INSPECTION/SCHEDULED)`)

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
      districtId: hyderabadId,
      stage: RequestStage.ACTIVE,
      subStatus: 'PAYING',
      requiresCustomerAction: true, // Customer makes EMI payments
      requiresAdminAction: false,
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
          condition: AssetCondition.EXCELLENT,
          purchaseYear: 2020,
          description: "Laptop for freelance work",
          estimatedValue: 200000,
          inspectedValue: 95000,
          status: AssetStatus.PLEDGED,
          warehouseId: warehouse.id,
        }
      }
    },
  })
  console.log(`  ✅ Created request: ${request4.requestNumber} (ACTIVE/PAYING)`)

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
      districtId: hyderabadId,
      stage: RequestStage.COMPLETED,
      subStatus: null, // Terminal stage - no sub-status
      requiresCustomerAction: false,
      requiresAdminAction: false,
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
          condition: AssetCondition.GOOD,
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
      districtId: warangalId,
      stage: RequestStage.REJECTED,
      subStatus: null, // Terminal stage
      requiresCustomerAction: false,
      requiresAdminAction: false,
      failureReason: "Asset condition too poor for lending. Vehicle has significant rust and mechanical issues.",
      failureType: "INSPECTION",
      asset: {
        create: {
          assetType: "Four Wheeler",
          brand: "Tata",
          model: "Nano",
          condition: AssetCondition.POOR,
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
        isEnabled: false, // Disabled by default - needs SMTP config
        isActive: false,
        connectionStatus: "DISCONNECTED",
        configuredBy: adminId,
        configuredAt: new Date(),
        // SMTP config structure (values need to be set by admin)
        config: {
          smtp: {
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
              user: "", // Gmail address - configure via admin UI
              pass: "", // App password - configure via admin UI
            },
          },
          from: "FundifyHub <noreply@fundifyhub.com>",
          replyTo: "support@fundifyhub.com",
        },
      },
      {
        serviceName: "WHATSAPP",
        isEnabled: false,
        isActive: false,
        connectionStatus: "DISCONNECTED",
        configuredBy: adminId,
        // WhatsApp Web.js config (QR code linking required)
        config: {
          sessionName: "fundifyhub-whatsapp",
          retryOnDisconnect: true,
          maxRetries: 3,
        },
      },
      {
        serviceName: "SMS",
        isEnabled: false,
        isActive: false,
        connectionStatus: "DISCONNECTED",
        configuredBy: adminId,
        // SMS provider config (future)
        config: {
          provider: "twilio", // or msg91, textlocal
          accountSid: "",
          authToken: "",
          fromNumber: "",
        },
      },
      {
        serviceName: "RAZORPAY",
        isEnabled: true, // Payment is critical - enabled by default
        isActive: true,
        connectionStatus: "CONNECTED",
        configuredBy: adminId,
        configuredAt: new Date(),
        // Razorpay config (uses env vars, this is for status tracking)
        config: {
          configured: true,
          mode: "test", // or "live"
        },
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
