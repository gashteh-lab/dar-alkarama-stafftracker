export const dynamic = "force-dynamic";
// app/api/reports/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { format } from "date-fns";

// We generate PDF on client side using a browser-friendly approach
// This route returns structured data for client-side PDF generation
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "MANAGER")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const type      = searchParams.get("type")      || "summary";
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : new Date();
    const endDate   = searchParams.get("endDate")   ? new Date(searchParams.get("endDate")!)   : new Date();
    const staffId   = searchParams.get("staffId")   || undefined;

    if (type === "summary") {
      const records = await prisma.attendanceRecord.findMany({
        where: {
          date:    { gte: startDate, lte: endDate },
          ...(staffId ? { staffId } : {}),
        },
        take: 10000,
        include: {
          staff: {
            select: {
              fullName:   true,
              user:       { select: { employeeId: true } },
              department: { select: { name: true } },
            },
          },
        },
      });

      // Build summary grouped by staff
      const grouped: Record<string, any> = {};
      for (const r of records as any[]) {
        const id = r.staffId;
        if (!grouped[id]) {
          grouped[id] = {
            employeeId:  r.staff?.user?.employeeId || "",
            fullName:    r.staff?.fullName         || "",
            department:  r.staff?.department?.name || "",
            present: 0, absent: 0, late: 0, overtime: 0, totalHours: 0,
          };
        }
        const g = grouped[id];
        if (["PRESENT","LATE","OVERTIME","EARLY_LEAVE","MANUAL_ADJUSTMENT","OFFLINE_PUNCH"].includes(r.status)) g.present++;
        if (r.status === "ABSENT")   g.absent++;
        if (r.status === "LATE")     g.late++;
        if (r.status === "OVERTIME") g.overtime++;
        g.totalHours += (r.totalWorkedMinutes || 0) / 60;
      }

      return NextResponse.json({
        success:   true,
        data: {
          type,
          period:    { start: startDate.toISOString(), end: endDate.toISOString() },
          generatedAt: new Date().toISOString(),
          generatedBy: session.fullName,
          summary:   Object.values(grouped as Record<string,any>).sort((a: any, b: any) => a.fullName.localeCompare(b.fullName)),
          totals: {
            totalRecords: records.length,
            totalPresent: records.filter((r: any) => ["PRESENT","LATE","OVERTIME","EARLY_LEAVE"].includes(r.status)).length,
            totalAbsent:  records.filter((r: any) => r.status === "ABSENT").length,
            totalLate:    records.filter((r: any) => r.status === "LATE").length,
            totalHours:   records.reduce((a: number, r: any) => a + (r.totalWorkedMinutes || 0) / 60, 0),
          },
        },
      });
    }

    return NextResponse.json({ success: false, error: "Unknown report type" }, { status: 400 });
  } catch (error) {
    console.error("PDF data error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate report data." }, { status: 500 });
  }
}
