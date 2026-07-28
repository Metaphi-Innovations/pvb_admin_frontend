import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { AccountsRouteLoading } from "@/components/accounts/AccountsRouteLoading";
import { resolveAccountsNavLabel } from "@/lib/accounts/accounts-nav";

/** Code-split accounts page clients — keeps navigation clicks responsive. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyAccountsPage(
  loader: () => Promise<{ default: ComponentType<any> }>,
  options?: { label?: string; pathnameHint?: string },
) {
  const hint = options?.pathnameHint;
  const label = options?.label ?? (hint ? resolveAccountsNavLabel(hint) : undefined);

  return dynamic(loader, {
    ssr: false,
    loading: () => <AccountsRouteLoading pathnameHint={hint} label={label} />,
  });
}
