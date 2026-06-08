export const dynamic = "force-dynamic";
// app/api/audit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const page   = parseInt(searchParams.get("page")  || "1");
    const limit  = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const skip   = (page - 1) * limit;
    const action = searchParams.get("action");
    const search = searchParams.get("search");

    const where: any = {
      ...(action ? { action: action as any } : {}),
      ...(search ? {
        OR: [
          { ipAddress: { contains: search } },
          { user: { employeeId: { contains: search, mode: "insensitive" } } },
          { user: { profile: { fullName: { contains: search, mode: "insensitive" } } } },
        ],
      } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip, take: limit,
        orderBy: { timestamp: "desc" },
        include: {
          user: {
            select: {
              employeeId: true,
              profile: { select: { fullName: true } },
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
