"use client";

import React, { useMemo, useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { getQcRecords } from "../mock-data";
import { QcRecord } from "../types";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { computeQcListingKpis } from "./qc-listing-kpis";
import { QcListingKpiRow } from "./components/QcListingKpiRow";
import { QcService } from "@/services/qc.service";

export function QcListingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [qcList, setQcList] = useState<QcRecord[]>([]);

  useEffect(() => {
    Promise.all([
      QcService.list({ page: 1, page_size: 100 }),
      QcService.listPending({ page: 1, page_size: 100 }),
    ])
      .then(([completedRes, pendingRes]) => {
        const completedMap = new Map((completedRes.data || []).map((q: any) => [q.grnNo, q]));
        const uniquePending = (pendingRes.data || []).filter((q: any) => !completedMap.has(q.grnNo));
        setQcList([...uniquePending, ...completedMap.values()]);
      })
      .catch((err) => {
        console.error("Failed to load QC records from API:", err);
        setQcList(getQcRecords());
      });
  }, [pathname]);

  const activeTab = pathname.includes("/warehouse/qc/stock-transfer")
    ? "stock-transfer"
    : pathname.includes("/warehouse/qc/sales-return")
      ? "sales-return"
      : pathname.includes("/warehouse/qc/sample-return")
        ? "sample-return"
        : "purchase";

  const qcListingKpis = useMemo(() => computeQcListingKpis(qcList), [qcList]);

  return (
    <ListingContainer
      title="Quality Control (QC)"
      titleIcon={ClipboardCheck}
      tabs={[
        { value: "purchase", label: "Purchase" },
        { value: "stock-transfer", label: "Stock Transfer" },
        { value: "sales-return", label: "Sales Return" },
        { value: "sample-return", label: "Sample Return" },
      ]}
      activeTab={activeTab}
      onTabChange={(val) => {
        const params = new URLSearchParams();
        const qcStatus = searchParams.get("qcStatus");
        if (qcStatus) params.set("qcStatus", qcStatus);
        const qs = params.toString();
        router.push(`/warehouse/qc/${val}${qs ? `?${qs}` : ""}`);
      }}
      metrics={<QcListingKpiRow kpis={qcListingKpis} />}
    >
      {children}
    </ListingContainer>
  );
}
