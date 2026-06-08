export const dynamic = "force-dynamic";
// app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, verifyPassword, hashPassword, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { changePasswordSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body   = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ success: false, error: "Current password is incorrect." }, { status: 401 });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: session.id },
      data:  { passwordHash: newHash },
    });

    await createAuditLog({
      userId: session.id, action: "PASSWORD_RESET",
      reason: "User changed their own password", ipAddress,
    });

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update password." }, { status: 500 });
  }
}
