// app/api/staff/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { updateStaffSchema } from "@/lib/validations";

// ── GET /api/staff/[id] ─────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "MANAGER")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.staffProfile.findFirst({
      where: { OR: [{ id: params.id }, { userId: params.id }] },
      include: {
        user:       { select: { id: true, email: true, phone: true, employeeId: true, role: true, isActive: true, lastLoginAt: true, createdAt: true } },
        department: true,
        branch:     true,
        shift:      true,
        geofence:   true,
        attendanceRecords: {
          orderBy: { date: "desc" },
          take:    5,
          include: { shift: { select: { name: true } } },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: "Staff member not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ── PUT /api/staff/[id] ─────────────────────────────────────
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body   = await req.json();
    const parsed = updateStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    // Find profile
    const existing = await prisma.staffProfile.findFirst({
      where: { OR: [{ id: params.id }, { userId: params.id }] },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Staff member not found" }, { status: 404 });
    }

    // Update user fields if provided
    if (d.email || d.phone || d.role) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: {
          ...(d.email ? { email: d.email.toLowerCase() } : {}),
          ...(d.phone ? { phone: d.phone }               : {}),
          ...(d.role  ? { role:  d.role as any }          : {}),
        },
      });
    }

    // Update profile
    const profile = await prisma.staffProfile.update({
      where: { id: existing.id },
      data: {
        ...(d.fullName         !== undefined ? { fullName:         d.fullName }         : {}),
        ...(d.position         !== undefined ? { position:         d.position }         : {}),
        ...(d.departmentId     !== undefined ? { departmentId:     d.departmentId }     : {}),
        ...(d.branchId         !== undefined ? { branchId:         d.branchId }         : {}),
        ...(d.managerId        !== undefined ? { managerId:        d.managerId }        : {}),
        ...(d.shiftId          !== undefined ? { shiftId:          d.shiftId }          : {}),
        ...(d.employmentStatus !== undefined ? { employmentStatus: d.employmentStatus as any } : {}),
        ...(d.joiningDate      !== undefined ? { joiningDate:      d.joiningDate ? new Date(d.joiningDate) : null } : {}),
        ...(d.workingDays      !== undefined ? { workingDays:      d.workingDays }      : {}),
        ...(d.punchMethod      !== undefined ? { punchMethod:      d.punchMethod }      : {}),
        ...(d.geofenceId       !== undefined ? { geofenceId:       d.geofenceId }       : {}),
        ...(d.emergencyContact !== undefined ? { emergencyContact: d.emergencyContact } : {}),
        ...(d.notes            !== undefined ? { notes:            d.notes }            : {}),
      },
      include: {
        user:       { select: { email: true, employeeId: true, role: true } },
        department: true,
        branch:     true,
        shift:      true,
      },
    });

    await createAuditLog({
      userId:    session.id,
      action:    "STAFF_UPDATED",
      entity:    "staff_profiles",
      entityId:  existing.id,
      newValue:  d,
      ipAddress,
    });

    return NextResponse.json({ success: true, data: profile, message: "Staff member updated." });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update staff member." }, { status: 500 });
  }
}

// ── DELETE /api/staff/[id] — Soft deactivate ────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { reason } = await req.json().catch(() => ({ reason: "Deactivated by admin" }));
    const ipAddress  = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    const profile = await prisma.staffProfile.findFirst({
      where: { OR: [{ id: params.id }, { userId: params.id }] },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: "Staff member not found" }, { status: 404 });
    }

    // Soft delete — deactivate user and profile
    await prisma.$transaction([
      prisma.user.update({
        where: { id: profile.userId },
        data:  { isActive: false },
      }),
      prisma.staffProfile.update({
        where: { id: profile.id },
        data:  { employmentStatus: "INACTIVE" },
      }),
      // Invalidate all sessions
      prisma.session.deleteMany({ where: { userId: profile.userId } }),
    ]);

    await createAuditLog({
      userId:   session.id,
      action:   "STAFF_DEACTIVATED",
      entity:   "users",
      entityId: profile.userId,
      reason,
      ipAddress,
    });

    return NextResponse.json({ success: true, message: "Staff member deactivated." });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to deactivate staff member." }, { status: 500 });
  }
}
