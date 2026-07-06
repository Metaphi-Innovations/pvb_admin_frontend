"use client";

import { AccountsAccordionProvider } from "@/components/accounts/AccountsAccordionContext";
import { AccountsModuleShell } from "@/components/accounts/AccountsModuleShell";
import { CoaNavigationProvider } from "@/components/accounts/CoaNavigationContext";
import { ACCOUNTS_VIEWPORT_HEIGHT } from "@/lib/accounts/accounts-layout-constants";

export default function AccountsLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex w-full overflow-hidden"
      style={{ height: ACCOUNTS_VIEWPORT_HEIGHT, maxHeight: ACCOUNTS_VIEWPORT_HEIGHT }}
    >
      <AccountsAccordionProvider>
        <CoaNavigationProvider>
          <AccountsModuleShell>{children}</AccountsModuleShell>
        </CoaNavigationProvider>
      </AccountsAccordionProvider>
    </div>
  );
}
