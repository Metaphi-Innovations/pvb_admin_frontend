"use client";

import React from "react";

interface BadgeStyle {
  bg: string;
  tx: string;
  bd: string;
  dot: string;
}

const STATUS_STYLES: Record<string, BadgeStyle> = {
  draft: { bg: "#FFFBEB", tx: "#B45309", bd: "#F59E0B", dot: "#F59E0B" },
  "pending approval": { bg: "#FFFBEB", tx: "#B45309", bd: "#F59E0B", dot: "#F59E0B" },
  confirmed: { bg: "#ECFDF5", tx: "#16A34A", bd: "#86EFAC", dot: "#16A34A" },
  approved: { bg: "#ECFDF5", tx: "#16A34A", bd: "#86EFAC", dot: "#16A34A" },
  dispatched: { bg: "#FFF7ED", tx: "#E57A1F", bd: "#E57A1F", dot: "#E57A1F" },
  delivered: { bg: "#ECFDF5", tx: "#16A34A", bd: "#86EFAC", dot: "#16A34A" },
  cancelled: { bg: "#FEF2F2", tx: "#DC2626", bd: "#FCA5A5", dot: "#DC2626" },
  rejected: { bg: "#FEF2F2", tx: "#DC2626", bd: "#FCA5A5", dot: "#DC2626" },
  active: { bg: "#ECFDF5", tx: "#16A34A", bd: "#86EFAC", dot: "#16A34A" },
  inactive: { bg: "#F3F4F6", tx: "#64748B", bd: "#E5E7EB", dot: "#9CA3AF" },
  blocked: { bg: "#FEF2F2", tx: "#DC2626", bd: "#FCA5A5", dot: "#DC2626" },
};

const FALLBACK: BadgeStyle = { bg: "#F3F4F6", tx: "#64748B", bd: "#E5E7EB", dot: "#9CA3AF" };

function normalize(status: string): string {
  return status.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Shared status pill — use everywhere a status value is shown in a table or detail row. */
export function StatusBadge({ status }: { status: string }) {
  const key = normalize(status);
  const style = STATUS_STYLES[key] ?? FALLBACK;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border font-bold"
      style={{
        backgroundColor: style.bg,
        color: style.tx,
        borderColor: style.bd,
        fontSize: "11px",
        padding: "2px 9px",
      }}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{ width: "5px", height: "5px", backgroundColor: style.dot }}
      />
      {toTitleCase(key)}
    </span>
  );
}
