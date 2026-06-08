export const dynamic = "force-dynamic";
// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true, email: true, phone: true, employeeId: true,
        role: true, lastLoginAt: true,
        profile: {
          include: {
            department: { select: { id: true, name: true } },
            branch:     { select: { id: true, name: true } },
            shift:      { select: { id: true, name: true, startTime: true, endTime: true, color: true } },
            geofence:   { select: { id: true, name: true, radiusMeters: true } },
          },
        },
      },
    });

    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
