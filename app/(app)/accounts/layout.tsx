"use client";

import "./accounts-ui-dense.css";
import { AccountsAccordionProvider } from "@/components/accounts/AccountsAccordionContext";
import { CoaNavigationProviderLazy } from "@/components/accounts/CoaNavigationProviderLazy";
import { AccountsSidebarProvider } from "@/components/accounts/AccountsSidebarContext";
import { AccountsModuleShell } from "@/components/accounts/AccountsModuleShell";
import { ACCOUNTS_VIEWPORT_HEIGHT } from "@/lib/accounts/accounts-layout-constants";

/**
 * Client layout — avoids a server→client default/named wrapper that was resolving
 * to an async client reference and throwing "Element type is invalid … undefined".
 */
export default function AccountsLayout({ children }: { children: React.ReactNode }) {
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
