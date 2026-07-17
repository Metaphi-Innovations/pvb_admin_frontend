"use client";

import { QueryProvider } from "@/lib/query/query-provider";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AppToaster } from "@/lib/toast";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        {children}
        <AppToaster />
      </AuthProvider>
    </QueryProvider>
  );
}
