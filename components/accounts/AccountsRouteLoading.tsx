"use client";

import { Loader2 } from "lucide-react";
import { resolveAccountsNavLabel } from "@/lib/accounts/accounts-nav";
import { useNavigationPendingOptional } from "@/components/navigation/NavigationPendingContext";

export function AccountsRouteLoading({
  pathnameHint,
  label,
}: {
  pathnameHint?: string;
  label?: string;
}) {
  const pending = useNavigationPendingOptional();
  const resolved =
    label ??
    pending?.pendingLabel ??
    (pending?.pendingHref ? resolveAccountsNavLabel(pending.pendingHref) : null) ??
    (pathnameHint ? resolveAccountsNavLabel(pathnameHint) : null) ??
    "page";

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[240px] gap-2 animate-in fade-in-0 duration-150">
      <Loader2 className="w-5 h-5 text-brand-600 animate-spin" aria-hidden />
      <p className="text-xs font-medium text-muted-foreground">Loading {resolved}…</p>
    </div>
  );
}
