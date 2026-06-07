// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const page  = parseInt(req.nextUrl.searchParams.get("page")  || "1");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 50);
    const skip  = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where:   { userId: session.id },
        orderBy: { createdAt: "desc" },
        skip, take: limit,
      }),
      prisma.notification.count({ where: { userId: session.id } }),
      prisma.notification.count({ where: { userId: session.id, isRead: false } }),
    ]);

    return NextResponse.json({
      success: true,
      data: { notifications, unreadCount, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { ids, markAll } = await req.json();

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: session.id, isRead: false },
        data:  { isRead: true, readAt: new Date() },
      });
    } else if (ids?.length) {
      await prisma.notification.updateMany({
        where: { userId: session.id, id: { in: ids } },
        data:  { isRead: true, readAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update notifications." }, { status: 500 });
  }
}
