"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DailyAttendanceRecord } from "../attendance-data";
import {
  STATUS_THEME,
  WEEKDAYS,
  buildCalendarCells,
  shiftMonth,
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
  onSelectDate: (date: string, record: DailyAttendanceRecord | undefined) => void;
  onMonthChange: (monthKey: string) => void;
}) {
  const cells = buildCalendarCells(monthKey);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-xl border border-border/80 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-brand-50/80 via-white to-sky-50/50">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
          className="w-8 h-8 rounded-lg border border-border/60 flex items-center justify-center hover:bg-brand-100 text-brand-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-bold text-brand-900">{monthTitle}</p>
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
          className="w-8 h-8 rounded-lg border border-border/60 flex items-center justify-center hover:bg-brand-100 text-brand-700 transition-colors"
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
            return <div key={`empty-${i}`} className="aspect-square min-h-[40px]" />;
          }
          const record = recordsByDate.get(cell.date);
          const status = record?.attendanceStatus;
          const theme = status ? STATUS_THEME[status] : null;
          const isSelected = selectedDate === cell.date;
          const isToday = cell.date === today;

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onSelectDate(cell.date!, record)}
              className={cn(
                "aspect-square min-h-[40px] rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center",
                theme ? theme.cell : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
                isSelected && "ring-2 ring-offset-2 ring-brand-700 scale-[1.02]",
                !isSelected && isToday && "ring-1 ring-brand-400",
              )}
            >
              {String(cell.day).padStart(2, "0")}
            </button>
          );
        })}
      </div>

      <div className="px-4 py-2.5 border-t bg-muted/20 flex flex-wrap gap-3">
        {(Object.keys(STATUS_THEME) as Array<keyof typeof STATUS_THEME>).map((key) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className={cn("w-2.5 h-2.5 rounded-full", STATUS_THEME[key].dot)} />
            {STATUS_THEME[key].label}
          </span>
        ))}
      </div>
    </div>
  );
}
