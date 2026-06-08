export const dynamic = "force-dynamic";
// app/api/corrections/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { correctionRequestSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page   = parseInt(searchParams.get("page")  || "1");
    const limit  = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const status = searchParams.get("status");
    const skip   = (page - 1) * limit;

    const profile = await prisma.staffProfile.findUnique({ where: { userId: session.id } });

    // Staff see only their own; admin/manager see all (or their team)
    const where: any = {
      ...(status ? { status: status as any } : {}),
      ...(!hasRole(session.role, "MANAGER") && profile ? { staffId: profile.id } : {}),
      ...(session.role === "MANAGER" && profile ? { staff: { managerId: session.id } } : {}),
    };

    const [requests, total] = await Promise.all([
      prisma.correctionRequest.findMany({
        where,
        skip, take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          staff:    { select: { fullName: true, user: { select: { employeeId: true } } } },
          reviewer: { select: { profile: { select: { fullName: true } } } },
          record:   { select: { date: true, punchIn: true, punchOut: true, status: true } },
        },
      }),
      prisma.correctionRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { requests, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body   = await req.json();
    const parsed = correctionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const settings = await prisma.companySettings.findFirst();
    if (!settings?.correctionAllowed) {
      return NextResponse.json({ success: false, error: "Correction requests are currently disabled." }, { status: 403 });
    }

    const profile = await prisma.staffProfile.findUnique({ where: { userId: session.id } });
    if (!profile) return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });

    const d = parsed.data;
    const request = await prisma.correctionRequest.create({
      data: {
        staffId:        profile.id,
        recordId:       d.recordId,
        date:           new Date(d.date),
        requestType:    d.requestType as any,
        correctPunchIn: d.correctPunchIn  ? new Date(d.correctPunchIn)  : null,
        correctPunchOut:d.correctPunchOut ? new Date(d.correctPunchOut) : null,
        reason:         d.reason,
        attachmentUrl:  d.attachmentUrl,
        status:         "PENDING",
      },
      include: {
        staff: { select: { fullName: true } },
      },
    });

    await createAuditLog({
      userId: session.id, action: "CORRECTION_SUBMITTED",
      entity: "correction_requests", entityId: request.id,
    });

    return NextResponse.json({ success: true, data: request, message: "Correction request submitted." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to submit request." }, { status: 500 });
  }
}
