"use client";

import React, { useState, useEffect } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { ClipboardCheck, FileText, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { getGrnRecords } from "./grn/mock-data";
import { getQcRecords } from "./qc/mock-data";
import { GrnRecord } from "./grn/types";
import { QcRecord } from "./qc/types";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MiniKPICard } from "@/components/ui/KPICard";
import { GrnListing } from "./grn/GrnListing";
import { QcListing } from "./qc/QcListing";

export default function GrnQcDashboardPage() {
  const [activeTab, setActiveTab] = useState("grn");
  const [grnList, setGrnList] = useState<GrnRecord[]>([]);
  const [qcList, setQcList] = useState<QcRecord[]>([]);

  // Loading lists for KPI cards
  useEffect(() => {
    setGrnList(getGrnRecords());
    setQcList(getQcRecords());
  }, []);

  return (
    <ListingContainer
      title="GRN & QC Module"
      titleIcon={ClipboardCheck}
      metrics={
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <MiniKPICard label="Total GRNs" value={grnList.length} icon={FileText} accent={true} />
          <MiniKPICard label="Pending QC GRNs" value={grnList.filter(g => g.status === "qc_pending").length} icon={Clock} accent={false} />
          <MiniKPICard label="Completed QC GRNs" value={grnList.filter(g => g.status === "qc_completed").length} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Total QC Inspections" value={qcList.length} icon={ClipboardCheck} accent={false} />
          <MiniKPICard label="Completed Inspections" value={qcList.filter(q => q.status === "completed").length} icon={ShieldCheck} accent={false} />
        </div>
      }
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
