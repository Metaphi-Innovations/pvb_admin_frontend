"use client";

import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordSectionCard } from "@/components/record-detail";
import { ProcBadge } from "../../design/proc-design";
import type { PurchaseOrder } from "../po-data";
import {
  addPOFollowUp,
  canAddPOFollowUp,
  formatFollowUpDateTime,
  getPOFollowUpSummary,
  loadFollowUpsForPO,
} from "../po-followup-data";
import { AddFollowUpModal } from "./AddFollowUpModal";
import { FollowUpActivityFeed } from "./FollowUpActivityFeed";
import { useCallback, useEffect, useState } from "react";

export function VendorFollowUpPanel({
  po,
  onPOUpdated,
  onToast,
}: {
  po: PurchaseOrder;
  onPOUpdated: (updated: PurchaseOrder) => void;
  onToast?: (msg: string) => void;
}) {
  const [entries, setEntries] = useState(() => loadFollowUpsForPO(po.id));
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = useCallback(() => {
    setEntries(loadFollowUpsForPO(po.id));
  }, [po.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const summary = getPOFollowUpSummary(po.id);

  return (
    <>
      <div className="space-y-4">
        <RecordSectionCard title="Supplier Follow-up" icon={MessageSquare} accent="orange">
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Last Follow-up Date</span>
              <span className="text-foreground text-right">
                {summary.lastFollowUpAt ? formatFollowUpDateTime(summary.lastFollowUpAt) : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Last Spoke With</span>
              <span className="text-foreground text-right">{summary.lastSpokeWith || "—"}</span>
            </div>
            <div className="flex justify-between gap-2 border-t border-border pt-2">
              <span className="text-muted-foreground">Total Follow-ups</span>
              <span className="font-semibold tabular-nums text-foreground">{summary.totalFollowUps}</span>
            </div>
          </div>

          {canAddPOFollowUp(po) ? (
            <Button
              size="sm"
              className="mt-3 h-8 w-full text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Follow-up &amp; Activities
            </Button>
          ) : entries.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-8 w-full text-xs"
              onClick={() => setModalOpen(true)}
            >
              View Activities
            </Button>
          ) : null}
        </RecordSectionCard>

        <RecordSectionCard title="Recent Activity" accent="blue">
          <FollowUpActivityFeed entries={entries.slice(0, 3)} showTitle={false} compact />
          {entries.length > 3 && (
            <button
              type="button"
              className="mt-3 text-xs font-medium text-brand-600 hover:underline"
              onClick={() => setModalOpen(true)}
            >
              View all {entries.length} activities
            </button>
          )}
        </RecordSectionCard>
      </div>

      <AddFollowUpModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        po={po}
        readOnly={!canAddPOFollowUp(po)}
        onSubmit={(input) => {
          const { updatedPo } = addPOFollowUp(po, input);
          onPOUpdated(updatedPo);
          refresh();
          onToast?.("Follow-up saved.");
        }}
      />
    </>
  );
}

export function FollowUpListingCell({
  poId,
  onViewHistory,
}: {
  poId: number;
  onViewHistory: () => void;
}) {
  const summary = getPOFollowUpSummary(poId);
  return (
    <div className="py-1.5 space-y-1" onClick={(e) => e.stopPropagation()}>
      <ProcBadge status={summary.availability} />
      {summary.lastFollowUpAt && (
        <>
          <p className="text-[10px] text-muted-foreground tabular-nums leading-tight">
            {formatFollowUpDateTime(summary.lastFollowUpAt).split(" ").slice(0, 2).join(" ")}
          </p>
          <button
            type="button"
            className="text-[10px] text-brand-600 hover:underline inline-flex items-center gap-0.5"
            onClick={onViewHistory}
          >
            View
          </button>
        </>
      )}
    </div>
  );
}
