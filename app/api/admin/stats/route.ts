export const dynamic = "force-dynamic";
// app/api/admin/stats/route.ts
// Quick stats endpoint for live dashboard widgets
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "MANAGER")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.companySettings.findFirst();
    const tz       = settings?.timezone || "Asia/Dubai";
    const nowUTC   = new Date();
    const local    = toZonedTime(nowUTC, tz);
    const todayS   = startOfDay(local);
    const todayE   = endOfDay(local);

    const [
      totalActive,
      todayPresent,
      todayOnDuty,
      todayLate,
      todayAbsent,
      pendingCorrections,
      pendingGeofence,
      recentPunches,
    ] = await Promise.all([
      prisma.staffProfile.count({ where: { employmentStatus: "ACTIVE" } }),
      prisma.attendanceRecord.count({ where: { date: { gte: todayS, lte: todayE }, status: { in: ["PRESENT","LATE","OVERTIME","EARLY_LEAVE"] } } }),
      prisma.attendanceRecord.count({ where: { date: { gte: todayS, lte: todayE }, punchIn: { not: null }, punchOut: null } }),
      prisma.attendanceRecord.count({ where: { date: { gte: todayS, lte: todayE }, status: "LATE" } }),
      prisma.attendanceRecord.count({ where: { date: { gte: todayS, lte: todayE }, status: "ABSENT" } }),
      prisma.correctionRequest.count({ where: { status: "PENDING" } }),
      prisma.auditLog.count({ where: { action: "GEOFENCE_VIOLATION", timestamp: { gte: todayS } } }),
      prisma.punchEvent.findMany({
        where:   { timestamp: { gte: todayS, lte: todayE } },
        orderBy: { timestamp: "desc" },
        take:    5,
        include: {
          staff: { select: { fullName: true, user: { select: { employeeId: true } } } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalActive,
        todayPresent,
        todayOnDuty,
        todayLate,
        todayAbsent,
        notPunchedIn:      Math.max(0, totalActive - todayPresent),
        pendingCorrections,
        pendingGeofence,
        attendanceRate:    totalActive > 0 ? Math.round((todayPresent / totalActive) * 100) : 0,
        recentPunches: recentPunches.map((p: any) => ({
          id:        p.id,
          type:      p.type,
          staffName: p.staff?.fullName,
          empId:     p.staff?.user?.employeeId,
          timestamp: p.timestamp,
        })),
        serverTime: nowUTC.toISOString(),
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
