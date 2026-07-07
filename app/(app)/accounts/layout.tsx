"use client";

import { AccountsModuleShell } from "@/components/accounts/AccountsModuleShell";
import { CoaNavigationProvider } from "@/components/accounts/CoaNavigationContext";
import { ACCOUNTS_VIEWPORT_HEIGHT } from "@/lib/accounts/accounts-layout-constants";

export default function AccountsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex w-full overflow-hidden"
      style={{ height: ACCOUNTS_VIEWPORT_HEIGHT, maxHeight: ACCOUNTS_VIEWPORT_HEIGHT }}
    >
      <CoaNavigationProvider>
        <AccountsModuleShell>{children}</AccountsModuleShell>
      </CoaNavigationProvider>
    </div>
  );
}
