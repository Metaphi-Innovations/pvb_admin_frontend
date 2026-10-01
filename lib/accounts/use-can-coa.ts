"use client";

import { useClientMounted } from "@/lib/use-client-mounted";
import { canCoa } from "@/lib/accounts/permissions";

/**
 * SSR-safe COA permission check.
 * Returns false until mount so server HTML matches the first client render,
 * then reads localStorage-backed permissions.
 */
export function useCanCoa(action: "view" | "create" | "edit" | "delete"): boolean {
  const mounted = useClientMounted();
  if (!mounted) return false;
  return canCoa(action);
}
