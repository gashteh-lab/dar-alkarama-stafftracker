export const dynamic = "force-dynamic";
// app/api/auth/login/route.ts — with rate limiting
import { NextRequest, NextResponse } from "next/server";
import { loginUser, createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { rateLimitLogin } from "@/lib/auth/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("x-real-ip") || "unknown";

    const rl = rateLimitLogin(ip);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: `Too many login attempts. Try again in ${Math.ceil((rl.resetAt - Date.now()) / 60000)} minutes.`, locked: true },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const body   = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { identifier, password } = parsed.data;
    const result = await loginUser(identifier, password, ip);

    if (!result.success || !result.user) {
      return NextResponse.json(
        { success: false, error: result.error, locked: result.locked ?? false },
        { status: result.locked ? 423 : 401 }
      );
    }

    await createSession(result.user);

    const redirectMap: Record<string, string> = {
      SUPER_ADMIN: "/admin/dashboard",
      ADMIN:       "/admin/dashboard",
      MANAGER:     "/manager/team",
      STAFF:       "/dashboard",
    };

    return NextResponse.json({
      success: true,
      user: { id: result.user.id, role: result.user.role, fullName: result.user.fullName, photoUrl: result.user.photoUrl, employeeId: result.user.employeeId },
      redirectTo: redirectMap[result.user.role] || "/dashboard",
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
