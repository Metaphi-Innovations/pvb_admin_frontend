"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "../../credit-notes/components/SearchableSelect";
import { Plus } from "lucide-react";
import {
  confirmEntryReconciliation,
  ignoreBankEntry,
  ledgerSearchOptions,
  MATCH_MODULE_OPTIONS,
  matchModuleLabel,
  resetEntryMatch,
  saveEntryMatch,
  searchModuleRecords,
  type BankStatementEntry,
  type MatchModule,
} from "../bank-reconciliation-data";
import { formatINR } from "../reconciliation-utils";
import { CreateLedgerModal } from "./CreateLedgerModal";
import { MatchStatusBadge } from "./MatchStatusBadge";
import type { Ledger } from "../../data";

export function MatchEntryModal({
  entry,
  open,
  onOpenChange,
  onUpdated,
}: {
  entry: BankStatementEntry | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: () => void;
}) {
  const [module, setModule] = useState<MatchModule | "">("");
  const [recordId, setRecordId] = useState("");
  const [recordSearch, setRecordSearch] = useState("");
  const [ledgerId, setLedgerId] = useState("");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [createLedgerOpen, setCreateLedgerOpen] = useState(false);

  useEffect(() => {
    if (!entry || !open) return;
    setModule((entry.matchedModule as MatchModule) || "");
    setRecordId(entry.matchedRecordId ? String(entry.matchedRecordId) : "");
    setLedgerId(entry.ledgerId ? String(entry.ledgerId) : "");
    setRemarks(entry.remarks || "");
    setRecordSearch("");
    setLedgerSearch("");
  }, [entry, open]);

  const recordOptions = useMemo(() => {
    if (!module || module === "other") return [];
    return searchModuleRecords(module, recordSearch).map((r) => ({
      value: String(r.id),
      label: r.label,
      sub: r.sub,
    }));
  }, [module, recordSearch]);

  const ledgerOptions = useMemo(
    () =>
      ledgerSearchOptions(ledgerSearch).map((l) => ({
        value: String(l.id),
        label: l.label,
      })),
    [ledgerSearch],
  );

  if (!entry) return null;

  const handleSaveMatch = () => {
    if (!module) return;
    if (module === "other") {
      const opt = ledgerOptions.find((o) => o.value === ledgerId);
      if (!ledgerId) return;
      saveEntryMatch({
        entryId: entry.id,
        matchedModule: "other",
        ledgerId: Number(ledgerId),
        ledgerName: opt?.label ?? "",
        remarks,
      });
    } else {
      const opt = recordOptions.find((o) => o.value === recordId);
      if (!recordId) return;
      saveEntryMatch({
        entryId: entry.id,
        matchedModule: module,
        matchedRecordId: Number(recordId),
        matchedRecordLabel: opt ? `${opt.label}${opt.sub ? ` / ${opt.sub}` : ""}` : "",
        remarks,
      });
    }
    onUpdated();
  };

  const handleReconcile = () => {
    const updated = confirmEntryReconciliation(entry.id);
    if (updated) {
      onUpdated();
      onOpenChange(false);
    }
  };

  const handleIgnore = () => {
    ignoreBankEntry(entry.id);
    onUpdated();
    onOpenChange(false);
  };

  const handleReset = () => {
    resetEntryMatch(entry.id);
    onUpdated();
    onOpenChange(false);
  };

  const canSaveMatch =
    module === "other" ? !!ledgerId : module !== "" && !!recordId;
  const canReconcile = entry.matchStatus === "matched";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-visible flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-sm">Match Bank Entry</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-8rem)] pr-1 -mr-1 space-y-3">
          <div className="rounded-lg border bg-muted/20 p-3 space-y-1 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Date</span>
              <span>{entry.transactionDate}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium tabular-nums">
                {entry.debit > 0 ? `Dr ${formatINR(entry.debit)}` : `Cr ${formatINR(entry.credit)}`}
              </span>
            </div>
            <p className="text-muted-foreground pt-1">{entry.narration}</p>
            <div className="pt-1">
              <MatchStatusBadge status={entry.matchStatus} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Match Module</Label>
              <Select value={module || undefined} onValueChange={(v) => { setModule(v as MatchModule); setRecordId(""); setLedgerId(""); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent className="z-[400]">
                  {MATCH_MODULE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {module && module !== "other" && (
              <>
                <Input
                  className="h-8 text-xs"
                  placeholder="Search records…"
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                />
                <SearchableSelect
                  label="Matched Record"
                  value={recordId}
                  onChange={setRecordId}
                  options={recordOptions}
                  placeholder="Search and select record"
                  required
                />
              </>
            )}

            {module === "other" && (
              <>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      className="h-8 text-xs mb-1"
                      placeholder="Search ledger…"
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                    />
                    <SearchableSelect
                      label="Ledger"
                      value={ledgerId}
                      onChange={setLedgerId}
                      options={ledgerOptions}
                      placeholder="Select ledger"
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs shrink-0 mb-0.5"
                    onClick={() => setCreateLedgerOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    New
                  </Button>
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Remarks</Label>
              <Textarea className="text-xs min-h-[60px]" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Bank charges, interest, etc." />
            </div>

            {entry.matchedModule && (
              <p className="text-[10px] text-muted-foreground">
                Current: {matchModuleLabel(entry.matchedModule)}
                {entry.matchedRecordLabel ? ` · ${entry.matchedRecordLabel}` : ""}
                {entry.ledgerName ? ` · ${entry.ledgerName}` : ""}
              </p>
            )}
          </div>
          </div>

          <DialogFooter className="flex-wrap gap-2 sm:justify-between shrink-0 pt-2">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={handleIgnore}>
                Ignore
              </Button>
              {entry.matchStatus !== "unmatched" && (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleReset}>
                  Reset
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs"
                variant="secondary"
                disabled={!canSaveMatch || entry.matchStatus === "reconciled"}
                onClick={handleSaveMatch}
              >
                Save Match
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                disabled={!canReconcile}
                onClick={handleReconcile}
                title="Confirm reconciliation after match is saved"
              >
                Confirm Reconcile
              </Button>
            </div>
          </DialogFooter>
          <p className="text-[10px] text-muted-foreground -mt-2">
            Save match first, then confirm reconciliation. No auto-reconcile.
          </p>
        </DialogContent>
      </Dialog>

      <CreateLedgerModal
        open={createLedgerOpen}
        onOpenChange={setCreateLedgerOpen}
        onCreated={(ledger: Ledger) => {
          setLedgerId(String(ledger.id));
          setLedgerSearch(ledger.ledgerName);
        }}
      />
    </>
  );
}
