"use client";

import React from "react";

export function formatListingDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const parts = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).split(" ");
  return parts.length >= 3 ? `${parts[0]}-${parts[1]}-${parts[2]}` : iso;
}

export function StackedCell({
  primary,
  secondary,
  className = "",
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`py-2 ${className}`}>
      <div className="text-xs text-foreground leading-tight">{primary}</div>
      {secondary != null && secondary !== "" && (
        <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{secondary}</div>
      )}
    </div>
  );
}
