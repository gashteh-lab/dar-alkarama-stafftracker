// lib/geofence/index.ts
// StaffTrack — Geofence & GPS Utilities

import type { Geofence, GeofenceCheckResult, GPSPosition } from "@/types";

// ─────────────────────────────────────────
// HAVERSINE DISTANCE (meters)
// ─────────────────────────────────────────

export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─────────────────────────────────────────
// GEOFENCE CHECK
// ─────────────────────────────────────────

export function checkGeofence(
  position: { latitude: number; longitude: number; accuracy: number },
  geofence: Geofence,
  minAccuracy: number = 100
): GeofenceCheckResult {
  // Reject if GPS accuracy is too poor
  if (position.accuracy > minAccuracy) {
    return {
      isInside:  false,
      distance:  0,
      accuracy:  position.accuracy,
      geofence,
      message: `GPS accuracy too poor (${Math.round(position.accuracy)}m). Required: ${minAccuracy}m or better. Please step outside and try again.`,
    };
  }

  const distance = haversineDistance(
    position.latitude,
    position.longitude,
    geofence.latitude,
    geofence.longitude
  );

  const isInside = distance <= geofence.radiusMeters;

  return {
    isInside,
    distance: Math.round(distance),
    accuracy: Math.round(position.accuracy),
    geofence,
    message: isInside
      ? `Within ${geofence.name} (${Math.round(distance)}m from center)`
      : `You are ${Math.round(distance - geofence.radiusMeters)}m outside ${geofence.name}. Please move to the work location to punch in.`,
  };
}

// ─────────────────────────────────────────
// GPS UTILITIES (client-side)
// ─────────────────────────────────────────

export function getCurrentPosition(options?: PositionOptions): Promise<GPSPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new GeofenceError("GPS_UNAVAILABLE", "GPS is not supported on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude:  pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy:  pos.coords.accuracy,
          altitude:  pos.coords.altitude,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(new GeofenceError(
              "GPS_DENIED",
              "Location access denied. Please enable location permissions in your browser settings and try again."
            ));
            break;
          case err.POSITION_UNAVAILABLE:
            reject(new GeofenceError(
              "GPS_UNAVAILABLE",
              "Unable to determine your location. Please check your GPS signal and try again."
            ));
            break;
          case err.TIMEOUT:
            reject(new GeofenceError(
              "GPS_TIMEOUT",
              "Location request timed out. Please try again in an open area with better signal."
            ));
            break;
          default:
            reject(new GeofenceError("GPS_ERROR", "Location error. Please try again."));
        }
      },
      {
        enableHighAccuracy: true,
        timeout:            15000,
        maximumAge:         5000,
        ...options,
      }
    );
  });
}

export class GeofenceError extends Error {
  constructor(
    public code: "GPS_DENIED" | "GPS_UNAVAILABLE" | "GPS_TIMEOUT" | "GPS_ERROR" | "OUTSIDE_GEOFENCE" | "POOR_ACCURACY",
    message: string
  ) {
    super(message);
    this.name = "GeofenceError";
  }
}

// ─────────────────────────────────────────
// REVERSE GEOCODING (address from GPS)
// ─────────────────────────────────────────

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    // Try Nominatim (OpenStreetMap) first — free, no API key
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: { "Accept-Language": "en" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const addr = data.address;

      // Build readable address
      const parts = [
        addr.road || addr.pedestrian || addr.path,
        addr.neighbourhood || addr.suburb || addr.district,
        addr.city || addr.town || addr.village,
        addr.country,
      ].filter(Boolean);

      return parts.join(", ") || data.display_name?.split(",").slice(0, 3).join(",") || null;
    }
  } catch {
    // Silently fail — address is optional
  }

  return null;
}

// ─────────────────────────────────────────
// DEVICE INFO
// ─────────────────────────────────────────

export function getDeviceInfo() {
  const ua = navigator.userAgent;

  // Browser detection
  let browser = "Unknown";
  if (ua.includes("Chrome") && !ua.includes("Edg"))  browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox"))  browser = "Firefox";
  else if (ua.includes("Edg"))      browser = "Edge";
  else if (ua.includes("Samsung"))  browser = "Samsung Browser";

  // OS detection
  let os = "Unknown";
  if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Android"))    os = "Android";
  else if (ua.includes("Windows"))    os = "Windows";
  else if (ua.includes("Mac"))        os = "macOS";
  else if (ua.includes("Linux"))      os = "Linux";

  // Device type
  let deviceType = "desktop";
  if (/Mobile|Android|iPhone/.test(ua)) deviceType = "mobile";
  else if (/iPad|Tablet/.test(ua))      deviceType = "tablet";

  return {
    browser,
    os,
    deviceType,
    userAgent: ua.substring(0, 200), // Truncate for storage
    language:  navigator.language,
  };
}

// ─────────────────────────────────────────
// MOCK LOCATION DETECTION (best-effort)
// ─────────────────────────────────────────

export function detectSuspiciousLocation(position: GPSPosition): {
  isSuspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Very high accuracy can indicate mock location (real GPS is rarely < 5m)
  if (position.accuracy < 3) {
    reasons.push("Unusually high GPS accuracy (possible mock location)");
  }

  // Round-number coordinates (unlikely from real GPS)
  const latDecimals = position.latitude.toString().split(".")[1]?.length || 0;
  const lngDecimals = position.longitude.toString().split(".")[1]?.length || 0;
  if (latDecimals < 4 && lngDecimals < 4) {
    reasons.push("Suspiciously round GPS coordinates");
  }

  // Instant fix (real GPS takes time to acquire)
  const fixAge = Date.now() - position.timestamp;
  if (fixAge < 100) {
    reasons.push("GPS fix acquired too quickly");
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
  };
}
