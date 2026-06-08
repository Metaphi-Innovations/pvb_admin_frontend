"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ResolvedAttendanceDay } from "../sf-attendance-data";
import {
  LEGEND_SWATCH,
  SF_ATTENDANCE_STATUSES,
  STATUS_LABEL,
  getAttendanceStatusForDate,
  getStatusTileClass,
} from "../sf-attendance-status-theme";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildCells(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const cells: ({ day: number | null; date: string | null })[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push({ day: null, date: null });
  for (let d = 1; d <= days; d++) {
    cells.push({ day: d, date: `${monthKey}-${String(d).padStart(2, "0")}` });
  }
  return cells;
}

function shiftMonth(monthKey: string, delta: number) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function SfAttendanceCalendar({
  monthKey,
  monthTitle,
  daysByDate,
  selectedDate,
  onMonthChange,
  onDateSelect,
}: {
  monthKey: string;
  monthTitle: string;
  daysByDate: Map<string, ResolvedAttendanceDay>;
  selectedDate?: string | null;
  onMonthChange: (mk: string) => void;
  onDateSelect?: (day: ResolvedAttendanceDay) => void;
}) {
  const cells = buildCells(monthKey);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r from-brand-50/80 to-white">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
          className="w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center hover:bg-brand-100"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-bold text-brand-900 flex-1 text-center truncate">{monthTitle}</p>
        <div className="hidden sm:flex items-center gap-2.5 text-[10px] shrink-0 mr-1">
          {SF_ATTENDANCE_STATUSES.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 text-muted-foreground whitespace-nowrap">
              <span className={cn("w-3 h-3 rounded-sm", LEGEND_SWATCH[s])} />
              {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
          className="w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center hover:bg-brand-100"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b bg-muted/30">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[10px] font-bold uppercase text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 p-3">
        {cells.map((cell, i) => {
          if (!cell.date || cell.day === null) {
            return <div key={`e-${i}`} className="aspect-square min-h-[56px]" />;
          }

          const day = daysByDate.get(cell.date);
          const status = getAttendanceStatusForDate(cell.date, day);
          const tileClass = getStatusTileClass(status);
          const hasStatus = status !== "empty";
          const isSelected = selectedDate === cell.date;

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => {
                const resolved: ResolvedAttendanceDay = day ?? {
                  date: cell.date!,
                  dayOfMonth: cell.day!,
                  dayName: WEEKDAYS[new Date(cell.date + "T12:00:00").getDay()],
                  status: hasStatus ? status : null,
                };
                onDateSelect?.(resolved);
              }}
              className={cn(
                "aspect-square min-h-[56px] rounded-lg border flex flex-col items-center justify-center transition-all",
                tileClass,
                cell.date === today && !isSelected && "ring-2 ring-brand-400 ring-offset-1",
                isSelected && "ring-2 ring-navy-900 ring-offset-2 scale-[1.02]",
                hasStatus ? "hover:brightness-95 cursor-pointer" : "hover:bg-slate-50 cursor-pointer",
              )}
            >
              <span className={cn("text-sm font-bold leading-none", hasStatus ? "text-white" : "text-slate-700")}>
                {String(cell.day).padStart(2, "0")}
              </span>
              {hasStatus && (
                <span className="text-[9px] font-semibold mt-1 leading-tight text-white/95 text-center px-0.5">
                  {STATUS_LABEL[status]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
