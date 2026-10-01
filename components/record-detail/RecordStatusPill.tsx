"use client";

import { cn } from "@/lib/utils";

export function RecordStatusPill({
  label,
  variant = "active",
}: {
  label: string;
  variant?: "active" | "inactive" | "draft" | "blocked" | "neutral";
}) {
  const styles = {
    active: "bg-[#ECFDF5] text-[#16A34A] border-[#86EFAC]",
    inactive: "bg-[#F3F4F6] text-[#64748B] border-[#E5E7EB]",
    draft: "bg-[#FFFBEB] text-[#B45309] border-[#F59E0B]",
    blocked: "bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]",
    neutral: "bg-[#F3F4F6] text-[#64748B] border-[#E5E7EB]",
  }[variant];

  const dot = {
    active: "bg-[#16A34A]",
    inactive: "bg-[#9CA3AF]",
    draft: "bg-[#F59E0B]",
    blocked: "bg-[#DC2626]",
    neutral: "bg-[#9CA3AF]",
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        styles,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}
