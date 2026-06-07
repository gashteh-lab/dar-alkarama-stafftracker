// app/api/attendance/today/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { startOfDay, endOfDay, formatISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get staff profile
    const profile = await prisma.staffProfile.findUnique({
      where:   { userId: session.id },
      include: { shift: true },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: "Staff profile not found" }, { status: 404 });
    }

    // Get company settings for timezone
    const settings = await prisma.companySettings.findFirst();
    const timezone = settings?.timezone || "Asia/Dubai";

    // Get today in company timezone
    const nowUTC    = new Date();
    const nowLocal  = toZonedTime(nowUTC, timezone);
    const todayStart = startOfDay(nowLocal);
    const todayEnd   = endOfDay(nowLocal);

    // Find today's attendance record
    const record = await prisma.attendanceRecord.findFirst({
      where: {
        staffId: profile.id,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: { shift: true },
    });

    // Calculate worked minutes
    let workedMinutes = 0;
    if (record?.punchIn) {
      const end = record.punchOut || nowUTC;
      workedMinutes = Math.floor((end.getTime() - record.punchIn.getTime()) / 60000);
      // Subtract break time if punched out
      if (record.punchOut) {
        workedMinutes -= record.breakMinutes || 0;
      }
    }

    // Calculate late status
    let isLate      = false;
    let lateMinutes = 0;

    if (profile.shift) {
      const [shiftHour, shiftMin] = profile.shift.startTime.split(":").map(Number);
      const shiftStart = new Date(todayStart);
      shiftStart.setHours(shiftHour, shiftMin, 0, 0);
      const graceEnd = new Date(shiftStart.getTime() + profile.shift.gracePeriod * 60000);

      if (record?.punchIn && record.punchIn > graceEnd) {
        isLate      = true;
        lateMinutes = Math.floor((record.punchIn.getTime() - shiftStart.getTime()) / 60000);
      } else if (!record?.punchIn && nowLocal > graceEnd) {
        isLate      = true;
        lateMinutes = Math.floor((nowUTC.getTime() - shiftStart.getTime()) / 60000);
      }
    }

    const todayStatus = {
      hasRecord:     !!record,
      record:        record || null,
      isPunchedIn:   !!record?.punchIn,
      isPunchedOut:  !!record?.punchOut,
      currentStatus: record?.status || null,
      workedMinutes: Math.max(0, workedMinutes),
      shift:         profile.shift || null,
      isLate,
      lateMinutes:   Math.max(0, lateMinutes),
      serverTime:    formatISO(nowUTC),
    };

    return NextResponse.json({ success: true, data: todayStatus });
  } catch (error) {
    console.error("Today status error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
