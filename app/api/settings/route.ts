export const dynamic = "force-dynamic";
// app/api/settings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { companySettingsSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const settings = await prisma.companySettings.findFirst();
    return NextResponse.json({ success: true, data: settings });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const body   = await req.json();
    const parsed = companySettingsSchema.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });

    const existing = await prisma.companySettings.findFirst();
    const settings = existing
      ? await prisma.companySettings.update({ where: { id: existing.id }, data: { ...parsed.data, updatedBy: session.id } })
      : await prisma.companySettings.create({ data: { id: "default", ...parsed.data as any, updatedBy: session.id } });

    await createAuditLog({
      userId: session.id, action: "SETTINGS_CHANGED",
      entity: "company_settings", newValue: parsed.data,
    });

    return NextResponse.json({ success: true, data: settings, message: "Settings updated." });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to save settings." }, { status: 500 });
  }
}
