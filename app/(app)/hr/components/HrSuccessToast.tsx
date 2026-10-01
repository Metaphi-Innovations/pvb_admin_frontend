"use client";

import React, { useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact success toast — HRMS Active/Inactive and other master feedback. */
export function HrSuccessToast({
  message,
  onDismiss,
  durationMs = 2800,
}: {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [message, onDismiss, durationMs]);

  if (!message) return null;

  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5",
        "px-3.5 py-2.5 rounded-xl shadow-xl text-white text-xs font-medium",
        "bg-emerald-600 animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
      )}
    >
      <Check className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span>{message}</span>
      <button
        type="button"
        className="ml-1 text-white/80 hover:text-white text-[11px]"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
