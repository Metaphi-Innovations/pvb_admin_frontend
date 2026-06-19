"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { ClipboardCheck, FileText, CheckCircle2 } from "lucide-react";
import { getGrnRecords } from "./grn/mock-data";
import { getQcRecords } from "./qc/mock-data";
import { GrnRecord } from "./grn/types";
import { QcRecord } from "./qc/types";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { GrnListing } from "./grn/GrnListing";
import { QcListing } from "./qc/QcListing";
import { computeGrnListingKpis } from "./grn-listing-kpis";
import { GrnListingKpiRow } from "./GrnListingKpiRow";

export default function GrnQcDashboardPage() {
  const [activeTab, setActiveTab] = useState("grn");
  const [grnList, setGrnList] = useState<GrnRecord[]>([]);
  const [qcList, setQcList] = useState<QcRecord[]>([]);

  // Loading lists for KPI cards
  useEffect(() => {
    setGrnList(getGrnRecords());
    setQcList(getQcRecords());
  }, []);

  const grnListingKpis = useMemo(() => computeGrnListingKpis(grnList), [grnList]);

  return (
    <ListingContainer
      title="GRN & QC Module"
      titleIcon={ClipboardCheck}
      metrics={<GrnListingKpiRow kpis={grnListingKpis} />}
      tabs={[
        { value: "grn", label: "GRN Listing", icon: FileText },
        { value: "qc", label: "QC Listing", icon: CheckCircle2 }
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* GRN TAB CONTENT */}
      <TabsContent value="grn" className="mt-0 outline-none">
        <div className="space-y-3">
          <GrnListing />
        </div>
      </TabsContent>

      {/* QC TAB CONTENT */}
      <TabsContent value="qc" className="mt-0 outline-none">
        <div className="space-y-3">
          <QcListing />
        </div>
      </TabsContent>
    </ListingContainer>
  );
}
