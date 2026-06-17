"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT_COLORS = {
  blue: "#E57A1F",
  green: "#1E9E61",
  orange: "#E57A1F",
  purple: "#7C5CBF",
  slate: "#6B80A0",
} as const;

export type SectionAccent = keyof typeof ACCENT_COLORS;

export function RecordSectionCard({
  title,
  icon: Icon,
  accent = "blue",
  children,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  accent?: SectionAccent;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("border border-border/60 bg-white overflow-hidden", className)}
      style={{ borderRadius: "13px", boxShadow: "0 1px 4px rgba(7,43,97,.05)" }}
    >
      <div className="flex items-center gap-2 border-b border-border/50 bg-[#F7F9FC] px-[18px] py-[11px]">
        <span
          className="w-[3px] self-stretch rounded-full flex-shrink-0"
          style={{ backgroundColor: ACCENT_COLORS[accent] }}
        />
        {Icon && <Icon className="w-[13px] h-[13px] text-[#64748B] flex-shrink-0" />}
        <h3 className="text-[11.5px] font-bold uppercase tracking-[0.4px] text-[#0F172A]">
          {title}
        </h3>
      </div>
      <div className="px-[18px] pt-1 pb-2.5">{children}</div>
    </div>
  );
}
