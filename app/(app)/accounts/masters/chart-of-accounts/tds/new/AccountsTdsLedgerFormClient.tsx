"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { ActiveInactiveToggle } from "@/components/ui/ActiveInactiveToggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BadgePercent,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  ExternalLink,
  Save,
  Search,
  X,
  XCircle,
} from "lucide-react";
import {
  formatApplicableToLabels,
  getTdsSectionCode,
  loadTDSMasters,
  type TDSMaster,
} from "@/app/(app)/masters/tds/tds-data";
import { saveChartOfAccounts, loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { parentGroupLabel } from "../../chart-of-accounts-data";
import {
  buildDefaultTdsLedgerForm,
  createTdsLedgerFromForm,
  tdsMasterToFormPatch,
  validateTdsLedgerForm,
  type TdsLedgerFormValues,
} from "@/lib/accounts/tds-ledger-form";
import { inferTdsLedgerKind } from "@/lib/accounts/coa-specialized-groups";
import { formatTdsRateDisplay } from "@/app/(app)/masters/tds/tds-data";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { useClientMounted } from "@/lib/use-client-mounted";
import {
  ACCOUNTS_PAGE_SUBTITLE_CLASS,
  ACCOUNTS_PAGE_TITLE_CLASS,
} from "@/lib/accounts/accounts-typography";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { dispatchCoaChanged } from "@/lib/accounts/coa-events";

export const TDS_MASTER_CHANGED = "ds_tds_master_changed";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        "animate-in slide-in-from-top-2 fade-in-0 duration-300",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      {toast.type === "success" ? (
        <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
      ) : (
        <XCircle className="flex-shrink-0 w-4 h-4" />
      )}
      {toast.msg}
      <button type="button" onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2.5 border-b border-border mb-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      <p className="h-9 flex items-center px-3 text-sm rounded-lg border border-border bg-muted/20 text-foreground">
        {value || "—"}
      </p>
    </div>
  );
}

export interface AccountsTdsLedgerFormProps {
  parentGroupId: number;
  onClose: () => void;
  onSaved?: (ledgerId: number, parentGroupId: number | null) => void;
}

export default function AccountsTdsLedgerFormClient({
  parentGroupId,
  onClose,
  onSaved,
}: AccountsTdsLedgerFormProps) {
  const mounted = useClientMounted();
  const canCreate = useCanCoa("create");

  const [records, setRecords] = useState(() => loadChartOfAccounts());
  const [form, setForm] = useState<TdsLedgerFormValues>(() =>
    buildDefaultTdsLedgerForm(parentGroupId, loadChartOfAccounts()),
  );
  const [tdsMasters, setTdsMasters] = useState<TDSMaster[]>(() => loadTDSMasters());
  const [sectionOpen, setSectionOpen] = useState(false);
  const [sectionSearch, setSectionSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saving, setSaving] = useState(false);

  const refreshMasters = useCallback(() => {
    setTdsMasters(loadTDSMasters());
  }, []);

  useEffect(() => {
    refreshMasters();
    const onStorage = (e: StorageEvent) => {
      if (e.key?.includes("tds_masters")) refreshMasters();
    };
    const onCustom = () => refreshMasters();
    window.addEventListener("storage", onStorage);
    window.addEventListener(TDS_MASTER_CHANGED, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(TDS_MASTER_CHANGED, onCustom);
    };
  }, [refreshMasters]);

  const parent = records.find((r) => r.id === parentGroupId);
  const tdsKind = parent ? inferTdsLedgerKind(parent, records) : form.tdsKind;
  const selectedMaster = tdsMasters.find((m) => m.id === form.tdsMasterId) ?? null;

  const activeSections = useMemo(
    () => tdsMasters.filter((m) => m.status === "active"),
    [tdsMasters],
  );

  const filteredSections = useMemo(() => {
    const q = sectionSearch.trim().toLowerCase();
    if (!q) return activeSections;
    return activeSections.filter(
      (m) =>
        getTdsSectionCode(m).toLowerCase().includes(q) ||
        m.sectionName.toLowerCase().includes(q),
    );
  }, [activeSections, sectionSearch]);

  const showToast = (msg: string, type: ToastState["type"]) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const selectSection = (master: TDSMaster) => {
    setForm((prev) => ({
      ...prev,
      ...tdsMasterToFormPatch(master, tdsKind),
    }));
    setFormError(null);
    setSectionOpen(false);
    setSectionSearch("");
  };

  const handleSave = () => {
    if (!canCreate) {
      showToast("You do not have permission to create ledgers.", "error");
      return;
    }
    const payload = { ...form, parentGroupId, tdsKind };
    const err = validateTdsLedgerForm(payload, records);
    if (err) {
      setFormError(err);
      showToast(err, "error");
      return;
    }

    setSaving(true);
    try {
      const { ledger, records: next } = createTdsLedgerFromForm(payload, records);
      saveChartOfAccounts(next);
      setRecords(next);
      dispatchCoaChanged();
      dispatchAccountsDataChanged("ledgers", { operation: "create", recordId: ledger.id });
      showToast(`TDS ledger "${ledger.accountName}" created.`, "success");
      onSaved?.(ledger.id, parentGroupId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create TDS ledger.";
      setFormError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  const kindLabel = tdsKind === "payable" ? "TDS Payable" : "TDS Receivable";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}

      <div className="sticky top-0 z-10 bg-white border-b border-border px-5 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 hover:bg-muted rounded-md transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
          <BadgePercent className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={ACCOUNTS_PAGE_TITLE_CLASS}>Add TDS Ledger</h2>
          <p className={ACCOUNTS_PAGE_SUBTITLE_CLASS}>
            Chart of Accounts → {kindLabel} → New section ledger
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
          onClick={handleSave}
          disabled={saving || !canCreate}
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving…" : "Save Ledger"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="max-w-[720px] space-y-5">
          <div className="rounded-xl border border-navy-100 bg-navy-50/40 px-3 py-2.5 text-xs text-navy-800 flex items-start gap-2">
            <BadgePercent className="w-4 h-4 flex-shrink-0 mt-0.5 text-navy-600" />
            <div className="space-y-1">
              <p className="font-medium">TDS sections are configured in TDS Master</p>
              <p className="text-[11px] text-navy-700/90">
                Select a section to auto-fill rate, code, and deductee applicability. GST and TDS
                use separate ledger forms.
              </p>
              <Link
                href="/masters/tds"
                className="inline-flex items-center gap-1 text-brand-600 hover:underline font-medium"
              >
                Open TDS Master
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <SectionHeading label="TDS Configuration" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs font-medium">
                TDS Section <span className="text-red-500">*</span>
              </Label>
              <Popover open={sectionOpen} onOpenChange={setSectionOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full h-9 px-3 text-sm text-left border border-border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <span className={selectedMaster ? "text-foreground" : "text-muted-foreground"}>
                      {selectedMaster
                        ? `${getTdsSectionCode(selectedMaster)} — ${selectedMaster.sectionName}`
                        : "Select TDS section from master…"}
                    </span>
                    <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground pointer-events-none" />
                      <input
                        placeholder="Search section…"
                        value={sectionSearch}
                        onChange={(e) => setSectionSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm focus:outline-none bg-transparent"
                      />
                    </div>
                  </div>
                  <div className="max-h-[240px] overflow-y-auto p-1">
                    {filteredSections.length === 0 ? (
                      <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                        No active TDS sections.{" "}
                        <Link href="/masters/tds" className="text-brand-600 hover:underline">
                          Add in TDS Master
                        </Link>
                      </p>
                    ) : (
                      filteredSections.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => selectSection(m)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-lg transition-colors hover:bg-muted/60",
                            form.tdsMasterId === m.id && "bg-brand-50",
                          )}
                        >
                          <span className="flex-1 min-w-0">
                            <span className="font-mono text-xs font-semibold text-brand-700">
                              {getTdsSectionCode(m)}
                            </span>
                            <span className="text-foreground ml-1.5">{m.sectionName}</span>
                            <span className="block text-[11px] text-muted-foreground mt-0.5">
                              {formatTdsRateDisplay(m.tdsRate)}
                            </span>
                          </span>
                          {form.tdsMasterId === m.id ? (
                            <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <ReadOnlyField
              label="Section Code"
              value={selectedMaster ? getTdsSectionCode(selectedMaster) : ""}
            />
            <ReadOnlyField
              label="TDS Nature"
              value={selectedMaster?.sectionName ?? ""}
            />
            <ReadOnlyField
              label="TDS Rate"
              value={selectedMaster ? formatTdsRateDisplay(selectedMaster.tdsRate) : ""}
            />
            <ReadOnlyField
              label="Deductee Type"
              value={
                selectedMaster ? formatApplicableToLabels(selectedMaster.applicableTo) : ""
              }
            />
            <ReadOnlyField
              label="Threshold Limit"
              value={
                selectedMaster?.thresholdAmount != null
                  ? `₹${selectedMaster.thresholdAmount.toLocaleString("en-IN")}`
                  : selectedMaster
                    ? "—"
                    : ""
              }
            />
            <ReadOnlyField label="Payable / Receivable" value={kindLabel} />
          </div>

          <SectionHeading label="Ledger Details" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs font-medium">
                Ledger Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.ledgerName}
                onChange={(e) => {
                  setForm((p) => ({ ...p, ledgerName: e.target.value }));
                  setFormError(null);
                }}
                placeholder="Auto-filled from section — editable"
                className="h-9 text-sm rounded-lg"
              />
            </div>

            <ReadOnlyField
              label="Parent Group"
              value={parentGroupLabel(records, parentGroupId)}
            />

            <div className="space-y-1">
              <Label className="text-xs font-medium">Balance Type</Label>
              <p className="h-9 flex items-center px-3 text-sm rounded-lg border border-border bg-muted/20">
                {form.balanceType}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Opening Balance</Label>
              <AccountsMoneyInput
                className="h-9 text-sm rounded-lg"
                value={form.openingBalance}
                onChange={(v) => setForm((p) => ({ ...p, openingBalance: String(v) }))}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Status</Label>
              <ActiveInactiveToggle
                active={form.status === "active"}
                onChange={(v) =>
                  setForm((p) => ({ ...p, status: v ? "active" : "inactive" }))
                }
              />
            </div>
          </div>

          {formError ? (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {formError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}