// lib/auth/index.ts
// StaffTrack — Authentication & Session Management

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db/prisma";
import type { Role, SessionUser } from "@/types";

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "change-this-secret-in-production-32chars"
);

const COOKIE_NAME = "stafftrack_session";

const SESSION_MAX_AGE = {
  STAFF:       parseInt(process.env.SESSION_MAX_AGE || "2592000"),      // 30 days
  ADMIN:       parseInt(process.env.ADMIN_SESSION_MAX_AGE || "86400"),  // 24h
  MANAGER:     parseInt(process.env.ADMIN_SESSION_MAX_AGE || "86400"),  // 24h
  SUPER_ADMIN: parseInt(process.env.ADMIN_SESSION_MAX_AGE || "86400"),  // 24h
};

// ─────────────────────────────────────────
// PASSWORD UTILITIES
// ─────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─────────────────────────────────────────
// JWT UTILITIES
// ─────────────────────────────────────────

export async function createToken(
  payload: SessionUser,
  expiresIn: number
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .setSubject(payload.id)
    .sign(SECRET);
}

export async function verifyToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────
// SESSION MANAGEMENT
// ─────────────────────────────────────────

export async function createSession(
  user: SessionUser,
  response?: NextResponse
): Promise<string> {
  const maxAge = SESSION_MAX_AGE[user.role] || SESSION_MAX_AGE.STAFF;
  const token = await createToken(user, maxAge);
  const expiresAt = new Date(Date.now() + maxAge * 1000);

  // Store session in DB
  await prisma.session.create({
    data: {
      userId:   user.id,
      token,
      expiresAt,
    },
  });

  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly:  true,
    secure:    process.env.NODE_ENV === "production",
    sameSite:  "lax",
    maxAge,
    path:      "/",
  });

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    // Check session still valid in DB
    const session = await prisma.session.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionUser | null> {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    const session = await prisma.session.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  cookieStore.delete(COOKIE_NAME);
}

// ─────────────────────────────────────────
// LOGIN WITH LOCKOUT
// ─────────────────────────────────────────

export async function loginUser(
  identifier: string,
  password: string,
  ipAddress?: string
): Promise<{
  success: boolean;
  user?: SessionUser;
  error?: string;
  locked?: boolean;
}> {
  try {
    // Find user by email, phone, or employeeId
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: identifier },
          { employeeId: identifier.toUpperCase() },
        ],
        isActive: true,
      },
      include: {
        profile: {
          include: {
            department: true,
            branch: true,
            shift: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: "Invalid credentials" };
    }

    // Check if account is locked
    const lockDuration = parseInt(
      process.env.ACCOUNT_LOCK_DURATION || "1800"
    );
    if (user.lockedAt) {
      const lockExpiry = new Date(
        user.lockedAt.getTime() + lockDuration * 1000
      );
      if (lockExpiry > new Date()) {
        const minutesLeft = Math.ceil(
          (lockExpiry.getTime() - Date.now()) / 60000
        );
        return {
          success: false,
          locked: true,
          error: `Account locked. Try again in ${minutesLeft} minutes.`,
        };
      } else {
        // Lock expired — reset
        await prisma.user.update({
          where: { id: user.id },
          data: { lockedAt: null, failedAttempts: 0 },
        });
      }
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      const maxAttempts = parseInt(
        process.env.ACCOUNT_LOCK_ATTEMPTS || "5"
      );
      const newAttempts = user.failedAttempts + 1;

      if (newAttempts >= maxAttempts) {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedAttempts: newAttempts, lockedAt: new Date() },
        });

        // Log account lock
        await createAuditLog({
          userId:    user.id,
          action:    "ACCOUNT_LOCKED",
          ipAddress,
        });

        return {
          success: false,
          locked: true,
          error: `Too many failed attempts. Account locked for ${
            lockDuration / 60
          } minutes.`,
        };
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: newAttempts },
      });

      // Log failed login
      await createAuditLog({
        userId:    user.id,
        action:    "LOGIN_FAILED",
        ipAddress,
        reason:    `Failed attempt ${newAttempts}/${maxAttempts}`,
      });

      return {
        success: false,
        error: `Invalid credentials. ${maxAttempts - newAttempts} attempts remaining.`,
      };
    }

    // Success — reset failed attempts, update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockedAt:       null,
        lastLoginAt:    new Date(),
        lastLoginIp:    ipAddress,
      },
    });

    // Log success
    await createAuditLog({
      userId:    user.id,
      action:    "LOGIN",
      ipAddress,
    });

    const sessionUser: SessionUser = {
      id:           user.id,
      email:        user.email,
      employeeId:   user.employeeId,
      role:         user.role as Role,
      fullName:     user.profile?.fullName ?? "Unknown",
      photoUrl:     user.profile?.photoUrl,
      departmentId: user.profile?.departmentId,
      branchId:     user.profile?.branchId,
      shiftId:      user.profile?.shiftId,
    };

    return { success: true, user: sessionUser };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "An error occurred. Please try again." };
  }
}

// ─────────────────────────────────────────
// RBAC — Permission checks
// ─────────────────────────────────────────

export const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 4,
  ADMIN:       3,
  MANAGER:     2,
  STAFF:       1,
};

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function isAdmin(role: Role): boolean {
  return hasRole(role, "ADMIN");
}

export function isManager(role: Role): boolean {
  return hasRole(role, "MANAGER");
}

export function isSuperAdmin(role: Role): boolean {
  return role === "SUPER_ADMIN";
}

// ─────────────────────────────────────────
// AUDIT LOG HELPER
// ─────────────────────────────────────────

export async function createAuditLog(params: {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId:    params.userId,
        action:    params.action as any,
        entity:    params.entity,
        entityId:  params.entityId,
        oldValue:  params.oldValue as any,
        newValue:  params.newValue as any,
        reason:    params.reason,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    // Audit log failures shouldn't break the request
    console.error("Audit log error:", error);
  }
}

// ─────────────────────────────────────────
// PASSWORD RESET
// ─────────────────────────────────────────

export async function createPasswordResetToken(
  userId: string
): Promise<string> {
  // Invalidate existing tokens
  await prisma.passwordReset.updateMany({
    where: { userId, usedAt: null },
    data:  { usedAt: new Date() },
  });

  // Generate secure token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const token = Buffer.from(array).toString("hex");

  await prisma.passwordReset.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
    },
  });

  return token;
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const resetRecord = await prisma.passwordReset.findUnique({
    where: { token },
  });

  if (!resetRecord) {
    return { success: false, error: "Invalid or expired reset token." };
  }

  if (resetRecord.usedAt) {
    return { success: false, error: "Reset token has already been used." };
  }

  if (resetRecord.expiresAt < new Date()) {
    return { success: false, error: "Reset token has expired." };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data:  { passwordHash, failedAttempts: 0, lockedAt: null },
    }),
    prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data:  { usedAt: new Date() },
    }),
    // Invalidate all sessions
    prisma.session.deleteMany({ where: { userId: resetRecord.userId } }),
  ]);

  return { success: true };
}
