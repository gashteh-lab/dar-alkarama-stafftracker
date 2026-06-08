export const dynamic = "force-dynamic";
// app/api/reports/excel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import ExcelJS from "exceljs";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "MANAGER")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const type      = searchParams.get("type")      || "attendance";
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : new Date();
    const endDate   = searchParams.get("endDate")   ? new Date(searchParams.get("endDate")!)   : new Date();
    const staffId   = searchParams.get("staffId")   || undefined;

    const wb = new ExcelJS.Workbook();
    wb.creator  = "StaffTrack PWA";
    wb.created  = new Date();
    wb.modified = new Date();

    // ── Colour palette ──────────────────────────────────────
    const NAVY   = "FF0F172A";
    const TEAL   = "FF0D9488";
    const WHITE  = "FFFFFFFF";
    const LIGHT  = "FFF8FAFC";
    const BORDER = "FFE2E8F0";
    const GREEN  = "FF10B981";
    const RED    = "FFEF4444";
    const AMBER  = "FFF59E0B";
    const PURPLE = "FF8B5CF6";

    function headerStyle(bgColor: string = NAVY): Partial<ExcelJS.Style> {
      return {
        font:      { bold: true, color: { argb: WHITE }, size: 10 },
        fill:      { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } },
        alignment: { horizontal: "center", vertical: "middle" },
        border: {
          bottom: { style: "thin", color: { argb: BORDER } },
          right:  { style: "thin", color: { argb: BORDER } },
        },
      };
    }

    function cellStyle(even: boolean): Partial<ExcelJS.Style> {
      return {
        fill:      { type: "pattern", pattern: "solid", fgColor: { argb: even ? LIGHT : WHITE } },
        alignment: { vertical: "middle" },
        border:    { bottom: { style: "hair", color: { argb: BORDER } } },
        font:      { size: 9 },
      };
    }

    function statusColor(status: string): string {
      const map: Record<string, string> = {
        PRESENT: GREEN, LATE: AMBER, ABSENT: RED, OVERTIME: PURPLE,
        EARLY_LEAVE: "FFEA580C", MISSED_PUNCH_OUT: "FFBE185D",
      };
      return map[status] || "FF64748B";
    }

    if (type === "attendance") {
      // ── Attendance sheet ──────────────────────────────────
      const records = await prisma.attendanceRecord.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          ...(staffId ? { staffId } : {}),
        },
        orderBy: [{ date: "asc" }, { staffId: "asc" }],
        take: 5000,
        include: {
          staff: {
            select: {
              fullName:   true,
              user:       { select: { employeeId: true, email: true } },
              department: { select: { name: true } },
              branch:     { select: { name: true } },
            },
          },
          shift: { select: { name: true } },
        },
      });

      const ws = wb.addWorksheet("Attendance", {
        pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
      });

      // Title
      ws.mergeCells("A1:O1");
      const titleCell = ws.getCell("A1");
      titleCell.value = `Attendance Report — ${format(startDate, "d MMM yyyy")} to ${format(endDate, "d MMM yyyy")}`;
      titleCell.style = {
        font:      { bold: true, size: 14, color: { argb: NAVY } },
        alignment: { horizontal: "center", vertical: "middle" },
        fill:      { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } },
      };
      ws.getRow(1).height = 36;

      // Generated
      ws.mergeCells("A2:O2");
      ws.getCell("A2").value = `Generated: ${format(new Date(), "d MMM yyyy, HH:mm")} by ${session.role}`;
      ws.getCell("A2").style = { font: { size: 9, color: { argb: "FF94A3B8" } }, alignment: { horizontal: "center" } };
      ws.getRow(2).height = 18;

      ws.addRow([]);

      // Headers
      const headers = [
        "Emp ID", "Full Name", "Date", "Day", "Shift",
        "Punch In", "Punch Out", "Worked Hrs", "Late (min)",
        "Early Leave (min)", "Overtime (min)", "Status",
        "Department", "Branch", "Source",
      ];
      const headerRow = ws.addRow(headers);
      headerRow.height = 24;
      headerRow.eachCell((cell) => { cell.style = headerStyle(); });

      // Column widths
      const colWidths = [10, 22, 12, 6, 14, 10, 10, 10, 10, 14, 13, 14, 18, 18, 8];
      colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

      // Data rows
      records.forEach((r: any, idx: number) => {
        const row = ws.addRow([
          r.staff?.user?.employeeId || "",
          r.staff?.fullName         || "",
          r.date ? format(new Date(r.date), "dd/MM/yyyy") : "",
          r.date ? format(new Date(r.date), "EEE") : "",
          r.shift?.name             || "",
          r.punchIn  ? format(new Date(r.punchIn),  "HH:mm") : "",
          r.punchOut ? format(new Date(r.punchOut), "HH:mm") : "",
          r.totalWorkedMinutes > 0 ? (r.totalWorkedMinutes / 60).toFixed(2) : "0.00",
          r.lateMinutes             || 0,
          r.earlyLeaveMinutes       || 0,
          r.overtimeMinutes         || 0,
          r.status?.replace(/_/g, " ") || "",
          r.staff?.department?.name || "",
          r.staff?.branch?.name     || "",
          r.source || "",
        ]);

        const even = idx % 2 === 0;
        row.eachCell((cell, colNumber) => {
          cell.style = cellStyle(even);
          if (colNumber === 12) {
            // Status cell — coloured text
            cell.font = { bold: true, color: { argb: statusColor(r.status) }, size: 9 };
          }
        });
        row.height = 18;
      });

      // Totals row
      if (records.length > 0) {
        ws.addRow([]);
        const totalsRow = ws.addRow([
          "", "TOTALS", "", "", "",
          "", "",
          (records.reduce((a: any, r: any) => a + r.totalWorkedMinutes, 0) / 60).toFixed(2),
          records.reduce((a: any, r: any) => a + r.lateMinutes, 0),
          records.reduce((a: any, r: any) => a + r.earlyLeaveMinutes, 0),
          records.reduce((a: any, r: any) => a + r.overtimeMinutes, 0),
          `${records.length} records`, "", "", "",
        ]);
        totalsRow.eachCell((cell) => {
          cell.style = { font: { bold: true, size: 9 }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } } };
        });
      }

    } else if (type === "payroll") {
      // ── Payroll summary sheet ───────────────────────────────
      const records = await prisma.attendanceRecord.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        take: 50000,
        include: {
          staff: {
            select: {
              id: true, fullName: true,
              user:       { select: { employeeId: true, email: true } },
              department: { select: { name: true } },
              branch:     { select: { name: true } },
              shift:      { select: { workingHours: true } },
            },
          },
        },
      });

      // Group by staff
      const grouped: Record<string, any> = {};
      for (const r of records) {
        const sid = r.staffId;
        if (!grouped[sid]) {
          grouped[sid] = {
            employeeId:   r.staff?.user?.employeeId || "",
            fullName:     r.staff?.fullName         || "",
            email:        r.staff?.user?.email      || "",
            department:   r.staff?.department?.name || "",
            branch:       r.staff?.branch?.name     || "",
            totalDays: 0, presentDays: 0, absentDays: 0,
            lateDays: 0, earlyLeaveDays: 0, overtimeDays: 0,
            totalWorkedMins: 0, totalLateMins: 0, totalOvertimeMins: 0,
            weekendDays: 0, holidayDays: 0,
          };
        }
        const g = grouped[sid];
        g.totalDays++;
        if (["PRESENT","LATE","OVERTIME","EARLY_LEAVE","HALF_DAY","OFFLINE_PUNCH","MANUAL_ADJUSTMENT"].includes(r.status)) g.presentDays++;
        if (r.status === "ABSENT")   g.absentDays++;
        if (r.status === "LATE")     { g.lateDays++; g.totalLateMins += r.lateMinutes || 0; }
        if (r.status === "EARLY_LEAVE") g.earlyLeaveDays++;
        if (r.status === "OVERTIME") { g.overtimeDays++; g.totalOvertimeMins += r.overtimeMinutes || 0; }
        if (r.status === "WEEKEND")  g.weekendDays++;
        if (r.status === "HOLIDAY")  g.holidayDays++;
        g.totalWorkedMins += r.totalWorkedMinutes || 0;
      }

      const ws = wb.addWorksheet("Payroll Summary", {
        pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
      });

      // Title
      ws.mergeCells("A1:P1");
      const titleCell = ws.getCell("A1");
      titleCell.value = `Payroll Summary — ${format(startDate, "MMMM yyyy")}`;
      titleCell.style = { font: { bold: true, size: 14, color: { argb: NAVY } }, alignment: { horizontal: "center", vertical: "middle" }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } } };
      ws.getRow(1).height = 36;
      ws.mergeCells("A2:P2");
      ws.getCell("A2").value = `Generated: ${format(new Date(), "d MMM yyyy, HH:mm")}  |  Period: ${format(startDate, "d MMM")} – ${format(endDate, "d MMM yyyy")}`;
      ws.getCell("A2").style = { font: { size: 9, color: { argb: "FF94A3B8" } }, alignment: { horizontal: "center" } };
      ws.addRow([]);

      const headers = [
        "Emp ID", "Full Name", "Email", "Department", "Branch",
        "Total Days", "Present", "Absent", "Late Days", "Early Leave",
        "OT Days", "Total Hrs", "Late Mins", "OT Mins", "Weekends", "Holidays",
      ];
      const headerRow = ws.addRow(headers);
      headerRow.height = 24;
      headerRow.eachCell(cell => { cell.style = headerStyle(TEAL); });

      const colWidths = [10, 22, 26, 18, 18, 10, 10, 10, 10, 12, 10, 10, 10, 10, 10, 10];
      colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

      Object.values(grouped as any).sort((a: any, b: any) => (a as any).fullName.localeCompare(b.fullName))
        .forEach((s: any, idx) => {
          const row = ws.addRow([
            s.employeeId, s.fullName, s.email, s.department, s.branch,
            s.totalDays, s.presentDays, s.absentDays, s.lateDays, s.earlyLeaveDays,
            s.overtimeDays,
            (s.totalWorkedMins / 60).toFixed(2),
            s.totalLateMins,
            s.totalOvertimeMins,
            s.weekendDays, s.holidayDays,
          ]);
          const even = idx % 2 === 0;
          row.eachCell((cell, col) => {
            cell.style = cellStyle(even);
            if (col === 8 && s.absentDays > 0)  cell.font = { bold: true, color: { argb: RED },   size: 9 };
            if (col === 9 && s.lateDays > 0)    cell.font = { bold: true, color: { argb: AMBER },  size: 9 };
            if (col === 11 && s.overtimeDays > 0) cell.font = { bold: true, color: { argb: PURPLE }, size: 9 };
          });
          row.height = 18;
        });
    }

    // ── Generate buffer ─────────────────────────────────────
    const buffer   = await wb.xlsx.writeBuffer();
    const filename = `stafftrack-${type}-${format(startDate, "yyyy-MM-dd")}.xlsx`;

    return new NextResponse(buffer, {
      status:  200,
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control":       "no-store",
      },
    });
  } catch (error) {
    console.error("Excel export error:", error);
    return NextResponse.json({ success: false, error: "Excel export failed." }, { status: 500 });
  }
}
