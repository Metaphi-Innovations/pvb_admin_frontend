/**
 * app/(app)/layout.tsx
 *
 * AuthGate → session required
 * PermissionsProvider → GET permissions on every route change
 * RouteGuard → module/submodule check before page render
 */

import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/auth/AuthGate";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { PermissionsProvider } from "@/lib/auth/permissions-context";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <PermissionsProvider>
        <AppShell>
          <RouteGuard>{children}</RouteGuard>
        </AppShell>
      </PermissionsProvider>
    </AuthGate>
  );
}
