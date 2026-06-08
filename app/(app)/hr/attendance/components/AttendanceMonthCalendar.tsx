"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DailyAttendanceRecord } from "../attendance-data";
import {
  CALENDAR_LEGEND_STATUSES,
  LEGEND_DOT,
  STATUS_LABELS,
  WEEKDAYS,
  buildCalendarCells,
  getAttendanceStatusForDate,
  getStatusTileClass,
  shiftMonth,
  type CalendarTileStatus,
} from "./attendance-status-theme";

export function AttendanceMonthCalendar({
  monthKey,
  monthTitle,
  recordsByDate,
  selectedDate,
  onSelectDate,
  onMonthChange,
}: {
  monthKey: string;
  monthTitle: string;
  recordsByDate: Map<string, DailyAttendanceRecord>;
  selectedDate: string | null;
  onSelectDate: (date: string, record: DailyAttendanceRecord | undefined, status: CalendarTileStatus) => void;
  onMonthChange: (monthKey: string) => void;
}) {
  const cells = buildCalendarCells(monthKey);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-xl border border-border/80 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r from-brand-50/80 via-white to-white">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
          className="w-8 h-8 shrink-0 rounded-lg border border-border/60 flex items-center justify-center hover:bg-brand-100 text-brand-700"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-bold text-brand-900 flex-1 text-center truncate">{monthTitle}</p>
        <div className="hidden sm:flex items-center gap-2.5 text-[10px] shrink-0 mr-1">
          {CALENDAR_LEGEND_STATUSES.map((key) => (
            <span key={key} className="inline-flex items-center gap-1 text-muted-foreground whitespace-nowrap">
              <span className={cn("w-3 h-3 rounded-sm", LEGEND_DOT[key])} />
              {STATUS_LABELS[key]}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
          className="w-8 h-8 shrink-0 rounded-lg border border-border/60 flex items-center justify-center hover:bg-brand-100 text-brand-700"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 p-3">
        {cells.map((cell, i) => {
          if (!cell.date || cell.day === null) {
            return <div key={`empty-${i}`} className="aspect-square min-h-[56px]" />;
          }

          const record = recordsByDate.get(cell.date);
          const status = getAttendanceStatusForDate(cell.date, record);
          const tileClass = getStatusTileClass(status);
          const isSelected = selectedDate === cell.date;
          const isToday = cell.date === today;
          const hasStatus = status !== "empty";

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onSelectDate(cell.date!, record, status)}
              className={cn(
                "aspect-square min-h-[56px] rounded-lg border flex flex-col items-center justify-center transition-all duration-150",
                tileClass,
                isSelected && "ring-2 ring-offset-2 ring-navy-900 scale-[1.02]",
                !isSelected && isToday && "ring-2 ring-brand-400 ring-offset-1",
                hasStatus ? "hover:brightness-95 cursor-pointer" : "cursor-pointer hover:bg-slate-50",
              )}
            >
              <span className={cn("text-sm font-bold leading-none", hasStatus ? "text-white" : "text-slate-700")}>
                {String(cell.day).padStart(2, "0")}
              </span>
              {hasStatus && (
                <span className="text-[9px] font-semibold mt-1 leading-tight text-white/95 text-center px-0.5">
                  {STATUS_LABELS[status]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
