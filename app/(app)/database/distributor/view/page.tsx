"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RecordDetailTabs } from "@/components/record-detail/RecordDetailTabs";
import { computeDistributorAssessment } from "@/lib/distributor/distributor-scoring";
import { DistributorProfileHeader } from "../components/DistributorProfileHeader";
import { DistributorContactTab } from "../components/DistributorContactTab";
import { DistributorBusinessTab } from "../components/DistributorBusinessTab";
import { DistributorScorePanel } from "../components/DistributorScorePanel";
import { DistributorConversionPanel } from "../components/DistributorConversionPanel";
import {
  SEED,
  type Distributor,
  loadDistributors,
  VIEW_DISTRIBUTOR_STORAGE_KEY,
} from "../distributor-data";

type DistributorTab = "contact" | "business" | "score" | "conversion";

const TABS = [
  { value: "contact", label: "Raw Data — Contact" },
  { value: "business", label: "Raw Data — Business" },
  { value: "score", label: "Score & Credit" },
  { value: "conversion", label: "Customer Conversion" },
];

function resolveDistributor(distributors: Distributor[]): Distributor | null {
  if (typeof window === "undefined") {
    return distributors[0] ?? null;
  }
  const id = window.sessionStorage.getItem(VIEW_DISTRIBUTOR_STORAGE_KEY);
  if (id) {
    const selected = distributors.find((d) => String(d.id) === id);
    if (selected) return selected;
  }
  return distributors[0] ?? null;
}

export default function DistributorViewPage() {
  const [distributors, setDistributors] = useState<Distributor[]>(SEED);
  const [distributor, setDistributor] = useState<Distributor | null>(SEED[0] ?? null);
  const [activeTab, setActiveTab] = useState<DistributorTab>("contact");

  useEffect(() => {
    const loaded = loadDistributors();
    setDistributors(loaded);
    setDistributor(resolveDistributor(loaded));
  }, []);

  const assessment = useMemo(
    () =>
      distributor && activeTab === "score"
        ? computeDistributorAssessment(distributor)
        : null,
    [distributor, activeTab],
  );

  if (!distributor) {
    return (
      <AppLayout>
        <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
          No distributor record found. Open a profile from the listing page.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout noPadding>
      <DistributorProfileHeader
        distributor={distributor}
        listHref="/database/distributor"
        listLabel="Distributor Database"
      />

      <RecordDetailTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(v) => setActiveTab(v as DistributorTab)}
      />

      <div className="w-full space-y-3 bg-muted/20 px-5 py-3">
        {activeTab === "contact" && <DistributorContactTab distributor={distributor} />}

        {activeTab === "business" && <DistributorBusinessTab distributor={distributor} />}

        {activeTab === "score" && assessment && (
          <DistributorScorePanel assessment={assessment} />
        )}

        {activeTab === "conversion" && (
          <DistributorConversionPanel distributor={distributor} />
        )}
      </div>
    </AppLayout>
  );
}
