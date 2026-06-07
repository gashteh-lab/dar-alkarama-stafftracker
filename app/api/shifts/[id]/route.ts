// app/api/shifts/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { shiftSchema } from "@/lib/validations";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const parsed = shiftSchema.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });

    const shift = await prisma.shift.update({ where: { id: params.id }, data: parsed.data as any });
    await createAuditLog({ userId: session.id, action: "SETTINGS_CHANGED", entity: "shifts", entityId: shift.id, newValue: parsed.data });
    return NextResponse.json({ success: true, data: shift });
  } catch { return NextResponse.json({ success: false, error: "Update failed" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    // Check if shift has staff
    const count = await prisma.staffProfile.count({ where: { shiftId: params.id } });
    if (count > 0) {
      return NextResponse.json({ success: false, error: `Cannot delete shift — ${count} staff members are assigned to it. Reassign them first.` }, { status: 409 });
    }
    await prisma.shift.update({ where: { id: params.id }, data: { isActive: false } });
    return NextResponse.json({ success: true, message: "Shift deactivated." });
  } catch { return NextResponse.json({ success: false, error: "Delete failed" }, { status: 500 }); }
}
