// app/api/admin/departments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasRole(session.role, "MANAGER")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: {
      branch:  { select: { name: true } },
      _count:  { select: { staff: true } },
    },
  });
  return NextResponse.json({ success: true, data: departments });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { name, branchId, managerId } = await req.json();
    if (!name?.trim()) return NextResponse.json({ success: false, error: "Department name required" }, { status: 400 });

    const dept = await prisma.department.create({
      data: { name: name.trim(), branchId: branchId || null, managerId: managerId || null },
    });
    await createAuditLog({ userId: session.id, action: "SETTINGS_CHANGED", entity: "departments", entityId: dept.id, newValue: { name } });
    return NextResponse.json({ success: true, data: dept, message: "Department created." }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create department." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id, name, branchId, managerId, isActive } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

    const dept = await prisma.department.update({
      where: { id },
      data: {
        ...(name      !== undefined ? { name }      : {}),
        ...(branchId  !== undefined ? { branchId }  : {}),
        ...(managerId !== undefined ? { managerId } : {}),
        ...(isActive  !== undefined ? { isActive }  : {}),
      },
    });
    return NextResponse.json({ success: true, data: dept });
  } catch {
    return NextResponse.json({ success: false, error: "Update failed." }, { status: 500 });
  }
}
