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
  if (!name && !date) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center min-w-0">
      <p className="text-[11px] leading-none text-muted-foreground truncate">
        By <span className="font-medium text-foreground">{name || "—"}</span> on{" "}
        <span className="font-mono text-[10px]">{date || "—"}</span>
      </p>
    </div>
  );
}
