"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  AS_ON_OPTIONS,
  COMPONENT_PERIOD_OPTIONS,
  resolveAsOnDate,
  resolvePeriodRange,
  type AsOnPreset,
  type PeriodPreset,
} from "@/components/dashboard/dashboard-period";

const control = cn(
  "h-7 px-2 text-[11px] rounded-lg border border-border bg-background",
  "focus:outline-none focus:ring-1 focus:ring-brand-300",
);

export function useComponentPeriod(defaultPreset: PeriodPreset = "this_month") {
  const [preset, setPreset] = useState<PeriodPreset>(defaultPreset);
  const [fromDate, setFromDate] = useState(() => resolvePeriodRange(defaultPreset).fromDate);
  const [toDate, setToDate] = useState(() => resolvePeriodRange(defaultPreset).toDate);

  const applyPreset = (next: PeriodPreset) => {
    setPreset(next);
    if (next !== "custom") {
      const r = resolvePeriodRange(next);
      setFromDate(r.fromDate);
      setToDate(r.toDate);
    }
  };

  const applyCustom = () => {
    const r = resolvePeriodRange("custom", fromDate, toDate);
    setFromDate(r.fromDate);
    setToDate(r.toDate);
    setPreset("custom");
  };

  return { preset, fromDate, toDate, setFromDate, setToDate, applyPreset, applyCustom };
}

export function ComponentPeriodSelect({
  preset,
  fromDate,
  toDate,
  onPreset,
  onFrom,
  onTo,
  onApplyCustom,
}: {
  preset: PeriodPreset;
  fromDate: string;
  toDate: string;
  onPreset: (p: PeriodPreset) => void;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onApplyCustom: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={preset}
        onChange={(e) => onPreset(e.target.value as PeriodPreset)}
        className={control}
        aria-label="Period"
      >
        {COMPONENT_PERIOD_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {preset === "custom" && (
        <>
          <input type="date" value={fromDate} onChange={(e) => onFrom(e.target.value)} className={control} />
          <input type="date" value={toDate} onChange={(e) => onTo(e.target.value)} className={control} />
          <button
            type="button"
            onClick={onApplyCustom}
            className="h-7 px-2 text-[11px] font-medium rounded-lg bg-brand-600 text-white"
          >
            Apply
          </button>
        </>
      )}
    </div>
  );
}

export function useAsOnPeriod(defaultPreset: AsOnPreset = "as_on_today") {
  const [preset, setPreset] = useState<AsOnPreset>(defaultPreset);
  const [asOnDate, setAsOnDate] = useState(() => resolveAsOnDate(defaultPreset));

  const applyPreset = (next: AsOnPreset) => {
    setPreset(next);
    if (next !== "custom_as_on") setAsOnDate(resolveAsOnDate(next));
  };

  return { preset, asOnDate, setAsOnDate, applyPreset };
}

export function AsOnPeriodSelect({
  preset,
  asOnDate,
  onPreset,
  onDate,
}: {
  preset: AsOnPreset;
  asOnDate: string;
  onPreset: (p: AsOnPreset) => void;
  onDate: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={preset}
        onChange={(e) => onPreset(e.target.value as AsOnPreset)}
        className={control}
        aria-label="As on date"
      >
        {AS_ON_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {preset === "custom_as_on" && (
        <input type="date" value={asOnDate} onChange={(e) => onDate(e.target.value)} className={control} />
      )}
    </div>
  );
}

export function ModuleSummaryStrip({
  items,
  activeKey,
  onSelect,
}: {
  items: { id: string; label: string; value: string | number; accent?: string; filterKey?: string }[];
  activeKey?: string | null;
  onSelect?: (filterKey: string) => void;
}) {
  const accentBorder: Record<string, string> = {
    brand: "border-l-brand-600",
    navy: "border-l-navy-700",
    amber: "border-l-amber-500",
    leaf: "border-l-leaf-600",
    sky: "border-l-sky-500",
    rose: "border-l-rose-500",
    violet: "border-l-violet-600",
    teal: "border-l-teal-600",
  };

  return (
    <div
      className={cn(
        "grid gap-2",
        items.length <= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4 xl:grid-cols-5",
      )}
    >
      {items.map((k) => {
        const key = k.filterKey ?? k.id;
        const active = activeKey === key;
        return (
          <button
            key={k.id}
            type="button"
            onClick={() => onSelect?.(key)}
            className={cn(
              "h-[60px] rounded-xl border border-border bg-white shadow-sm border-l-[3px] px-2.5 py-2 text-left transition-colors",
              accentBorder[k.accent ?? "brand"] ?? "border-l-brand-600",
              active ? "ring-2 ring-brand-300 bg-brand-50/40" : "hover:bg-muted/30",
            )}
          >
            <p className="text-[11px] font-medium text-muted-foreground truncate">{k.label}</p>
            <p className="text-lg font-bold text-foreground tabular-nums leading-none mt-1">{k.value}</p>
          </button>
        );
      })}
    </div>
  );
}
