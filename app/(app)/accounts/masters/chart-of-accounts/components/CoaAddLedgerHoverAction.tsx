"use client";

import React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoaAddLedgerHoverActionProps {
  onClick: () => void;
  className?: string;
}

/** Compact + control shown on row hover in the COA tree and listing. */
export function CoaAddLedgerHoverAction({ onClick, className }: CoaAddLedgerHoverActionProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex items-center justify-center flex-shrink-0 w-5 h-5 rounded-md",
        "text-brand-600 hover:bg-brand-100 hover:text-brand-700",
        "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
        className,
      )}
      title="Add Ledger"
      aria-label="Add Ledger"
    >
      <Plus className="w-3.5 h-3.5" strokeWidth={2} />
    </button>
  );
}
