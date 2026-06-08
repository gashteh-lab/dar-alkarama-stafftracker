export const dynamic = "force-dynamic";
// app/api/reports/attendance/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "MANAGER")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const page      = parseInt(searchParams.get("page")  || "1");
    const limit     = Math.min(parseInt(searchParams.get("limit") || "30"), 200);
    const skip      = (page - 1) * limit;
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : new Date();
    const endDate   = searchParams.get("endDate")   ? new Date(searchParams.get("endDate")!)   : new Date();
    const status    = searchParams.get("status");
    const staffId   = searchParams.get("staffId");
    const deptId    = searchParams.get("departmentId");

    const where: any = {
      date: { gte: startDate, lte: endDate },
      ...(status  ? { status: status as any }                     : {}),
      ...(staffId ? { staffId }                                   : {}),
      ...(deptId  ? { staff: { departmentId: deptId } }           : {}),
      // Manager sees only their team
      ...(session.role === "MANAGER" ? { staff: { managerId: session.id } } : {}),
    };

    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        skip, take: limit,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: {
          staff: {
            select: {
              id: true, fullName: true,
              user:       { select: { employeeId: true } },
              department: { select: { name: true } },
              branch:     { select: { name: true } },
            },
          },
          shift: { select: { name: true, startTime: true, endTime: true } },
        },
      }),
      prisma.attendanceRecord.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        records,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
