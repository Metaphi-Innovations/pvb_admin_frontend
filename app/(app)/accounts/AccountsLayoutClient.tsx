"use client";

import { AccountsAccordionProvider } from "@/components/accounts/AccountsAccordionContext";
import { CoaNavigationProviderLazy } from "@/components/accounts/CoaNavigationProviderLazy";
import { AccountsSidebarProvider } from "@/components/accounts/AccountsSidebarContext";
import { AccountsModuleShell } from "@/components/accounts/AccountsModuleShell";
import { ACCOUNTS_VIEWPORT_HEIGHT } from "@/lib/accounts/accounts-layout-constants";

export default function AccountsLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex w-full overflow-hidden"
      style={{ height: ACCOUNTS_VIEWPORT_HEIGHT, maxHeight: ACCOUNTS_VIEWPORT_HEIGHT }}
    >
      <AccountsAccordionProvider>
        <CoaNavigationProviderLazy>
          <AccountsSidebarProvider>
            <AccountsModuleShell>{children}</AccountsModuleShell>
          </AccountsSidebarProvider>
        </CoaNavigationProviderLazy>
      </AccountsAccordionProvider>
    </div>
  );
}
