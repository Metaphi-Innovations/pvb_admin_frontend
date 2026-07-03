"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostalLocationMasterTab } from "./components/PostalLocationMasterTab";
import { GeographySetupTab } from "./components/GeographySetupTab";
import { SplitMergeWizardTab } from "./components/SplitMergeWizardTab";
import { AuditHistoryTab } from "./components/AuditHistoryTab";
import { GeographyWorkflowBanner } from "./components/GeographyWorkflowBanner";
import { migrateGeographyStorageIfNeeded, resetGeographyDemoData } from "./geography-reset";
import { hydratePostalMaster, getPostalRecordCount } from "./pincode-data";
import { getWorkflowSummary, syncGeographyCoverageCounts, syncGeographyUserCounts } from "./geography-workflow-data";

const TAB_VALUES = ["postal", "setup", "split", "audit"] as const;
type TabValue = (typeof TAB_VALUES)[number];

/** Legacy tabs removed — redirect to Business Geography. */
const LEGACY_TAB_REDIRECT: Record<string, TabValue> = {
  coverage: "setup",
  users: "setup",
  preview: "setup",
  pincode: "postal",
  geography: "setup",
};

const TAB_TRIGGER_CLASS =
  "rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 text-xs font-semibold text-muted-foreground data-[state=active]:border-brand-600 data-[state=active]:text-brand-650 bg-transparent shadow-none shrink-0";

function parseTab(raw: string | null): TabValue {
  if (raw && LEGACY_TAB_REDIRECT[raw]) return LEGACY_TAB_REDIRECT[raw];
  if (raw && TAB_VALUES.includes(raw as TabValue)) return raw as TabValue;
  return "postal";
}

const EMPTY_SUMMARY = {
  totalPincodes: 0,
  mappedPincodes: 0,
  totalGeographies: 0,
  totalAssignments: 0,
};

const IS_DEV = process.env.NODE_ENV === "development";

export default function GeographyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab = parseTab(rawTab);
  const [mounted, setMounted] = useState(false);
  const [postalCount, setPostalCount] = useState(0);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [resetting, setResetting] = useState(false);

  const [postalHydrating, setPostalHydrating] = useState(true);

  const refreshSummary = useCallback(() => {
    syncGeographyCoverageCounts();
    syncGeographyUserCounts();
    setSummary(getWorkflowSummary());
    setPostalCount(getPostalRecordCount());
  }, []);

  const initGeography = useCallback(async () => {
    migrateGeographyStorageIfNeeded();
    setPostalHydrating(true);
    try {
      const records = await hydratePostalMaster();
      setPostalCount(records.length);
      refreshSummary();
    } finally {
      setPostalHydrating(false);
    }
  }, [refreshSummary]);

  useEffect(() => {
    setMounted(true);
    void initGeography();
  }, [initGeography]);

  useEffect(() => {
    if (rawTab && LEGACY_TAB_REDIRECT[rawTab] && LEGACY_TAB_REDIRECT[rawTab] !== rawTab) {
      router.replace(`/masters/geography?tab=${LEGACY_TAB_REDIRECT[rawTab]}`);
    }
  }, [rawTab, router]);

  const setTab = (tab: string) => {
    router.replace(tab === "postal" ? "/masters/geography" : `/masters/geography?tab=${tab}`);
  };

  const handleResetDemoData = async () => {
    if (!confirm("Reset all Geography localStorage data and reload postal master from file?")) return;
    setResetting(true);
    try {
      const count = await resetGeographyDemoData();
      setPostalCount(count);
      refreshSummary();
    } finally {
      setResetting(false);
    }
  };

  if (!mounted) {
    return (
      <ListingContainer title="Geography" titleIcon={Globe}>
        <div className="rounded-xl border border-border bg-white p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      </ListingContainer>
    );
  }

  return (
    <ListingContainer title="Geography" titleIcon={Globe}>
      <div className="space-y-4">
        <GeographyWorkflowBanner summary={summary} />

        {postalHydrating && (
          <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            Loading postal master dataset…
          </div>
        )}

        {!postalHydrating && postalCount === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Postal Master data is not loaded.</p>
              <p className="mt-0.5 text-amber-800">
                Please upload India Post data first (Bulk Upload on Postal Master tab), or run{" "}
                <code className="text-[10px] bg-amber-100 px-1 rounded">npm run import:postal</code>{" "}
                then refresh.
              </p>
            </div>
          </div>
        )}

        {IS_DEV && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-amber-800 border-amber-300"
              disabled={resetting}
              onClick={handleResetDemoData}
            >
              {resetting ? "Resetting…" : "Reset Geography Demo Data"}
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setTab} className="space-y-4">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="border-b border-border w-max min-w-full justify-start rounded-none h-auto p-0 bg-transparent gap-0">
              <TabsTrigger value="postal" className={TAB_TRIGGER_CLASS}>Postal Master</TabsTrigger>
              <TabsTrigger value="setup" className={TAB_TRIGGER_CLASS}>Business Geography</TabsTrigger>
              <TabsTrigger value="split" className={TAB_TRIGGER_CLASS}>Split / Merge</TabsTrigger>
              <TabsTrigger value="audit" className={TAB_TRIGGER_CLASS}>Audit</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="postal" className="m-0 mt-0 outline-none">
            {activeTab === "postal" && (
              <PostalLocationMasterTab
                onWorkflowChange={refreshSummary}
                postalRecordCount={postalCount}
                postalHydrating={postalHydrating}
              />
            )}
          </TabsContent>
          <TabsContent value="setup" className="m-0 mt-0 outline-none">
            {activeTab === "setup" && <GeographySetupTab postalRecordCount={postalCount} />}
          </TabsContent>
          <TabsContent value="split" className="m-0 mt-0 outline-none">
            {activeTab === "split" && <SplitMergeWizardTab />}
          </TabsContent>
          <TabsContent value="audit" className="m-0 mt-0 outline-none">
            {activeTab === "audit" && <AuditHistoryTab />}
          </TabsContent>
        </Tabs>
      </div>
    </ListingContainer>
  );
}
