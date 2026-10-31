"use client";

import React, { useMemo, useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { getQcRecords } from "../mock-data";
import { QcRecord } from "../types";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { useRouter, usePathname } from "next/navigation";
import { computeQcListingKpis } from "./qc-listing-kpis";
import { QcListingKpiRow } from "./components/QcListingKpiRow";
import { QcService } from "@/services/qc.service";
import { buildQcListHref, type QcListSource } from "./qc-list-nav";
import { useQcListingState } from "../qc-listing-state-context";

function pathnameToQcSource(pathname: string): QcListSource {
  if (pathname.includes("/warehouse/qc/stock-transfer")) return "stock-transfer";
  if (pathname.includes("/warehouse/qc/sales-return")) return "sales-return";
  if (pathname.includes("/warehouse/qc/sample-return")) return "sample-return";
  return "purchase";
}

function isQcListSource(value: string): value is QcListSource {
  return (
    value === "purchase" ||
    value === "stock-transfer" ||
    value === "sales-return" ||
    value === "sample-return"
  );
}

export function QcListingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { getStatusForSource } = useQcListingState();

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

  const activeTab = pathnameToQcSource(pathname);

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
        if (!isQcListSource(val)) return;
        // Each source keeps its own Pending/Completed selection.
        router.push(
          buildQcListHref(`/warehouse/qc/${val}`, {
            qcStatus: getStatusForSource(val),
          }),
        );
      }}
      metrics={<QcListingKpiRow kpis={qcListingKpis} />}
    >
      {children}
    </ListingContainer>
  );
}
