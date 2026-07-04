"use client";

import { cn } from "@/lib/utils";
import { balanceSideLabel, type BalanceSide } from "@/lib/accounts/money-format";
import { resolveDrCrColumnSide } from "@/lib/accounts/running-balance";

export function DrCrSideBadge({
  debit,
  credit,
  runningBalanceType,
  isBalanceRow = false,
  className,
}: {
  debit: number;
  credit: number;
  runningBalanceType: BalanceSide;
  isBalanceRow?: boolean;
  className?: string;
}) {
  const side = resolveDrCrColumnSide({
    debit,
    credit,
    runningBalanceType,
    isBalanceRow,
  });
  const label = balanceSideLabel(side);

  return (
    <span
      className={cn(
        "text-xs font-semibold px-1.5 py-0.5 rounded",
        side === "Debit" ? "bg-emerald-50 text-emerald-700" : "bg-navy-50 text-navy-700",
        className,
      )}
    >
      {label}
    </span>
  );
}
