"use client";

/**
 * Modern PVB HR calendar popover — used by HrDateInput across Employee Management.
 * No new date libraries; Popover + Lucide only.
 */

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function parseIso(iso: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(y: number, m: number) {
  return new Date(y, m, 1);
}

/** Monday-first weekday index 0..6 */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function HrCalendarPopover({
  value,
  onSelect,
  min,
  max,
}: {
  value: string;
  onSelect: (iso: string) => void;
  min?: string;
  max?: string;
}) {
  const selected = parseIso(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const initial = selected ?? today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const minD = parseIso(min ?? "");
  const maxD = parseIso(max ?? "");

  const years = useMemo(() => {
    const cur = today.getFullYear();
    const list: number[] = [];
    for (let y = cur + 10; y >= cur - 80; y -= 1) list.push(y);
    return list;
  }, [today]);

  const cells = useMemo(() => {
    const first = startOfMonth(viewYear, viewMonth);
    const startPad = mondayIndex(first);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevDays = new Date(viewYear, viewMonth, 0).getDate();
    const items: Array<{ date: Date; inMonth: boolean }> = [];

    for (let i = startPad - 1; i >= 0; i -= 1) {
      items.push({
        date: new Date(viewYear, viewMonth - 1, prevDays - i),
        inMonth: false,
      });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      items.push({ date: new Date(viewYear, viewMonth, d), inMonth: true });
    }
    while (items.length % 7 !== 0 || items.length < 42) {
      const n = items.length - (startPad + daysInMonth) + 1;
      items.push({
        date: new Date(viewYear, viewMonth + 1, n),
        inMonth: false,
      });
      if (items.length >= 42) break;
    }
    return items.slice(0, 42);
  }, [viewYear, viewMonth]);

  const isDisabled = (d: Date) => {
    const t = d.getTime();
    if (minD && t < minD.getTime()) return true;
    if (maxD && t > maxD.getTime()) return true;
    return false;
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <div className="w-[280px] p-1">
      <div className="flex items-center gap-1.5 mb-2">
        <button
          type="button"
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border hover:bg-muted/60"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <Select
          value={String(viewMonth)}
          onValueChange={(v) => setViewMonth(Number(v))}
        >
          <SelectTrigger className="h-8 flex-1 text-xs font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i)} className="text-xs">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(viewYear)}
          onValueChange={(v) => setViewYear(Number(v))}
        >
          <SelectTrigger className="h-8 w-[88px] text-xs font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            {years.map((y) => (
              <SelectItem key={y} value={String(y)} className="text-xs">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border hover:bg-muted/60"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="h-7 text-[10px] font-semibold text-muted-foreground flex items-center justify-center"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map(({ date, inMonth }) => {
          const disabled = isDisabled(date);
          const selectedDay = selected ? isSameDay(date, selected) : false;
          const isToday = isSameDay(date, today);
          return (
            <button
              key={toIso(date) + (inMonth ? "" : "-o")}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(toIso(date))}
              className={cn(
                "h-8 text-xs rounded-lg transition-colors tabular-nums",
                !inMonth && "text-muted-foreground/40",
                inMonth && !selectedDay && "text-foreground hover:bg-brand-50",
                selectedDay && "bg-brand-600 text-white hover:bg-brand-700 font-semibold",
                isToday && !selectedDay && "ring-1 ring-brand-300 font-medium",
                disabled && "opacity-30 cursor-not-allowed hover:bg-transparent",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
        <button
          type="button"
          className="text-[11px] font-medium text-brand-700 hover:underline"
          onClick={() => {
            setViewYear(today.getFullYear());
            setViewMonth(today.getMonth());
            if (!isDisabled(today)) onSelect(toIso(today));
          }}
        >
          Today
        </button>
        <button
          type="button"
          className="text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => onSelect("")}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
