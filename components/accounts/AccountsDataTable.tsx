"use client";

/**
 * Accounts module data table — re-exports unified table primitives.
 * All accounts listing/report tables should use these components + globals.css `.accounts-table*` rules.
 */

export {
  ACCOUNTS_TABLE_HEADER_HEIGHT,
  ACCOUNTS_TABLE_ROW_HEIGHT,
  AccountsTableScroll,
  AccountsTable,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableHeadCell,
  AccountsTableBody,
  AccountsTableRow,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsColumnarTable,
  AccountsRichTable,
  type AccountsTableAlign,
  type AccountsColumnDef,
  type AccountsRichColumnDef,
} from "@/components/accounts/AccountsTable";

export {
  AccountsTableEmpty,
  AccountsListingCountFooter,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
