// prisma/seed.ts
// Dar Al Karama Center — Database Seed
// Run: npm run db:seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Dar Al Karama Center database...\n");

  // ── Company Settings ────────────────────────────────
  await prisma.companySettings.upsert({
    where:  { id: "default" },
    update: { name: "Dar Al Karama Center" },
    create: {
      id:                      "default",
      name:                    "Dar Al Karama Center",
      timezone:                "Asia/Dubai",
      workingWeekStart:        0, // Sunday
      workingWeekEnd:          4, // Thursday
      defaultGracePeriod:      15,
      geofenceRequired:        false,
      gpsAccuracyMin:          100,
      offlinePunchAllowed:     true,
      selfieRequired:          false,
      correctionAllowed:       true,
      managerApprovalRequired: false,
      pushNotificationsEnabled: true,
      dateFormat:              "DD/MM/YYYY",
      timeFormat:              "12h",
      language:                "en",
      theme:                   "light",
    },
  });

  // ── Branches ────────────────────────────────────────
  const mainBranch = await prisma.branch.upsert({
    where:  { id: "branch-main" },
    update: {},
    create: {
      id:       "branch-main",
      name:     "Dar Al Karama Center — Main",
      address:  "Sharjah, UAE",
      timezone: "Asia/Dubai",
      isActive: true,
    },
  });

  // ── Departments ─────────────────────────────────────
  const salesDept = await prisma.department.upsert({
    where:  { id: "dept-sales" },
    update: {},
    create: {
      id:       "dept-sales",
      name:     "Sales",
      branchId: mainBranch.id,
      isActive: true,
    },
  });

  const socialDept = await prisma.department.upsert({
    where:  { id: "dept-social" },
    update: {},
    create: {
      id:       "dept-social",
      name:     "Social Media",
      branchId: mainBranch.id,
      isActive: true,
    },
  });

  const mgmtDept = await prisma.department.upsert({
    where:  { id: "dept-mgmt" },
    update: {},
    create: {
      id:       "dept-mgmt",
      name:     "Management",
      branchId: mainBranch.id,
      isActive: true,
    },
  });

  const hrDept = await prisma.department.upsert({
    where:  { id: "dept-hr" },
    update: {},
    create: {
      id:       "dept-hr",
      name:     "HR & Admin",
      branchId: mainBranch.id,
      isActive: true,
    },
  });

  const opsDept = await prisma.department.upsert({
    where:  { id: "dept-ops" },
    update: {},
    create: {
      id:       "dept-ops",
      name:     "Operations",
      branchId: mainBranch.id,
      isActive: true,
    },
  });

  const csDept = await prisma.department.upsert({
    where:  { id: "dept-cs" },
    update: {},
    create: {
      id:       "dept-cs",
      name:     "Customer Service",
      branchId: mainBranch.id,
      isActive: true,
    },
  });

  // ── Shifts ──────────────────────────────────────────
  const officeShift = await prisma.shift.upsert({
    where:  { id: "shift-office" },
    update: {},
    create: {
      id:              "shift-office",
      name:            "Office Hours",
      startTime:       "09:00",
      endTime:         "18:00",
      gracePeriod:     15,
      breakDuration:   60,
      workingHours:    8,
      shiftType:       "FIXED",
      crossesMidnight: false,
      color:           "#10B981",
      isActive:        true,
    },
  });

  const morningShift = await prisma.shift.upsert({
    where:  { id: "shift-morning" },
    update: {},
    create: {
      id:              "shift-morning",
      name:            "Morning Shift",
      startTime:       "08:00",
      endTime:         "16:00",
      gracePeriod:     15,
      breakDuration:   30,
      workingHours:    8,
      shiftType:       "FIXED",
      crossesMidnight: false,
      color:           "#F59E0B",
      isActive:        true,
    },
  });

  const eveningShift = await prisma.shift.upsert({
    where:  { id: "shift-evening" },
    update: {},
    create: {
      id:              "shift-evening",
      name:            "Evening Shift",
      startTime:       "14:00",
      endTime:         "22:00",
      gracePeriod:     15,
      breakDuration:   30,
      workingHours:    8,
      shiftType:       "FIXED",
      crossesMidnight: false,
      color:           "#3B82F6",
      isActive:        true,
    },
  });

  const flexShift = await prisma.shift.upsert({
    where:  { id: "shift-flex" },
    update: {},
    create: {
      id:              "shift-flex",
      name:            "Flexible Hours",
      startTime:       "09:00",
      endTime:         "18:00",
      gracePeriod:     30,
      breakDuration:   60,
      workingHours:    8,
      shiftType:       "FLEXIBLE",
      crossesMidnight: false,
      color:           "#8B5CF6",
      isActive:        true,
    },
  });

  // ── Geofence ─────────────────────────────────────────
  const mainFence = await prisma.geofence.upsert({
    where:  { id: "geo-main" },
    update: {},
    create: {
      id:           "geo-main",
      name:         "Dar Al Karama Center",
      address:      "Sharjah, UAE",
      latitude:     25.3463,
      longitude:    55.4209,
      radiusMeters: 200,
      branchId:     mainBranch.id,
      isActive:     true,
    },
  });

  // ── Hash passwords ────────────────────────────────────
  const [superAdminHash, adminHash, managerHash, staffHash] = await Promise.all([
    bcrypt.hash("SuperAdmin@123", 12),
    bcrypt.hash("Admin@123456",   12),
    bcrypt.hash("Manager@123",    12),
    bcrypt.hash("Staff@12345",    12),
  ]);

  // ── Super Admin ───────────────────────────────────────
  const superAdminUser = await prisma.user.upsert({
    where:  { employeeId: "SA001" },
    update: {},
    create: {
      email:        "superadmin@daralkarama.ae",
      employeeId:   "SA001",
      passwordHash: superAdminHash,
      role:         "SUPER_ADMIN",
      isActive:     true,
    },
  });

  await prisma.staffProfile.upsert({
    where:  { userId: superAdminUser.id },
    update: {},
    create: {
      userId:           superAdminUser.id,
      fullName:         "Super Administrator",
      position:         "System Administrator",
      departmentId:     mgmtDept.id,
      branchId:         mainBranch.id,
      shiftId:          officeShift.id,
      employmentStatus: "ACTIVE",
      joiningDate:      new Date("2020-01-01"),
      workingDays:      ["SUN","MON","TUE","WED","THU"],
    },
  });

  // ── Admin / HR ────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where:  { employeeId: "ADM001" },
    update: {},
    create: {
      email:        "admin@daralkarama.ae",
      employeeId:   "ADM001",
      passwordHash: adminHash,
      role:         "ADMIN",
      isActive:     true,
    },
  });

  await prisma.staffProfile.upsert({
    where:  { userId: adminUser.id },
    update: {},
    create: {
      userId:           adminUser.id,
      fullName:         "HR Administrator",
      position:         "HR Manager",
      departmentId:     hrDept.id,
      branchId:         mainBranch.id,
      shiftId:          officeShift.id,
      geofenceId:       mainFence.id,
      employmentStatus: "ACTIVE",
      joiningDate:      new Date("2021-01-01"),
      workingDays:      ["SUN","MON","TUE","WED","THU"],
    },
  });

  // ── Manager ───────────────────────────────────────────
  const managerUser = await prisma.user.upsert({
    where:  { employeeId: "MGR001" },
    update: {},
    create: {
      email:        "manager@daralkarama.ae",
      employeeId:   "MGR001",
      passwordHash: managerHash,
      role:         "MANAGER",
      isActive:     true,
    },
  });

  const managerProfile = await prisma.staffProfile.upsert({
    where:  { userId: managerUser.id },
    update: {},
    create: {
      userId:           managerUser.id,
      fullName:         "Operations Manager",
      position:         "Operations Manager",
      departmentId:     mgmtDept.id,
      branchId:         mainBranch.id,
      shiftId:          officeShift.id,
      geofenceId:       mainFence.id,
      employmentStatus: "ACTIVE",
      joiningDate:      new Date("2020-06-01"),
      workingDays:      ["SUN","MON","TUE","WED","THU"],
    },
  });

  // ── Staff Members — Dar Al Karama roles ──────────────
  const staffMembers = [
    { id: "USR-S001", empId: "EMP001", name: "Sales Supervisor",        pos: "Sales Supervisor",        dept: salesDept.id,  shift: officeShift.id,  email: "sales.supervisor@daralkarama.ae" },
    { id: "USR-S002", empId: "EMP002", name: "Social Media Manager",    pos: "Social Media Manager",    dept: socialDept.id, shift: officeShift.id,  email: "social.manager@daralkarama.ae"  },
    { id: "USR-S003", empId: "EMP003", name: "Social Media Executive",  pos: "Social Media Executive",  dept: socialDept.id, shift: flexShift.id,    email: "social.exec@daralkarama.ae"     },
    { id: "USR-S004", empId: "EMP004", name: "Sales Executive",         pos: "Sales Executive",         dept: salesDept.id,  shift: morningShift.id, email: "sales.exec@daralkarama.ae"      },
    { id: "USR-S005", empId: "EMP005", name: "Customer Service Rep",    pos: "Customer Service Rep",    dept: csDept.id,     shift: officeShift.id,  email: "cs.rep@daralkarama.ae"          },
  ];

  for (const s of staffMembers) {
    const user = await prisma.user.upsert({
      where:  { employeeId: s.empId },
      update: {},
      create: {
        id:           s.id,
        employeeId:   s.empId,
        email:        s.email,
        passwordHash: staffHash,
        role:         "STAFF",
        isActive:     true,
      },
    });

    await prisma.staffProfile.upsert({
      where:  { userId: user.id },
      update: {},
      create: {
        userId:           user.id,
        fullName:         s.name,
        position:         s.pos,
        departmentId:     s.dept,
        branchId:         mainBranch.id,
        managerId:        managerUser.id,
        shiftId:          s.shift,
        geofenceId:       mainFence.id,
        employmentStatus: "ACTIVE",
        joiningDate:      new Date("2022-01-01"),
        workingDays:      ["SUN","MON","TUE","WED","THU"],
      },
    });
  }

  // ── UAE Holidays 2025 ─────────────────────────────────
  const holidays = [
    { id: "hol-newyear",    name: "New Year's Day",           date: "2025-01-01" },
    { id: "hol-eidfitr1",   name: "Eid Al Fitr",              date: "2025-03-30" },
    { id: "hol-eidfitr2",   name: "Eid Al Fitr Holiday",      date: "2025-03-31" },
    { id: "hol-eidfitr3",   name: "Eid Al Fitr Holiday",      date: "2025-04-01" },
    { id: "hol-arafat",     name: "Arafat Day",               date: "2025-06-05" },
    { id: "hol-eidadha1",   name: "Eid Al Adha",              date: "2025-06-06" },
    { id: "hol-eidadha2",   name: "Eid Al Adha Holiday",      date: "2025-06-07" },
    { id: "hol-eidadha3",   name: "Eid Al Adha Holiday",      date: "2025-06-08" },
    { id: "hol-islamicny",  name: "Islamic New Year",         date: "2025-06-26" },
    { id: "hol-prophet",    name: "Prophet's Birthday",       date: "2025-09-04" },
    { id: "hol-commemorate",name: "UAE Commemoration Day",    date: "2025-11-30" },
    { id: "hol-national1",  name: "UAE National Day",         date: "2025-12-02" },
    { id: "hol-national2",  name: "UAE National Day Holiday", date: "2025-12-03" },
  ];

  for (const h of holidays) {
    await prisma.holiday.upsert({
      where:  { id: h.id },
      update: {},
      create: {
        id:          h.id,
        name:        h.name,
        date:        new Date(h.date),
        isRecurring: false,
      },
    });
  }

  console.log("\n✅ Dar Al Karama Center — Seed complete!\n");
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log("│  Role          │ Employee ID │ Password                 │");
  console.log("├────────────────┼─────────────┼──────────────────────────┤");
  console.log("│  Super Admin   │ SA001       │ SuperAdmin@123           │");
  console.log("│  Admin / HR    │ ADM001      │ Admin@123456             │");
  console.log("│  Manager       │ MGR001      │ Manager@123              │");
  console.log("│  Staff         │ EMP001-005  │ Staff@12345              │");
  console.log("└─────────────────────────────────────────────────────────┘");
  console.log("\n  Departments: Sales, Social Media, Management, HR & Admin, Operations, Customer Service");
  console.log("  Shifts: Office Hours, Morning Shift, Evening Shift, Flexible Hours");
  console.log("  Holidays: 13 UAE public holidays pre-loaded\n");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
