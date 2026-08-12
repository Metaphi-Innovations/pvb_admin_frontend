"use client";

import React, { useMemo } from "react";
import { FileText } from "lucide-react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { GrnListingKpiRow } from "./components/GrnListingKpiRow";
import { useRouter, usePathname } from "next/navigation";
import { computeGrnListingKpis } from "./grn-listing-kpis";
import { getGrnTabApiContext } from "@/lib/warehouse/grn-list-config";
import { useGrnSummary } from "@/hooks/warehouse/use-grn";
import type { BackendGrnSourceType } from "@/lib/warehouse/grn-status";

const EMPTY_KPIS = computeGrnListingKpis([]);

type GrnLayoutTab = "purchase" | "stock-transfer" | "sales-return" | "sample-return";

function tabToSourceType(tab: GrnLayoutTab): BackendGrnSourceType {
  switch (tab) {
    case "stock-transfer":
      return getGrnTabApiContext("stock_transfer").sourceType;
    case "sales-return":
      return getGrnTabApiContext("sales_return").sourceType;
    case "sample-return":
      return getGrnTabApiContext("sample_return").sourceType;
    default:
      return getGrnTabApiContext("purchase").sourceType;
  }
}

export function GrnListingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const activeTab: GrnLayoutTab = pathname.includes("/warehouse/grn/stock-transfer")
    ? "stock-transfer"
    : pathname.includes("/warehouse/grn/sales-return")
      ? "sales-return"
      : pathname.includes("/warehouse/grn/sample-return")
        ? "sample-return"
        : "purchase";

  const sourceType = tabToSourceType(activeTab);
  const { data: summary } = useGrnSummary(sourceType);

  const kpis = useMemo(
    () =>
      summary
        ? {
            pendingQc: summary.pendingQc,
            qcInProgress: summary.qcInProgress,
            qcCompleted: summary.qcCompleted,
            totalGrns: summary.totalGrns,
          }
        : EMPTY_KPIS,
    [summary],
  );

  return (
    <ListingContainer
      title="Goods Receipt Note (GRN)"
      titleIcon={FileText}
      metrics={<GrnListingKpiRow kpis={kpis} />}
      tabs={[
        { value: "purchase", label: "Purchase" },
        { value: "stock-transfer", label: "Stock Transfer" },
        { value: "sales-return", label: "Sales Return" },
        { value: "sample-return", label: "Sample Return" },
      ]}
      activeTab={activeTab}
      onTabChange={(val) => router.push(`/warehouse/grn/${val}`)}
    >
      <div className="space-y-4">{children}</div>
    </ListingContainer>
  );
}
