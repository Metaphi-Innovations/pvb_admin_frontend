"use client";

import { cn } from "@/lib/utils";

export function getInitials(name: string, max = 2): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, max)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function RecordEntityAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full",
        "bg-brand-50 border border-brand-100 text-base font-bold text-brand-700",
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}
