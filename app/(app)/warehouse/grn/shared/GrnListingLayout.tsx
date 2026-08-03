"use client";

import React, { useMemo } from "react";
import { FileText, Loader2 } from "lucide-react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { GrnListingKpiRow } from "./components/GrnListingKpiRow";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useWarehousesDropdown } from "@/hooks/masters";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
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
  const searchParams = useSearchParams();

  const {
    data: warehouses = [],
    isLoading: warehousesLoading,
    isError: warehousesError,
  } = useWarehousesDropdown();

  const activeTab: GrnLayoutTab = pathname.includes("/warehouse/grn/stock-transfer")
    ? "stock-transfer"
    : pathname.includes("/warehouse/grn/sales-return")
      ? "sales-return"
      : pathname.includes("/warehouse/grn/sample-return")
        ? "sample-return"
        : "purchase";

  const destinationWarehouse = searchParams.get("destinationWarehouse") || "All";
  const sourceType = tabToSourceType(activeTab);
  const warehouseForSummary =
    activeTab === "purchase" ? undefined : destinationWarehouse;

  const { data: summary } = useGrnSummary(sourceType, warehouseForSummary);

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

  const warehouseOptions = [
    { value: "All", label: "All Warehouses" },
    ...warehouses
      .filter((wh) => Boolean(wh.warehouse_id))
      .map((wh) => ({
        value: wh.warehouse_id,
        label: wh.warehouseName || wh.warehouse_id,
      })),
  ];

  const handleWarehouseChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!val || val === "All") {
      params.delete("destinationWarehouse");
    } else {
      params.set("destinationWarehouse", val);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const showWarehouseSelector =
    activeTab === "stock-transfer" ||
    activeTab === "sales-return" ||
    activeTab === "sample-return";

  const warehouseSelector = showWarehouseSelector && (
    <div className="flex items-center gap-2 bg-white px-1.5 py-1.5 rounded-lg border border-border">
      <span className="text-[11px] text-muted-foreground font-semibold pl-1.5">
        Warehouse:
      </span>
      {warehousesLoading ? (
        <div className="flex h-7 w-[180px] items-center gap-1.5 px-2 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading…
        </div>
      ) : (
        <AutocompleteSelect
          options={warehouseOptions}
          value={destinationWarehouse}
          onChange={handleWarehouseChange}
          placeholder="All Warehouses"
          searchPlaceholder="Search warehouse…"
          className="h-7 w-[180px] text-xs py-1 px-2 border-0 bg-white focus:ring-0 shadow-none focus:outline-none"
        />
      )}
      {warehousesError && (
        <span className="text-[10px] text-red-600 pr-1">Failed to load</span>
      )}
    </div>
  );

  return (
    <ListingContainer
      title="Goods Receipt Note (GRN)"
      titleIcon={FileText}
      metrics={<GrnListingKpiRow kpis={kpis} />}
      actions={warehouseSelector}
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
