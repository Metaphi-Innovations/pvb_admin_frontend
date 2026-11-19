/**
 * Links Shift Setup ↔ Attendance Policy without duplicating rule stores.
 * Modes remain a company-wide singleton (attendance-modes-data).
 *
 * Exclusive-policy rule: when HR edits rules on a shift, only that shift’s
 * linked policy is updated. If the linked policy is shared by other shifts,
 * clone first so sibling shifts are not silently changed.
 */

import {
  getAttendancePolicyById,
  getDefaultAttendancePolicy,
  loadAttendancePolicies,
  nextAttendancePolicyId,
  saveAttendancePolicies,
  withPolicyNewAudit,
  withPolicyUpdateAudit,
  type AfterAllowedLimit,
  type AttendancePolicyRecord,
} from "./attendance-policy-data";
import { loadShifts, type ShiftRecord } from "./shift-setup-data";
import {
  loadAttendanceModesSettings,
  type AttendanceModesSettings,
} from "./attendance-modes-data";

export type ShiftPolicyRuleFields = {
  trackLateComing: boolean;
  allowedLateEntriesPerMonth: number;
  afterAllowedLimit: AfterAllowedLimit;
  trackEarlyGoing: boolean;
  halfDayHours: number;
  halfDayMinutes: number;
  absentHours: number;
  absentMinutes: number;
  overtimeEnabled: boolean;
  overtimeAfterMinutes: number;
};

function countShiftsUsingPolicy(policyId: number, shifts?: ShiftRecord[]): number {
  return (shifts ?? loadShifts()).filter((s) => s.attendancePolicyId === policyId).length;
}

/** True when this policy is safe to mutate from a single shift edit. */
export function isPolicyExclusiveToShift(
  policyId: number | null | undefined,
  shiftId: number | undefined,
  shifts?: ShiftRecord[],
): boolean {
  if (policyId == null) return true;
  const list = shifts ?? loadShifts();
  const users = list.filter((s) => s.attendancePolicyId === policyId);
  if (users.length === 0) return true;
  if (users.length === 1 && shiftId != null && users[0].id === shiftId) return true;
  return false;
}

export function policyRulesFromRecord(p: AttendancePolicyRecord): ShiftPolicyRuleFields {
  return {
    trackLateComing: p.trackLateComing,
    allowedLateEntriesPerMonth: p.allowedLateEntriesPerMonth,
    afterAllowedLimit: p.afterAllowedLimit,
    trackEarlyGoing: p.trackEarlyGoing,
    halfDayHours: p.halfDayHours,
    halfDayMinutes: p.halfDayMinutes,
    absentHours: p.absentHours,
    absentMinutes: p.absentMinutes,
    overtimeEnabled: p.overtimeEnabled,
    overtimeAfterMinutes: p.overtimeAfterMinutes,
  };
}

export function defaultPolicyRules(): ShiftPolicyRuleFields {
  const d = getDefaultAttendancePolicy();
  if (d) return policyRulesFromRecord(d);
  return {
    trackLateComing: true,
    allowedLateEntriesPerMonth: 2,
    afterAllowedLimit: "half_day",
    trackEarlyGoing: true,
    halfDayHours: 4,
    halfDayMinutes: 30,
    absentHours: 2,
    absentMinutes: 0,
    overtimeEnabled: true,
    overtimeAfterMinutes: 30,
  };
}

/**
 * Upsert attendance rules for a shift into the policy master.
 * Returns the policy id to store on the shift.
 */
export function upsertExclusivePolicyForShift(input: {
  shiftId?: number;
  shiftName: string;
  existingPolicyId: number | null;
  rules: ShiftPolicyRuleFields;
  shiftStatus: "active" | "inactive";
}): number {
  const policies = loadAttendancePolicies();
  const shifts = loadShifts();
  const exclusive = isPolicyExclusiveToShift(input.existingPolicyId, input.shiftId, shifts);
  const policyName = `${input.shiftName.trim()} Rules`;

  if (input.existingPolicyId != null && exclusive) {
    const existing = getAttendancePolicyById(input.existingPolicyId, policies);
    if (existing) {
      const next = withPolicyUpdateAudit({
        ...existing,
        name: existing.isDefault ? existing.name : policyName,
        ...input.rules,
        status: input.shiftStatus,
      });
      saveAttendancePolicies(policies.map((p) => (p.id === next.id ? next : p)));
      return next.id;
    }
  }

  // Clone or create — never mutate a shared/default policy from a shift edit.
  const id = nextAttendancePolicyId(policies);
  const created = withPolicyNewAudit({
    id,
    name: policyName,
    ...input.rules,
    isDefault: false,
    status: input.shiftStatus,
  });
  saveAttendancePolicies([...policies, created]);
  return id;
}

export function formatShiftAttendanceRulesSummary(
  shift: Pick<ShiftRecord, "attendancePolicyId">,
): string {
  if (shift.attendancePolicyId == null) return "Company default";
  const p = getAttendancePolicyById(shift.attendancePolicyId);
  if (!p) return "—";
  const bits: string[] = [];
  if (p.trackLateComing) bits.push(`Late ${p.allowedLateEntriesPerMonth}/mo`);
  bits.push(`Half <${p.halfDayHours}h${p.halfDayMinutes ? ` ${p.halfDayMinutes}m` : ""}`);
  if (p.overtimeEnabled) bits.push(`OT +${p.overtimeAfterMinutes}m`);
  return bits.join(" · ") || p.name;
}

export function formatAttendanceModesSummary(settings?: AttendanceModesSettings): string {
  const s = settings ?? loadAttendanceModesSettings();
  if (!s.mobileAttendanceEnabled) return "Mobile off";
  const bits = ["Mobile"];
  if (s.geoFencingEnabled) bits.push("GPS");
  if (s.faceVerificationEnabled) bits.push("Face");
  return bits.join(" · ");
}

export function shiftsSharingPolicyCount(policyId: number): number {
  return countShiftsUsingPolicy(policyId);
}
