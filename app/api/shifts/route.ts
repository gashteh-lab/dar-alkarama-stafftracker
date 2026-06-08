export const dynamic = "force-dynamic";
// app/api/shifts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { shiftSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasRole(session.role, "MANAGER")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const shifts = await prisma.shift.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { staff: true } } },
  });

  return NextResponse.json({ success: true, data: shifts });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body   = await req.json();
    const parsed = shiftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const shift = await prisma.shift.create({ data: parsed.data as any });
    await createAuditLog({
      userId: session.id, action: "SETTINGS_CHANGED",
      entity: "shifts", entityId: shift.id, newValue: shift,
    });

    return NextResponse.json({ success: true, data: shift, message: "Shift created." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create shift." }, { status: 500 });
  }
}
