"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  MONEY_AMOUNT_CLASS,
  MONEY_CELL_CLASS,
  type BalanceSide,
  formatMoney,
  formatMoneyOrDash,
  formatMoneyWithSide,
} from "@/lib/accounts/money-format";

interface MoneyAmountProps {
  amount: number;
  side?: BalanceSide | null;
  className?: string;
  /** When true, zero renders as — */
  dashIfZero?: boolean;
}

/** Inline monetary amount: ₹ 8,50,000.00 Dr */
export function MoneyAmount({ amount, side, className, dashIfZero }: MoneyAmountProps) {
  if (dashIfZero && !amount) {
    return <span className={cn(MONEY_AMOUNT_CLASS, "text-muted-foreground", className)}>—</span>;
  }
  const text = side ? formatMoneyWithSide(amount, side) : formatMoney(amount);
  return <span className={cn(MONEY_AMOUNT_CLASS, className)}>{text}</span>;
}

interface MoneyCellProps extends MoneyAmountProps {
  as?: "td" | "span";
}

/** Right-aligned table cell for monetary values */
export function MoneyCell({ amount, side, className, dashIfZero, as = "td" }: MoneyCellProps) {
  const content =
    dashIfZero && !amount ? (
      <span className="text-muted-foreground">—</span>
    ) : side ? (
      formatMoneyWithSide(amount, side)
    ) : (
      formatMoneyOrDash(amount)
    );

  if (as === "span") {
    return <span className={cn(MONEY_AMOUNT_CLASS, "block text-right", className)}>{content}</span>;
  }

  return (
    <td className={cn(MONEY_CELL_CLASS, "px-4 py-3.5", className)}>
      {content}
    </td>
  );
}
