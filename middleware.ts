// middleware.ts
// StaffTrack — Route protection middleware

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import type { Role, SessionUser } from "@/types";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "change-this-secret-in-production-32chars"
);

const COOKIE_NAME = "stafftrack_session";

// ── Route access rules ──────────────────────────────────────────────────────
const ROUTE_RULES: Record<string, Role[]> = {
  "/admin":         ["SUPER_ADMIN", "ADMIN"],
  "/manager":       ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  "/dashboard":     ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"],
  "/attendance":    ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"],
  "/profile":       ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"],
  "/corrections":   ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"],
};

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/offline",
  "/manifest.json",
  "/sw.js",
  "/icons",
  "/_next",
  "/favicon.ico",
];

const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 4,
  ADMIN:       3,
  MANAGER:     2,
  STAFF:       1,
};

function hasAccess(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.some(
    (r) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[r]
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes and static assets
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route)
  );

  if (isPublic) {
    return NextResponse.next();
  }

  // Get session token
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT
  let session: SessionUser | null = null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    session = payload as unknown as SessionUser;
  } catch {
    const loginUrl = new URL("/login", req.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Check role-based access for matched routes
  const matchedRoute = Object.keys(ROUTE_RULES).find((route) =>
    pathname.startsWith(route)
  );

  if (matchedRoute) {
    const allowedRoles = ROUTE_RULES[matchedRoute];
    if (!hasAccess(session.role as Role, allowedRoles)) {
      // Redirect to their appropriate dashboard
      const redirectMap: Record<Role, string> = {
        SUPER_ADMIN: "/admin/dashboard",
        ADMIN:       "/admin/dashboard",
        MANAGER:     "/manager/team",
        STAFF:       "/dashboard",
      };
      return NextResponse.redirect(
        new URL(redirectMap[session.role as Role] || "/dashboard", req.url)
      );
    }
  }

  // Inject user info headers for API routes
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id",   session.id);
  requestHeaders.set("x-user-role", session.role);
  requestHeaders.set("x-user-name", session.fullName);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|screenshots/|manifest.json|sw.js|offline).*)",
  ],
};
