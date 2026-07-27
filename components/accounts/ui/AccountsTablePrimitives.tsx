"use client";

/**
 * Re-export Accounts table primitives under the ui/ surface.
 */

export {
  AccountsTable,
  AccountsTableScroll,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableHeadCell,
  AccountsTableBody,
  AccountsTableRow,
  AccountsTableCell,
  AccountsTableFoot,
  ACCOUNTS_TABLE_HEADER_HEIGHT,
  ACCOUNTS_TABLE_ROW_HEIGHT,
} from "@/components/accounts/AccountsTable";

export type { AccountsTableAlign } from "@/components/accounts/AccountsTable";

import React from "react";
import { AccountsTableCell, AccountsTableHeadCell } from "@/components/accounts/AccountsTable";

/** Amount column cell — right-aligned tabular money. */
export function AccountsAmountCell({
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof AccountsTableCell>, "align" | "money">) {
  return (
    <AccountsTableCell align="right" money className={className} {...props}>
      {children}
    </AccountsTableCell>
  );
}

/** Alias for head cell — preferred Accounts UI name. */
export const AccountsTableHeader = AccountsTableHeadCell;
