"use client";

import { cn } from "@/lib/utils";
import { LogIn, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SOURCE_LABELS,
  formatPunchTime,
  type DailyAttendanceRecord,
} from "../attendance-data";
import { STATUS_THEME } from "./attendance-status-theme";

function formatDayTitle(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  return `${day}${suffix} ${d.toLocaleDateString("en-IN", { month: "long" })}`;
}

export function AttendanceDayPanel({
  record,
  employeeInitials,
  onOpenFullDetail,
  onRefresh,
}: {
  record: DailyAttendanceRecord | null;
  employeeInitials: string;
  onOpenFullDetail: () => void;
  onRefresh?: () => void;
}) {
  if (!record) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-gradient-to-br from-muted/30 to-white flex flex-col items-center justify-center min-h-[320px] text-center p-6">
        <p className="text-sm font-medium text-muted-foreground">Select a date on the calendar</p>
        <p className="text-xs text-muted-foreground mt-1">Daily punches and status will appear here</p>
      </div>
    );
  }

  const theme = STATUS_THEME[record.attendanceStatus];

  return (
    <div className="rounded-xl border border-border/80 bg-white shadow-sm flex flex-col min-h-[320px] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
        <h3 className="text-sm font-bold text-foreground">{formatDayTitle(record.date)}</h3>
        <button
          type="button"
          onClick={onRefresh}
          className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_THEME) as Array<keyof typeof STATUS_THEME>).slice(0, 5).map((key) => (
            <span
              key={key}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border",
                record.attendanceStatus === key ? theme.pill : "bg-white text-muted-foreground border-border",
              )}
            >
              {STATUS_THEME[key].label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-muted/30 px-2.5 py-2">
            <p className="text-muted-foreground">Shift</p>
            <p className="font-semibold truncate">{record.shift}</p>
          </div>
          <div className="rounded-lg bg-muted/30 px-2.5 py-2">
            <p className="text-muted-foreground">Working Hours</p>
            <p className="font-semibold">{record.workingHours}</p>
          </div>
          <div className="rounded-lg bg-muted/30 px-2.5 py-2">
            <p className="text-muted-foreground">Late By</p>
            <p className="font-semibold">{record.lateBy}</p>
          </div>
          <div className="rounded-lg bg-muted/30 px-2.5 py-2">
            <p className="text-muted-foreground">Early Exit</p>
            <p className="font-semibold">{record.earlyExit}</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Punch Timeline
          </p>
          {record.punches.length === 0 ? (
            <p className="text-xs text-muted-foreground">No punches recorded.</p>
          ) : (
            <ul className="space-y-3">
              {record.punches.map((p) => (
                <li key={p.id} className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {employeeInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      {p.type === "in" ? (
                        <LogIn className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <LogOut className="w-3 h-3 text-amber-600" />
                      )}
                      {formatPunchTime(p.time)} · {p.type === "in" ? "In" : "Out"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {p.sourceDetail ?? SOURCE_LABELS[p.source]} · {record.shift}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground">
          Source: <span className="font-semibold text-foreground">{SOURCE_LABELS[record.source]}</span>
        </p>
      </div>

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
    </div>
  );
}
