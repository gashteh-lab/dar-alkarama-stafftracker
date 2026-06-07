// app/api/notifications/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { pushSubscriptionSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body   = await req.json();
    const parsed = pushSubscriptionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });

    const { endpoint, p256dh, auth, deviceInfo } = parsed.data;

    await prisma.pushSubscription.upsert({
      where:  { endpoint },
      update: { p256dh, auth, deviceInfo: deviceInfo as any, isActive: true },
      create: { userId: session.id, endpoint, p256dh, auth, deviceInfo: deviceInfo as any, isActive: true },
    });

    return NextResponse.json({ success: true, message: "Push subscription registered." });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to register subscription." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { endpoint } = await req.json();
    if (endpoint) {
      await prisma.pushSubscription.updateMany({ where: { endpoint, userId: session.id }, data: { isActive: false } });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to unsubscribe." }, { status: 500 });
  }
}
