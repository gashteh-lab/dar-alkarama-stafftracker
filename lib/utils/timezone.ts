// lib/utils/timezone.ts
// Timezone utilities — wraps date-fns-tz for compatibility

// date-fns-tz v2 exports toZonedTime, v1 exports utcToZonedTime
// This shim handles both versions

let _toZonedTime: (date: Date | string | number, timeZone: string) => Date;

try {
  // Try v2 API first
  const { toZonedTime } = require("date-fns-tz");
  _toZonedTime = toZonedTime;
} catch {
  try {
    // Fallback to v1 API
    const { utcToZonedTime } = require("date-fns-tz");
    _toZonedTime = utcToZonedTime;
  } catch {
    // Final fallback: no timezone conversion
    _toZonedTime = (date: Date | string | number) => new Date(date);
  }
}

export function toZonedTime(date: Date | string | number, timeZone: string): Date {
  return _toZonedTime(date, timeZone);
}

export function getCompanyNow(timezone: string = "Asia/Dubai"): Date {
  return toZonedTime(new Date(), timezone);
}
