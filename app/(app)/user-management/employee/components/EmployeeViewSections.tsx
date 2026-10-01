"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function formatProfileDate(date?: string): string {
  if (!date?.trim()) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  const day = parsed.getDate();
  const month = parsed.toLocaleString("en", { month: "short" });
  const year = parsed.getFullYear();
  return `${day}-${month}-${year}`;
}

export function displayValue(value?: React.ReactNode): React.ReactNode {
  if (value === undefined || value === null || value === "") return "—";
  return value;
}

export function CompactField({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-3 py-[3px]", className)}>
      <span className="w-[104px] flex-shrink-0 text-[12px] leading-snug text-[#6B80A0]">
        {label}
      </span>
      <span
        className={cn(
          "text-[13px] leading-snug font-medium text-[#1E2A3B] min-w-0",
          mono && "font-mono text-[12.5px]",
        )}
      >
        {displayValue(value)}
      </span>
    </div>
  );
}

export function CompactInfoCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "h-full rounded-lg border border-border/60 bg-white shadow-[0_1px_3px_rgba(7,43,97,.04)] overflow-hidden",
        className,
      )}
    >
      <header className="flex items-center gap-2 border-b border-border/50 bg-[#F8FAFC] px-3.5 py-2">
        {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0 text-[#6B80A0]" />}
        <h3 className="text-[11px] font-bold uppercase tracking-[0.35px] text-[#3D5473]">
          {title}
        </h3>
      </header>
      <div className="px-3.5 py-2">{children}</div>
    </section>
  );
}

export function ProfileCardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 md:grid-cols-2", className)}>
      {children}
    </div>
  );
}
