// app/api/staff/import/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole, hashPassword, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

interface ImportRow {
  employeeId:   string;
  fullName:     string;
  email?:       string;
  phone?:       string;
  position?:    string;
  department?:  string;
  branch?:      string;
  shiftName?:   string;
  joiningDate?: string;
  role?:        string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body    = await req.json();
    const rows: ImportRow[] = body.rows || [];
    const preview: boolean  = body.preview || false;
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    if (!rows.length) {
      return NextResponse.json({ success: false, error: "No data provided" }, { status: 400 });
    }

    if (rows.length > 500) {
      return NextResponse.json({ success: false, error: "Maximum 500 rows per import" }, { status: 400 });
    }

    // Load existing data for lookups
    const [departments, branches, shifts, existingUsers] = await Promise.all([
      prisma.department.findMany({ select: { id: true, name: true } }),
      prisma.branch.findMany({ select: { id: true, name: true } }),
      prisma.shift.findMany({ select: { id: true, name: true } }),
      prisma.user.findMany({
        where: { employeeId: { in: rows.map((r) => r.employeeId?.toUpperCase()).filter(Boolean) } },
        select: { employeeId: true },
      }),
    ]);

    const existingIds = new Set(existingUsers.map((u: any) => u.employeeId));
    const deptMap  = Object.fromEntries(departments.map((d: any) => [d.name.toLowerCase(), d.id]));
    const branchMap = Object.fromEntries(branches.map((b: any) => [b.name.toLowerCase(), b.id]));
    const shiftMap  = Object.fromEntries(shifts.map((s: any) => [s.name.toLowerCase(), s.id]));

    // Validate rows
    const errors:  { row: number; field: string; message: string }[] = [];
    const valid:   ImportRow[] = [];
    const seenIds = new Set<string>();

    rows.forEach((row, idx) => {
      const rowNum = idx + 1;

      if (!row.employeeId?.trim()) {
        errors.push({ row: rowNum, field: "employeeId", message: "Employee ID is required" });
        return;
      }
      if (!row.fullName?.trim()) {
        errors.push({ row: rowNum, field: "fullName", message: "Full name is required" });
        return;
      }

      const empId = row.employeeId.toUpperCase().trim();

      if (existingIds.has(empId)) {
        errors.push({ row: rowNum, field: "employeeId", message: `Employee ID ${empId} already exists` });
        return;
      }

      if (seenIds.has(empId)) {
        errors.push({ row: rowNum, field: "employeeId", message: `Duplicate Employee ID ${empId} in import` });
        return;
      }

      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push({ row: rowNum, field: "email", message: "Invalid email format" });
        return;
      }

      seenIds.add(empId);
      valid.push(row);
    });

    // Preview mode — just return validation results
    if (preview) {
      return NextResponse.json({
        success: true,
        data: {
          total:   rows.length,
          valid:   valid.length,
          errors,
          preview: valid.slice(0, 5),
        },
      });
    }

    // Stop if there are errors
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error:   `${errors.length} validation errors found. Fix them and re-import.`,
        data:    { errors },
      }, { status: 422 });
    }

    // Import valid rows
    const defaultPassword = await hashPassword("Welcome@123");
    const imported: string[] = [];
    const failed:   { row: string; error: string }[] = [];

    for (const row of valid) {
      try {
        const empId      = row.employeeId.toUpperCase().trim();
        const deptId     = row.department ? deptMap[row.department.toLowerCase()] : undefined;
        const branchId   = row.branch     ? branchMap[row.branch.toLowerCase()]   : undefined;
        const shiftId    = row.shiftName  ? shiftMap[row.shiftName.toLowerCase()] : undefined;
        const roleValue  = (row.role?.toUpperCase() as any) || "STAFF";

        await prisma.$transaction(async (tx: any) => {
          const user = await tx.user.create({
            data: {
              email:        row.email?.toLowerCase() || null,
              phone:        row.phone                || null,
              employeeId:   empId,
              passwordHash: defaultPassword,
              role:         roleValue,
              isActive:     true,
            },
          });

          await tx.staffProfile.create({
            data: {
              userId:           user.id,
              fullName:         row.fullName.trim(),
              position:         row.position,
              departmentId:     deptId,
              branchId,
              shiftId,
              employmentStatus: "ACTIVE",
              joiningDate:      row.joiningDate ? new Date(row.joiningDate) : null,
            },
          });
        });

        imported.push(empId);
      } catch (err) {
        failed.push({ row: row.employeeId, error: "Database error" });
      }
    }

    await createAuditLog({
      userId:   session.id,
      action:   "STAFF_CREATED",
      entity:   "users",
      reason:   `Bulk import: ${imported.length} staff`,
      newValue: { imported: imported.length, failed: failed.length },
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      data: { imported: imported.length, failed: failed.length, errors: failed },
      message: `${imported.length} staff imported successfully. Default password: Welcome@123`,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ success: false, error: "Import failed" }, { status: 500 });
  }
}
