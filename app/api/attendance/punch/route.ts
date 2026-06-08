export const dynamic = "force-dynamic";
// app/api/attendance/punch/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, createAuditLog } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { punchSchema } from "@/lib/validations";
import { haversineDistance, detectSuspiciousLocation } from "@/lib/geofence";
import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body   = await req.json();
    const parsed = punchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    // Get staff profile with shift and geofence
    const profile = await prisma.staffProfile.findUnique({
      where: { userId: session.id },
      include: {
        shift:    true,
        geofence: true,
      },
    });

    if (!profile || profile.employmentStatus !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Staff profile not found or inactive." },
        { status: 403 }
      );
    }

    // Get company settings
    const settings = await prisma.companySettings.findFirst();
    const timezone  = settings?.timezone || "Asia/Dubai";
    const geofenceRequired = settings?.geofenceRequired ?? true;
    const minAccuracy      = settings?.gpsAccuracyMin  ?? 100;

    // Get today in company timezone
    const punchTime  = new Date(data.timestamp);
    const localTime  = toZonedTime(punchTime, timezone);
    const todayStart = startOfDay(localTime);
    const todayEnd   = endOfDay(localTime);

    // ── Geofence validation ──────────────────────────────────

    let geofenceCheck = null;

    if (geofenceRequired && profile.geofence && data.latitude && data.longitude) {
      // Check GPS accuracy
      if (data.accuracy && data.accuracy > minAccuracy) {
        return NextResponse.json({
          success: false,
          error: `GPS accuracy too poor (${Math.round(data.accuracy)}m). Please move to an open area and try again.`,
          code: "POOR_ACCURACY",
        }, { status: 422 });
      }

      const distance = haversineDistance(
        data.latitude!,
        data.longitude!,
        profile.geofence.latitude,
        profile.geofence.longitude
      );

      geofenceCheck = {
        isInside:     distance <= profile.geofence.radiusMeters,
        distance:     Math.round(distance),
        accuracy:     data.accuracy ? Math.round(data.accuracy) : null,
        geofenceName: profile.geofence.name,
        radiusMeters: profile.geofence.radiusMeters,
      };

      if (!geofenceCheck.isInside) {
        // Log geofence violation
        await createAuditLog({
          userId:    session.id,
          action:    "GEOFENCE_VIOLATION",
          entity:    "punch_events",
          reason:    `Distance: ${geofenceCheck.distance}m, Radius: ${profile.geofence.radiusMeters}m`,
          ipAddress,
        });

        return NextResponse.json({
          success:      false,
          error:        `You are ${Math.round(distance - profile.geofence.radiusMeters)}m outside the allowed work location "${profile.geofence.name}". Please move closer and try again.`,
          code:         "OUTSIDE_GEOFENCE",
          geofenceCheck,
        }, { status: 422 });
      }
    } else if (geofenceRequired && profile.geofence && !data.latitude) {
      return NextResponse.json({
        success: false,
        error:   "Location is required. Please allow location access and try again.",
        code:    "GPS_REQUIRED",
      }, { status: 422 });
    }

    // ── Mock location check ──────────────────────────────────

    let isFlagged  = false;
    let flagReason = "";

    if (data.latitude && data.longitude && data.accuracy) {
      const suspicion = detectSuspiciousLocation({
        latitude:  data.latitude,
        longitude: data.longitude,
        accuracy:  data.accuracy,
        timestamp: punchTime.getTime(),
      });

      if (suspicion.isSuspicious) {
        isFlagged  = true;
        flagReason = suspicion.reasons.join("; ");
      }
    }

    // ── Find or create today's attendance record ─────────────

    let record = await prisma.attendanceRecord.findFirst({
      where: {
        staffId: profile.id,
        date: { gte: todayStart, lte: todayEnd },
      },
    });

    if (data.type === "PUNCH_IN") {
      // Prevent duplicate punch-in
      if (record?.punchIn) {
        return NextResponse.json(
          { success: false, error: "You have already punched in today.", code: "DUPLICATE_PUNCH_IN" },
          { status: 409 }
        );
      }

      // Calculate lateness
      let lateMinutes    = 0;
      let attendanceStatus: string = "PRESENT";

      if (profile.shift) {
        const [h, m] = profile.shift.startTime.split(":").map(Number);
        const shiftStart = new Date(todayStart);
        shiftStart.setHours(h, m, 0, 0);
        const graceEnd = new Date(shiftStart.getTime() + profile.shift.gracePeriod * 60000);

        if (punchTime > graceEnd) {
          lateMinutes      = Math.floor((punchTime.getTime() - shiftStart.getTime()) / 60000);
          attendanceStatus = "LATE";
        }
      }

      // Create or update record
      record = await prisma.attendanceRecord.upsert({
        where: { staffId_date: { staffId: profile.id, date: todayStart } },
        update: {
          punchIn:        punchTime,
          punchInLat:     data.latitude,
          punchInLng:     data.longitude,
          punchInAddress: data.address,
          punchInDevice:  data.deviceInfo as any,
          status:         attendanceStatus as any,
          lateMinutes,
          source:         data.source as any,
          isFlagged,
          flagReason:     isFlagged ? flagReason : null,
        },
        create: {
          staffId:        profile.id,
          date:           todayStart,
          shiftId:        profile.shiftId,
          punchIn:        punchTime,
          punchInLat:     data.latitude,
          punchInLng:     data.longitude,
          punchInAddress: data.address,
          punchInDevice:  data.deviceInfo as any,
          status:         attendanceStatus as any,
          lateMinutes,
          source:         data.source as any,
          isFlagged,
          flagReason:     isFlagged ? flagReason : null,
        },
      });

      // Log punch event
      await prisma.punchEvent.create({
        data: {
          recordId:  record.id,
          staffId:   profile.id,
          type:      "PUNCH_IN",
          timestamp: punchTime,
          lat:       data.latitude,
          lng:       data.longitude,
          address:   data.address,
          accuracy:  data.accuracy,
          deviceInfo: data.deviceInfo as any,
          ipAddress,
          source:    data.source as any,
          isSynced:  !data.isOffline,
          syncedAt:  data.isOffline ? null : new Date(),
        },
      });

      await createAuditLog({
        userId:    session.id,
        action:    "PUNCH_IN",
        entity:    "attendance_records",
        entityId:  record.id,
        ipAddress,
      });

    } else {
      // PUNCH_OUT
      if (!record?.punchIn) {
        return NextResponse.json(
          { success: false, error: "You haven't punched in yet today.", code: "NO_PUNCH_IN" },
          { status: 409 }
        );
      }

      if (record.punchOut) {
        return NextResponse.json(
          { success: false, error: "You have already punched out today.", code: "DUPLICATE_PUNCH_OUT" },
          { status: 409 }
        );
      }

      // Calculate worked time
      const totalWorkedMs = punchTime.getTime() - record.punchIn.getTime();
      const totalWorkedMinutes = Math.floor(totalWorkedMs / 60000) - (record.breakMinutes || 0);

      // Calculate early leave / overtime
      let earlyLeaveMinutes = 0;
      let overtimeMinutes   = 0;
      let finalStatus: string = record.status;

      if (profile.shift) {
        const [h, m] = profile.shift.endTime.split(":").map(Number);
        const shiftEnd = new Date(todayStart);
        shiftEnd.setHours(h, m, 0, 0);

        // Handle night shift (crosses midnight)
        if (profile.shift.crossesMidnight && shiftEnd <= record.punchIn) {
          shiftEnd.setDate(shiftEnd.getDate() + 1);
        }

        const expectedMinutes = profile.shift.workingHours * 60;

        if (punchTime < shiftEnd) {
          earlyLeaveMinutes = Math.floor((shiftEnd.getTime() - punchTime.getTime()) / 60000);
          if (earlyLeaveMinutes > 30 && finalStatus === "PRESENT") {
            finalStatus = "EARLY_LEAVE";
          }
        } else {
          overtimeMinutes = Math.floor((punchTime.getTime() - shiftEnd.getTime()) / 60000);
          if (overtimeMinutes > 30 && finalStatus === "PRESENT") {
            finalStatus = "OVERTIME";
          }
        }
      }

      record = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          punchOut:          punchTime,
          punchOutLat:       data.latitude,
          punchOutLng:       data.longitude,
          punchOutAddress:   data.address,
          punchOutDevice:    data.deviceInfo as any,
          status:            finalStatus as any,
          earlyLeaveMinutes: Math.max(0, earlyLeaveMinutes),
          overtimeMinutes:   Math.max(0, overtimeMinutes),
          totalWorkedMinutes: Math.max(0, totalWorkedMinutes),
        },
      });

      await prisma.punchEvent.create({
        data: {
          recordId:   record.id,
          staffId:    profile.id,
          type:       "PUNCH_OUT",
          timestamp:  punchTime,
          lat:        data.latitude,
          lng:        data.longitude,
          address:    data.address,
          accuracy:   data.accuracy,
          deviceInfo: data.deviceInfo as any,
          ipAddress,
          source:     data.source as any,
          isSynced:   !data.isOffline,
          syncedAt:   data.isOffline ? null : new Date(),
        },
      });

      await createAuditLog({
        userId:   session.id,
        action:   "PUNCH_OUT",
        entity:   "attendance_records",
        entityId: record.id,
        ipAddress,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        record,
        geofenceCheck,
        isFlagged,
        message: data.type === "PUNCH_IN" ? "Punched in successfully!" : "Punched out successfully!",
      },
    });

  } catch (error) {
    console.error("Punch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record punch. Please try again." },
      { status: 500 }
    );
  }
}
