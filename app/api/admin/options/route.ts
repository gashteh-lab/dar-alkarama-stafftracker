export const dynamic = "force-dynamic";
// app/api/admin/options/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "MANAGER")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const type = req.nextUrl.searchParams.get("type");

    switch (type) {
      case "departments":
        return NextResponse.json({
          success: true,
          data: await prisma.department.findMany({
            where:   { isActive: true },
            select:  { id: true, name: true, branch: { select: { name: true } } },
            orderBy: { name: "asc" },
          }),
        });

      case "branches":
        return NextResponse.json({
          success: true,
          data: await prisma.branch.findMany({
            where:   { isActive: true },
            select:  { id: true, name: true },
            orderBy: { name: "asc" },
          }),
        });

      case "shifts":
        return NextResponse.json({
          success: true,
          data: await prisma.shift.findMany({
            where:   { isActive: true },
            select:  { id: true, name: true, startTime: true, endTime: true, color: true },
            orderBy: { name: "asc" },
          }),
        });

      case "geofences":
        return NextResponse.json({
          success: true,
          data: await prisma.geofence.findMany({
            where:   { isActive: true },
            select:  { id: true, name: true, address: true, radiusMeters: true },
            orderBy: { name: "asc" },
          }),
        });

      case "managers":
        return NextResponse.json({
          success: true,
          data: await prisma.staffProfile.findMany({
            where: {
              employmentStatus: "ACTIVE",
              user: { role: { in: ["MANAGER", "ADMIN", "SUPER_ADMIN"] } },
            },
            select: {
              id:       true,
              fullName: true,
              user:     { select: { role: true, employeeId: true } },
            },
            orderBy: { fullName: "asc" },
          }),
        });

      case "staff":
        return NextResponse.json({
          success: true,
          data: await prisma.staffProfile.findMany({
            where:   { employmentStatus: "ACTIVE" },
            select:  { id: true, fullName: true, user: { select: { employeeId: true } } },
            orderBy: { fullName: "asc" },
          }),
        });

      default:
        return NextResponse.json({ success: false, error: "Unknown option type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Options error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
