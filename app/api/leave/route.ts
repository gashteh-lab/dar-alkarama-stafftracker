// app/api/leave/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const leaveSchema = z.object({
  leaveType:   z.enum(["ANNUAL","SICK","EMERGENCY","UNPAID","MATERNITY","PATERNITY","OTHER"]),
  startDate:   z.string().datetime(),
  endDate:     z.string().datetime(),
  reason:      z.string().min(5).max(500),
  attachmentUrl: z.string().url().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page      = parseInt(searchParams.get("page")  || "1");
    const limit     = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const status    = searchParams.get("status");
    const staffId   = searchParams.get("staffId");
    const skip      = (page - 1) * limit;

    const profile = await prisma.staffProfile.findUnique({ where: { userId: session.id } });

    // Build where based on role
    const where: any = {
      ...(status  ? { status: status as any } : {}),
      ...(!hasRole(session.role, "MANAGER") && profile ? { staffId: profile.id } : {}),
      ...(staffId && hasRole(session.role, "MANAGER")  ? { staffId }             : {}),
    };

    const [leaves, total] = await Promise.all([
      prisma.holiday.findMany({
        where:   { name: { contains: "LEAVE:" } }, // Hacky — see note below
        orderBy: { date: "desc" },
        skip, take: limit,
      }),
      prisma.holiday.count({ where: { name: { contains: "LEAVE:" } } }),
    ]);

    // NOTE: We're reusing the Holiday table as a simple leave store for MVP.
    // A production system would use a dedicated Leave table.
    // Leave records are stored as holidays with name format: "LEAVE:{staffId}:{type}:{status}"

    // Better: query from a proper store. For MVP, return from corrections with type APPROVED_LEAVE
    const leaveRecords = await prisma.correctionRequest.findMany({
      where: {
        requestType: "APPROVED_LEAVE",
        ...(status  ? { status: status as any }     : {}),
        ...(!hasRole(session.role, "MANAGER") && profile ? { staffId: profile.id } : {}),
        ...(staffId && hasRole(session.role, "MANAGER") ? { staffId }              : {}),
      },
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: {
        staff:    { select: { fullName: true, user: { select: { employeeId: true } } } },
        reviewer: { select: { profile: { select: { fullName: true } } } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        leaves: leaveRecords,
        pagination: { page, limit, total: leaveRecords.length, pages: 1 },
      },
    });
  } catch (error) {
    console.error("Leave GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body   = await req.json();
    const parsed = leaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const d = parsed.data;
    const profile = await prisma.staffProfile.findUnique({ where: { userId: session.id } });
    if (!profile) return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });

    // Calculate number of days
    const start    = new Date(d.startDate);
    const end      = new Date(d.endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Store as a correction request with APPROVED_LEAVE type
    const leave = await prisma.correctionRequest.create({
      data: {
        staffId:     profile.id,
        date:        start,
        requestType: "APPROVED_LEAVE",
        reason:      `[${d.leaveType}] ${d.reason} (${diffDays} day${diffDays !== 1 ? "s" : ""}: ${start.toDateString()} – ${end.toDateString()})`,
        attachmentUrl: d.attachmentUrl,
        status:      "PENDING",
        correctPunchIn:  start,
        correctPunchOut: end,
      },
      include: { staff: { select: { fullName: true } } },
    });

    await createAuditLog({
      userId: session.id, action: "CORRECTION_SUBMITTED",
      entity: "correction_requests", entityId: leave.id,
      reason: `Leave application: ${d.leaveType}`,
    });

    return NextResponse.json({
      success: true,
      data:    leave,
      message: `Leave application submitted (${diffDays} day${diffDays !== 1 ? "s" : ""}).`,
    }, { status: 201 });
  } catch (error) {
    console.error("Leave POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to submit leave." }, { status: 500 });
  }
}
