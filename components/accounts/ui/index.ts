"use client";

/**
 * Accounts UI public surface — stable imports for Accounts screens.
 * Prefer these over ad-hoc local chrome. Implementations reuse existing
 * Accounts shells; this folder standardizes spacing/density APIs.
 */

export {
  AccountsPageHeader,
  AccountsPageBreadcrumbs,
} from "./AccountsPageHeader";

export { AccountsListingChrome } from "./AccountsListingChrome";

export {
  AccountsSectionCard,
  AccountsSectionHeader,
} from "./AccountsSectionCard";

export {
  AccountsFormGrid,
  AccountsField,
  AccountsReadOnlyField,
} from "./AccountsFormFields";

export {
  AccountsTable,
  AccountsTableScroll,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableHeader,
  AccountsTableBody,
  AccountsTableRow,
  AccountsTableCell,
  AccountsAmountCell,
  ACCOUNTS_TABLE_HEADER_HEIGHT,
  ACCOUNTS_TABLE_ROW_HEIGHT,
} from "./AccountsTablePrimitives";

export { AccountsFilterBar } from "@/components/accounts/AccountsFilterBar";

export { AccountsSummaryBlock } from "./AccountsSummaryBlock";

export {
  AccountsNarrationSection,
  AccountsAttachmentSection,
} from "./AccountsNarrationAttachment";

export { AccountsStickyActionBar } from "./AccountsStickyActionBar";

export { AccountsEmptyState } from "./AccountsEmptyState";

export { AccountsStatusBadge } from "./AccountsStatusBadge";

export { AccountsPagination } from "./AccountsPagination";

export { AccountsFormLayout } from "@/app/(app)/accounts/expenses/components/AccountsFormLayout";

export {
  ACCOUNTS_UI_INPUT_CLASS,
  ACCOUNTS_UI_MONEY_INPUT_CLASS,
  ACCOUNTS_UI_AMOUNT_WIDTH,
  ACCOUNTS_UI_GST_PCT_WIDTH,
  ACCOUNTS_UI_DATE_WIDTH,
  ACCOUNTS_UI_VOUCHER_NO_WIDTH,
  ACCOUNTS_UI_LABEL_CLASS,
  ACCOUNTS_UI_HELPER_CLASS,
  ACCOUNTS_UI_PAGE_TITLE_CLASS,
  ACCOUNTS_UI_PAGE_SUBTITLE_CLASS,
  ACCOUNTS_UI_SECTION_TITLE_CLASS,
  ACCOUNTS_UI_BUTTON_CLASS,
  ACCOUNTS_UI_PRIMARY_BUTTON_CLASS,
  ACCOUNTS_UI_FORM_GRID_CLASS,
  ACCOUNTS_UI_FORM_GRID_2_CLASS,
  ACCOUNTS_UI_FORM_STACK_CLASS,
  ACCOUNTS_UI_READONLY_VALUE_CLASS,
  ACCOUNTS_UI_NARRATION_CLASS,
  ACCOUNTS_UI_GRAND_TOTAL_CLASS,
} from "@/lib/accounts/accounts-ui-tokens";
