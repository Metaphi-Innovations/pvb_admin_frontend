"use client";

import { AccountsPageShell, type AccountsPageShellProps } from "@/components/accounts/AccountsPageShell";

type PurchaseInvoicePageShellProps = Omit<AccountsPageShellProps, "layout" | "className">;

/** Full-width form/view shell with a single vertical scroll pane. */
export function PurchaseInvoicePageShell({ children, ...props }: PurchaseInvoicePageShellProps) {
  return (
    <AccountsPageShell
      {...props}
      layout="form"
      className="min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain gap-1 w-full max-w-none [&>nav]:mb-1 [&_h1]:leading-tight [&_.accounts-page-subtitle]:mt-1"
    >
      {children}
    </AccountsPageShell>
  );
}

/** @deprecated Use PurchaseInvoicePageShell */
export const DirectPurchaseFormShell = PurchaseInvoicePageShell;
