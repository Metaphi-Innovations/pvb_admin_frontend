/**
 * Attendance Modes — company-wide singleton (localStorage).
 * HR configures how the employee mobile app captures Punch In / Punch Out.
 * Employees never choose GPS, face, QR, or geo-fence — rules run automatically.
 */

import { CURRENT_USER } from "@/lib/hr/config";
import { policyToday } from "@/lib/hr/policy-common";

const STORAGE_KEY = "ds_hr_attendance_modes_v1";
const LEGACY_STORAGE_KEY = "ds_hr_mobile_face_attendance_v1";

export type OutsideLocationBehavior = "block" | "allow_with_flag" | "allow";
export type FaceFailureBehavior = "block" | "hr_review" | "allow";

/** @deprecated Use AttendanceModesSettings */
export type MobileFaceAttendanceSettings = AttendanceModesSettings;

export interface AttendanceModesSettings {
  mobileAttendanceEnabled: boolean;

  captureGps: boolean;
  geoFencingEnabled: boolean;
  geoFenceRadiusMeters: number;
  outsideLocationBehavior: OutsideLocationBehavior;

  captureDeviceInfo: boolean;
  allowMultiplePunches: boolean;

  faceVerificationEnabled: boolean;
  requireFaceOnCheckIn: boolean;
  requireFaceOnCheckOut: boolean;
  faceFailureBehavior: FaceFailureBehavior;

  updatedBy: string;
  updatedAt: string;
}

export const OUTSIDE_LOCATION_OPTIONS: {
  value: OutsideLocationBehavior;
  label: string;
}[] = [
  { value: "block", label: "Block Punch" },
  { value: "allow_with_flag", label: "Allow and Flag for HR" },
  { value: "allow", label: "Allow Punch" },
];

export const FACE_FAILURE_OPTIONS: {
  value: FaceFailureBehavior;
  label: string;
}[] = [
  { value: "block", label: "Block Punch" },
  { value: "hr_review", label: "Flag for HR Review" },
  { value: "allow", label: "Allow Without Face" },
];

const DEFAULT_SETTINGS: AttendanceModesSettings = {
  mobileAttendanceEnabled: true,
  captureGps: true,
  geoFencingEnabled: true,
  geoFenceRadiusMeters: 200,
  outsideLocationBehavior: "allow_with_flag",
  captureDeviceInfo: true,
  allowMultiplePunches: true,
  faceVerificationEnabled: true,
  requireFaceOnCheckIn: true,
  requireFaceOnCheckOut: false,
  faceFailureBehavior: "hr_review",
  updatedBy: CURRENT_USER,
  updatedAt: "2026-01-01",
};

function normalizeOutsideBehavior(raw: unknown): OutsideLocationBehavior {
  if (raw === "block" || raw === "allow") return raw;
  return "allow_with_flag";
}

function normalizeFaceFailure(raw: unknown): FaceFailureBehavior {
  if (raw === "block" || raw === "allow") return raw;
  return "hr_review";
}

function normalizeSettings(raw: Record<string, unknown>): AttendanceModesSettings {
  return {
    mobileAttendanceEnabled: raw.mobileAttendanceEnabled !== false,
    captureGps: raw.captureGps !== false,
    geoFencingEnabled: raw.geoFencingEnabled !== false,
    geoFenceRadiusMeters: Math.max(0, Number(raw.geoFenceRadiusMeters) || 0),
    outsideLocationBehavior: normalizeOutsideBehavior(raw.outsideLocationBehavior),
    captureDeviceInfo: raw.captureDeviceInfo !== false,
    allowMultiplePunches: raw.allowMultiplePunches !== false,
    faceVerificationEnabled: raw.faceVerificationEnabled !== false,
    requireFaceOnCheckIn:
      raw.requireFaceOnCheckIn !== undefined
        ? raw.requireFaceOnCheckIn !== false
        : raw.faceOnCheckIn !== false,
    requireFaceOnCheckOut: raw.requireFaceOnCheckOut === true || raw.faceOnCheckOut === true,
    faceFailureBehavior: normalizeFaceFailure(
      raw.faceFailureBehavior ?? raw.faceVerificationFallback,
    ),
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : CURRENT_USER,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : policyToday(),
  };
}

/** Merge legacy separate mobile/face stores if present (read-only migration). */
function migrateLegacyStores(): AttendanceModesSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const mobileRaw = localStorage.getItem("ds_hr_mobile_attendance_v1");
    const faceRaw = localStorage.getItem("ds_hr_face_attendance_v1");
    if (!mobileRaw && !faceRaw) return null;
    const mobile = mobileRaw ? (JSON.parse(mobileRaw) as Record<string, unknown>) : {};
    const face = faceRaw ? (JSON.parse(faceRaw) as Record<string, unknown>) : {};
    return normalizeSettings({ ...DEFAULT_SETTINGS, ...mobile, ...face });
  } catch {
    return null;
  }
}

function readStoredSettings(): AttendanceModesSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return normalizeSettings(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function loadAttendanceModesSettings(): AttendanceModesSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  const stored = readStoredSettings();
  if (stored) {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    }
    return stored;
  }
  const migrated = migrateLegacyStores();
  const seed = migrated ?? { ...DEFAULT_SETTINGS };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

/** @deprecated Use loadAttendanceModesSettings */
export const loadMobileFaceAttendanceSettings = loadAttendanceModesSettings;

export function saveAttendanceModesSettings(settings: AttendanceModesSettings): void {
  if (typeof window === "undefined") return;
  const next: AttendanceModesSettings = {
    ...settings,
    captureGps: settings.mobileAttendanceEnabled,
    captureDeviceInfo: true,
    updatedBy: CURRENT_USER,
    updatedAt: policyToday(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("hr-attendance-modes-updated"));
  window.dispatchEvent(new CustomEvent("hr-mobile-face-attendance-updated"));
}

/** @deprecated Use saveAttendanceModesSettings */
export const saveMobileFaceAttendanceSettings = saveAttendanceModesSettings;

export function outsideLocationLabel(v: OutsideLocationBehavior): string {
  return OUTSIDE_LOCATION_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export function faceFailureLabel(v: FaceFailureBehavior): string {
  return FACE_FAILURE_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export function onOffLabel(on: boolean): string {
  return on ? "ON" : "OFF";
}

export interface AttendanceModesValidation {
  valid: boolean;
  errors: Record<string, string>;
}

/** @deprecated Use AttendanceModesValidation */
export type MobileFaceAttendanceValidation = AttendanceModesValidation;

export function validateAttendanceModesSettings(input: {
  mobileAttendanceEnabled: boolean;
  geoFencingEnabled: boolean;
  geoFenceRadiusMeters: number;
}): AttendanceModesValidation {
  const errors: Record<string, string> = {};
  if (
    input.mobileAttendanceEnabled &&
    input.geoFencingEnabled &&
    input.geoFenceRadiusMeters < 0
  ) {
    errors.geoFenceRadiusMeters = "Must be 0 or greater";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/** @deprecated Use validateAttendanceModesSettings */
export const validateMobileFaceAttendanceSettings = validateAttendanceModesSettings;
