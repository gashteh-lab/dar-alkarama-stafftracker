export const dynamic = "force-dynamic";
// app/api/admin/dashboard/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.companySettings.findFirst();
    const tz       = settings?.timezone || "Asia/Dubai";
    const nowUTC   = new Date();
    const nowLocal = toZonedTime(nowUTC, tz);
    const todayS   = startOfDay(nowLocal);
    const todayE   = endOfDay(nowLocal);

    // Run all queries in parallel
    const [
      totalStaff,
      todayRecords,
      pendingCorrections,
      missedPunchOuts,
      recentAudit,
      weeklyData,
      deptBreakdown,
    ] = await Promise.all([
      // Total active staff
      prisma.staffProfile.count({ where: { employmentStatus: "ACTIVE" } }),

      // Today's attendance records
      prisma.attendanceRecord.findMany({
        where: { date: { gte: todayS, lte: todayE } },
        select: { status: true, staffId: true, punchOut: true, punchIn: true },
      }),

      // Pending correction requests
      prisma.correctionRequest.count({ where: { status: "PENDING" } }),

      // Missed punch-outs from yesterday
      prisma.attendanceRecord.count({
        where: {
          date:     { gte: startOfDay(subDays(nowLocal, 1)), lte: endOfDay(subDays(nowLocal, 1)) },
          punchIn:  { not: null },
          punchOut: null,
          status:   { not: "ABSENT" },
        },
      }),

      // Recent audit logs
      prisma.auditLog.findMany({
        take:    8,
        orderBy: { timestamp: "desc" },
        include: {
          user: {
            select: {
              employeeId: true,
              profile:    { select: { fullName: true } },
            },
          },
        },
      }),

      // Last 7 days attendance summary
      Promise.all(
        Array.from({ length: 7 }, (_, i) => {
          const d = subDays(nowLocal, 6 - i);
          return prisma.attendanceRecord.groupBy({
            by:    ["status"],
            where: { date: { gte: startOfDay(d), lte: endOfDay(d) } },
            _count: { status: true },
          }).then((rows: any[]) => ({
            date:    format(d, "EEE"),
            present: rows.find((r) => r.status === "PRESENT")?._count.status || 0,
            late:    rows.find((r) => r.status === "LATE")?._count.status    || 0,
            absent:  rows.find((r) => r.status === "ABSENT")?._count.status  || 0,
          }));
        })
      ),

      // Department breakdown today
      prisma.attendanceRecord.findMany({
        where: { date: { gte: todayS, lte: todayE } },
        include: {
          staff: {
            select: {
              department: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    // Compute today stats
    const presentToday  = todayRecords.filter((r: any) => ["PRESENT", "LATE", "OVERTIME", "EARLY_LEAVE"].includes(r.status)).length;
    const absentToday   = todayRecords.filter((r: any) => r.status === "ABSENT").length;
    const lateToday     = todayRecords.filter((r: any) => r.status === "LATE").length;
    const onDutyNow     = todayRecords.filter((r: any) => r.punchIn && !r.punchOut).length;
    const notPunchedIn  = Math.max(0, totalStaff - todayRecords.length);

    // Dept breakdown
    const deptMap: Record<string, { present: number; absent: number; total: number }> = {};
    for (const r of deptBreakdown as any[]) {
      const dept = r.staff?.department?.name || "Unassigned";
      if (!deptMap[dept]) deptMap[dept] = { present: 0, absent: 0, total: 0 };
      deptMap[dept].total++;
      if (["PRESENT", "LATE", "OVERTIME"].includes(r.status)) deptMap[dept].present++;
      else if (r.status === "ABSENT") deptMap[dept].absent++;
    }

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalStaff,
          presentToday,
          absentToday,
          lateToday,
          onDutyNow,
          notPunchedIn,
          pendingCorrections,
          missedPunchOuts,
          attendanceRate: totalStaff > 0 ? Math.round((presentToday / totalStaff) * 100) : 0,
        },
        weeklyChart: weeklyData,
        deptBreakdown: Object.entries(deptMap).map(([name, d]) => ({ name, ...d })),
        recentAudit: recentAudit.map((l: any) => ({
          id:        l.id,
          action:    l.action,
          userName:  l.user?.profile?.fullName || l.user?.employeeId || "System",
          timestamp: l.timestamp,
          ipAddress: l.ipAddress,
        })),
        serverTime: nowUTC.toISOString(),
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
