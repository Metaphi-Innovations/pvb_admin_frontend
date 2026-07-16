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

export const COA_SYSTEM_MANAGED_TOOLTIP =
  "System Generated - Managed from ERP Masters";

const STATUTORY_GROUP_TYPES = new Set([
  "gst_input",
  "gst_output",
  "gst_payable",
  "gst_receivable",
  "gst_duties",
  "tds_payable",
  "tds_receivable",
]);

export function isSystemManagedStatutoryNode(node: ChartOfAccount): boolean {
  return Boolean(
    (node.specializedGroupType &&
      STATUTORY_GROUP_TYPES.has(node.specializedGroupType)) ||
      node.erpSourceModule === "gst_master" ||
      node.erpSourceModule === "tds_master" ||
      (node.isSystemGenerated && (node.gstApplicable || node.tdsApplicable)),
  );
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
