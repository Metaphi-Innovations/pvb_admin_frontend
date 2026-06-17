"use client";

import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type AuditVariant = "created" | "updated";

const VARIANT_CFG = {
  created: {
    icon: Calendar,
    iconWrap: "bg-brand-50 border-brand-100",
    iconColor: "text-brand-600",
  },
  updated: {
    icon: Clock,
    iconWrap: "bg-[#FFFBEB] border-[#F59E0B]",
    iconColor: "text-[#E57A1F]",
  },
} as const;

export function ListingAuditCell({
  name,
  date,
  variant = "created",
}: {
  name?: string;
  date?: string;
  variant?: AuditVariant;
}) {
  const cfg = VARIANT_CFG[variant];
  const Icon = cfg.icon;

  if (!name && !date) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className={cn(
          "w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0",
          cfg.iconWrap,
        )}
      >
        <Icon className={cn("w-3.5 h-3.5", cfg.iconColor)} />
      </div>
      <p className="text-[11px] leading-none text-muted-foreground truncate">
        By <span className="font-medium text-foreground">{name || "—"}</span> on{" "}
        <span className="font-mono text-[10px]">{date || "—"}</span>
      </p>
    </div>
  );
}
