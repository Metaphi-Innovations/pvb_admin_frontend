"use client";

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
  // #region agent log
  fetch("http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8fbc9e" },
    body: JSON.stringify({
      sessionId: "8fbc9e",
      runId: "post-fix",
      hypothesisId: "H-I",
      location: "accounts/layout.tsx",
      message: "AccountsLayout client layout render",
      data: {
        Accordion: typeof AccountsAccordionProvider,
        CoaLazy: typeof CoaNavigationProviderLazy,
        Sidebar: typeof AccountsSidebarProvider,
        ModuleShell: typeof AccountsModuleShell,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

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
