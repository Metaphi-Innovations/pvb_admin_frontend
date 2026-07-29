"use client";

import { Lock } from "lucide-react";
import type { ChartOfAccount } from "../../../data";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isLockedSystemLedger } from "../coa-statutory-ledgers";
import { isStatutoryTaxPayableParent } from "@/lib/accounts/coa-statutory-tax-display";

export const COA_SYSTEM_MANAGED_TOOLTIP =
  "System ledger — locked (cannot edit, delete, rename, move, or deactivate)";

/** True for permanently locked statutory ledgers (Stock in Hand, Product Sales, GST, TDS/TCS Payable + section projections). */
export function isSystemManagedStatutoryNode(node: ChartOfAccount): boolean {
  if (isLockedSystemLedger(node)) return true;
  // Payable parents stay locked even when shown as expandable grouping ledgers
  if (isStatutoryTaxPayableParent(node)) return true;
  return false;
}

export function CoaSystemManagedLock({
  className,
}: {
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex align-middle"
            aria-label={COA_SYSTEM_MANAGED_TOOLTIP}
          >
            <Lock
              className={cn("w-3 h-3 text-muted-foreground/70", className)}
              aria-hidden
            />
          </span>
        </TooltipTrigger>
        <TooltipContent>{COA_SYSTEM_MANAGED_TOOLTIP}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
