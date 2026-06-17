"use client";

import { cn } from "@/lib/utils";
import { getInitials } from "@/components/record-detail/RecordEntityAvatar";

/** Display name for audit users — maps legacy short names to full labels */
export function formatAuditUserName(name?: string): string {
  if (!name?.trim()) return "—";
  if (name === "Admin") return "Admin User";
  return name;
}

export function ListingUserCell({
  name,
  date,
}: {
  name?: string;
  date?: string;
}) {
  const displayName = formatAuditUserName(name);

  if (!name?.trim()) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
          "bg-brand-50 border border-brand-100 text-[10px] font-semibold text-brand-700",
        )}
      >
        {getInitials(displayName)}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-foreground leading-tight truncate">
          {displayName}
        </p>
        {date && (
          <p className="text-[10px] font-mono text-muted-foreground leading-tight mt-0.5">
            {date}
          </p>
        )}
      </div>
    </div>
  );
}

export function AuditUserRow({ label, name }: { label: string; name?: string }) {
  const displayName = formatAuditUserName(name);
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
            "bg-brand-50 border border-brand-100 text-[10px] font-semibold text-brand-700",
          )}
        >
          {getInitials(displayName)}
        </div>
        <span className="text-sm font-medium text-foreground">{displayName}</span>
      </div>
    </div>
  );
}
