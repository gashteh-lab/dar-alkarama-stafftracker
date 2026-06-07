// prisma/seed.ts
// StaffTrack — Database Seed
// Run: npm run db:seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding StaffTrack database...\n");

  // ── Company Settings ────────────────────────────────
  await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id:                    "default",
      name:                  "Demo Company LLC",
      timezone:              "Asia/Dubai",
      workingWeekStart:      0, // Sunday
      workingWeekEnd:        4, // Thursday
      defaultGracePeriod:    15,
      geofenceRequired:      true,
      gpsAccuracyMin:        100,
      offlinePunchAllowed:   true,
      selfieRequired:        false,
      correctionAllowed:     true,
      managerApprovalRequired: false,
      pushNotificationsEnabled: true,
      dateFormat:            "DD/MM/YYYY",
      timeFormat:            "12h",
      language:              "en",
      theme:                 "light",
    },
  });

  // ── Branches ────────────────────────────────────────
  const hqBranch = await prisma.branch.upsert({
    where: { id: "branch-hq" },
    update: {},
    create: {
      id:       "branch-hq",
      name:     "Head Office — Dubai",
      address:  "Business Bay, Dubai, UAE",
      timezone: "Asia/Dubai",
      isActive: true,
    },
  });

  const airportBranch = await prisma.branch.upsert({
    where: { id: "branch-airport" },
    update: {},
    create: {
      id:       "branch-airport",
      name:     "Dubai International Airport",
      address:  "Airport Road, Garhoud, Dubai, UAE",
      timezone: "Asia/Dubai",
      isActive: true,
    },
  });

  // ── Departments ─────────────────────────────────────
  const hrDept = await prisma.department.upsert({
    where: { id: "dept-hr" },
    update: {},
    create: {
      id:       "dept-hr",
      name:     "Human Resources",
      branchId: hqBranch.id,
      isActive: true,
    },
  });

  const opsDept = await prisma.department.upsert({
    where: { id: "dept-ops" },
    update: {},
    create: {
      id:       "dept-ops",
      name:     "Airport Operations",
      branchId: airportBranch.id,
      isActive: true,
    },
  });

  const secDept = await prisma.department.upsert({
    where: { id: "dept-sec" },
    update: {},
    create: {
      id:       "dept-sec",
      name:     "Security",
      branchId: airportBranch.id,
      isActive: true,
    },
  });

  // ── Shifts ──────────────────────────────────────────
  const morningShift = await prisma.shift.upsert({
    where: { id: "shift-morning" },
    update: {},
    create: {
      id:             "shift-morning",
      name:           "Morning Shift",
      startTime:      "06:00",
      endTime:        "14:00",
      gracePeriod:    15,
      breakDuration:  30,
      workingHours:   8,
      shiftType:      "FIXED",
      crossesMidnight: false,
      color:          "#F59E0B",
      isActive:       true,
    },
  });

  const afternoonShift = await prisma.shift.upsert({
    where: { id: "shift-afternoon" },
    update: {},
    create: {
      id:             "shift-afternoon",
      name:           "Afternoon Shift",
      startTime:      "14:00",
      endTime:        "22:00",
      gracePeriod:    15,
      breakDuration:  30,
      workingHours:   8,
      shiftType:      "FIXED",
      crossesMidnight: false,
      color:          "#3B82F6",
      isActive:       true,
    },
  });

  const nightShift = await prisma.shift.upsert({
    where: { id: "shift-night" },
    update: {},
    create: {
      id:             "shift-night",
      name:           "Night Shift",
      startTime:      "22:00",
      endTime:        "06:00",
      gracePeriod:    15,
      breakDuration:  30,
      workingHours:   8,
      shiftType:      "NIGHT",
      crossesMidnight: true,
      color:          "#8B5CF6",
      isActive:       true,
    },
  });

  const officeShift = await prisma.shift.upsert({
    where: { id: "shift-office" },
    update: {},
    create: {
      id:             "shift-office",
      name:           "Office Hours",
      startTime:      "08:00",
      endTime:        "17:00",
      gracePeriod:    15,
      breakDuration:  60,
      workingHours:   8,
      shiftType:      "FIXED",
      crossesMidnight: false,
      color:          "#10B981",
      isActive:       true,
    },
  });

  // ── Geofences ───────────────────────────────────────
  const hqFence = await prisma.geofence.upsert({
    where: { id: "geo-hq" },
    update: {},
    create: {
      id:           "geo-hq",
      name:         "Head Office",
      address:      "Business Bay, Dubai",
      latitude:     25.1875,
      longitude:    55.2796,
      radiusMeters: 200,
      branchId:     hqBranch.id,
      isActive:     true,
    },
  });

  const airportFence = await prisma.geofence.upsert({
    where: { id: "geo-airport" },
    update: {},
    create: {
      id:           "geo-airport",
      name:         "Dubai International Airport",
      address:      "Airport Road, Garhoud, Dubai",
      latitude:     25.2532,
      longitude:    55.3657,
      radiusMeters: 500,
      branchId:     airportBranch.id,
      isActive:     true,
    },
  });

  // ── Hash passwords ───────────────────────────────────
  const [superAdminHash, adminHash, managerHash, staffHash] = await Promise.all([
    bcrypt.hash("SuperAdmin@123", 12),
    bcrypt.hash("Admin@123456",   12),
    bcrypt.hash("Manager@123",    12),
    bcrypt.hash("Staff@12345",    12),
  ]);

  // ── Super Admin ─────────────────────────────────────
  const superAdminUser = await prisma.user.upsert({
    where: { employeeId: "SA001" },
    update: {},
    create: {
      email:        "superadmin@stafftrack.com",
      employeeId:   "SA001",
      passwordHash: superAdminHash,
      role:         "SUPER_ADMIN",
      isActive:     true,
    },
  });

  await prisma.staffProfile.upsert({
    where: { userId: superAdminUser.id },
    update: {},
    create: {
      userId:           superAdminUser.id,
      fullName:         "Super Administrator",
      position:         "System Administrator",
      departmentId:     hrDept.id,
      branchId:         hqBranch.id,
      shiftId:          officeShift.id,
      employmentStatus: "ACTIVE",
      joiningDate:      new Date("2020-01-01"),
      workingDays:      ["SUN", "MON", "TUE", "WED", "THU"],
    },
  });

  // ── Admin ────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { employeeId: "ADM001" },
    update: {},
    create: {
      email:        "admin@stafftrack.com",
      employeeId:   "ADM001",
      passwordHash: adminHash,
      role:         "ADMIN",
      isActive:     true,
    },
  });

  await prisma.staffProfile.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId:           adminUser.id,
      fullName:         "Ahmed Al Rashidi",
      position:         "HR Manager",
      departmentId:     hrDept.id,
      branchId:         hqBranch.id,
      shiftId:          officeShift.id,
      geofenceId:       hqFence.id,
      employmentStatus: "ACTIVE",
      joiningDate:      new Date("2021-03-15"),
      workingDays:      ["SUN", "MON", "TUE", "WED", "THU"],
    },
  });

  // ── Manager ──────────────────────────────────────────
  const managerUser = await prisma.user.upsert({
    where: { employeeId: "MGR001" },
    update: {},
    create: {
      email:        "manager@stafftrack.com",
      employeeId:   "MGR001",
      passwordHash: managerHash,
      role:         "MANAGER",
      isActive:     true,
    },
  });

  const managerProfile = await prisma.staffProfile.upsert({
    where: { userId: managerUser.id },
    update: {},
    create: {
      userId:           managerUser.id,
      fullName:         "Mohammed Al Mansoori",
      position:         "Operations Supervisor",
      departmentId:     opsDept.id,
      branchId:         airportBranch.id,
      shiftId:          morningShift.id,
      geofenceId:       airportFence.id,
      employmentStatus: "ACTIVE",
      joiningDate:      new Date("2019-06-01"),
      workingDays:      ["SUN", "MON", "TUE", "WED", "THU"],
    },
  });

  // ── Staff members ────────────────────────────────────
  const staffMembers = [
    { id: "USR-S001", empId: "EMP001", name: "Fatima Al Zaabi",   pos: "Ground Handler",    dept: opsDept.id,  shift: morningShift.id,   branch: airportBranch.id, geo: airportFence.id },
    { id: "USR-S002", empId: "EMP002", name: "Khalid Al Mazrouei",pos: "Security Officer",   dept: secDept.id,  shift: afternoonShift.id, branch: airportBranch.id, geo: airportFence.id },
    { id: "USR-S003", empId: "EMP003", name: "Sara Al Hashimi",   pos: "Check-in Agent",    dept: opsDept.id,  shift: morningShift.id,   branch: airportBranch.id, geo: airportFence.id },
    { id: "USR-S004", empId: "EMP004", name: "Omar Al Shamsi",    pos: "Ramp Agent",        dept: opsDept.id,  shift: afternoonShift.id, branch: airportBranch.id, geo: airportFence.id },
    { id: "USR-S005", empId: "EMP005", name: "Aisha Al Muhairi",  pos: "HR Assistant",      dept: hrDept.id,   shift: officeShift.id,    branch: hqBranch.id,     geo: hqFence.id     },
  ];

  for (const s of staffMembers) {
    const user = await prisma.user.upsert({
      where: { employeeId: s.empId },
      update: {},
      create: {
        id:           s.id,
        employeeId:   s.empId,
        passwordHash: staffHash,
        role:         "STAFF",
        isActive:     true,
      },
    });

    await prisma.staffProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId:           user.id,
        fullName:         s.name,
        position:         s.pos,
        departmentId:     s.dept,
        branchId:         s.branch,
        managerId:        managerUser.id,
        shiftId:          s.shift,
        geofenceId:       s.geo,
        employmentStatus: "ACTIVE",
        joiningDate:      new Date("2022-01-01"),
        workingDays:      ["SUN", "MON", "TUE", "WED", "THU"],
      },
    });
  }

  // ── Sample attendance records (last 7 days) ──────────
  const staffUser1 = await prisma.user.findFirst({
    where: { employeeId: "EMP001" },
    include: { profile: true },
  });

  if (staffUser1?.profile) {
    const today = new Date();
    for (let i = 1; i <= 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const punchIn  = new Date(date);
      punchIn.setHours(6, Math.floor(Math.random() * 20), 0, 0);
      const punchOut = new Date(date);
      punchOut.setHours(14, Math.floor(Math.random() * 30), 0, 0);

      const lateMinutes = Math.max(0, (punchIn.getMinutes() - 15));
      const workedMinutes = Math.floor(
        (punchOut.getTime() - punchIn.getTime()) / 60000
      );

      await prisma.attendanceRecord.upsert({
        where: { staffId_date: { staffId: staffUser1.profile.id, date } },
        update: {},
        create: {
          staffId:           staffUser1.profile.id,
          date,
          shiftId:           morningShift.id,
          punchIn,
          punchOut,
          punchInLat:        25.2532,
          punchInLng:        55.3657,
          punchOutLat:       25.2532,
          punchOutLng:       55.3657,
          punchInAddress:    "Dubai International Airport, Terminal 1",
          punchOutAddress:   "Dubai International Airport, Terminal 1",
          status:            lateMinutes > 0 ? "LATE" : "PRESENT",
          lateMinutes,
          totalWorkedMinutes: workedMinutes,
          source:            "ONLINE",
        },
      });
    }
  }

  console.log("\n✅ Seed complete! Demo accounts:\n");
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log("│  Role          │ Employee ID │ Password                 │");
  console.log("├────────────────┼─────────────┼──────────────────────────┤");
  console.log("│  Super Admin   │ SA001       │ SuperAdmin@123           │");
  console.log("│  Admin / HR    │ ADM001      │ Admin@123456             │");
  console.log("│  Manager       │ MGR001      │ Manager@123              │");
  console.log("│  Staff         │ EMP001-005  │ Staff@12345              │");
  console.log("└─────────────────────────────────────────────────────────┘");
  console.log("\n  Or login with email: admin@stafftrack.com / Admin@123456\n");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
