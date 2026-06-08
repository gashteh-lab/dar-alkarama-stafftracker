// app/api/admin/branches/route.ts
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasRole(session.role, "MANAGER")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { staff: true, departments: true } } },
  });
  return NextResponse.json({ success: true, data: branches });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { name, address, timezone } = await req.json();
    if (!name?.trim()) return NextResponse.json({ success: false, error: "Branch name required" }, { status: 400 });

    const branch = await prisma.branch.create({
      data: { name: name.trim(), address, timezone: timezone || "Asia/Dubai" },
    });
    await createAuditLog({ userId: session.id, action: "SETTINGS_CHANGED", entity: "branches", entityId: branch.id, newValue: { name } });
    return NextResponse.json({ success: true, data: branch, message: "Branch created." }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create branch." }, { status: 500 });
  }
}
