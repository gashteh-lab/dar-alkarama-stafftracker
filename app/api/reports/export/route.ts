// app/api/reports/export/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "MANAGER")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const exportFormat = searchParams.get("format") || "csv";
    const type         = searchParams.get("type")   || "attendance";
    const startDate    = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : new Date();
    const endDate      = searchParams.get("endDate")   ? new Date(searchParams.get("endDate")!)   : new Date();
    const staffId      = searchParams.get("staffId");

    const where: any = {
      ...(type === "attendance" ? {
        date: { gte: startDate, lte: endDate },
        ...(staffId ? { staffId } : {}),
      } : {}),
    };

    let csvContent = "";
    const filename  = `stafftrack-${type}-${format(new Date(), "yyyy-MM-dd")}`;

    if (type === "attendance") {
      const records = await prisma.attendanceRecord.findMany({
        where,
        orderBy: [{ date: "asc" }],
        take:    5000,
        include: {
          staff: {
            select: {
              fullName: true,
              user:       { select: { employeeId: true, email: true } },
              department: { select: { name: true } },
              branch:     { select: { name: true } },
            },
          },
          shift: { select: { name: true } },
        },
      });

      const headers = [
        "Employee ID", "Full Name", "Date", "Shift",
        "Punch In", "Punch Out", "Worked Hours",
        "Status", "Late (min)", "Early Leave (min)", "Overtime (min)",
        "Department", "Branch", "Source", "Flagged",
      ];

      const rows = records.map((r: any) => [
        r.staff?.user?.employeeId || "",
        r.staff?.fullName          || "",
        format(new Date(r.date), "yyyy-MM-dd"),
        r.shift?.name || "",
        r.punchIn  ? format(new Date(r.punchIn),  "HH:mm") : "",
        r.punchOut ? format(new Date(r.punchOut), "HH:mm") : "",
        r.totalWorkedMinutes > 0 ? (r.totalWorkedMinutes / 60).toFixed(2) : "0",
        r.status,
        r.lateMinutes.toString(),
        r.earlyLeaveMinutes.toString(),
        r.overtimeMinutes.toString(),
        r.staff?.department?.name || "",
        r.staff?.branch?.name     || "",
        r.source,
        r.isFlagged ? "Yes" : "No",
      ]);

      csvContent = [headers, ...rows]
        .map((row) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    } else if (type === "staff") {
      const staff = await prisma.staffProfile.findMany({
        take: 1000,
        include: {
          user:       { select: { email: true, phone: true, employeeId: true, role: true, isActive: true, createdAt: true } },
          department: { select: { name: true } },
          branch:     { select: { name: true } },
          shift:      { select: { name: true } },
        },
      });

      const headers = ["Employee ID","Full Name","Email","Phone","Position","Department","Branch","Shift","Status","Role","Joining Date"];
      const rows    = staff.map((s: any) => [
        s.user?.employeeId || "",
        s.fullName,
        s.user?.email  || "",
        s.user?.phone  || "",
        s.position     || "",
        s.department?.name || "",
        s.branch?.name     || "",
        s.shift?.name      || "",
        s.employmentStatus,
        s.user?.role || "",
        s.joiningDate ? format(new Date(s.joiningDate), "yyyy-MM-dd") : "",
      ]);

      csvContent = [headers, ...rows]
        .map((row) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
        "Cache-Control":       "no-store",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ success: false, error: "Export failed" }, { status: 500 });
  }
}
