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

export const COA_SYSTEM_MANAGED_TOOLTIP =
  "System ledger — locked (cannot edit, delete, rename, move, or deactivate)";

/** True only for permanently locked statutory Level-4 ledgers. */
export function isSystemManagedStatutoryNode(node: ChartOfAccount): boolean {
  return isLockedSystemLedger(node);
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
