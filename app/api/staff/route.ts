// app/api/staff/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole, hashPassword, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { createStaffSchema } from "@/lib/validations";

// ── GET /api/staff — List all staff ──────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "MANAGER")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const page         = parseInt(searchParams.get("page")  || "1");
    const limit        = Math.min(parseInt(searchParams.get("limit") || "25"), 100);
    const search       = searchParams.get("search") || "";
    const departmentId = searchParams.get("departmentId") || undefined;
    const branchId     = searchParams.get("branchId")     || undefined;
    const status       = searchParams.get("status")       || undefined;
    const skip         = (page - 1) * limit;

    const where: any = {
      ...(status ? { employmentStatus: status } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(branchId     ? { branchId }     : {}),
      ...(search ? {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { position: { contains: search, mode: "insensitive" } },
          { user: { employeeId: { contains: search, mode: "insensitive" } } },
          { user: { email:      { contains: search, mode: "insensitive" } } },
        ],
      } : {}),
    };

    // Managers can only see their direct reports
    if (session.role === "MANAGER") {
      where.managerId = session.id;
    }

    const [profiles, total] = await Promise.all([
      prisma.staffProfile.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { fullName: "asc" },
        include: {
          user:       { select: { id: true, email: true, phone: true, employeeId: true, role: true, isActive: true, lastLoginAt: true } },
          department: { select: { id: true, name: true } },
          branch:     { select: { id: true, name: true } },
          shift:      { select: { id: true, name: true, startTime: true, endTime: true, color: true } },
        },
      }),
      prisma.staffProfile.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        staff: profiles,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error("Staff list error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ── POST /api/staff — Create staff member ────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body   = await req.json();
    const parsed = createStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message, details: parsed.error.errors },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    // Check for duplicate email / phone / employeeId
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          ...(d.email      ? [{ email:      d.email.toLowerCase() }] : []),
          ...(d.phone      ? [{ phone:      d.phone               }] : []),
          ...(d.employeeId ? [{ employeeId: d.employeeId.toUpperCase() }] : []),
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A staff member with this email, phone, or employee ID already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(d.password);

    // Create user + profile in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          email:        d.email?.toLowerCase() || null,
          phone:        d.phone                || null,
          employeeId:   d.employeeId.toUpperCase(),
          passwordHash,
          role:         d.role as any,
          isActive:     true,
        },
      });

      const profile = await tx.staffProfile.create({
        data: {
          userId:           user.id,
          fullName:         d.fullName,
          position:         d.position,
          departmentId:     d.departmentId,
          branchId:         d.branchId,
          managerId:        d.managerId,
          shiftId:          d.shiftId,
          employmentStatus: d.employmentStatus as any,
          joiningDate:      d.joiningDate ? new Date(d.joiningDate) : null,
          workingDays:      d.workingDays,
          punchMethod:      d.punchMethod,
          geofenceId:       d.geofenceId,
          emergencyContact: d.emergencyContact,
          notes:            d.notes,
        },
        include: {
          user:       { select: { email: true, employeeId: true, role: true } },
          department: true,
          branch:     true,
          shift:      true,
        },
      });

      return { user, profile };
    });

    await createAuditLog({
      userId:    session.id,
      action:    "STAFF_CREATED",
      entity:    "users",
      entityId:  result.user.id,
      newValue:  { employeeId: d.employeeId, fullName: d.fullName },
      ipAddress,
    });

    return NextResponse.json(
      { success: true, data: result.profile, message: "Staff member created successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create staff error:", error);
    return NextResponse.json({ success: false, error: "Failed to create staff member." }, { status: 500 });
  }
}
