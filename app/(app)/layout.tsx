/**
 * app/(app)/layout.tsx
 *
 * Persistent layout for ALL authenticated (app) routes.
 *
 * This file is the key fix for "must click twice / hard refresh" issues.
 * Without this file, every page in (app) mounts its own AppLayout including
 * TopNavbar, AppHeader, and FYProvider — causing full unmount/remount on
 * every navigation, which destroys open dropdown state and causes missed clicks.
 *
 * With this layout, Next.js App Router keeps TopNavbar, AppHeader, and
 * FYProvider mounted once. Only the page content (children) swaps on navigation.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
