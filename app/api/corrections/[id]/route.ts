// app/api/corrections/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { correctionReviewSchema } from "@/lib/validations";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "MANAGER")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body   = await req.json();
    const parsed = correctionReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { status, comment } = parsed.data;
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    const correction = await prisma.correctionRequest.findUnique({
      where: { id: params.id },
      include: { staff: true },
    });

    if (!correction) return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    if (correction.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "This request has already been reviewed." }, { status: 409 });
    }

    const reviewerProfile = await prisma.staffProfile.findUnique({ where: { userId: session.id } });

    const updated = await prisma.$transaction(async (tx: any) => {
      const req = await tx.correctionRequest.update({
        where: { id: params.id },
        data: {
          status:        status as any,
          reviewedBy:    session.id,
          reviewedAt:    new Date(),
          reviewComment: comment,
        },
      });

      // If approved, apply correction to attendance record
      if (status === "APPROVED" && correction.recordId) {
        const updateData: any = {};
        if (correction.correctPunchIn)  updateData.punchIn  = correction.correctPunchIn;
        if (correction.correctPunchOut) updateData.punchOut = correction.correctPunchOut;

        if (Object.keys(updateData).length > 0) {
          // Recalculate worked minutes
          const record = await tx.attendanceRecord.findUnique({ where: { id: correction.recordId } });
          const pIn  = updateData.punchIn  || record?.punchIn;
          const pOut = updateData.punchOut || record?.punchOut;
          if (pIn && pOut) {
            updateData.totalWorkedMinutes = Math.max(0,
              Math.floor((new Date(pOut).getTime() - new Date(pIn).getTime()) / 60000)
            );
          }

          await tx.attendanceRecord.update({
            where: { id: correction.recordId },
            data: {
              ...updateData,
              status:     "MANUAL_ADJUSTMENT",
              source:     "MANUAL",
              editedBy:   session.id,
              editReason: `Correction request approved by ${reviewerProfile?.fullName || "admin"}`,
            },
          });
        }
      }

      return req;
    });

    await createAuditLog({
      userId:   session.id,
      action:   status === "APPROVED" ? "CORRECTION_APPROVED" : "CORRECTION_REJECTED",
      entity:   "correction_requests",
      entityId: params.id,
      reason:   comment,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      data:    updated,
      message: `Correction request ${status.toLowerCase()}.`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to review request." }, { status: 500 });
  }
}
