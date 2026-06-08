export const dynamic = "force-dynamic";
// app/api/locations/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { geofenceSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasRole(session.role, "MANAGER")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const locations = await prisma.geofence.findMany({
    orderBy: { name: "asc" },
    include: {
      branch: { select: { name: true } },
      _count: { select: { staff: true } },
    },
  });
  return NextResponse.json({ success: true, data: locations });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const body   = await req.json();
    const parsed = geofenceSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });

    const geo = await prisma.geofence.create({ data: parsed.data });
    await createAuditLog({ userId: session.id, action: "SETTINGS_CHANGED", entity: "geofences", entityId: geo.id, newValue: geo });
    return NextResponse.json({ success: true, data: geo, message: "Location created." }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create location." }, { status: 500 });
  }
}
