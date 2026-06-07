// types/index.ts
// StaffTrack PWA — Core Type Definitions

// ─────────────────────────────────────────
// ENUMS (mirror Prisma schema)
// ─────────────────────────────────────────

export type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "STAFF";

export type EmploymentStatus =
  | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TERMINATED" | "ON_LEAVE";

export type AttendanceStatus =
  | "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "EARLY_LEAVE"
  | "OVERTIME" | "MISSED_PUNCH_OUT" | "PENDING_CORRECTION"
  | "OUTSIDE_GEOFENCE" | "OFFLINE_PUNCH" | "MANUAL_ADJUSTMENT"
  | "WEEKEND" | "HOLIDAY" | "ON_LEAVE";

export type PunchSource = "ONLINE" | "OFFLINE" | "MANUAL";
export type ShiftType = "FIXED" | "FLEXIBLE" | "ROTATING" | "SPLIT" | "NIGHT";
export type CorrectionStatus = "PENDING" | "APPROVED" | "REJECTED";
export type CorrectionType =
  | "FORGOT_PUNCH_IN" | "FORGOT_PUNCH_OUT" | "WRONG_LOCATION"
  | "TECHNICAL_ISSUE" | "SHIFT_ISSUE" | "APPROVED_LEAVE" | "OTHER";

// ─────────────────────────────────────────
// USER & AUTH
// ─────────────────────────────────────────

export interface User {
  id: string;
  email?: string | null;
  phone?: string | null;
  employeeId?: string | null;
  role: Role;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  profile?: StaffProfile | null;
}

export interface SessionUser {
  id: string;
  email?: string | null;
  employeeId?: string | null;
  role: Role;
  fullName: string;
  photoUrl?: string | null;
  departmentId?: string | null;
  branchId?: string | null;
  shiftId?: string | null;
}

export interface LoginCredentials {
  identifier: string; // email | phone | employeeId
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: SessionUser;
  token?: string;
  error?: string;
}

// ─────────────────────────────────────────
// ORGANIZATION
// ─────────────────────────────────────────

export interface Branch {
  id: string;
  name: string;
  address?: string | null;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Department {
  id: string;
  name: string;
  branchId?: string | null;
  managerId?: string | null;
  isActive: boolean;
  branch?: Branch | null;
}

// ─────────────────────────────────────────
// STAFF PROFILE
// ─────────────────────────────────────────

export interface StaffProfile {
  id: string;
  userId: string;
  fullName: string;
  photoUrl?: string | null;
  departmentId?: string | null;
  position?: string | null;
  branchId?: string | null;
  managerId?: string | null;
  shiftId?: string | null;
  employmentStatus: EmploymentStatus;
  joiningDate?: Date | null;
  workingDays: string[];
  punchMethod: string[];
  geofenceId?: string | null;
  emergencyContact?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  user?: Pick<User, "id" | "email" | "phone" | "employeeId" | "role">;
  department?: Department | null;
  branch?: Branch | null;
  shift?: Shift | null;
  geofence?: Geofence | null;
}

export interface StaffWithProfile extends User {
  profile: StaffProfile & {
    department?: Department | null;
    branch?: Branch | null;
    shift?: Shift | null;
  };
}

// ─────────────────────────────────────────
// SHIFTS
// ─────────────────────────────────────────

export interface Shift {
  id: string;
  name: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  gracePeriod: number;
  breakDuration: number;
  workingHours: number;
  shiftType: ShiftType;
  crossesMidnight: boolean;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────
// GEOFENCING
// ─────────────────────────────────────────

export interface Geofence {
  id: string;
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  branchId?: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface GeofenceCheckResult {
  isInside: boolean;
  distance: number; // meters
  accuracy: number; // GPS accuracy meters
  geofence?: Geofence;
  message?: string;
}

// ─────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: Date;
  shiftId?: string | null;
  punchIn?: Date | null;
  punchOut?: Date | null;
  punchInLat?: number | null;
  punchInLng?: number | null;
  punchOutLat?: number | null;
  punchOutLng?: number | null;
  punchInAddress?: string | null;
  punchOutAddress?: string | null;
  punchInDevice?: DeviceInfo | null;
  punchOutDevice?: DeviceInfo | null;
  status: AttendanceStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  totalWorkedMinutes: number;
  breakMinutes: number;
  source: PunchSource;
  editedBy?: string | null;
  editReason?: string | null;
  isFlagged: boolean;
  flagReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  staff?: StaffProfile;
  shift?: Shift | null;
}

export interface PunchPayload {
  type: "PUNCH_IN" | "PUNCH_OUT";
  timestamp: string; // ISO string
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  address?: string;
  deviceInfo?: DeviceInfo;
  source?: PunchSource;
  // For offline punches
  isOffline?: boolean;
  offlineId?: string;
}

export interface PunchResponse {
  success: boolean;
  record?: AttendanceRecord;
  status?: AttendanceStatus;
  message?: string;
  error?: string;
  geofenceCheck?: GeofenceCheckResult;
}

export interface TodayStatus {
  hasRecord: boolean;
  record?: AttendanceRecord | null;
  isPunchedIn: boolean;
  isPunchedOut: boolean;
  currentStatus?: AttendanceStatus;
  workedMinutes: number;
  shift?: Shift | null;
  isLate: boolean;
  lateMinutes: number;
  serverTime: string;
}

// ─────────────────────────────────────────
// DEVICE & LOCATION
// ─────────────────────────────────────────

export interface DeviceInfo {
  browser?: string;
  os?: string;
  deviceType?: string; // mobile | tablet | desktop
  userAgent?: string;
  ipAddress?: string;
  language?: string;
}

export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  timestamp: number;
}

// ─────────────────────────────────────────
// CORRECTION REQUESTS
// ─────────────────────────────────────────

export interface CorrectionRequest {
  id: string;
  staffId: string;
  recordId?: string | null;
  date: Date;
  requestType: CorrectionType;
  correctPunchIn?: Date | null;
  correctPunchOut?: Date | null;
  reason: string;
  attachmentUrl?: string | null;
  status: CorrectionStatus;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  reviewComment?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  staff?: StaffProfile;
  reviewer?: Pick<User, "id"> & { profile?: Pick<StaffProfile, "fullName"> };
}

// ─────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  sentAt?: Date | null;
  readAt?: Date | null;
  createdAt: Date;
}

// ─────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────

export interface ReportFilters {
  startDate: string;
  endDate: string;
  staffId?: string;
  departmentId?: string;
  branchId?: string;
  managerId?: string;
  shiftId?: string;
  status?: AttendanceStatus;
  page?: number;
  limit?: number;
}

export interface AttendanceSummary {
  staffId: string;
  fullName: string;
  employeeId?: string | null;
  department?: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  halfDays: number;
  overtimeDays: number;
  totalWorkedHours: number;
  totalOvertimeHours: number;
  totalLateMinutes: number;
}

export interface DashboardStats {
  totalStaff: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onDutyNow: number;
  missedPunchOut: number;
  pendingCorrections: number;
  pendingGeofenceExceptions: number;
}

// ─────────────────────────────────────────
// OFFLINE SYNC
// ─────────────────────────────────────────

export interface OfflinePunchRecord {
  id: string;          // local UUID
  staffId: string;
  type: "PUNCH_IN" | "PUNCH_OUT";
  timestamp: string;   // ISO
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  deviceInfo?: DeviceInfo;
  isSynced: boolean;
  createdAt: string;   // ISO
}

// ─────────────────────────────────────────
// API RESPONSES
// ─────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ─────────────────────────────────────────
// COMPANY SETTINGS
// ─────────────────────────────────────────

export interface CompanySettings {
  id: string;
  name: string;
  logoUrl?: string | null;
  timezone: string;
  workingWeekStart: number;
  workingWeekEnd: number;
  defaultGracePeriod: number;
  geofenceRequired: boolean;
  gpsAccuracyMin: number;
  offlinePunchAllowed: boolean;
  selfieRequired: boolean;
  correctionAllowed: boolean;
  managerApprovalRequired: boolean;
  pushNotificationsEnabled: boolean;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  language: string;
  theme: string;
  updatedAt: Date;
}

// ─────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: Date;
  user?: Pick<User, "id" | "email" | "employeeId"> & {
    profile?: Pick<StaffProfile, "fullName">;
  };
}
