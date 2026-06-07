// app/api/notifications/broadcast/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, hasRole, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { sendPushToUser, sendPushToAdmins } from "@/lib/notifications/push";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !hasRole(session.role, "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { title, body, target } = await req.json();
    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ success: false, error: "Title and message required" }, { status: 400 });
    }

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    let recipientCount = 0;

    if (target === "all") {
      // Send to all active staff
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      // Create in-app notifications
      await prisma.notification.createMany({
        data: users.map((u: any) => ({
          userId: u.id, type: "ANNOUNCEMENT" as any,
          title, body, sentAt: new Date(),
        })),
      });

      // Send push
      await Promise.allSettled(users.map((u: any) => sendPushToUser(u.id, { title, body, type: "ANNOUNCEMENT", url: "/dashboard" })));
      recipientCount = users.length;

    } else if (target === "admins") {
      await sendPushToAdmins({ title, body, type: "ANNOUNCEMENT", url: "/admin/dashboard" });
      recipientCount = -1; // unknown count

    } else {
      // Specific staff member
      const user = await prisma.staffProfile.findUnique({
        where: { id: target }, select: { userId: true },
      });
      if (user) {
        await prisma.notification.create({
          data: { userId: user.userId, type: "ANNOUNCEMENT" as any, title, body, sentAt: new Date() },
        });
        await sendPushToUser(user.userId, { title, body, type: "ANNOUNCEMENT", url: "/dashboard" });
        recipientCount = 1;
      }
    }

    await createAuditLog({
      userId:   session.id,
      action:   "SETTINGS_CHANGED",
      entity:   "notifications",
      reason:   `Broadcast: "${title}" to ${target}`,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${recipientCount > 0 ? recipientCount + " users" : "recipients"}.`,
    });
  } catch (error) {
    console.error("Broadcast error:", error);
    return NextResponse.json({ success: false, error: "Failed to send notification." }, { status: 500 });
  }
}
