"use client";

import React from "react";
import { RotateCcw } from "lucide-react";
import type { PurchaseOrder } from "../../purchase-orders/po-data";

interface CreatePurchaseReturnActionProps {
  po: PurchaseOrder;
  onCreate: () => void;
  variant?: "menu" | "button";
  className?: string;
}

export function CreatePurchaseReturnAction({
  po: _po,
  onCreate,
  variant = "menu",
  className,
}: CreatePurchaseReturnActionProps) {
  const content =
    variant === "menu" ? (
      <button
        type="button"
        onClick={onCreate}
        className={
          className ??
          "flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
        }
      >
        <RotateCcw className="w-3.5 h-3.5" /> Create Purchase Return
      </button>
    ) : (
      <button
        type="button"
        onClick={onCreate}
        className={
          className ??
          "inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border border-border hover:bg-muted/50"
        }
      >
        <RotateCcw className="w-3.5 h-3.5" /> Create Purchase Return
      </button>
    );
  return content;
}
