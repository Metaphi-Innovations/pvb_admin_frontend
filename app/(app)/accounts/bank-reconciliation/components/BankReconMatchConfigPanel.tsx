"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadMatchConfig, saveMatchConfig } from "@/lib/accounts/bank-recon-match-store";
import type { BankReconMatchConfig } from "@/lib/accounts/bank-recon-match-types";
import { DEFAULT_MATCH_CONFIG } from "@/lib/accounts/bank-recon-match-types";
import { appendMatchAudit, createAuditId } from "@/lib/accounts/bank-recon-match-store";

interface BankReconMatchConfigPanelProps {
  bankAccountId: string;
  open: boolean;
  onClose: () => void;
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 w-full text-sm rounded-lg border border-border px-2"
      />
    </div>
  );
}

export function BankReconMatchConfigPanel({ bankAccountId, open, onClose }: BankReconMatchConfigPanelProps) {
  const [config, setConfig] = useState<BankReconMatchConfig>(DEFAULT_MATCH_CONFIG);

  useEffect(() => {
    if (open) setConfig(loadMatchConfig(bankAccountId));
  }, [open, bankAccountId]);

  const handleSave = () => {
    saveMatchConfig(config, bankAccountId);
    appendMatchAudit({
      id: createAuditId(),
      timestamp: new Date().toISOString(),
      user: "Finance User",
      bankAccountId,
      statementTransactionId: null,
      bookTransactionId: null,
      action: "Match configuration changed",
      matchScore: null,
      previousStatus: null,
      newStatus: null,
      reason: JSON.stringify(config),
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Match Configuration</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Electronic Date Tolerance (days)" value={config.electronicDateTolerance} onChange={(v) => setConfig((c) => ({ ...c, electronicDateTolerance: v }))} />
          <NumField label="Cheque Date Tolerance (days)" value={config.chequeDateTolerance} onChange={(v) => setConfig((c) => ({ ...c, chequeDateTolerance: v }))} />
          <NumField label="Exact Match Threshold" value={config.exactMatchThreshold} onChange={(v) => setConfig((c) => ({ ...c, exactMatchThreshold: v }))} />
          <NumField label="Suggested Match Threshold" value={config.suggestedMatchThreshold} onChange={(v) => setConfig((c) => ({ ...c, suggestedMatchThreshold: v }))} />
          <NumField label="Possible Match Threshold" value={config.possibleMatchThreshold} onChange={(v) => setConfig((c) => ({ ...c, possibleMatchThreshold: v }))} />
          <NumField label="Multiple Candidate Gap" value={config.multipleCandidateGap} onChange={(v) => setConfig((c) => ({ ...c, multipleCandidateGap: v }))} />
        </div>
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Auto Accept Exact Matches</Label>
            <Switch checked={config.autoAcceptExactMatches} onCheckedChange={(v) => setConfig((c) => ({ ...c, autoAcceptExactMatches: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Require Approval for Bulk Accept</Label>
            <Switch checked={config.requireApprovalForBulkAccept} onCheckedChange={(v) => setConfig((c) => ({ ...c, requireApprovalForBulkAccept: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Reference Normalization</Label>
            <Switch checked={config.referenceNormalizationEnabled} onCheckedChange={(v) => setConfig((c) => ({ ...c, referenceNormalizationEnabled: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Party Name Detection</Label>
            <Switch checked={config.partyNameDetectionEnabled} onCheckedChange={(v) => setConfig((c) => ({ ...c, partyNameDetectionEnabled: v }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={handleSave}>Save Configuration</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
