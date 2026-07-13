"use client";

import React, { useMemo, useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { getQcRecords } from "../mock-data";
import { QcRecord } from "../types";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { getQcSourceType } from "@/lib/warehouse/grn-source";
import { loadWarehouses } from "@/app/(app)/masters/warehouse/warehouse-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getGrnRecords } from "@/app/(app)/warehouse/grn/mock-data";
import { computeQcListingKpis } from "./qc-listing-kpis";
import { QcListingKpiRow } from "./components/QcListingKpiRow";
import { QcService } from "@/services/qc.service";

export function QcListingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [qcList, setQcList] = useState<QcRecord[]>([]);
  const [grnList, setGrnList] = useState<any[]>([]);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    Promise.all([
      QcService.list({ page: 1, page_size: 100 }),
      QcService.listPending({ page: 1, page_size: 100 })
    ]).then(([completedRes, pendingRes]) => {
      const completedMap = new Map((completedRes.data || []).map((q: any) => [q.grnNo, q]));
      const uniquePending = (pendingRes.data || []).filter((q: any) => !completedMap.has(q.grnNo));
      setQcList([...uniquePending, ...completedMap.values()]);
    }).catch((err) => {
      console.error("Failed to load QC records from API:", err);
      setQcList(getQcRecords());
    });
    setGrnList(getGrnRecords());
  }, [pathname]);

  // Determine active tab based on pathname
  const activeTab = pathname.includes("/warehouse/qc/stock-transfer")
    ? "stock-transfer"
    : pathname.includes("/warehouse/qc/sales-return")
    ? "sales-return"
    : pathname.includes("/warehouse/qc/sample-return")
    ? "sample-return"
    : "purchase";

  // Calculate counts for badges based on QC items
  const purchaseCount = useMemo(
    () => qcList.filter((q) => getQcSourceType(q) === "purchase").length,
    [qcList],
  );
  
  const stockTransferCount = useMemo(
    () => qcList.filter((q) => getQcSourceType(q) === "stock_transfer").length,
    [qcList],
  );

  const salesReturnCount = useMemo(
    () => qcList.filter((q) => getQcSourceType(q) === "sales_return").length,
    [qcList],
  );

  const sampleReturnCount = useMemo(
    () => qcList.filter((q) => getQcSourceType(q) === "sample_return").length,
    [qcList],
  );

  const sourceCounts = {
    purchase: purchaseCount,
    "stock-transfer": stockTransferCount,
    "sales-return": salesReturnCount,
    "sample-return": sampleReturnCount,
  };

  const qcListingKpis = useMemo(() => computeQcListingKpis(qcList), [qcList]);

  const destinationWarehouse = searchParams.get("destinationWarehouse") || "All";

  const handleWarehouseChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("destinationWarehouse", val);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const warehouseSelector = (
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
      title="Quality Control (QC)"
      titleIcon={ClipboardCheck}
      actions={warehouseSelector}
      tabs={[
        { value: "purchase", label: `Purchase (${isMounted ? sourceCounts.purchase : 0})` },
        { value: "stock-transfer", label: `Stock Transfer (${isMounted ? sourceCounts["stock-transfer"] : 0})` },
        { value: "sales-return", label: `Sales Return (${isMounted ? sourceCounts["sales-return"] : 0})` },
        { value: "sample-return", label: `Sample Return (${isMounted ? sourceCounts["sample-return"] : 0})` },
      ]}
      activeTab={activeTab}
      onTabChange={(val) => router.push(`/warehouse/qc/${val}`)}
      metrics={<QcListingKpiRow kpis={qcListingKpis} />}
    >
      <div className="space-y-4">
        {/* Tab Route Content */}
        {children}
      </div>
    </ListingContainer>
  );
}
