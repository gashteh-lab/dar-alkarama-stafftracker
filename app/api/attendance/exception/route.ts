// app/api/attendance/exception/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { latitude, longitude, accuracy, reason, punchType } = await req.json();
    if (!reason?.trim()) {
      return NextResponse.json({ success: false, error: "Reason required for location exception." }, { status: 400 });
    }

    const profile = await prisma.staffProfile.findUnique({ where: { userId: session.id } });
    if (!profile) return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });

    // Log the geofence violation attempt with reason
    await createAuditLog({
      userId:    session.id,
      action:    "GEOFENCE_VIOLATION",
      entity:    "punch_events",
      reason:    `Exception requested: ${reason} | ${punchType} at (${latitude?.toFixed(4)}, ${longitude?.toFixed(4)}) accuracy:${accuracy}m`,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
    });

    // Create a correction request for admin review
    const exception = await prisma.correctionRequest.create({
      data: {
        staffId:     profile.id,
        date:        new Date(),
        requestType: "WRONG_LOCATION",
        reason:      `Geofence exception — ${punchType}: ${reason}. GPS: (${latitude?.toFixed(5)}, ${longitude?.toFixed(5)}) ±${Math.round(accuracy || 0)}m`,
        status:      "PENDING",
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN","SUPER_ADMIN"] }, isActive: true },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a: any) => ({
          userId: a.id,
          type:   "GEOFENCE_EXCEPTION" as any,
          title:  "📍 Geofence Exception Request",
          body:   `${session.fullName} requested a location exception for ${punchType.toLowerCase().replace("_"," ")}: ${reason}`,
          data:   { correctionId: exception.id } as any,
          sentAt: new Date(),
        })),
      });
    }

    return NextResponse.json({
      success: true,
      data:    { exceptionId: exception.id },
      message: "Exception request submitted. An admin will review your request.",
    });
  } catch (error) {
    console.error("Exception error:", error);
    return NextResponse.json({ success: false, error: "Failed to submit exception." }, { status: 500 });
  }
}
