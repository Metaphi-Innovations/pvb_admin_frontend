"use client";

import { Suspense } from "react";
import { AccountsModuleShell } from "@/components/accounts/AccountsModuleShell";
import { CoaNavigationProvider } from "@/components/accounts/CoaNavigationContext";

export default function AccountsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 w-full min-h-[calc(100vh-4.5rem)]">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        }
      >
        <CoaNavigationProvider>
          <AccountsModuleShell>{children}</AccountsModuleShell>
        </CoaNavigationProvider>
      </Suspense>
    </div>
  );
}
