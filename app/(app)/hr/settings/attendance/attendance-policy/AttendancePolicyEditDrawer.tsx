"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { HrFormDrawer } from "../../organization/_components/HrFormDrawer";
import { HrOrgField, hrInput } from "../../organization/_components";
import {
  AFTER_ALLOWED_LIMIT_OPTIONS,
  buildLateComingSummary,
  validateAttendancePolicyRecord,
  type AfterAllowedLimit,
  type AttendancePolicyRecord,
  type AttendancePolicyStatus,
} from "../../attendance-policy-data";

/** Wider drawer for multi-section attendance policy form (~720px desktop). */
const POLICY_DRAWER_WIDTH =
  "w-full max-w-full sm:max-w-[720px]";

export type AttendancePolicyFormState = {
  id?: number;
  name: string;
  isDefault: boolean;
  status: AttendancePolicyStatus;
  trackLateComing: boolean;
  allowedLateEntriesPerMonth: string;
  afterAllowedLimit: AfterAllowedLimit;
  trackEarlyGoing: boolean;
  halfDayHours: string;
  halfDayMinutes: string;
  absentHours: string;
  absentMinutes: string;
  overtimeEnabled: boolean;
  overtimeAfterMinutes: string;
};

export const EMPTY_POLICY_FORM: AttendancePolicyFormState = {
  name: "",
  isDefault: false,
  status: "active",
  trackLateComing: true,
  allowedLateEntriesPerMonth: "2",
  afterAllowedLimit: "half_day",
  trackEarlyGoing: true,
  halfDayHours: "4",
  halfDayMinutes: "30",
  absentHours: "2",
  absentMinutes: "0",
  overtimeEnabled: true,
  overtimeAfterMinutes: "30",
};

function recordToForm(r: AttendancePolicyRecord): AttendancePolicyFormState {
  return {
    id: r.id,
    name: r.name,
    isDefault: r.isDefault,
    status: r.status,
    trackLateComing: r.trackLateComing,
    allowedLateEntriesPerMonth: String(r.allowedLateEntriesPerMonth),
    afterAllowedLimit: r.afterAllowedLimit,
    trackEarlyGoing: r.trackEarlyGoing,
    halfDayHours: String(r.halfDayHours),
    halfDayMinutes: String(r.halfDayMinutes),
    absentHours: String(r.absentHours),
    absentMinutes: String(r.absentMinutes),
    overtimeEnabled: r.overtimeEnabled,
    overtimeAfterMinutes: String(r.overtimeAfterMinutes),
  };
}

function parseNonNegInt(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return 0;
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}

function parseMinutesField(raw: string): number | null {
  const n = parseNonNegInt(raw);
  if (n == null || n > 59) return null;
  return n;
}

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function CompactToggleRow({
  label,
  checked,
  onCheckedChange,
  helper,
  disabled,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  helper?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 min-h-9">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "text-[11px] font-medium",
              checked ? "text-emerald-600" : "text-muted-foreground",
            )}
          >
            {checked ? "ON" : "OFF"}
          </span>
          <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
        </div>
      </div>
      {helper ? (
        <p className="text-[11px] text-muted-foreground leading-snug">{helper}</p>
      ) : null}
    </div>
  );
}

const NUM_INPUT = "h-9 w-20 text-xs tabular-nums px-2 shrink-0";

function DurationFields({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  hoursId,
  minutesId,
  error,
}: {
  hours: string;
  minutes: string;
  onHoursChange: (v: string) => void;
  onMinutesChange: (v: string) => void;
  hoursId: string;
  minutesId: string;
  error?: string;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5">
        <Input
          id={hoursId}
          inputMode="numeric"
          value={hours}
          onChange={(e) => onHoursChange(e.target.value)}
          className={cn(hrInput(undefined, error ? "error" : "default"), NUM_INPUT)}
        />
        <span className="text-[11px] text-muted-foreground">h</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          id={minutesId}
          inputMode="numeric"
          value={minutes}
          onChange={(e) => onMinutesChange(e.target.value)}
          className={cn(hrInput(undefined, error ? "error" : "default"), NUM_INPUT)}
        />
        <span className="text-[11px] text-muted-foreground">m</span>
      </div>
    </div>
  );
}

function AfterLimitSelect({
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
            hrInput(undefined, "default"),
            "h-9 w-full max-w-[260px] px-3 text-xs text-left flex items-center justify-between gap-2",
          )}
        >
          <span className="truncate">
            {AFTER_ALLOWED_LIMIT_OPTIONS.find((o) => o.value === value)?.label}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-1 rounded-[12px]">
        {AFTER_ALLOWED_LIMIT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-2 text-xs text-left rounded-lg transition-colors",
              value === opt.value
                ? "bg-brand-50 text-brand-700 font-medium"
                : "text-foreground hover:bg-muted/60",
            )}
          >
            <span className="flex-1">{opt.label}</span>
            {value === opt.value ? (
              <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            ) : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function AttendancePolicyEditDrawer({
  open,
  onOpenChange,
  record,
  isFirstPolicy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AttendancePolicyRecord | null;
  isFirstPolicy: boolean;
  onSubmit: (form: AttendancePolicyFormState) => void;
}) {
  const isEdit = !!record;
  const [form, setForm] = useState<AttendancePolicyFormState>(EMPTY_POLICY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [baseline, setBaseline] = useState("");

  useEffect(() => {
    if (!open) return;
    const next = record ? recordToForm(record) : { ...EMPTY_POLICY_FORM, isDefault: isFirstPolicy };
    setForm(next);
    setBaseline(JSON.stringify(next));
    setErrors({});
  }, [open, record, isFirstPolicy]);

  const dirty = useMemo(() => JSON.stringify(form) !== baseline, [form, baseline]);

  const set = <K extends keyof AttendancePolicyFormState>(
    key: K,
    value: AttendancePolicyFormState[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const n = { ...e };
      delete n[key];
      delete n.halfDay;
      delete n.absent;
      return n;
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const hh = parseNonNegInt(form.halfDayHours);
    const hm = parseMinutesField(form.halfDayMinutes);
    const ah = parseNonNegInt(form.absentHours);
    const am = parseMinutesField(form.absentMinutes);
    const allowedLate = parseNonNegInt(form.allowedLateEntriesPerMonth);

    if (hh == null || hm == null) e.halfDay = "Enter valid hours and minutes";
    if (ah == null || am == null) e.absent = "Enter valid hours and minutes";

    if (form.overtimeEnabled) {
      const ot = parseNonNegInt(form.overtimeAfterMinutes);
      if (ot == null) e.overtimeAfterMinutes = "Enter a valid number";
    }

    if (form.trackLateComing && allowedLate == null) {
      e.allowedLateEntriesPerMonth = "Enter a valid whole number";
    }

    if (hh != null && hm != null && ah != null && am != null) {
      const v = validateAttendancePolicyRecord({
        name: form.name,
        excludeId: form.id,
        trackLateComing: form.trackLateComing,
        allowedLateEntriesPerMonth: allowedLate ?? 0,
        halfDayHours: hh,
        halfDayMinutes: hm,
        absentHours: ah,
        absentMinutes: am,
        overtimeEnabled: form.overtimeEnabled,
        overtimeAfterMinutes: Number(form.overtimeAfterMinutes) || 0,
      });
      Object.assign(e, v.errors);
    } else if (!form.name.trim()) {
      e.name = "Policy name is required";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSubmit(form);
  };

  const lateSummary = form.trackLateComing
    ? buildLateComingSummary(Number(form.allowedLateEntriesPerMonth) || 0, form.afterAllowedLimit)
    : null;

  return (
    <HrFormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Attendance Policy" : "Add Attendance Policy"}
      description="Configure how attendance is interpreted for assigned employees."
      saveLabel={isEdit ? "Update" : "Create"}
      onSave={handleSave}
      saveDisabled={!dirty}
      contentClassName={POLICY_DRAWER_WIDTH}
    >
      <div className="space-y-5 pb-1">
        <section className="space-y-3">
          <SectionHeading label="Policy Details" />
          <HrOrgField label="Policy Name" size="full" error={errors.name} required>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={cn(hrInput(undefined, errors.name ? "error" : "default"), "h-9 text-xs w-full")}
              placeholder="e.g. Standard Attendance Policy"
            />
          </HrOrgField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
            <CompactToggleRow
              label="Default Policy"
              checked={form.isDefault}
              onCheckedChange={(v) => set("isDefault", v)}
              helper="Applied automatically to new employees."
              disabled={isFirstPolicy && form.isDefault}
            />
            <CompactToggleRow
              label="Active"
              checked={form.status === "active"}
              onCheckedChange={(v) => set("status", v ? "active" : "inactive")}
              helper="Available for new assignment."
            />
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeading label="Attendance Classification" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
            <HrOrgField label="Mark Half Day if worked less than" size="full" error={errors.halfDay}>
              <DurationFields
                hours={form.halfDayHours}
                minutes={form.halfDayMinutes}
                onHoursChange={(v) => set("halfDayHours", v)}
                onMinutesChange={(v) => set("halfDayMinutes", v)}
                hoursId="halfDayHours"
                minutesId="halfDayMinutes"
                error={errors.halfDay}
              />
            </HrOrgField>

            <HrOrgField label="Mark Absent if worked less than" size="full" error={errors.absent}>
              <DurationFields
                hours={form.absentHours}
                minutes={form.absentMinutes}
                onHoursChange={(v) => set("absentHours", v)}
                onMinutesChange={(v) => set("absentMinutes", v)}
                hoursId="absentHours"
                minutesId="absentMinutes"
                error={errors.absent}
              />
            </HrOrgField>
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeading label="Late Coming" />
          <CompactToggleRow
            label="Track Late Coming"
            checked={form.trackLateComing}
            onCheckedChange={(v) => set("trackLateComing", v)}
            helper="Uses assigned Shift and grace time."
          />

          {form.trackLateComing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
              <HrOrgField
                label="Allowed Late Entries per Month"
                size="full"
                error={errors.allowedLateEntriesPerMonth}
              >
                <Input
                  inputMode="numeric"
                  value={form.allowedLateEntriesPerMonth}
                  onChange={(e) => set("allowedLateEntriesPerMonth", e.target.value)}
                  className={cn(
                    hrInput(undefined, errors.allowedLateEntriesPerMonth ? "error" : "default"),
                    "h-9 w-[7.5rem] text-xs tabular-nums px-2",
                  )}
                />
              </HrOrgField>

              <HrOrgField label="After Allowed Limit" size="full">
                <AfterLimitSelect
                  value={form.afterAllowedLimit}
                  onChange={(v) => set("afterAllowedLimit", v)}
                />
              </HrOrgField>
            </div>
          ) : null}

          {form.trackLateComing && lateSummary ? (
            <p className="text-[11px] text-muted-foreground leading-snug">{lateSummary}</p>
          ) : null}

          {form.trackLateComing && form.afterAllowedLimit === "hr_review" ? (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 leading-snug">
              HR review workflow is not connected yet.
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          <SectionHeading label="Early Going" />
          <CompactToggleRow
            label="Track Early Going"
            checked={form.trackEarlyGoing}
            onCheckedChange={(v) => set("trackEarlyGoing", v)}
            helper="Uses assigned Shift and grace time."
          />
        </section>

        <section className="space-y-3">
          <SectionHeading label="Overtime" />
          <CompactToggleRow
            label="Track Overtime"
            checked={form.overtimeEnabled}
            onCheckedChange={(v) => set("overtimeEnabled", v)}
          />
          {form.overtimeEnabled ? (
            <HrOrgField label="Count Overtime After" size="full" error={errors.overtimeAfterMinutes}>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Input
                  inputMode="numeric"
                  value={form.overtimeAfterMinutes}
                  onChange={(e) => set("overtimeAfterMinutes", e.target.value)}
                  className={cn(
                    hrInput(undefined, errors.overtimeAfterMinutes ? "error" : "default"),
                    NUM_INPUT,
                  )}
                />
                <span className="text-[11px] text-muted-foreground">min beyond shift end</span>
              </div>
            </HrOrgField>
          ) : null}
        </section>
      </div>
    </HrFormDrawer>
  );
}
