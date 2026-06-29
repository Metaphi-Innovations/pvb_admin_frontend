"use client";

import React from "react";
import { cn } from "@/lib/utils";

/** Stacked label + value — avoids wide justify-between gaps in profile cards */
export function DistributorDetailField({
  label,
  value,
  mono,
  highlight,
  className,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
  highlight?: boolean;
  className?: string;
}) {
  const display =
    value === undefined || value === null || value === "" ? "—" : value;

  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-medium leading-tight text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-xs font-medium leading-snug break-words text-foreground",
          mono && "font-mono text-brand-700",
          highlight && "font-semibold text-brand-700",
        )}
      >
        {display}
      </p>
    </div>
  );
}

export function DistributorFieldGrid({
  children,
  cols = 2,
  className,
}: {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const colCls = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  }[cols];

  return (
    <div className={cn("grid gap-x-4 gap-y-2.5", colCls, className)}>{children}</div>
  );
}
