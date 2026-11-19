"use client";

/**
 * Full-page Add/Edit Shift — four sections, no tabs/drawer.
 * Attendance rules → exclusive linked policy (attendance-policy-data).
 * Attendance modes → company-wide singleton (attendance-modes-data).
 */

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronsUpDown, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { HrInfoHint } from "@/app/(app)/hr/components/HrInfoHint";
import { HrActiveStatusSwitch } from "../../../components/HrActiveStatusSwitch";
import { HrSuccessToast } from "../../../components/HrSuccessToast";
import { HrTimeInput } from "../../../components/HrTimeInput";
import {
  HrOrgPageHeader,
  HrOrgField,
  hrInput,
  hrBtn,
  HR_FORM_MAX_CLASS,
} from "../../organization/_components";

/** Compact control sizing for this form only */
const NUM = "h-9 w-[7.5rem] text-xs tabular-nums px-2";
const NAME = "h-9 text-xs max-w-[340px] w-full";
const SELECT_SM = "h-8 text-xs border border-border rounded-[10px] px-2 bg-white max-w-[150px]";
import {
  applyTimingToWorkingDays,
  dayTypeNeedsTiming,
  defaultWeeklySchedule,
  formatOffWeeksCompact,
  loadShifts,
  nextShiftId,
  normalizeOffWeeks,
  normalizeShiftName,
  normalizeTime24,
  offDayConfig,
  saveShifts,
  selectedWeeksOffConfig,
  SHIFT_DAY_KEYS,
  SHIFT_DAY_LABELS,
  SHIFT_WEEK_OPTIONS,
  withShiftNewAudit,
  withShiftUpdateAudit,
  workingDayConfig,
  type ShiftDayKey,
  type ShiftRecord,
  type ShiftWeekOccurrence,
  type ShiftWeeklySchedule,
} from "../../shift-setup-data";
import {
  AFTER_ALLOWED_LIMIT_OPTIONS,
  buildLateComingSummary,
  getAttendancePolicyById,
  getDefaultAttendancePolicy,
  validateAttendancePolicyRecord,
  type AfterAllowedLimit,
} from "../../attendance-policy-data";
import {
  FACE_FAILURE_OPTIONS,
  loadAttendanceModesSettings,
  OUTSIDE_LOCATION_OPTIONS,
  saveAttendanceModesSettings,
  validateAttendanceModesSettings,
  type AttendanceModesSettings,
  type FaceFailureBehavior,
  type OutsideLocationBehavior,
} from "../../attendance-modes-data";
import {
  defaultPolicyRules,
  policyRulesFromRecord,
  upsertExclusivePolicyForShift,
  type ShiftPolicyRuleFields,
} from "../../shift-attendance-link";

type SectionInfo = {
  title: string;
  summary: string;
  what?: string;
  when?: string;
  affects?: string;
  rules?: React.ReactNode;
};

/** Numbered section shell — clear start/end without heavy cards */
function FormSection({
  number,
  title,
  description,
  note,
  info,
  headerAside,
  children,
}: {
  number: string;
  title: string;
  description: string;
  /** Extra line under description (e.g. company-wide scope) */
  note?: string;
  info?: SectionInfo;
  headerAside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border border-l-[3px] border-l-brand-500 bg-white overflow-hidden">
      <div className="flex items-start gap-2.5 px-4 py-3 border-b border-border/70 bg-muted/20">
        <span className="text-[11px] font-bold tabular-nums text-brand-600 shrink-0 leading-5 pt-px">
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-xs font-bold uppercase tracking-wide text-foreground leading-5">
              {title}
            </h3>
            {info ? <HrInfoHint mode="popover" content={info} /> : null}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
          {note ? (
            <p className="text-[11px] font-medium text-brand-700 mt-1 leading-snug">{note}</p>
          ) : null}
        </div>
        {headerAside ? <div className="shrink-0 self-center">{headerAside}</div> : null}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

/** Dense label + switch — no full-row empty space */
function CompactToggle({
  label,
  checked,
  onCheckedChange,
  helper,
  className,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  helper?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <div className="flex items-center gap-2.5 min-h-8">
        <p className="text-xs font-medium text-foreground leading-tight">{label}</p>
        <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
          <span
            className={cn(
              "text-[10px] font-semibold tabular-nums",
              checked ? "text-emerald-600" : "text-muted-foreground",
            )}
          >
            {checked ? "ON" : "OFF"}
          </span>
          <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </div>
      </div>
      {helper ? (
        <p className="text-[11px] text-muted-foreground leading-snug max-w-md">{helper}</p>
      ) : null}
    </div>
  );
}

/** Light internal group — no nested card borders */
function RuleGroup({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md bg-muted/25 px-3 py-2.5 space-y-2", className)}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

type FormState = {
  id?: number;
  name: string;
  graceInMinutes: string;
  graceOutMinutes: string;
  breakDurationMinutes: string;
  weeklySchedule: ShiftWeeklySchedule;
  status: ShiftRecord["status"];
  attendancePolicyId: number | null;
  rules: ShiftPolicyRuleFields;
  modes: {
    mobileAttendanceEnabled: boolean;
    officeLocationValidation: boolean;
    geoFenceRadiusMeters: string;
    outsideLocationBehavior: OutsideLocationBehavior;
    allowMultiplePunches: boolean;
    faceVerificationEnabled: boolean;
    requireFaceOnCheckIn: boolean;
    requireFaceOnCheckOut: boolean;
    faceFailureBehavior: FaceFailureBehavior;
  };
};

function modesFromSettings(s: AttendanceModesSettings): FormState["modes"] {
  return {
    mobileAttendanceEnabled: s.mobileAttendanceEnabled,
    officeLocationValidation: s.geoFencingEnabled,
    geoFenceRadiusMeters: String(s.geoFenceRadiusMeters),
    outsideLocationBehavior: s.outsideLocationBehavior,
    allowMultiplePunches: s.allowMultiplePunches,
    faceVerificationEnabled: s.faceVerificationEnabled,
    requireFaceOnCheckIn: s.requireFaceOnCheckIn,
    requireFaceOnCheckOut: s.requireFaceOnCheckOut,
    faceFailureBehavior: s.faceFailureBehavior,
  };
}

function emptyForm(): FormState {
  const def = getDefaultAttendancePolicy();
  return {
    name: "",
    graceInMinutes: "15",
    graceOutMinutes: "10",
    breakDurationMinutes: "60",
    weeklySchedule: defaultWeeklySchedule("09:30", "18:30"),
    status: "active",
    attendancePolicyId: def?.id ?? null,
    rules: defaultPolicyRules(),
    modes: modesFromSettings(loadAttendanceModesSettings()),
  };
}

function recordToForm(r: ShiftRecord): FormState {
  const linked = r.attendancePolicyId != null ? getAttendancePolicyById(r.attendancePolicyId) : null;
  const rules = linked ? policyRulesFromRecord(linked) : defaultPolicyRules();
  return {
    id: r.id,
    name: r.name,
    graceInMinutes: String(r.graceInMinutes),
    graceOutMinutes: String(r.graceOutMinutes),
    breakDurationMinutes: String(r.breakDurationMinutes),
    weeklySchedule: r.weeklySchedule,
    status: r.status,
    attendancePolicyId: r.attendancePolicyId,
    rules,
    modes: modesFromSettings(loadAttendanceModesSettings()),
  };
}

export default function ShiftFormPageClient({
  mode,
  shiftId,
}: {
  mode: "create" | "edit";
  shiftId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(mode === "create");

  useEffect(() => {
    if (mode === "edit" && shiftId != null) {
      const hit = loadShifts().find((s) => s.id === shiftId);
      if (hit) setForm(recordToForm(hit));
      setLoaded(true);
    }
  }, [mode, shiftId]);

  const setDay = useCallback((day: ShiftDayKey, patch: Partial<ShiftWeeklySchedule[ShiftDayKey]>) => {
    setForm((f) => ({
      ...f,
      weeklySchedule: {
        ...f.weeklySchedule,
        [day]: { ...f.weeklySchedule[day], ...patch },
      },
    }));
  }, []);

  const applyMonday = () => {
    const mon = form.weeklySchedule.monday;
    if (!dayTypeNeedsTiming(mon.dayType)) return;
    setForm((f) => ({
      ...f,
      weeklySchedule: applyTimingToWorkingDays(f.weeklySchedule, mon.startTime, mon.endTime),
    }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Shift name is required";
    else {
      const list = loadShifts();
      const dup = list.some(
        (s) =>
          s.id !== form.id &&
          normalizeShiftName(s.name) === normalizeShiftName(form.name),
      );
      if (dup) e.name = "Shift name already exists";
    }
    for (const key of ["graceInMinutes", "graceOutMinutes", "breakDurationMinutes"] as const) {
      if (!/^\d+$/.test(form[key].trim())) e[key] = "Enter a valid number";
    }
    for (const day of SHIFT_DAY_KEYS) {
      const cfg = form.weeklySchedule[day];
      if (dayTypeNeedsTiming(cfg.dayType)) {
        if (!normalizeTime24(cfg.startTime) || !normalizeTime24(cfg.endTime)) {
          e[`day_${day}`] = "Start and end time required";
        }
      }
      if (cfg.dayType === "selected_weeks_off" && normalizeOffWeeks(cfg.offWeeks).length === 0) {
        e[`weeks_${day}`] = "Select at least one week off";
      }
    }
    const v = validateAttendancePolicyRecord({
      name: `${form.name.trim() || "Shift"} Rules`,
      excludeId: form.attendancePolicyId ?? undefined,
      trackLateComing: form.rules.trackLateComing,
      allowedLateEntriesPerMonth: form.rules.allowedLateEntriesPerMonth,
      halfDayHours: form.rules.halfDayHours,
      halfDayMinutes: form.rules.halfDayMinutes,
      absentHours: form.rules.absentHours,
      absentMinutes: form.rules.absentMinutes,
      overtimeEnabled: form.rules.overtimeEnabled,
      overtimeAfterMinutes: form.rules.overtimeAfterMinutes,
    });
    // Name uniqueness for auto-named policies is handled in upsert — ignore name errors from helper when empty shift name already caught
    Object.entries(v.errors).forEach(([k, msg]) => {
      if (k !== "name") e[`rule_${k}`] = msg;
    });

    const radius = Number(form.modes.geoFenceRadiusMeters);
    const mv = validateAttendanceModesSettings({
      mobileAttendanceEnabled: form.modes.mobileAttendanceEnabled,
      geoFencingEnabled: form.modes.officeLocationValidation,
      geoFenceRadiusMeters: Number.isFinite(radius) ? radius : 0,
    });
    Object.entries(mv.errors).forEach(([k, msg]) => {
      e[`mode_${k}`] = msg;
    });

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const list = loadShifts();
    const policyId = upsertExclusivePolicyForShift({
      shiftId: form.id,
      shiftName: form.name.trim(),
      existingPolicyId: form.attendancePolicyId,
      rules: form.rules,
      shiftStatus: form.status,
    });

    const savedModes = loadAttendanceModesSettings();
    saveAttendanceModesSettings({
      ...savedModes,
      mobileAttendanceEnabled: form.modes.mobileAttendanceEnabled,
      captureGps: form.modes.mobileAttendanceEnabled,
      geoFencingEnabled: form.modes.officeLocationValidation,
      geoFenceRadiusMeters: Number(form.modes.geoFenceRadiusMeters) || 0,
      outsideLocationBehavior: form.modes.outsideLocationBehavior,
      allowMultiplePunches: form.modes.allowMultiplePunches,
      faceVerificationEnabled: form.modes.faceVerificationEnabled,
      requireFaceOnCheckIn: form.modes.requireFaceOnCheckIn,
      requireFaceOnCheckOut: form.modes.requireFaceOnCheckOut,
      faceFailureBehavior: form.modes.faceFailureBehavior,
    });

    const base: Omit<ShiftRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt"> = {
      id: form.id ?? nextShiftId(list),
      name: form.name.trim(),
      graceInMinutes: Number(form.graceInMinutes) || 0,
      graceOutMinutes: Number(form.graceOutMinutes) || 0,
      breakDurationMinutes: Number(form.breakDurationMinutes) || 0,
      weeklySchedule: form.weeklySchedule,
      attendancePolicyId: policyId,
      status: form.status,
    };

    if (form.id) {
      saveShifts(
        list.map((s) => (s.id === form.id ? withShiftUpdateAudit({ ...s, ...base, id: form.id }) : s)),
      );
    } else {
      saveShifts([...list, withShiftNewAudit(base)]);
    }

    router.push("/hr/settings/attendance/shift-setup");
  };

  const goBack = () => router.push("/hr/settings/attendance/shift-setup");

  const lateSummary = form.rules.trackLateComing
    ? buildLateComingSummary(form.rules.allowedLateEntriesPerMonth, form.rules.afterAllowedLimit)
    : null;

  const scheduleError = Object.keys(errors).find((k) => k.startsWith("day_") || k.startsWith("weeks_"));

  if (!loaded) return null;

  if (mode === "edit" && shiftId != null && !form.id) {
    return (
      <HrOrgPageHeader
        title="Shift not found"
        icon={Timer}
        sectionLabel="Attendance Settings"
        maxWidthClass={HR_FORM_MAX_CLASS}
      >
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goBack}>
          Back to Shift Setup
        </Button>
      </HrOrgPageHeader>
    );
  }

  return (
    <HrOrgPageHeader
      title={mode === "edit" ? "Edit Shift" : "Add Shift"}
      description="Shift timings, weekly schedule, attendance rules, and mobile punch settings."
      icon={Timer}
      sectionLabel="Attendance Settings"
      sectionHref="/hr/settings/attendance/shift-setup"
      maxWidthClass={HR_FORM_MAX_CLASS}
      titleAside={
        <HrInfoHint
          mode="drawer"
          content={{
            title: "Shift Setup",
            summary: "One place to configure when people work, how attendance is interpreted, and how mobile punches are captured.",
            what: "Shift details and weekly schedule are shift-specific. Attendance rules are saved to a linked policy record exclusive to this shift when possible. Mobile punch settings are company-wide.",
            when: "Create or update a shift used for employee assignment and attendance evaluation.",
            affects: "Employee shift assignment, attendance policy resolution, and Employee Mobile punch configuration.",
            rules: (
              <ul className="list-disc pl-4 space-y-1">
                <li>Editing rules on this shift will not change other shifts that share a policy — a new linked policy is created when needed.</li>
                <li>Mobile punch settings apply to all employees company-wide.</li>
                <li>Employees with an explicitly assigned policy keep that assignment.</li>
              </ul>
            ),
          }}
        />
      }
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={goBack}>
            <ArrowLeft className="w-3.5 h-3.5" /> Cancel
          </Button>
          <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={handleSave}>
            {mode === "edit" ? "Update Shift" : "Create Shift"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 pb-6">
        <FormSection
          number="01"
          title="Shift Details"
          description="Basic shift information, grace and break times."
        >
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <HrOrgField label="Shift Name" required error={errors.name} size="full" className="sm:max-w-[340px]">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={hrInput(NAME, errors.name ? "error" : "default")}
                  placeholder="e.g. General Shift"
                />
              </HrOrgField>
              <div className="space-y-1.5 pb-0.5">
                <p className="text-xs font-medium">Status</p>
                <div className="h-9 flex items-center">
                  <HrActiveStatusSwitch
                    size="md"
                    checked={form.status === "active"}
                    onCheckedChange={(a) => setForm({ ...form, status: a ? "active" : "inactive" })}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
              <HrOrgField label="Grace In" error={errors.graceInMinutes} className="w-auto">
                <div className="flex items-center gap-1.5">
                  <Input
                    inputMode="numeric"
                    value={form.graceInMinutes}
                    onChange={(e) => setForm({ ...form, graceInMinutes: e.target.value })}
                    className={hrInput(NUM, errors.graceInMinutes ? "error" : "default")}
                  />
                  <span className="text-[11px] text-muted-foreground shrink-0">min</span>
                </div>
              </HrOrgField>
              <HrOrgField label="Grace Out" error={errors.graceOutMinutes} className="w-auto">
                <div className="flex items-center gap-1.5">
                  <Input
                    inputMode="numeric"
                    value={form.graceOutMinutes}
                    onChange={(e) => setForm({ ...form, graceOutMinutes: e.target.value })}
                    className={hrInput(NUM, errors.graceOutMinutes ? "error" : "default")}
                  />
                  <span className="text-[11px] text-muted-foreground shrink-0">min</span>
                </div>
              </HrOrgField>
              <HrOrgField label="Break Duration" error={errors.breakDurationMinutes} className="w-auto">
                <div className="flex items-center gap-1.5">
                  <Input
                    inputMode="numeric"
                    value={form.breakDurationMinutes}
                    onChange={(e) => setForm({ ...form, breakDurationMinutes: e.target.value })}
                    className={hrInput(NUM, errors.breakDurationMinutes ? "error" : "default")}
                  />
                  <span className="text-[11px] text-muted-foreground shrink-0">min</span>
                </div>
              </HrOrgField>
            </div>
          </div>
        </FormSection>

        <FormSection
          number="02"
          title="Weekly Schedule"
          description="Working days, shift timings and weekly offs."
          info={{
            title: "Weekly Schedule",
            summary: "Working days, offs, and timings for this shift.",
            what: "Defines which days are working, weekly off, or selected weeks off (e.g. alternate Saturdays).",
          }}
          headerAside={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={applyMonday}
            >
              Apply Monday Timing
            </Button>
          }
        >
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-xs table-fixed min-w-[640px]">
              <colgroup>
                <col className="w-[88px]" />
                <col className="w-[150px]" />
                <col className="w-[120px]" />
                <col className="w-[130px]" />
                <col className="w-[130px]" />
              </colgroup>
              <thead>
                <tr className="bg-muted/40 border-b border-border text-left">
                  <th className="px-2 py-1.5 font-semibold">Day</th>
                  <th className="px-2 py-1.5 font-semibold">Type</th>
                  <th className="px-2 py-1.5 font-semibold">Week Pattern</th>
                  <th className="px-2 py-1.5 font-semibold">Start</th>
                  <th className="px-2 py-1.5 font-semibold">End</th>
                </tr>
              </thead>
              <tbody>
                {SHIFT_DAY_KEYS.map((day) => {
                  const cfg = form.weeklySchedule[day];
                  const needsTiming = dayTypeNeedsTiming(cfg.dayType);
                  return (
                    <tr key={day} className="border-b border-border/60 last:border-0 h-[44px]">
                      <td className="px-2 py-1 font-medium whitespace-nowrap align-middle">
                        {SHIFT_DAY_LABELS[day]}
                      </td>
                      <td className="px-2 py-1 align-middle">
                        <select
                          className={SELECT_SM}
                          value={cfg.dayType}
                          onChange={(e) => {
                            const v = e.target.value as "working" | "off" | "selected_weeks_off";
                            if (v === "off") setDay(day, offDayConfig());
                            else if (v === "selected_weeks_off") {
                              setDay(
                                day,
                                selectedWeeksOffConfig(
                                  cfg.startTime || "09:30",
                                  cfg.endTime || "18:30",
                                  cfg.offWeeks?.length ? cfg.offWeeks : [2, 4],
                                ),
                              );
                            } else {
                              setDay(
                                day,
                                workingDayConfig(cfg.startTime || "09:30", cfg.endTime || "18:30"),
                              );
                            }
                          }}
                        >
                          <option value="working">Working Day</option>
                          <option value="off">Weekly Off</option>
                          <option value="selected_weeks_off">Selected Weeks Off</option>
                        </select>
                      </td>
                      <td className="px-2 py-1 align-middle">
                        {cfg.dayType === "selected_weeks_off" ? (
                          <WeekOffPicker
                            value={normalizeOffWeeks(cfg.offWeeks)}
                            onChange={(weeks) => setDay(day, { offWeeks: weeks })}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1 align-middle">
                        {needsTiming ? (
                          <HrTimeInput
                            value={cfg.startTime}
                            onChange={(v) => setDay(day, { startTime: v })}
                            className="h-8 max-w-[118px]"
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1 align-middle">
                        {needsTiming ? (
                          <HrTimeInput
                            value={cfg.endTime}
                            onChange={(v) => setDay(day, { endTime: v })}
                            className="h-8 max-w-[118px]"
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {scheduleError && (
            <p className="text-xs text-red-600 mt-1.5">{errors[scheduleError]}</p>
          )}
        </FormSection>

        <FormSection
          number="03"
          title="Attendance Rules"
          description="Late coming, early going, half-day and overtime."
          info={{
            title: "Attendance Rules",
            summary: "How late, early, half-day, absent and overtime are interpreted for this shift.",
            what: "Saved to a linked attendance policy used when employees on this shift have no explicit policy assignment.",
            rules:
              "Shared policies are never overwritten from another shift — a dedicated linked policy is created when needed.",
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RuleGroup title="Late Coming">
              <CompactToggle
                label="Enable"
                checked={form.rules.trackLateComing}
                onCheckedChange={(v) =>
                  setForm({ ...form, rules: { ...form.rules, trackLateComing: v } })
                }
              />
              {form.rules.trackLateComing ? (
                <div className="flex flex-wrap items-start gap-3">
                  <HrOrgField label="Allowed / month">
                    <Input
                      inputMode="numeric"
                      value={String(form.rules.allowedLateEntriesPerMonth)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          rules: {
                            ...form.rules,
                            allowedLateEntriesPerMonth:
                              Number(e.target.value.replace(/\D/g, "")) || 0,
                          },
                        })
                      }
                      className={hrInput(NUM)}
                    />
                  </HrOrgField>
                  <HrOrgField label="After limit" size="full" className="min-w-[160px] flex-1">
                    <LimitSelect
                      value={form.rules.afterAllowedLimit}
                      onChange={(v) =>
                        setForm({ ...form, rules: { ...form.rules, afterAllowedLimit: v } })
                      }
                    />
                  </HrOrgField>
                </div>
              ) : null}
              {lateSummary ? (
                <p className="text-[11px] text-muted-foreground leading-snug">{lateSummary}</p>
              ) : null}
            </RuleGroup>

            <RuleGroup title="Early Going">
              <CompactToggle
                label="Enable"
                checked={form.rules.trackEarlyGoing}
                onCheckedChange={(v) =>
                  setForm({ ...form, rules: { ...form.rules, trackEarlyGoing: v } })
                }
              />
            </RuleGroup>

            <RuleGroup title="Half Day / Absent">
              <div className="flex flex-wrap gap-3">
                <HrOrgField label="Half-day if less than" error={errors.rule_halfDay}>
                  <DurationInputs
                    hours={form.rules.halfDayHours}
                    minutes={form.rules.halfDayMinutes}
                    onHours={(h) => setForm({ ...form, rules: { ...form.rules, halfDayHours: h } })}
                    onMinutes={(m) =>
                      setForm({ ...form, rules: { ...form.rules, halfDayMinutes: m } })
                    }
                  />
                </HrOrgField>
                <HrOrgField label="Absent if less than" error={errors.rule_absent}>
                  <DurationInputs
                    hours={form.rules.absentHours}
                    minutes={form.rules.absentMinutes}
                    onHours={(h) => setForm({ ...form, rules: { ...form.rules, absentHours: h } })}
                    onMinutes={(m) =>
                      setForm({ ...form, rules: { ...form.rules, absentMinutes: m } })
                    }
                  />
                </HrOrgField>
              </div>
            </RuleGroup>

            <RuleGroup title="Overtime">
              <CompactToggle
                label="Enable"
                checked={form.rules.overtimeEnabled}
                onCheckedChange={(v) =>
                  setForm({ ...form, rules: { ...form.rules, overtimeEnabled: v } })
                }
              />
              {form.rules.overtimeEnabled ? (
                <HrOrgField
                  label="Threshold past shift end"
                  error={errors.rule_overtimeAfterMinutes}
                >
                  <div className="flex items-center gap-1.5">
                    <Input
                      inputMode="numeric"
                      value={String(form.rules.overtimeAfterMinutes)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          rules: {
                            ...form.rules,
                            overtimeAfterMinutes:
                              Number(e.target.value.replace(/\D/g, "")) || 0,
                          },
                        })
                      }
                      className={hrInput(NUM, errors.rule_overtimeAfterMinutes ? "error" : "default")}
                    />
                    <span className="text-[11px] text-muted-foreground shrink-0">min</span>
                  </div>
                </HrOrgField>
              ) : null}
            </RuleGroup>
          </div>
        </FormSection>

        <FormSection
          number="04"
          title="Attendance Mode"
          description="Mobile punch, location and face verification."
          note="Company-wide settings — apply to all employees."
          info={{
            title: "Attendance Mode",
            summary: "Company-wide mobile punch settings — same for all shifts.",
            what: "Controls Employee Mobile punch, office location validation, and face verification.",
            rules: "Saving updates the shared company configuration. It is not stored per shift.",
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RuleGroup title="Mobile Punch">
              <div className="space-y-2">
                <CompactToggle
                  label="Allow Mobile Punch"
                  checked={form.modes.mobileAttendanceEnabled}
                  onCheckedChange={(v) =>
                    setForm({ ...form, modes: { ...form.modes, mobileAttendanceEnabled: v } })
                  }
                />
                {form.modes.mobileAttendanceEnabled ? (
                  <CompactToggle
                    label="Multiple Punches"
                    checked={form.modes.allowMultiplePunches}
                    onCheckedChange={(v) =>
                      setForm({ ...form, modes: { ...form.modes, allowMultiplePunches: v } })
                    }
                  />
                ) : null}
              </div>
            </RuleGroup>

            {form.modes.mobileAttendanceEnabled ? (
              <>
                <RuleGroup title="Office Location">
                  <CompactToggle
                    label="Validate Office Location"
                    checked={form.modes.officeLocationValidation}
                    onCheckedChange={(v) =>
                      setForm({ ...form, modes: { ...form.modes, officeLocationValidation: v } })
                    }
                  />
                  {form.modes.officeLocationValidation ? (
                    <div className="flex flex-wrap items-start gap-3">
                      <HrOrgField
                        label="Allowed distance"
                        error={errors.mode_geoFenceRadiusMeters}
                      >
                        <div className="flex items-center gap-1.5">
                          <Input
                            inputMode="numeric"
                            value={form.modes.geoFenceRadiusMeters}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                modes: { ...form.modes, geoFenceRadiusMeters: e.target.value },
                              })
                            }
                            className={hrInput(
                              NUM,
                              errors.mode_geoFenceRadiusMeters ? "error" : "default",
                            )}
                          />
                          <span className="text-[11px] text-muted-foreground shrink-0">m</span>
                        </div>
                      </HrOrgField>
                      <HrOrgField label="Outside office" size="full" className="min-w-[160px] flex-1">
                        <ModeOptionSelect
                          value={form.modes.outsideLocationBehavior}
                          options={OUTSIDE_LOCATION_OPTIONS}
                          onChange={(v) =>
                            setForm({
                              ...form,
                              modes: { ...form.modes, outsideLocationBehavior: v },
                            })
                          }
                        />
                      </HrOrgField>
                    </div>
                  ) : null}
                </RuleGroup>

                <RuleGroup title="Face Verification">
                  <CompactToggle
                    label="Face Verification"
                    checked={form.modes.faceVerificationEnabled}
                    onCheckedChange={(v) =>
                      setForm({ ...form, modes: { ...form.modes, faceVerificationEnabled: v } })
                    }
                  />
                  {form.modes.faceVerificationEnabled ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <CompactToggle
                          label="Required on Punch In"
                          checked={form.modes.requireFaceOnCheckIn}
                          onCheckedChange={(v) =>
                            setForm({
                              ...form,
                              modes: { ...form.modes, requireFaceOnCheckIn: v },
                            })
                          }
                        />
                        <CompactToggle
                          label="Required on Punch Out"
                          checked={form.modes.requireFaceOnCheckOut}
                          onCheckedChange={(v) =>
                            setForm({
                              ...form,
                              modes: { ...form.modes, requireFaceOnCheckOut: v },
                            })
                          }
                        />
                      </div>
                      <HrOrgField label="Verification failure action" size="full" className="max-w-sm">
                        <ModeOptionSelect
                          value={form.modes.faceFailureBehavior}
                          options={FACE_FAILURE_OPTIONS}
                          onChange={(v) =>
                            setForm({
                              ...form,
                              modes: { ...form.modes, faceFailureBehavior: v },
                            })
                          }
                        />
                      </HrOrgField>
                    </div>
                  ) : null}
                </RuleGroup>
              </>
            ) : null}
          </div>
        </FormSection>
      </div>

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrOrgPageHeader>
  );
}

function DurationInputs({
  hours,
  minutes,
  onHours,
  onMinutes,
}: {
  hours: number;
  minutes: number;
  onHours: (n: number) => void;
  onMinutes: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Input
        inputMode="numeric"
        value={String(hours)}
        onChange={(e) => onHours(Number(e.target.value.replace(/\D/g, "")) || 0)}
        className={cn(hrInput(), "h-9 w-14 text-xs px-2 tabular-nums")}
      />
      <span className="text-[11px] text-muted-foreground">h</span>
      <Input
        inputMode="numeric"
        value={String(minutes)}
        onChange={(e) => onMinutes(Math.min(59, Number(e.target.value.replace(/\D/g, "")) || 0))}
        className={cn(hrInput(), "h-9 w-14 text-xs px-2 tabular-nums")}
      />
      <span className="text-[11px] text-muted-foreground">m</span>
    </div>
  );
}

function LimitSelect({
  value,
  onChange,
}: {
  value: AfterAllowedLimit;
  onChange: (v: AfterAllowedLimit) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            hrInput(),
            "h-9 w-full max-w-[220px] px-2.5 text-xs text-left flex items-center justify-between",
          )}
        >
          <span className="truncate">{AFTER_ALLOWED_LIMIT_OPTIONS.find((o) => o.value === value)?.label}</span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-1 rounded-[12px]" align="start">
        {AFTER_ALLOWED_LIMIT_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg text-left",
              value === o.value ? "bg-brand-50 text-brand-700" : "hover:bg-muted/60",
            )}
            onClick={() => {
              onChange(o.value);
              setOpen(false);
            }}
          >
            <span className="flex-1">{o.label}</span>
            {value === o.value ? <Check className="w-3.5 h-3.5 text-brand-600" /> : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function ModeOptionSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            hrInput(),
            "h-9 w-full max-w-[240px] px-2.5 text-xs text-left flex items-center justify-between",
          )}
        >
          <span className="truncate">{options.find((o) => o.value === value)?.label}</span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-1 rounded-[12px]" align="start">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg text-left",
              value === o.value ? "bg-brand-50 text-brand-700" : "hover:bg-muted/60",
            )}
            onClick={() => {
              onChange(o.value);
              setOpen(false);
            }}
          >
            <span className="flex-1">{o.label}</span>
            {value === o.value ? <Check className="w-3.5 h-3.5 text-brand-600" /> : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function WeekOffPicker({
  value,
  onChange,
}: {
  value: ShiftWeekOccurrence[];
  onChange: (v: ShiftWeekOccurrence[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (w: ShiftWeekOccurrence) => {
    const set = new Set(value);
    if (set.has(w)) set.delete(w);
    else set.add(w);
    onChange(Array.from(set).sort((a, b) => a - b) as ShiftWeekOccurrence[]);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-8 px-2 text-[11px] border border-border rounded-[10px] bg-white min-w-[88px] max-w-[110px] text-left truncate"
        >
          {formatOffWeeksCompact(value)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2 space-y-1" align="start">
        {SHIFT_WEEK_OPTIONS.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
            <Checkbox
              checked={value.includes(o.value)}
              onCheckedChange={() => toggle(o.value)}
            />
            {o.label}
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}
