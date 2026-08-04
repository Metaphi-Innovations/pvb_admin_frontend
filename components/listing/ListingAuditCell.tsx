"use client";

import { ListingTruncateCell } from "./ListingTruncateCell";

type AuditVariant = "created" | "updated";

export function ListingAuditCell({
  name,
  date,
  variant: _variant = "created",
}: {
  name?: string;
  date?: string;
  variant?: AuditVariant;
}) {
  if (!name && !date) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const label = `By ${name || "—"} on ${date || "—"}`;

  return (
    <ListingTruncateCell text={label} className="text-[11px] leading-none text-muted-foreground">
      By <span className="font-medium text-foreground">{name || "—"}</span> on{" "}
      <span className="font-mono text-[10px]">{date || "—"}</span>
    </ListingTruncateCell>
  );
}
