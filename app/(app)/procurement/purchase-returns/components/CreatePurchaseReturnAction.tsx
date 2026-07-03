"use client";

import React from "react";
import { RotateCcw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PurchaseOrder } from "../../purchase-orders/po-data";
import {
  getPurchaseReturnEligibility,
  PURCHASE_RETURN_DISABLED_MSG,
} from "../purchase-return-utils";

interface CreatePurchaseReturnActionProps {
  po: PurchaseOrder;
  onCreate: () => void;
  variant?: "menu" | "button";
  className?: string;
}

export function CreatePurchaseReturnAction({
  po,
  onCreate,
  variant = "menu",
  className,
}: CreatePurchaseReturnActionProps) {
  const { eligible } = getPurchaseReturnEligibility(po);

  const content =
    variant === "menu" ? (
      <button
        type="button"
        disabled={!eligible}
        onClick={() => eligible && onCreate()}
        className={
          className ??
          "flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        }
      >
        <RotateCcw className="w-3.5 h-3.5" /> Create Purchase Return
      </button>
    ) : (
      <button
        type="button"
        disabled={!eligible}
        onClick={() => eligible && onCreate()}
        className={
          className ??
          "inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border border-border hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
        }
      >
        <RotateCcw className="w-3.5 h-3.5" /> Create Purchase Return
      </button>
    );

  if (eligible) return content;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={variant === "menu" ? "block w-full" : "inline-flex"}>{content}</span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[220px]">
          {PURCHASE_RETURN_DISABLED_MSG}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
