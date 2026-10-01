"use client";

import { cn } from "@/lib/utils";
import {
  AccountsTableHeadCell,
  type AccountsTableAlign,
} from "@/components/accounts/AccountsTable";

/** Static column header for financial statements — no sort, no column filters. */
export function FinancialReportHeadCell({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: AccountsTableAlign;
  className?: string;
}) {
  return (
    <AccountsTableHeadCell
      align={align}
      sticky
      className={cn(
        "font-bold normal-case tracking-normal bg-brand-50 border-b border-border",
        className,
      )}
    >
      {children}
    </AccountsTableHeadCell>
  );
}

/** Plain th for financial reports when AccountsTableHeadCell is not used. */
export function financialReportThClassName(className?: string): string {
  return cn(
    "accounts-table-th accounts-table-th-sticky font-bold normal-case tracking-normal bg-brand-50 border-b border-border",
    className,
  );
}
