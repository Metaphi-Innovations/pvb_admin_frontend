"use client";

import React, { useMemo, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { getGrnRecords } from "./mock-data";
import { GrnRecord } from "./types";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { computeGrnListingKpis } from "./grn-listing-kpis";
import { GrnListingKpiRow } from "./components/GrnListingKpiRow";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DEFAULT_DESTINATION_WAREHOUSE, getGrnSourceType } from "@/lib/warehouse/grn-source";
import { loadWarehouses } from "@/app/(app)/masters/warehouse/warehouse-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GrnListingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [grnList, setGrnList] = useState<GrnRecord[]>([]);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setGrnList(getGrnRecords());
  }, [pathname]);

  const grnListingKpis = useMemo(() => computeGrnListingKpis(grnList), [grnList]);

  // Determine active tab based on pathname
  const activeTab = pathname.includes("/warehouse/grn/stock-transfer")
    ? "stock-transfer"
    : pathname.includes("/warehouse/grn/sales-return")
    ? "sales-return"
    : pathname.includes("/warehouse/grn/sample-return")
    ? "sample-return"
    : "purchase";

  // Calculate counts for badges
  const purchaseCount = useMemo(
    () => grnList.filter((g) => getGrnSourceType(g) === "purchase").length,
    [grnList],
  );

  const stockTransferCount = useMemo(() => {
    const stGrns = grnList.filter((g) => g.sourceType === "stock_transfer");
    const { getDispatchedStockTransfersForGrn } = require("@/app/(app)/sales/stock-transfer/warehouse-receipt-sync");
    const pendingTransfers = getDispatchedStockTransfersForGrn("All");
    return stGrns.length + pendingTransfers.length;
  }, [grnList]);

  const salesReturnCount = useMemo(() => {
    const srGrns = grnList.filter((g) => g.sourceType === "sales_return");
    const { getSalesReturnRecords } = require("@/app/(app)/sales/orders/sales-return-data");
    const allReturns = getSalesReturnRecords();
    const receivedReturnNos = new Set(srGrns.map(g => g.salesReturnNo).filter(Boolean));
    const pendingReturns = allReturns.filter((r: any) => !receivedReturnNos.has(r.returnNumber));
    return srGrns.length + pendingReturns.length;
  }, [grnList]);

  const sampleReturnCount = useMemo(() => {
    const smpGrns = grnList.filter((g) => g.sourceType === "sample_return");
    const { getSampleReturnRecords } = require("@/app/(app)/sales/sample-order/sample-return-data");
    const allReturns = getSampleReturnRecords();
    const receivedReturnNos = new Set(smpGrns.map(g => g.sampleReturnNo ?? g.salesReturnNo).filter(Boolean));
    const pendingReturns = allReturns.filter((r: any) => !receivedReturnNos.has(r.returnNumber));
    return smpGrns.length + pendingReturns.length;
  }, [grnList]);

  const sourceCounts = {
    purchase: purchaseCount,
    "stock-transfer": stockTransferCount,
    "sales-return": salesReturnCount,
    "sample-return": sampleReturnCount,
  };

  const destinationWarehouse = searchParams.get("destinationWarehouse") || "All";

  const handleWarehouseChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("destinationWarehouse", val);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const warehouseSelector = (activeTab === "stock-transfer" || activeTab === "sales-return" || activeTab === "sample-return") && (
    <div className="flex items-center gap-2 bg-white px-1.5 py-1.5 rounded-lg border border-border">
      <span className="text-[11px] text-muted-foreground font-semibold pl-1.5">Warehouse:</span>
      <Select value={destinationWarehouse} onValueChange={handleWarehouseChange}>
        <SelectTrigger className="w-[180px] h-7 text-xs bg-white border-0 focus:ring-0 shadow-none font-medium text-foreground">
          <SelectValue placeholder="Select Warehouse" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Warehouses</SelectItem>
          {loadWarehouses().map((wh) => (
            <SelectItem key={wh.warehouseName} value={wh.warehouseName}>
              {wh.warehouseName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <ListingContainer
      title="Goods Receipt Note (GRN)"
      titleIcon={FileText}
      metrics={<GrnListingKpiRow kpis={grnListingKpis} />}
      actions={warehouseSelector}
      tabs={[
        { value: "purchase", label: `Purchase (${isMounted ? sourceCounts.purchase : 0})` },
        { value: "stock-transfer", label: `Stock Transfer (${isMounted ? sourceCounts["stock-transfer"] : 0})` },
        { value: "sales-return", label: `Sales Return (${isMounted ? sourceCounts["sales-return"] : 0})` },
        { value: "sample-return", label: `Sample Return (${isMounted ? sourceCounts["sample-return"] : 0})` },
      ]}
      activeTab={activeTab}
      onTabChange={(val) => router.push(`/warehouse/grn/${val}`)}
    >
      <div className="space-y-4">
        {/* Tab Route Content */}
        {children}
      </div>
    </ListingContainer>
  );
}
