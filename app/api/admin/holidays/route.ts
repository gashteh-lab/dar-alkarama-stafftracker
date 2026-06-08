export const dynamic = "force-dynamic";
// app/api/admin/holidays/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const year   = parseInt(req.nextUrl.searchParams.get("year") || String(new Date().getFullYear()));
  const holidays = await prisma.holiday.findMany({
    where: {
      date: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      },
    },
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ success: true, data: holidays });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { name, date, isRecurring, branchId } = await req.json();
    if (!name?.trim() || !date) {
      return NextResponse.json({ success: false, error: "Name and date required" }, { status: 400 });
    }
    const holiday = await prisma.holiday.create({
      data: { name: name.trim(), date: new Date(date), isRecurring: isRecurring || false, branchId },
    });
    return NextResponse.json({ success: true, data: holiday, message: "Holiday added." }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to add holiday." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await req.json();
    await prisma.holiday.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Holiday removed." });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete holiday." }, { status: 500 });
  }
}
