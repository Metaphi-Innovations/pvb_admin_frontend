"use client";

import Link from "next/link";
import { ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  billWiseOutstandingHref,
  canShowBillWiseOutstanding,
} from "@/lib/accounts/bill-wise-outstanding";

/**
 * Additive COA / GL action — opens Bill-wise Outstanding for party ledgers only.
 * Renders nothing for non-customer / non-supplier ledgers.
 */
export function BillWiseOutstandingButton({
  ledger,
  records,
  from,
  className,
}: {
  ledger: ChartOfAccount | null | undefined;
  records?: ChartOfAccount[];
  from?: "coa" | "gl";
  className?: string;
}) {
  if (!ledger || !canShowBillWiseOutstanding(ledger, records)) return null;

  return (
    <Button
      asChild
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-8 text-xs gap-1.5", className)}
    >
      <Link href={billWiseOutstandingHref(ledger.id, from)}>
        <ListOrdered className="w-3.5 h-3.5" />
        Bill-wise Outstanding
      </Link>
    </Button>
  );
}
