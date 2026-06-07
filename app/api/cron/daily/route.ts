// app/api/cron/daily/route.ts
// Triggered daily by Vercel Cron or external scheduler
// vercel.json: { "crons": [{ "path": "/api/cron/daily", "schedule": "0 22 * * *" }] }

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { sendPushToUser, sendPushToAdmins, createNotification } from "@/lib/notifications/push";
import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings  = await prisma.companySettings.findFirst();
  const tz        = settings?.timezone || "Asia/Dubai";
  const nowUTC    = new Date();
  const nowLocal  = toZonedTime(nowUTC, tz);
  const todayStart = startOfDay(nowLocal);
  const todayEnd   = endOfDay(nowLocal);

  let notified = 0;

  try {
    // 1. Missed punch-outs — staff who punched in but never punched out
    const missedPunchOuts = await prisma.attendanceRecord.findMany({
      where: {
        date:     { gte: todayStart, lte: todayEnd },
        punchIn:  { not: null },
        punchOut: null,
        status:   { not: "ABSENT" },
      },
      include: {
        staff: {
          select: {
            userId:   true,
            fullName: true,
          },
        },
      },
    });

    for (const record of missedPunchOuts as any[]) {
      if (!record.staff?.userId) continue;

      await createNotification({
        userId:   record.staff.userId,
        type:     "MISSED_PUNCH_OUT",
        title:    "⚠️ Don't forget to punch out!",
        body:     "You have not punched out today. Please open StaffTrack and punch out.",
        sendPush: settings?.pushNotificationsEnabled,
        data:     { recordId: record.id },
      });

      // Update record status
      await prisma.attendanceRecord.update({
        where: { id: record.id },
        data:  { status: "MISSED_PUNCH_OUT" },
      });

      notified++;
    }

    // 2. Alert admins about missed punch-outs
    if (missedPunchOuts.length > 0) {
      await sendPushToAdmins({
        title: `${missedPunchOuts.length} missed punch-out${missedPunchOuts.length !== 1 ? "s" : ""}`,
        body:  `${missedPunchOuts.map((r: any) => r.staff?.fullName).join(", ")} did not punch out today.`,
        url:   "/admin/attendance",
        type:  "MISSED_PUNCH_OUT",
      });
    }

    // 3. Mark absent staff (those with no record today)
    const activeStaff = await prisma.staffProfile.findMany({
      where: { employmentStatus: "ACTIVE" },
      select: { id: true, userId: true, fullName: true, workingDays: true },
    });

    const todayDayName = nowLocal.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase().slice(0, 3);

    const recordedIds = new Set(
      (await prisma.attendanceRecord.findMany({
        where: { date: { gte: todayStart, lte: todayEnd } },
        select: { staffId: true },
      })).map((r: any) => r.staffId)
    );

    for (const staff of activeStaff as any[]) {
      // Skip if not a working day for this staff member
      if (!staff.workingDays.includes(todayDayName)) continue;
      // Skip if already has a record
      if (recordedIds.has(staff.id)) continue;

      // Create absent record
      await prisma.attendanceRecord.upsert({
        where: { staffId_date: { staffId: staff.id, date: todayStart } },
        update: { status: "ABSENT" },
        create: {
          staffId: staff.id,
          date:    todayStart,
          status:  "ABSENT",
          source:  "ONLINE",
        },
      });
    }

    return NextResponse.json({
      success:         true,
      missedPunchOuts: missedPunchOuts.length,
      notified,
      timestamp:       nowUTC.toISOString(),
    });

  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ success: false, error: "Cron job failed" }, { status: 500 });
  }
}
