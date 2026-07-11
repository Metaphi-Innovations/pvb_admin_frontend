"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { CoaNavigationProvider } from "./CoaNavigationContext";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";
import { GENERAL_LEDGER_HREF } from "@/lib/accounts/general-ledger-data";
import { useAccountsAccordion } from "./AccountsAccordionContext";

const CoaAddLedgerHost = dynamic(
  () => import("./CoaAddLedgerHost").then((m) => ({ default: m.CoaAddLedgerHost })),
  { ssr: false },
);

const CoaAddGroupHost = dynamic(
  () => import("./CoaAddGroupHost").then((m) => ({ default: m.CoaAddGroupHost })),
  { ssr: false },
);

function routeNeedsCoaData(pathname: string): boolean {
  return (
    pathname.startsWith(CHART_OF_ACCOUNTS_HREF) ||
    pathname.startsWith(GENERAL_LEDGER_HREF) ||
    pathname.startsWith("/accounts/masters/") ||
    pathname.startsWith("/accounts/settings")
  );
}

/**
 * Mounts COA navigation context only when the COA section is active or a COA/master route needs data.
 * Transactions / receivables / payables / banking / reports never load the chart tree.
 */
export function CoaNavigationProviderLazy({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeAccountsSection } = useAccountsAccordion();
  const needsFullCoa = routeNeedsCoaData(pathname);
  const needsTreeCoa = activeAccountsSection === "coa";

  if (!needsFullCoa && !needsTreeCoa) return <>{children}</>;

  return (
    <CoaNavigationProvider initMode={needsFullCoa ? "full" : "tree-only"}>
      {children}
      <CoaAddLedgerHost />
      <CoaAddGroupHost />
    </CoaNavigationProvider>
  );
}
