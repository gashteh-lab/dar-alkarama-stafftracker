// lib/auth/apiGuard.ts
// Shared API middleware helpers for route handlers

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole } from "@/lib/auth";
import { rateLimitAPI, rateLimitPunch } from "@/lib/auth/rateLimit";
import type { Role, SessionUser } from "@/types";

export interface GuardResult {
  session:  SessionUser | null;
  error:    NextResponse | null;
  ip:       string;
}

export async function apiGuard(
  req:          NextRequest,
  requiredRole: Role = "STAFF",
  options: { rateLimit?: boolean; punchLimit?: boolean } = {}
): Promise<GuardResult> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // API rate limiting
  if (options.rateLimit) {
    const route = new URL(req.url).pathname;
    const rl    = rateLimitAPI(ip, route);
    if (!rl.success) {
      return {
        session: null,
        ip,
        error: NextResponse.json(
          { success: false, error: "Rate limit exceeded. Please slow down." },
          { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
        ),
      };
    }
  }

  // Auth check
  const session = await getSessionFromRequest(req);
  if (!session) {
    return { session: null, ip, error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  }

  // Role check
  if (!hasRole(session.role, requiredRole)) {
    return { session, ip, error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  }

  // Punch-specific rate limit
  if (options.punchLimit) {
    const rl = rateLimitPunch(session.id);
    if (!rl.success) {
      return {
        session, ip,
        error: NextResponse.json(
          { success: false, error: "Too many punch attempts. Please try again later." },
          { status: 429 }
        ),
      };
    }
  }

  return { session, ip, error: null };
}
