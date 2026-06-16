"use client";

import React from "react";

interface BadgeStyle {
  bg: string;
  tx: string;
  bd: string;
  dot: string;
}

const STATUS_STYLES: Record<string, BadgeStyle> = {
  draft: { bg: "#F1F5F9", tx: "#475569", bd: "#CBD5E1", dot: "#94A3B8" },
  "pending approval": { bg: "#FFFBEB", tx: "#92400E", bd: "#FDE68A", dot: "#D97706" },
  confirmed: { bg: "#EFF6FF", tx: "#1D4ED8", bd: "#93C5FD", dot: "#3B82F6" },
  approved: { bg: "#E6F7EF", tx: "#065F46", bd: "#C2EDD9", dot: "#1E9E61" },
  dispatched: { bg: "#F5F3FF", tx: "#5B21B6", bd: "#C4B5FD", dot: "#7C3AED" },
  delivered: { bg: "#ECFDF5", tx: "#166534", bd: "#86EFAC", dot: "#10B981" },
  cancelled: { bg: "#FEF2F2", tx: "#991B1B", bd: "#FCA5A5", dot: "#EF4444" },
  rejected: { bg: "#FEF2F2", tx: "#991B1B", bd: "#FCA5A5", dot: "#EF4444" },
  active: { bg: "#ECFDF5", tx: "#166534", bd: "#86EFAC", dot: "#10B981" },
  inactive: { bg: "#F1F5F9", tx: "#475569", bd: "#CBD5E1", dot: "#94A3B8" },
  blocked: { bg: "#FEF2F2", tx: "#991B1B", bd: "#FCA5A5", dot: "#EF4444" },
};

const FALLBACK: BadgeStyle = { bg: "#F1F5F9", tx: "#475569", bd: "#CBD5E1", dot: "#94A3B8" };

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
