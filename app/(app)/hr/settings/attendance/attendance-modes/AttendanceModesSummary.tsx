"use client";

import React from "react";
import { Info, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  faceFailureLabel,
  onOffLabel,
  outsideLocationLabel,
  type AttendanceModesSettings,
} from "../../attendance-modes-data";

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <p className="text-[11px] text-muted-foreground leading-snug">{label}</p>
      <div className="text-xs font-medium text-foreground text-right shrink-0">{value}</div>
    </div>
  );
}

function StatusValue({ on }: { on: boolean }) {
  return (
    <span className={cn("font-medium", on ? "text-emerald-600" : "text-muted-foreground")}>
      {onOffLabel(on)}
    </span>
  );
}

export function AttendanceModesSummary({ settings }: { settings: AttendanceModesSettings }) {
  return (
    <div className="space-y-3 max-w-[640px]">
      <div className="rounded-xl border border-navy-100 bg-navy-50/50 px-3.5 py-3 flex gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-white border border-navy-100 flex items-center justify-center shrink-0">
          <Smartphone className="w-4 h-4 text-navy-600" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold text-navy-700">Employee mobile app</p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Employees only see <span className="font-medium text-foreground">Punch In</span> and{" "}
            <span className="font-medium text-foreground">Punch Out</span>. Location checks and
            face verification run automatically based on the settings below.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white shadow-sm p-4 space-y-4">
        <SectionHeading label="Mobile Punch" />
        <SummaryRow
          label="Allow Mobile Punch"
          value={<StatusValue on={settings.mobileAttendanceEnabled} />}
        />
        {settings.mobileAttendanceEnabled ? (
          <SummaryRow
            label="Multiple Punches per Day"
            value={<StatusValue on={settings.allowMultiplePunches} />}
          />
        ) : null}

        {settings.mobileAttendanceEnabled ? (
          <>
            <SectionHeading label="Office Location" />
            <div className="space-y-0.5">
              <SummaryRow
                label="Validate Office Location"
                value={<StatusValue on={settings.geoFencingEnabled} />}
              />
              {settings.geoFencingEnabled ? (
                <>
                  <SummaryRow
                    label="Allowed Distance from Office"
                    value={`${settings.geoFenceRadiusMeters} m`}
                  />
                  <SummaryRow
                    label="If Outside Office Location"
                    value={outsideLocationLabel(settings.outsideLocationBehavior)}
                  />
                </>
              ) : (
                <SummaryRow
                  label="Location Capture"
                  value={<StatusValue on={settings.captureGps} />}
                />
              )}
            </div>

            <SectionHeading label="Face Verification" />
            <div className="space-y-0.5">
              <SummaryRow
                label="Face Verification"
                value={<StatusValue on={settings.faceVerificationEnabled} />}
              />
              {settings.faceVerificationEnabled ? (
                <>
                  <SummaryRow
                    label="Required on Punch In"
                    value={<StatusValue on={settings.requireFaceOnCheckIn} />}
                  />
                  <SummaryRow
                    label="Required on Punch Out"
                    value={<StatusValue on={settings.requireFaceOnCheckOut} />}
                  />
                  <SummaryRow
                    label="If Face Verification Fails"
                    value={faceFailureLabel(settings.faceFailureBehavior)}
                  />
                </>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-2">
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-snug">
              Mobile punch is off. Employees cannot mark attendance from the mobile app.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
