// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "MANAGER")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const q     = req.nextUrl.searchParams.get("q")?.trim() || "";
    const scope = req.nextUrl.searchParams.get("scope") || "all"; // all | staff | attendance

    if (q.length < 2) {
      return NextResponse.json({ success: true, data: { staff: [], attendance: [], corrections: [] } });
    }

    const results: { staff: any[]; attendance: any[]; corrections: any[] } = {
      staff:       [],
      attendance:  [],
      corrections: [],
    };

    if (scope === "all" || scope === "staff") {
      results.staff = await prisma.staffProfile.findMany({
        where: {
          OR: [
            { fullName:   { contains: q, mode: "insensitive" } },
            { position:   { contains: q, mode: "insensitive" } },
            { user: { email:      { contains: q, mode: "insensitive" } } },
            { user: { employeeId: { contains: q, mode: "insensitive" } } },
          ],
        },
        take: 8,
        select: {
          id:       true,
          fullName: true,
          position: true,
          employmentStatus: true,
          user:       { select: { employeeId: true, email: true, role: true } },
          department: { select: { name: true } },
          shift:      { select: { name: true, color: true } },
        },
      });
    }

    if ((scope === "all" || scope === "attendance") && session.role !== "STAFF") {
      // Search recent attendance by staff name
      const staffIds = await prisma.staffProfile.findMany({
        where: { fullName: { contains: q, mode: "insensitive" } },
        select: { id: true },
        take: 5,
      });

      if (staffIds.length > 0) {
        results.attendance = await prisma.attendanceRecord.findMany({
          where: {
            staffId: { in: staffIds.map((s: any) => s.id) },
            date:    { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // last 30 days
          },
          take:    10,
          orderBy: { date: "desc" },
          include: {
            staff: { select: { fullName: true, user: { select: { employeeId: true } } } },
            shift: { select: { name: true } },
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ success: false, error: "Search failed." }, { status: 500 });
  }
}
