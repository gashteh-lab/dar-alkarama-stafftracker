export const dynamic = "force-dynamic";
// app/api/attendance/sync/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { offlineSyncSchema } from "@/lib/validations";
import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body   = await req.json();
    const parsed = offlineSyncSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { records } = parsed.data;

    // Get profile
    const profile = await prisma.staffProfile.findUnique({
      where:   { userId: session.id },
      include: { shift: true, geofence: true },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    const settings  = await prisma.companySettings.findFirst();
    const timezone  = settings?.timezone || "Asia/Dubai";
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    const syncedIds: string[] = [];
    const failedIds: string[] = [];
    const errors:    Record<string, string> = {};

    // Sort by timestamp to process in order
    const sorted = [...records].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const item of sorted) {
      try {
        const punchTime  = new Date(item.timestamp);
        const localTime  = toZonedTime(punchTime, timezone);
        const todayStart = startOfDay(localTime);
        const todayEnd   = endOfDay(localTime);

        // Store in offline sync queue log
        await prisma.offlineSyncQueue.create({
          data: {
            staffId:         profile.id,
            eventType:       item.type,
            payload:         item as any,
            deviceTimestamp: punchTime,
            isSynced:        true,
            syncedAt:        new Date(),
            syncAttempts:    1,
          },
        });

        // Find existing record
        let record = await prisma.attendanceRecord.findFirst({
          where: {
            staffId: profile.id,
            date:    { gte: todayStart, lte: todayEnd },
          },
        });

        if (item.type === "PUNCH_IN") {
          if (record?.punchIn) {
            // Skip duplicate
            syncedIds.push(item.id);
            continue;
          }

          let lateMinutes    = 0;
          let status: string = "OFFLINE_PUNCH";

          if (profile.shift) {
            const [h, m] = profile.shift.startTime.split(":").map(Number);
            const shiftStart = new Date(todayStart);
            shiftStart.setHours(h, m, 0, 0);
            const graceEnd = new Date(shiftStart.getTime() + profile.shift.gracePeriod * 60000);

            if (punchTime > graceEnd) {
              lateMinutes = Math.floor((punchTime.getTime() - shiftStart.getTime()) / 60000);
              status = "LATE";
            } else {
              status = "PRESENT";
            }
          }

          record = await prisma.attendanceRecord.upsert({
            where: { staffId_date: { staffId: profile.id, date: todayStart } },
            update: {
              punchIn:        punchTime,
              punchInLat:     item.latitude,
              punchInLng:     item.longitude,
              punchInDevice:  item.deviceInfo as any,
              status:         status as any,
              lateMinutes,
              source:         "OFFLINE",
            },
            create: {
              staffId:       profile.id,
              date:          todayStart,
              shiftId:       profile.shiftId,
              punchIn:       punchTime,
              punchInLat:    item.latitude,
              punchInLng:    item.longitude,
              punchInDevice: item.deviceInfo as any,
              status:        status as any,
              lateMinutes,
              source:        "OFFLINE",
            },
          });

        } else {
          // PUNCH_OUT
          if (!record?.punchIn) {
            errors[item.id] = "No matching punch-in found for this date";
            failedIds.push(item.id);
            continue;
          }

          if (record.punchOut) {
            syncedIds.push(item.id);
            continue;
          }

          const totalWorkedMs      = punchTime.getTime() - record.punchIn.getTime();
          const totalWorkedMinutes = Math.floor(totalWorkedMs / 60000);

          await prisma.attendanceRecord.update({
            where: { id: record.id },
            data: {
              punchOut:           punchTime,
              punchOutLat:        item.latitude,
              punchOutLng:        item.longitude,
              punchOutDevice:     item.deviceInfo as any,
              totalWorkedMinutes: Math.max(0, totalWorkedMinutes),
            },
          });
        }

        // Create punch event with offline flag
        await prisma.punchEvent.create({
          data: {
            recordId:   record?.id,
            staffId:    profile.id,
            type:       item.type,
            timestamp:  punchTime,
            lat:        item.latitude,
            lng:        item.longitude,
            accuracy:   item.accuracy,
            deviceInfo: item.deviceInfo as any,
            ipAddress,
            source:     "OFFLINE",
            isSynced:   true,
            syncedAt:   new Date(),
          },
        });

        syncedIds.push(item.id);

      } catch (err) {
        console.error(`Failed to sync record ${item.id}:`, err);
        failedIds.push(item.id);
        errors[item.id] = "Processing error";
      }
    }

    await createAuditLog({
      userId:    session.id,
      action:    "OFFLINE_SYNC",
      entity:    "attendance_records",
      reason:    `Synced ${syncedIds.length} offline punches (${failedIds.length} failed)`,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      data: { syncedIds, failedIds, errors },
      message: `${syncedIds.length} punch${syncedIds.length !== 1 ? "es" : ""} synced successfully.`,
    });

  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { success: false, error: "Sync failed. Please try again." },
      { status: 500 }
    );
  }
}
