// app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, destroySession, createAuditLog } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);

    if (session) {
      await createAuditLog({
        userId:    session.id,
        action:    "LOGOUT",
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      });
    }

    await destroySession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
