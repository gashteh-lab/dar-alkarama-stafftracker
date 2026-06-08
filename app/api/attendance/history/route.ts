export const dynamic = "force-dynamic";
// app/api/attendance/history/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const page  = parseInt(searchParams.get("page")  || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip  = (page - 1) * limit;

    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : startOfMonth(subMonths(new Date(), 1));

    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : endOfMonth(new Date());

    const status = searchParams.get("status");

    // Get staff profile
    const profile = await prisma.staffProfile.findUnique({
      where: { userId: session.id },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    const where = {
      staffId: profile.id,
      date:    { gte: startDate, lte: endDate },
      ...(status ? { status: status as any } : {}),
    };

    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
        include: { shift: { select: { name: true, startTime: true, endTime: true } } },
      }),
      prisma.attendanceRecord.count({ where }),
    ]);

    // Monthly summary
    const currentMonthStart = startOfMonth(new Date());
    const monthlySummary = await prisma.attendanceRecord.groupBy({
      by:    ["status"],
      where: { staffId: profile.id, date: { gte: currentMonthStart } },
      _count: { status: true },
    });

    const summary: Record<string, number> = {};
    for (const s of monthlySummary) {
      summary[s.status] = s._count.status;
    }

    return NextResponse.json({
      success: true,
      data: {
        records,
        summary,
        pagination: {
          page, limit, total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
