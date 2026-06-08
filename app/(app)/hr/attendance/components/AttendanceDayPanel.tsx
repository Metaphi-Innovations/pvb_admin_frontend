"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  type DailyAttendanceRecord,
} from "../attendance-data";
import {
  STATUS_LABELS,
  getAttendanceStatusForDate,
  getStatusTileClass,
  type CalendarTileStatus,
} from "./attendance-status-theme";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatMarkedOn(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function AttendanceDayPanel({
  date,
  record,
  tileStatus,
  onOpenFullDetail,
}: {
  date: string | null;
  record: DailyAttendanceRecord | null;
  tileStatus: CalendarTileStatus;
  onOpenFullDetail: () => void;
}) {
  if (!date) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white flex flex-col items-center justify-center min-h-[320px] text-center p-6">
        <p className="text-sm font-medium text-muted-foreground">Select a date on the calendar</p>
        <p className="text-xs text-muted-foreground mt-1">Date details will appear here</p>
      </div>
    );
  }

  const dayName = DAY_NAMES[new Date(date + "T12:00:00").getDay()];
  const status = tileStatus !== "empty" ? tileStatus : (record ? getAttendanceStatusForDate(date, record) : "empty");
  const statusLabel = status !== "empty" ? STATUS_LABELS[status] : "—";
  const badgeClass = status !== "empty" ? getStatusTileClass(status) : "bg-white text-slate-600 border-slate-200";

  return (
    <div className="rounded-xl border border-border/80 bg-white shadow-sm flex flex-col min-h-[320px] overflow-hidden">
      <div className="px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
        <h3 className="text-sm font-bold text-foreground">Date Details</h3>
      </div>

      <div className="p-4 space-y-3 flex-1 overflow-y-auto text-xs">
        <DetailRow label="Date" value={date} />
        <DetailRow label="Day" value={dayName} />
        <DetailRow
          label="Status"
          value={
            status !== "empty" ? (
              <span className={cn("inline-flex px-2.5 py-0.5 rounded-md border text-[11px] font-semibold", badgeClass)}>
                {statusLabel}
              </span>
            ) : (
              "—"
            )
          }
        />

        {status === "holiday" && record && (
          <DetailRow label="Holiday Name" value={record.note ?? record.shift ?? "Holiday"} />
        )}

        {status === "week_off" && record && (
          <DetailRow label="Week Off Rule" value={record.note ?? "Configured week off"} />
        )}

        {status === "present" && record && (
          <>
            <DetailRow label="Marked By" value={record.updatedBy || record.createdBy || "—"} />
            <DetailRow label="Marked On" value={formatMarkedOn(record.date)} />
          </>
        )}

        {status === "absent" && record && (
          <DetailRow label="Remarks" value={record.note ?? "—"} />
        )}

        {status === "empty" && (
          <p className="text-[11px] text-muted-foreground pt-1">No attendance status recorded for this date.</p>
        )}
      </div>

      {record && (
        <div className="p-3 border-t bg-muted/10">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs border-brand-200 text-brand-700 hover:bg-brand-50"
            onClick={onOpenFullDetail}
          >
            View full record & audit
          </Button>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="font-medium mt-0.5 text-foreground">{value}</div>
    </div>
  );
}
