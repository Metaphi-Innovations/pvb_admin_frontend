"use client";

/**
 * Excel-style column filter — thin alias over AccountsColumnFilterPopover
 * so Accounting reports share one consistent name / API.
 */

export {
  AccountsColumnFilterPopover as ExcelColumnFilter,
} from "@/components/accounts/AccountsColumnFilterPopover";

export { AccountsColumnHeader as ExcelColumnHeader } from "@/components/accounts/AccountsColumnHeader";
