"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { History, MessageSquare, Plus } from "lucide-react";
import { ProcBadge, ProcButton, ProcCardSection } from "../../design/proc-design";
import type { PurchaseOrder } from "../po-data";
import {
  addPOFollowUp,
  canAddPOFollowUp,
  formatFollowUpDateTime,
  getPOFollowUpSummary,
  loadFollowUpsForPO,
} from "../po-followup-data";
import { AddFollowUpModal } from "./AddFollowUpModal";
import { FollowUpTimeline } from "./FollowUpTimeline";

export function VendorFollowUpPanel({
  po,
  onPOUpdated,
  onToast,
}: {
  po: PurchaseOrder;
  onPOUpdated: (updated: PurchaseOrder) => void;
  onToast?: (msg: string) => void;
}) {
  const historyRef = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState(() => loadFollowUpsForPO(po.id));
  const [modalOpen, setModalOpen] = useState(false);
  const [rev, setRev] = useState(0);

  const refresh = useCallback(() => {
    setEntries(loadFollowUpsForPO(po.id));
    setRev((t) => t + 1);
  }, [po.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const summary = getPOFollowUpSummary(po.id);
  void rev;

  const scrollToHistory = () => {
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <div className="space-y-4 xl:sticky xl:top-4">
        <ProcCardSection accent="amber" title="Supplier Follow-up" icon={<MessageSquare className="w-3.5 h-3.5 text-amber-600" />}>
          <div className="space-y-2.5 text-[12px]">
            <div className="flex justify-between gap-2">
              <span className="text-[#6B80A0]">Last Follow-up Date</span>
              <span className="text-[#0A1628] text-right">
                {summary.lastFollowUpAt ? formatFollowUpDateTime(summary.lastFollowUpAt) : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#6B80A0]">Last Spoke With</span>
              <span className="text-[#0A1628] text-right">{summary.lastSpokeWith || "—"}</span>
            </div>
            <div className="flex justify-between gap-2 border-t border-[#DDE3EF] pt-2">
              <span className="text-[#6B80A0]">Total Follow-ups</span>
              <span className="font-semibold tabular-nums text-[#0A1628]">{summary.totalFollowUps}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-3">
            {canAddPOFollowUp(po) && (
              <ProcButton variant="primary" size="sm" className="w-full" onClick={() => setModalOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Add Follow-up
              </ProcButton>
            )}
            {summary.totalFollowUps > 0 && (
              <ProcButton variant="outline" size="sm" className="w-full" onClick={scrollToHistory}>
                <History className="w-3.5 h-3.5" /> View History
              </ProcButton>
            )}
          </div>
        </ProcCardSection>

        <div id="follow-up-history" ref={historyRef}>
          <ProcCardSection accent="navy" title="Follow-up History">
            <FollowUpTimeline entries={entries} />
          </ProcCardSection>
        </div>
      </div>

      <AddFollowUpModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        po={po}
        onSubmit={(input) => {
          const { updatedPo } = addPOFollowUp(po, input);
          onPOUpdated(updatedPo);
          refresh();
          onToast?.("Follow-up added.");
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
          <p className="text-[10px] text-[#6B80A0] tabular-nums leading-tight">
            {formatFollowUpDateTime(summary.lastFollowUpAt).split(" ").slice(0, 2).join(" ")}
          </p>
          <button
            type="button"
            className="text-[10px] text-brand-600 hover:underline inline-flex items-center gap-0.5"
            onClick={onViewHistory}
          >
            <History className="w-3 h-3" /> View
          </button>
        </>
      )}
    </div>
  );
}
