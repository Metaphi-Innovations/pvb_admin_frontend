"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Leaf } from "lucide-react";

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({
  size = "md",
  className,
}: {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = {
    xs: "w-3 h-3 border",
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-2",
  }[size];

  return (
    <span
      className={cn(
        "inline-block rounded-full border-brand-200 border-t-brand-500 animate-spin",
        sizeClass,
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

// ── Page loader (full screen) ─────────────────────────────────────────────────
export function PageLoader({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg">
            <Leaf className="w-7 h-7 text-white animate-pulse-soft" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white bg-brand-200 border-t-brand-500 animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">{message}</p>
      </div>
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-border/50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className={cn(
              "h-4 rounded skeleton",
              i === 0 ? "w-32" : i === cols - 1 ? "w-16" : "w-full",
            )}
          />
        </td>
      ))}
    </tr>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-card border border-border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded skeleton" />
        <div className="h-8 w-8 rounded-xl skeleton" />
      </div>
      <div className="h-8 w-32 rounded skeleton" />
      <div className="h-3 w-20 rounded skeleton" />
    </div>
  );
}

// ── Skeleton table ────────────────────────────────────────────────────────────
export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-card border border-border overflow-hidden">
      {/* Toolbar skeleton */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <div className="h-9 w-56 rounded-md skeleton" />
        <div className="h-9 w-24 rounded-md skeleton" />
        <div className="ml-auto h-9 w-28 rounded-md skeleton" />
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <div className="h-3 w-20 rounded skeleton" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Inline button loader ──────────────────────────────────────────────────────
export function BtnLoader() {
  return <Spinner size="sm" className="border-white/40 border-t-white" />;
}
