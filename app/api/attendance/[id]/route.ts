// app/api/attendance/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { attendanceEditSchema } from "@/lib/validations";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body   = await req.json();
    const parsed = attendanceEditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { punchIn, punchOut, status, editReason } = parsed.data;
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    // Get existing record
    const existing = await prisma.attendanceRecord.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }

    // Recalculate worked minutes if times changed
    let totalWorkedMinutes = existing.totalWorkedMinutes;
    const newPunchIn  = punchIn  ? new Date(punchIn)  : existing.punchIn;
    const newPunchOut = punchOut ? new Date(punchOut) : existing.punchOut;

    if (newPunchIn && newPunchOut) {
      totalWorkedMinutes = Math.max(0,
        Math.floor((newPunchOut.getTime() - newPunchIn.getTime()) / 60000) - existing.breakMinutes
      );
    }

    const updated = await prisma.attendanceRecord.update({
      where: { id: params.id },
      data: {
        ...(punchIn  ? { punchIn:  new Date(punchIn)  } : {}),
        ...(punchOut ? { punchOut: new Date(punchOut) } : {}),
        ...(status   ? { status:   status as any }       : {}),
        totalWorkedMinutes,
        source:   "MANUAL",
        editedBy: session.id,
        editReason,
      },
      include: {
        staff: { select: { fullName: true, user: { select: { employeeId: true } } } },
      },
    });

    await createAuditLog({
      userId:   session.id,
      action:   "ATTENDANCE_EDITED",
      entity:   "attendance_records",
      entityId: params.id,
      oldValue: { punchIn: existing.punchIn, punchOut: existing.punchOut, status: existing.status },
      newValue: { punchIn, punchOut, status },
      reason:   editReason,
      ipAddress,
    });

    return NextResponse.json({ success: true, data: updated, message: "Attendance record updated." });
  } catch (error) {
    console.error("Edit attendance error:", error);
    return NextResponse.json({ success: false, error: "Failed to update record." }, { status: 500 });
  }
}
