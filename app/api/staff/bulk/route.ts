export const dynamic = "force-dynamic";
// app/api/staff/bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const bulkSchema = z.object({
  staffIds: z.array(z.string()).min(1).max(200),
  action:   z.enum(["assign_shift","assign_department","assign_branch","assign_geofence","change_status","assign_manager"]),
  value:    z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body   = await req.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { staffIds, action, value } = parsed.data;
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    let updateData: any = {};

    switch (action) {
      case "assign_shift":
        updateData = { shiftId:       value || null };
        break;
      case "assign_department":
        updateData = { departmentId:  value || null };
        break;
      case "assign_branch":
        updateData = { branchId:      value || null };
        break;
      case "assign_geofence":
        updateData = { geofenceId:    value || null };
        break;
      case "assign_manager":
        updateData = { managerId:     value || null };
        break;
      case "change_status":
        if (!["ACTIVE","INACTIVE","SUSPENDED","ON_LEAVE"].includes(value || "")) {
          return NextResponse.json({ success: false, error: "Invalid status value." }, { status: 400 });
        }
        updateData = { employmentStatus: value as any };
        break;
      default:
        return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
    }

    const result = await prisma.staffProfile.updateMany({
      where: { id: { in: staffIds } },
      data:  updateData,
    });

    await createAuditLog({
      userId:   session.id,
      action:   "STAFF_UPDATED",
      entity:   "staff_profiles",
      reason:   `Bulk action: ${action} = ${value} on ${staffIds.length} staff`,
      newValue: { action, value, count: staffIds.length },
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      data:    { updated: result.count },
      message: `${result.count} staff member${result.count !== 1 ? "s" : ""} updated successfully.`,
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json({ success: false, error: "Bulk update failed." }, { status: 500 });
  }
}
