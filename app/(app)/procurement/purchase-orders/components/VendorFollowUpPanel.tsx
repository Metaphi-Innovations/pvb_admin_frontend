"use client";

import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordSectionCard } from "@/components/record-detail";
import { ProcBadge } from "../../design/proc-design";
import type { PurchaseOrder } from "../po-data";
import { formatListingDate } from "../../components/listing/ListingCells";
import {
  canAddPOFollowUp,
  formatFollowUpDateTime,
  type AddFollowUpInput,
  type POFollowUpEntry,
} from "../po-followup-data";
import { AddFollowUpModal } from "./AddFollowUpModal";
import { FollowUpActivityFeed } from "./FollowUpActivityFeed";
import { useEffect, useMemo, useState } from "react";

export function VendorFollowUpPanel({
  po,
  followups = [],
  onSubmitFollowUp,
  submitting = false,
  onToast,
}: {
  po: PurchaseOrder;
  followups?: POFollowUpEntry[];
  onSubmitFollowUp: (input: AddFollowUpInput) => void;
  submitting?: boolean;
  onToast?: (msg: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [entries, setEntries] = useState(followups);

  useEffect(() => {
    setEntries(followups);
  }, [followups]);

  const summary = useMemo(() => {
    const latest = entries[0];
    return {
      totalFollowUps: entries.length,
      lastFollowUpAt: latest?.followUpAt ?? null,
      nextFollowUpAt: latest?.nextFollowUpAt ?? null,
      availability: entries.length > 0 ? "followup_available" : "no_followup",
    } as const;
  }, [entries]);

  return (
    <>
      <div className="space-y-4">
        <RecordSectionCard
          title="Supplier Follow-up"
          icon={MessageSquare}
          accent="orange"
        >
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Last Follow-up Date</span>
              <span className="text-foreground text-right">
                {summary.lastFollowUpAt
                  ? formatFollowUpDateTime(summary.lastFollowUpAt)
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Next Follow-up</span>
              <span className="text-foreground text-right">
                {summary.nextFollowUpAt
                  ? formatListingDate(summary.nextFollowUpAt.slice(0, 10))
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2 border-t border-border pt-2">
              <span className="text-muted-foreground">Total Follow-ups</span>
              <span className="font-semibold tabular-nums text-foreground">
                {summary.totalFollowUps}
              </span>
            </div>
          </div>

          {canAddPOFollowUp(po) ? (
            <Button
              size="sm"
              className="mt-3 h-8 w-full text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => setModalOpen(true)}
              disabled={submitting}
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
          <FollowUpActivityFeed
            entries={entries.slice(0, 3)}
            showTitle={false}
            compact
          />
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
        entries={entries}
        readOnly={!canAddPOFollowUp(po)}
        submitting={submitting}
        onSubmit={(input) => {
          onSubmitFollowUp(input);
          onToast?.("Follow-up saved.");
        }}
      />
    </>
  );
}

export function FollowUpListingCell({
  followUpCount = 0,
  onViewHistory,
}: {
  followUpCount?: number;
  onViewHistory: () => void;
}) {
  const availability = followUpCount > 0 ? "followup_available" : "no_followup";
  return (
    <div className="py-1.5 space-y-1" onClick={(e) => e.stopPropagation()}>
      <ProcBadge status={availability} />

      {followUpCount > 0 && (
        <button
          type="button"
          className="block text-[10px] text-brand-600 hover:underline"
          onClick={onViewHistory}
        >
          View
        </button>
      )}
    </div>
  );
}
