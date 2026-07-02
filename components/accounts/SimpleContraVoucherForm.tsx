"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save, X } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { formatMoney } from "@/lib/accounts/money-format";
import { ledgerMatchesVoucherScope } from "@/lib/accounts/voucher-quick-add-ledger";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { useCoaRecords } from "@/lib/accounts/use-coa-records";
import {
  buildContraVoucherLines,
  canEditVoucher,
  createVoucher,
  generateVoucherNumber,
  getVoucherById,
  loadVouchers,
  parseContraVoucherFromLines,
  updateVoucher,
  validateContraVoucherForPost,
  validateVoucherForPost,
  VOUCHER_TYPE_LABELS,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { findLedgerById } from "@/lib/accounts/coa-hierarchy";
import { useClientMounted } from "@/lib/use-client-mounted";

interface SimpleContraVoucherFormProps {
  cancelHref: string;
  onDone: () => void;
  voucherId?: number;
  readOnly?: boolean;
  onEdit?: () => void;
  entryModeControl?: React.ReactNode;
  onDirtyChange?: (dirty: boolean) => void;
}

export function SimpleContraVoucherForm({
  cancelHref,
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
  entryModeControl,
  onDirtyChange,
}: SimpleContraVoucherFormProps) {
  const mounted = useClientMounted();
  const label = VOUCHER_TYPE_LABELS.contra;
  const isEdit = voucherId != null && !readOnly;
  const isView = voucherId != null && readOnly;
  const existing = useMemo(
    () => (mounted && voucherId != null ? getVoucherById(voucherId) : undefined),
    [voucherId, mounted],
  );
  const parsed = useMemo(
    () => (existing ? parseContraVoucherFromLines(existing.lines) : null),
    [existing],
  );

  const [date, setDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [narration, setNarration] = useState("");
  const [amount, setAmount] = useState("");
  const [fromLedger, setFromLedger] = useState<ChartOfAccount | null>(null);
  const [toLedger, setToLedger] = useState<ChartOfAccount | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    setDate(existing?.date ?? new Date().toISOString().slice(0, 10));
    setReferenceNo(existing?.referenceNo ?? "");
    setNarration(existing?.narration ?? "");
    setAmount(parsed?.amount ? String(parsed.amount) : "");
    setFromLedger(
      parsed?.fromLedgerId ? findLedgerById(parsed.fromLedgerId) ?? null : null,
    );
    setToLedger(parsed?.toLedgerId ? findLedgerById(parsed.toLedgerId) ?? null : null);
  }, [mounted, existing, parsed]);

  const voucherNumber = mounted
    ? existing?.voucherNumber ?? generateVoucherNumber("contra", loadVouchers())
    : "";
  const voucherStatus = existing?.status ?? "draft";

  const coaRecords = useCoaRecords();
  const numericAmount = Number(amount) || 0;

  const simpleInput = useMemo(
    () => ({
      fromLedgerId: fromLedger?.id ?? null,
      fromLedgerName: fromLedger?.accountName ?? "",
      toLedgerId: toLedger?.id ?? null,
      toLedgerName: toLedger?.accountName ?? "",
      amount: numericAmount,
      referenceNo,
    }),
    [fromLedger, toLedger, numericAmount, referenceNo],
  );

  const canPost = useMemo(
    () => validateContraVoucherForPost(simpleInput) == null,
    [simpleInput],
  );

  const bankCashFilter = useMemo(
    () => (ledger: ChartOfAccount) => ledgerMatchesVoucherScope(ledger, "bank_cash", coaRecords),
    [coaRecords],
  );

  useEffect(() => {
    if (!onDirtyChange || readOnly) return;
    const dirty =
      Boolean(referenceNo.trim()) ||
      Boolean(narration.trim()) ||
      numericAmount > 0 ||
      fromLedger != null ||
      toLedger != null;
    onDirtyChange(dirty);
  }, [referenceNo, narration, numericAmount, fromLedger, toLedger, onDirtyChange, readOnly]);

  const impactLines = useMemo(() => {
    if (!fromLedger && !toLedger && numericAmount <= 0) return [];
    const amt = numericAmount > 0 ? numericAmount : 0;
    const lines = [];
    if (toLedger) {
      lines.push({
        ledger: toLedger.accountName,
        debit: amt > 0 ? amt : undefined,
        note: "Debit — transfer to",
      });
    }
    if (fromLedger) {
      lines.push({
        ledger: fromLedger.accountName,
        credit: amt > 0 ? amt : undefined,
        note: "Credit — transfer from",
      });
    }
    return lines;
  }, [fromLedger, toLedger, numericAmount]);

  const buildLines = () => buildContraVoucherLines(simpleInput);

  const persistVoucher = (status: "draft" | "posted") => {
    const payload = {
      date,
      referenceNo,
      narration,
      lines: buildLines(),
      status,
      entryMode: "simple" as const,
    };
    if (isEdit && voucherId != null) {
      updateVoucher(voucherId, payload);
    } else {
      createVoucher("contra", payload);
    }
    onDone();
  };

  const handlePost = () => {
    setError(null);
    const preErr = validateContraVoucherForPost(simpleInput);
    if (preErr) {
      setError(preErr);
      return;
    }
    const lines = buildLines();
    const postErr = validateVoucherForPost({ date, narration, lines });
    if (postErr) {
      setError(postErr);
      return;
    }
    persistVoucher("posted");
  };

  const pageTitle = isView ? `View ${label}` : isEdit ? `Edit ${label}` : `New ${label}`;

  if (!mounted) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", pageTitle, cancelHref)}
        title={pageTitle}
        description="Transfer funds between cash and bank accounts."
        layout="standard"
        className="w-full"
      >
        <div className="border border-border rounded-xl bg-muted/10 h-56 animate-pulse" />
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Transactions", pageTitle, cancelHref)}
      title={pageTitle}
      description="Transfer funds between cash and bank accounts."
      actions={
        readOnly ? (
          <>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onDone}>
              <X className="w-3.5 h-3.5" /> Back
            </Button>
            {existing && canEditVoucher(existing) && onEdit && (
              <Button
                size="sm"
                className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1"
                onClick={onEdit}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onDone}>
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1"
              onClick={handlePost}
              disabled={!canPost}
            >
              <Save className="w-3.5 h-3.5" /> Post Voucher
            </Button>
          </>
        )
      }
      layout="standard"
      className="w-full"
    >
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="border border-border rounded-xl bg-white shadow-sm p-4 space-y-4 w-full">
        {entryModeControl && <div className="pb-1">{entryModeControl}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Date <span className="text-red-500">*</span>
            </Label>
            <Input
              className="h-9 text-sm rounded-lg bg-white w-full"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Voucher Number</Label>
            <Input className="h-9 text-sm font-mono bg-muted/30 w-full" value={voucherNumber} readOnly disabled />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Reference No</Label>
            <Input
              className="h-9 text-sm rounded-lg bg-white w-full"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="Cheque / UTR ref…"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Status</Label>
            <div className="h-9 flex items-center">
              <StatusBadge status={voucherStatus} />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Narration</Label>
          <Textarea
            className="text-sm min-h-[52px] resize-none bg-white w-full rounded-lg"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Voucher narration…"
            disabled={readOnly}
          />
        </div>

        <div className="pb-2.5 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Transfer Details
          </p>
        </div>

        <div className="space-y-3">
          <GroupedLedgerSelect
            label="Transfer From"
            required={!readOnly}
            value={fromLedger?.id ?? null}
            onChange={setFromLedger}
            placeholder="Select source bank or cash ledger…"
            ledgerFilter={bankCashFilter}
            quickAddScope="bank_cash"
            disabled={readOnly}
          />

          <GroupedLedgerSelect
            label="Transfer To"
            required={!readOnly}
            value={toLedger?.id ?? null}
            onChange={setToLedger}
            placeholder="Select destination bank or cash ledger…"
            ledgerFilter={bankCashFilter}
            quickAddScope="bank_cash"
            disabled={readOnly}
          />

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Amount {!readOnly && <span className="text-red-500">*</span>}
            </Label>
            <AccountsMoneyInput
              compact={false}
              className="h-9 text-sm bg-white w-full rounded-lg"
              value={amount}
              onChange={(v) => setAmount(String(v))}
              placeholder="0.00"
              disabled={readOnly}
            />
            {numericAmount > 0 && (
              <p className="text-[11px] text-muted-foreground">{formatMoney(numericAmount)}</p>
            )}
          </div>
        </div>
      </div>

      {impactLines.length > 0 && (
        <LedgerImpactPreview
          title={readOnly ? "Posted Ledger Entries" : "Ledger Impact Preview"}
          lines={impactLines}
          className="mt-4"
        />
      )}
    </AccountsPageShell>
  );
}
