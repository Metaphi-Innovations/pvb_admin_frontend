"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ResolvedAttendanceDay } from "../sf-attendance-data";
import {
  STATUS_LABEL,
  getStatusTileClass,
} from "../sf-attendance-status-theme";

function fmtMarkedOn(iso?: string, date?: string): string {
  if (iso) {
    try {
      return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return iso;
    }
  }
  if (date) {
    try {
      return new Date(date + "T12:00:00").toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return date;
    }
  }
  return "—";
}

export function SfAttendanceDatePanel({ day }: { day: ResolvedAttendanceDay | null }) {
  if (!day) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white p-4 flex items-center justify-center min-h-[320px]">
        <p className="text-[11px] text-muted-foreground text-center">Select a date on the calendar to view details.</p>
      </div>
    );
  }

  const status = day.status;
  const badgeClass = status ? getStatusTileClass(status) : "bg-white text-slate-600 border-slate-200";

  return (
    <div className="rounded-xl border bg-white shadow-sm flex flex-col min-h-[320px] overflow-hidden">
      <div className="px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
        <h3 className="text-sm font-bold text-foreground">Date Details</h3>
      </div>
      <div className="p-4 space-y-3 flex-1 text-xs">
        <Field label="Date" value={day.date} />
        <Field label="Day" value={day.dayName} />
        <Field
          label="Status"
          value={
            status ? (
              <span className={cn("inline-flex px-2.5 py-0.5 rounded-md border text-[11px] font-semibold", badgeClass)}>
                {STATUS_LABEL[status]}
              </span>
            ) : (
              "—"
            )
          }
        />

        {status === "holiday" && (
          <Field label="Holiday Name" value={day.eventName ?? "—"} />
        )}

        {status === "week_off" && (
          <Field label="Week Off Rule" value={day.ruleName ?? day.eventName ?? "—"} />
        )}

        {status === "present" && (
          <>
            <Field label="Marked By" value={day.markedBy ?? "—"} />
            <Field label="Marked On" value={fmtMarkedOn(day.markedOn, day.date)} />
          </>
        )}

        {status === "absent" && (
          <Field label="Remarks" value={day.remarks ?? "—"} />
        )}

        {!status && (
          <p className="text-[11px] text-muted-foreground">No attendance status for this date.</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}
