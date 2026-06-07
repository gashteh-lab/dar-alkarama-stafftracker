// lib/validations/index.ts
// StaffTrack — Zod validation schemas

import { z } from "zod";

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────

export const loginSchema = z.object({
  identifier: z.string().min(1, "Username is required"),
  password:   z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, "Email or employee ID required"),
});

export const resetPasswordSchema = z.object({
  token:           z.string().min(1, "Reset token required"),
  password:        z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path:    ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path:    ["confirmPassword"],
});

// ─────────────────────────────────────────
// STAFF
// ─────────────────────────────────────────

export const createStaffSchema = z.object({
  fullName:         z.string().min(2, "Full name required"),
  email:            z.string().email("Invalid email").optional().or(z.literal("")),
  phone:            z.string().optional(),
  employeeId:       z.string().min(1, "Employee ID required"),
  password:         z.string().min(8, "Password must be at least 8 characters"),
  role:             z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"]),
  departmentId:     z.string().optional(),
  position:         z.string().optional(),
  branchId:         z.string().optional(),
  managerId:        z.string().optional(),
  shiftId:          z.string().optional(),
  employmentStatus: z.enum([
    "ACTIVE", "INACTIVE", "SUSPENDED", "TERMINATED", "ON_LEAVE"
  ]).default("ACTIVE"),
  joiningDate:  z.string().optional(),
  workingDays:  z.array(z.string()).default(["MON","TUE","WED","THU","FRI"]),
  punchMethod:  z.array(z.string()).default(["GPS"]),
  geofenceId:   z.string().optional(),
  emergencyContact: z.string().optional(),
  notes:        z.string().optional(),
});

export const updateStaffSchema = createStaffSchema.partial().omit({ password: true });

// ─────────────────────────────────────────
// PUNCH
// ─────────────────────────────────────────

export const punchSchema = z.object({
  type:      z.enum(["PUNCH_IN", "PUNCH_OUT"]),
  timestamp: z.string().datetime(),
  latitude:  z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracy:  z.number().min(0).optional(),
  address:   z.string().max(500).optional(),
  deviceInfo: z.object({
    browser:    z.string().optional(),
    os:         z.string().optional(),
    deviceType: z.string().optional(),
    userAgent:  z.string().max(500).optional(),
    language:   z.string().optional(),
  }).optional(),
  isOffline: z.boolean().default(false),
  offlineId: z.string().optional(),
  source:    z.enum(["ONLINE", "OFFLINE", "MANUAL"]).default("ONLINE"),
});

export const offlineSyncSchema = z.object({
  records: z.array(z.object({
    id:        z.string(),
    type:      z.enum(["PUNCH_IN", "PUNCH_OUT"]),
    timestamp: z.string().datetime(),
    latitude:  z.number().optional(),
    longitude: z.number().optional(),
    accuracy:  z.number().optional(),
    deviceInfo: z.object({
      browser:    z.string().optional(),
      os:         z.string().optional(),
      deviceType: z.string().optional(),
    }).optional(),
  })).max(100),
});

// ─────────────────────────────────────────
// SHIFTS
// ─────────────────────────────────────────

export const shiftSchema = z.object({
  name:            z.string().min(1, "Shift name required"),
  startTime:       z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time"),
  endTime:         z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time"),
  gracePeriod:     z.number().int().min(0).max(120),
  breakDuration:   z.number().int().min(0).max(480),
  workingHours:    z.number().min(0).max(24),
  shiftType:       z.enum(["FIXED","FLEXIBLE","ROTATING","SPLIT","NIGHT"]),
  crossesMidnight: z.boolean().default(false),
  color:           z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1D9E75"),
  isActive:        z.boolean().default(true),
});

// ─────────────────────────────────────────
// GEOFENCE
// ─────────────────────────────────────────

export const geofenceSchema = z.object({
  name:         z.string().min(1, "Location name required"),
  address:      z.string().optional(),
  latitude:     z.number().min(-90).max(90),
  longitude:    z.number().min(-180).max(180),
  radiusMeters: z.number().int().min(10).max(10000).default(200),
  branchId:     z.string().optional(),
  isActive:     z.boolean().default(true),
});

// ─────────────────────────────────────────
// CORRECTION REQUEST
// ─────────────────────────────────────────

export const correctionRequestSchema = z.object({
  date:            z.string().datetime(),
  recordId:        z.string().optional(),
  requestType:     z.enum([
    "FORGOT_PUNCH_IN", "FORGOT_PUNCH_OUT", "WRONG_LOCATION",
    "TECHNICAL_ISSUE", "SHIFT_ISSUE", "APPROVED_LEAVE", "OTHER"
  ]),
  correctPunchIn:  z.string().datetime().optional(),
  correctPunchOut: z.string().datetime().optional(),
  reason:          z.string().min(10, "Please provide a detailed reason").max(1000),
  attachmentUrl:   z.string().url().optional(),
});

export const correctionReviewSchema = z.object({
  status:  z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().max(500).optional(),
});

// ─────────────────────────────────────────
// ATTENDANCE ADMIN EDIT
// ─────────────────────────────────────────

export const attendanceEditSchema = z.object({
  punchIn:    z.string().datetime().optional(),
  punchOut:   z.string().datetime().optional(),
  status:     z.enum([
    "PRESENT","ABSENT","LATE","HALF_DAY","EARLY_LEAVE","OVERTIME",
    "MISSED_PUNCH_OUT","MANUAL_ADJUSTMENT","WEEKEND","HOLIDAY","ON_LEAVE"
  ]).optional(),
  editReason: z.string().min(5, "Reason required for manual edits").max(500),
});

// ─────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────

export const reportFiltersSchema = z.object({
  startDate:    z.string().datetime(),
  endDate:      z.string().datetime(),
  staffId:      z.string().optional(),
  departmentId: z.string().optional(),
  branchId:     z.string().optional(),
  managerId:    z.string().optional(),
  shiftId:      z.string().optional(),
  status:       z.string().optional(),
  page:         z.number().int().min(1).default(1),
  limit:        z.number().int().min(1).max(500).default(50),
});

// ─────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────

export const companySettingsSchema = z.object({
  name:                    z.string().min(1).max(100),
  timezone:                z.string(),
  workingWeekStart:        z.number().int().min(0).max(6),
  workingWeekEnd:          z.number().int().min(0).max(6),
  defaultGracePeriod:      z.number().int().min(0).max(120),
  geofenceRequired:        z.boolean(),
  gpsAccuracyMin:          z.number().int().min(10).max(1000),
  offlinePunchAllowed:     z.boolean(),
  selfieRequired:          z.boolean(),
  correctionAllowed:       z.boolean(),
  managerApprovalRequired: z.boolean(),
  pushNotificationsEnabled: z.boolean(),
  dateFormat:              z.string(),
  timeFormat:              z.enum(["12h", "24h"]),
  language:                z.string(),
  theme:                   z.string(),
});

// ─────────────────────────────────────────
// PUSH SUBSCRIPTION
// ─────────────────────────────────────────

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh:   z.string(),
  auth:     z.string(),
  deviceInfo: z.object({
    browser:    z.string().optional(),
    os:         z.string().optional(),
    deviceType: z.string().optional(),
  }).optional(),
});
