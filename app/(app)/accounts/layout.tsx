"use client";

import { AccountsModuleShell } from "@/components/accounts/AccountsModuleShell";
import { CoaNavigationProvider } from "@/components/accounts/CoaNavigationContext";

export default function AccountsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden">
      <CoaNavigationProvider>
        <AccountsModuleShell>{children}</AccountsModuleShell>
      </CoaNavigationProvider>
    </div>
  );
}
