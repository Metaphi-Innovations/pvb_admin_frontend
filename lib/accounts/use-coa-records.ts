"use client";

import { useEffect, useMemo, useState } from "react";
import { loadChartOfAccounts, type ChartOfAccount } from "@/app/(app)/accounts/data";
import { subscribeCoaChanged } from "@/lib/accounts/coa-events";
import { useClientMounted } from "@/lib/use-client-mounted";

/** Reactive COA list — reloads when ledgers or sub-groups are created from voucher quick-add. */
export function useCoaRecords(): ChartOfAccount[] {
  const mounted = useClientMounted();
  const [revision, setRevision] = useState(0);

  useEffect(() => subscribeCoaChanged(() => setRevision((r) => r + 1)), []);

  return useMemo(
    () => (mounted ? loadChartOfAccounts() : []),
    [mounted, revision],
  );
}
