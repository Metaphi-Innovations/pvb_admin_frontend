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
  FACE_FAILURE_OPTIONS,
  OUTSIDE_LOCATION_OPTIONS,
  saveAttendanceModesSettings,
  validateAttendanceModesSettings,
  type AttendanceModesSettings,
  type FaceFailureBehavior,
  type OutsideLocationBehavior,
} from "../../attendance-modes-data";

const DRAWER_WIDTH = "w-full max-w-full sm:max-w-[640px]";
const NUM_INPUT = "h-9 w-[7.5rem] text-xs tabular-nums px-2 shrink-0";

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
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  helper?: string;
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
          <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </div>
      </div>
      {helper ? (
        <p className="text-[11px] text-muted-foreground leading-snug">{helper}</p>
      ) : null}
    </div>
  );
}

function OptionSelect<T extends string>({
  value,
  options,
  onChange,
  widthClass = "max-w-[260px]",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  widthClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = options.find((o) => o.value === value)?.label ?? value;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            hrInput(undefined, "default"),
            "h-9 w-full px-3 text-xs text-left flex items-center justify-between gap-2",
            widthClass,
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn("p-1 rounded-[12px]", widthClass)}>
        {options.map((opt) => (
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

type FormState = {
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

function settingsToForm(s: AttendanceModesSettings): FormState {
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

function parseNonNegInt(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return 0;
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}

export function AttendanceModesEditDrawer({
  open,
  onOpenChange,
  saved,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saved: AttendanceModesSettings;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => settingsToForm(saved));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [baseline, setBaseline] = useState("");

  useEffect(() => {
    if (!open) return;
    const next = settingsToForm(saved);
    setForm(next);
    setBaseline(JSON.stringify(next));
    setErrors({});
  }, [open, saved]);

  const dirty = useMemo(() => JSON.stringify(form) !== baseline, [form, baseline]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const n = { ...e };
      delete n[key];
      return n;
    });
  };

  const validate = (): boolean => {
    const radius = parseNonNegInt(form.geoFenceRadiusMeters);
    const e: Record<string, string> = {};
    if (form.mobileAttendanceEnabled && form.officeLocationValidation && radius == null) {
      e.geoFenceRadiusMeters = "Enter a valid number";
    }
    const v = validateAttendanceModesSettings({
      mobileAttendanceEnabled: form.mobileAttendanceEnabled,
      geoFencingEnabled: form.officeLocationValidation,
      geoFenceRadiusMeters: radius ?? 0,
    });
    Object.assign(e, v.errors);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleUpdate = () => {
    if (!validate()) return;
    const next: AttendanceModesSettings = {
      mobileAttendanceEnabled: form.mobileAttendanceEnabled,
      captureGps: form.mobileAttendanceEnabled,
      geoFencingEnabled: form.officeLocationValidation,
      geoFenceRadiusMeters: Number(form.geoFenceRadiusMeters) || 0,
      outsideLocationBehavior: form.outsideLocationBehavior,
      captureDeviceInfo: true,
      allowMultiplePunches: form.allowMultiplePunches,
      faceVerificationEnabled: form.faceVerificationEnabled,
      requireFaceOnCheckIn: form.requireFaceOnCheckIn,
      requireFaceOnCheckOut: form.requireFaceOnCheckOut,
      faceFailureBehavior: form.faceFailureBehavior,
      updatedBy: saved.updatedBy,
      updatedAt: saved.updatedAt,
    };
    saveAttendanceModesSettings(next);
    onSaved();
    onOpenChange(false);
  };

  return (
    <HrFormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Attendance Modes"
      description="Configure mobile punch, office location, and face verification for the employee app."
      saveLabel="Update"
      onSave={handleUpdate}
      saveDisabled={!dirty}
      contentClassName={DRAWER_WIDTH}
    >
      <div className="space-y-5 pb-1">
        <section className="space-y-3">
          <SectionHeading label="Mobile Punch" />
          <CompactToggleRow
            label="Allow Mobile Punch"
            checked={form.mobileAttendanceEnabled}
            onCheckedChange={(v) => set("mobileAttendanceEnabled", v)}
            helper="Employees can mark attendance from the mobile app using Punch In and Punch Out."
          />
          {form.mobileAttendanceEnabled ? (
            <CompactToggleRow
              label="Allow Multiple Punches per Day"
              checked={form.allowMultiplePunches}
              onCheckedChange={(v) => set("allowMultiplePunches", v)}
              helper="Allow more than one punch-in or punch-out in a day."
            />
          ) : null}
        </section>

        {form.mobileAttendanceEnabled ? (
          <>
            <section className="space-y-3">
              <SectionHeading label="Office Location" />
              <CompactToggleRow
                label="Validate Office Location"
                checked={form.officeLocationValidation}
                onCheckedChange={(v) => set("officeLocationValidation", v)}
                helper="Check punch against the employee's assigned branch or office location."
              />

              {form.officeLocationValidation ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                  <HrOrgField
                    label="Allowed Distance from Office"
                    size="full"
                    error={errors.geoFenceRadiusMeters}
                  >
                    <div className="flex items-center gap-1.5">
                      <Input
                        inputMode="numeric"
                        value={form.geoFenceRadiusMeters}
                        onChange={(e) => set("geoFenceRadiusMeters", e.target.value)}
                        className={cn(
                          hrInput(undefined, errors.geoFenceRadiusMeters ? "error" : "default"),
                          NUM_INPUT,
                        )}
                      />
                      <span className="text-[11px] text-muted-foreground">meters</span>
                    </div>
                  </HrOrgField>

                  <HrOrgField label="If Outside Office Location" size="full">
                    <OptionSelect
                      value={form.outsideLocationBehavior}
                      options={OUTSIDE_LOCATION_OPTIONS}
                      onChange={(v) => set("outsideLocationBehavior", v)}
                    />
                  </HrOrgField>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Location is still captured with each punch for audit purposes.
                </p>
              )}
            </section>

            <section className="space-y-3">
              <SectionHeading label="Face Verification" />
              <CompactToggleRow
                label="Face Verification"
                checked={form.faceVerificationEnabled}
                onCheckedChange={(v) => set("faceVerificationEnabled", v)}
                helper="Verify the employee's face during punch when required."
              />

              {form.faceVerificationEnabled ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                    <CompactToggleRow
                      label="Required on Punch In"
                      checked={form.requireFaceOnCheckIn}
                      onCheckedChange={(v) => set("requireFaceOnCheckIn", v)}
                    />
                    <CompactToggleRow
                      label="Required on Punch Out"
                      checked={form.requireFaceOnCheckOut}
                      onCheckedChange={(v) => set("requireFaceOnCheckOut", v)}
                    />
                  </div>

                  <HrOrgField label="If Face Verification Fails" size="full">
                    <OptionSelect
                      value={form.faceFailureBehavior}
                      options={FACE_FAILURE_OPTIONS}
                      onChange={(v) => set("faceFailureBehavior", v)}
                      widthClass="max-w-[280px]"
                    />
                  </HrOrgField>

                  {form.faceFailureBehavior === "hr_review" ? (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 leading-snug">
                      Punches flagged for HR review will appear in attendance exceptions once that
                      workflow is connected.
                    </p>
                  ) : null}
                </>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </HrFormDrawer>
  );
}
