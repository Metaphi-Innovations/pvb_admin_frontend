"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SalesStyleKpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-2">
      <div
        className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
          accent ? "bg-brand-600" : "bg-muted",
        )}
      >
        <Icon className={cn("h-4 w-4", accent ? "text-white" : "text-muted-foreground")} />
      </div>
      <div className="min-w-0">
        <p className="text-base font-bold leading-none text-foreground tabular-nums">{value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function SalesStyleKpiGrid({
  children,
  cols = 4,
}: {
  children: React.ReactNode;
  cols?: 4 | 5 | 6;
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        cols === 6
          ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"
          : cols === 5
            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            : "grid-cols-2 sm:grid-cols-4",
      )}
    >
      {children}
    </div>
  );
}
