"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostalLocationMasterTab } from "./components/PostalLocationMasterTab";
import { GeographySetupTab } from "./components/GeographySetupTab";
import { SplitMergeWizardTab } from "./components/SplitMergeWizardTab";
import { AuditHistoryTab } from "./components/AuditHistoryTab";
import { GeographyWorkflowBanner } from "./components/GeographyWorkflowBanner";
import { migrateGeographyStorageIfNeeded, resetGeographyDemoData } from "./geography-reset";
import { getWorkflowSummary, syncGeographyCoverageCounts, syncGeographyUserCounts } from "./geography-workflow-data";
import { usePostalMasterSummary } from "@/hooks/masters";
import { masterKeys } from "@/lib/masters/master-query-keys";

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
  return "setup";
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
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [resetting, setResetting] = useState(false);

  const queryClient = useQueryClient();
  const postalSummaryQuery = usePostalMasterSummary();
  const postalCount = postalSummaryQuery.data?.totalMappings ?? 0;

  const refreshSummary = useCallback(() => {
    syncGeographyCoverageCounts();
    syncGeographyUserCounts();
    setSummary(getWorkflowSummary());
    void queryClient.invalidateQueries({
      queryKey: masterKeys.postalMaster.summary(),
    });
  }, [queryClient]);

  useEffect(() => {
    setMounted(true);
    migrateGeographyStorageIfNeeded();
    syncGeographyCoverageCounts();
    syncGeographyUserCounts();
    setSummary(getWorkflowSummary());
  }, []);

  useEffect(() => {
    if (rawTab && LEGACY_TAB_REDIRECT[rawTab] && LEGACY_TAB_REDIRECT[rawTab] !== rawTab) {
      router.replace(`/masters/geography?tab=${LEGACY_TAB_REDIRECT[rawTab]}`);
    }
  }, [rawTab, router]);

  const setTab = (tab: string) => {
    router.replace(tab === "setup" ? "/masters/geography" : `/masters/geography?tab=${tab}`);
  };

  const handleResetDemoData = async () => {
    if (!confirm("Reset all Geography localStorage demo data?")) return;
    setResetting(true);
    try {
      await resetGeographyDemoData();
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
        {activeTab !== "setup" && (
          <GeographyWorkflowBanner
            summary={{
              ...summary,
              totalPincodes: postalCount || summary.totalPincodes,
            }}
          />
        )}

        {IS_DEV && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-amber-800 border-amber-300"
              disabled={resetting}
              onClick={() => void handleResetDemoData()}
            >
              {resetting ? "Resetting…" : "Reset Geography Demo Data"}
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setTab} className="space-y-4">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="border-b border-border w-max min-w-full justify-start rounded-none h-auto p-0 bg-transparent gap-0">
              <TabsTrigger value="setup" className={TAB_TRIGGER_CLASS}>
                Business Geography
              </TabsTrigger>
              <TabsTrigger value="postal" className={TAB_TRIGGER_CLASS}>
                Postal Master
              </TabsTrigger>
              <TabsTrigger value="split" className={TAB_TRIGGER_CLASS}>
                Split / Merge
              </TabsTrigger>
              <TabsTrigger value="audit" className={TAB_TRIGGER_CLASS}>
                Audit
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="postal" className="m-0 mt-0 outline-none">
            {activeTab === "postal" && (
              <PostalLocationMasterTab onWorkflowChange={refreshSummary} />
            )}
          </TabsContent>
          <TabsContent value="setup" className="m-0 mt-0 outline-none">
            {activeTab === "setup" && (
              <GeographySetupTab postalRecordCount={postalCount} />
            )}
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
