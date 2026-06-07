// lib/notifications/push.ts
// StaffTrack — Web Push sender utility

import webpush from "web-push";
import prisma from "@/lib/db/prisma";

// Configure VAPID
if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@stafftrack.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title:            string;
  body:             string;
  url?:             string;
  type?:            string;
  tag?:             string;
  requireInteraction?: boolean;
  actions?:         { action: string; title: string }[];
  data?:            Record<string, unknown>;
}

// Send to a single user
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, isActive: true },
  });

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 86400 }
      );
      sent++;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription expired — deactivate
        await prisma.pushSubscription.update({
          where: { id: sub.id }, data: { isActive: false },
        });
      }
    }
  }
  return sent;
}

// Send to multiple users
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  await Promise.allSettled(userIds.map(id => sendPushToUser(id, payload)));
}

// Send to all admins
export async function sendPushToAdmins(payload: PushPayload): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
    select: { id: true },
  });
  await sendPushToUsers(admins.map((a: any) => a.id), payload);
}

// Create in-app notification record
export async function createNotification(params: {
  userId:  string;
  type:    string;
  title:   string;
  body:    string;
  data?:   Record<string, unknown>;
  sendPush?: boolean;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId:  params.userId,
      type:    params.type as any,
      title:   params.title,
      body:    params.body,
      data:    params.data as any,
      sentAt:  new Date(),
    },
  });

  if (params.sendPush) {
    await sendPushToUser(params.userId, {
      title: params.title,
      body:  params.body,
      type:  params.type,
      data:  params.data,
    });
  }
}
