// app/api/staff/[id]/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole, hashPassword, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const profile = await prisma.staffProfile.findFirst({
      where: { OR: [{ id: params.id }, { userId: params.id }] },
    });
    if (!profile) return NextResponse.json({ success: false, error: "Staff not found" }, { status: 404 });

    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: profile.userId }, data: { passwordHash, failedAttempts: 0, lockedAt: null } }),
      prisma.session.deleteMany({ where: { userId: profile.userId } }),
    ]);

    await createAuditLog({
      userId: session.id, action: "PASSWORD_RESET",
      entity: "users", entityId: profile.userId,
      reason: `Password reset by admin ${session.employeeId}`,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
    });

    return NextResponse.json({ success: true, message: "Password reset. All sessions invalidated." });
  } catch {
    return NextResponse.json({ success: false, error: "Password reset failed." }, { status: 500 });
  }
}
