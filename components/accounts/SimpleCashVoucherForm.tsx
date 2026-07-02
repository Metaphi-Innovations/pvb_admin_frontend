"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save, X } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { formatMoney, MONEY_INPUT_CLASS } from "@/lib/accounts/money-format";
import { ledgerMatchesVoucherScope } from "@/lib/accounts/voucher-quick-add-ledger";
import { applyAutoPartyToLines } from "@/lib/accounts/voucher-ledger-groups";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { useCoaRecords } from "@/lib/accounts/use-coa-records";
import {
  buildPaymentVoucherLines,
  buildReceiptVoucherLines,
  createVoucher,
  getVoucherById,
  parseCashVoucherFromLines,
  updateVoucher,
  validatePaymentVoucherForPost,
  validateReceiptVoucherForPost,
  validateVoucherDraft,
  validateVoucherForPost,
  VOUCHER_TYPE_LABELS,
  generateVoucherNumber,
  loadVouchers,
  canEditVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { findLedgerById } from "@/lib/accounts/coa-hierarchy";
import { useClientMounted } from "@/lib/use-client-mounted";

type CashVoucherMode = "receipt" | "payment";

interface SimpleCashVoucherFormProps {
  mode: CashVoucherMode;
  cancelHref: string;
  onDone: () => void;
  voucherId?: number;
  readOnly?: boolean;
  onEdit?: () => void;
  /** Use full page width (receipt voucher entry). */
  fullWidth?: boolean;
  /** Allow partial ledger entry; post validation only on Post Voucher. */
  flexibleEntry?: boolean;
}

const CONFIG: Record<
  CashVoucherMode,
  {
    partyLabel: string;
    bankLabel: string;
    partyScope: "receipt_credit" | "payment_debit";
    description: string;
  }
> = {
  receipt: {
    partyLabel: "Received From / Party Ledger",
    bankLabel: "Deposit To / Bank or Cash Ledger",
    partyScope: "receipt_credit",
    description: "Record money received. Debit bank/cash and credit party automatically on post.",
  },
  payment: {
    partyLabel: "Paid To / Party or Expense Ledger",
    bankLabel: "Paid From / Bank or Cash Ledger",
    partyScope: "payment_debit",
    description: "Record money paid out. Debit party/expense and credit bank/cash automatically on post.",
  },
};

export function SimpleCashVoucherForm({
  mode,
  cancelHref,
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
  fullWidth = false,
  flexibleEntry = false,
}: SimpleCashVoucherFormProps) {
  const mounted = useClientMounted();
  const cfg = CONFIG[mode];
  const label = VOUCHER_TYPE_LABELS[mode];
  const isEdit = voucherId != null && !readOnly;
  const isView = voucherId != null && readOnly;
  const existing = useMemo(
    () => (mounted && voucherId != null ? getVoucherById(voucherId) : undefined),
    [voucherId, mounted],
  );
  const parsed = useMemo(
    () => (existing ? parseCashVoucherFromLines(existing.lines, mode) : null),
    [existing, mode],
  );

  const [date, setDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [narration, setNarration] = useState("");
  const [amount, setAmount] = useState("");
  const [partyLedger, setPartyLedger] = useState<ChartOfAccount | null>(null);
  const [bankCashLedger, setBankCashLedger] = useState<ChartOfAccount | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    setDate(existing?.date ?? new Date().toISOString().slice(0, 10));
    setReferenceNo(existing?.referenceNo ?? "");
    setNarration(existing?.narration ?? "");
    setAmount(parsed?.amount ? String(parsed.amount) : "");
    setPartyLedger(
      parsed?.partyLedgerId ? findLedgerById(parsed.partyLedgerId) ?? null : null,
    );
    setBankCashLedger(
      parsed?.bankCashLedgerId ? findLedgerById(parsed.bankCashLedgerId) ?? null : null,
    );
  }, [mounted, existing, parsed]);

  const voucherNumber = mounted
    ? existing?.voucherNumber ?? generateVoucherNumber(mode, loadVouchers())
    : "";
  const voucherStatus = existing?.status ?? "draft";

  const coaRecords = useCoaRecords();

  const numericAmount = Number(amount) || 0;

  const simpleInput = useMemo(
    () => ({
      partyLedgerId: partyLedger?.id ?? null,
      partyLedgerName: partyLedger?.accountName ?? "",
      bankCashLedgerId: bankCashLedger?.id ?? null,
      bankCashLedgerName: bankCashLedger?.accountName ?? "",
      amount: numericAmount,
      referenceNo,
    }),
    [partyLedger, bankCashLedger, numericAmount, referenceNo],
  );

  const canPost = useMemo(() => {
    const err =
      mode === "receipt"
        ? validateReceiptVoucherForPost(simpleInput)
        : validatePaymentVoucherForPost(simpleInput);
    return err == null;
  }, [mode, simpleInput]);

  const impactLines = useMemo(() => {
    if (!partyLedger && !bankCashLedger && numericAmount <= 0) return [];
    const amt = numericAmount > 0 ? numericAmount : 0;
    if (mode === "receipt") {
      const lines = [];
      if (bankCashLedger) {
        lines.push({
          ledger: bankCashLedger.accountName,
          debit: amt > 0 ? amt : undefined,
          note: "Debit — money deposited",
        });
      }
      if (partyLedger) {
        lines.push({
          ledger: partyLedger.accountName,
          credit: amt > 0 ? amt : undefined,
          note: "Credit — received from party",
        });
      }
      return lines;
    }
    const lines = [];
    if (partyLedger) {
      lines.push({
        ledger: partyLedger.accountName,
        debit: amt > 0 ? amt : undefined,
        note: "Debit — paid to party / expense",
      });
    }
    if (bankCashLedger) {
      lines.push({
        ledger: bankCashLedger.accountName,
        credit: amt > 0 ? amt : undefined,
        note: "Credit — paid from bank / cash",
      });
    }
    return lines;
  }, [mode, partyLedger, bankCashLedger, numericAmount]);

  const partyFilter = useMemo(
    () => (ledger: ChartOfAccount) => ledgerMatchesVoucherScope(ledger, cfg.partyScope, coaRecords),
    [cfg.partyScope, coaRecords],
  );

  const bankFilter = useMemo(
    () => (ledger: ChartOfAccount) => ledgerMatchesVoucherScope(ledger, "bank_cash", coaRecords),
    [coaRecords],
  );

  const buildLines = () => {
    const raw =
      mode === "receipt"
        ? buildReceiptVoucherLines(simpleInput)
        : buildPaymentVoucherLines(simpleInput);
    return applyAutoPartyToLines(raw, coaRecords);
  };

  const persistVoucher = (status: "draft" | "posted") => {
    const payload = {
      date,
      referenceNo,
      narration,
      lines: buildLines(),
      status,
    };
    if (isEdit && voucherId != null) {
      updateVoucher(voucherId, payload);
    } else {
      createVoucher(mode, payload);
    }
    onDone();
  };

  const handleSaveDraft = () => {
    setError(null);
    const draftErr = validateVoucherDraft({ date });
    if (draftErr) {
      setError(draftErr);
      return;
    }
    persistVoucher("draft");
  };

  const handlePost = () => {
    setError(null);
    const preErr =
      mode === "receipt"
        ? validateReceiptVoucherForPost(simpleInput)
        : validatePaymentVoucherForPost(simpleInput);
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
  const breadcrumbLabel = pageTitle;
  const shellClassName = fullWidth ? "w-full" : "max-w-[720px] mx-auto";
  const headerGridClass = fullWidth ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "grid grid-cols-2 gap-3";
  const ledgerRequired = !readOnly && !flexibleEntry;
  const amountRequired = !readOnly && !flexibleEntry;

  if (!mounted) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", breadcrumbLabel, cancelHref)}
        title={pageTitle}
        description={cfg.description}
        layout="standard"
        className={shellClassName}
      >
        <div className="border border-border rounded-xl bg-muted/10 h-56 animate-pulse" />
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Transactions", breadcrumbLabel, cancelHref)}
      title={pageTitle}
      description={cfg.description}
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
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={handleSaveDraft}
            >
              <Save className="w-3.5 h-3.5" /> Save Draft
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1"
              onClick={handlePost}
              disabled={!flexibleEntry && !canPost}
            >
              <Save className="w-3.5 h-3.5" /> Post Voucher
            </Button>
          </>
        )
      }
      layout="standard"
      className={shellClassName}
    >
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="border border-border rounded-xl bg-white shadow-sm p-4 space-y-4 w-full">
        <div className={headerGridClass}>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Date</Label>
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
            <Label className="text-xs font-medium">Reference Number</Label>
            <Input
              className="h-9 text-sm rounded-lg bg-white w-full"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="Cheque / UTR / receipt ref…"
              disabled={readOnly}
            />
          </div>
          {!fullWidth && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">Status</Label>
              <div className="h-9 flex items-center">
                <StatusBadge status={voucherStatus} />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Narration / Notes</Label>
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
            Voucher Details
          </p>
        </div>

        <div className="space-y-3">
          <GroupedLedgerSelect
            label={cfg.partyLabel}
            required={ledgerRequired}
            value={partyLedger?.id ?? null}
            onChange={setPartyLedger}
            placeholder="Select party / income / expense ledger…"
            ledgerFilter={partyFilter}
            quickAddScope={cfg.partyScope}
            disabled={readOnly}
          />

          <GroupedLedgerSelect
            label={cfg.bankLabel}
            required={ledgerRequired}
            value={bankCashLedger?.id ?? null}
            onChange={setBankCashLedger}
            placeholder="Select bank or cash ledger…"
            ledgerFilter={bankFilter}
            quickAddScope="bank_cash"
            disabled={readOnly}
          />

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Amount {amountRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              className={`h-9 text-sm bg-white w-full rounded-lg ${MONEY_INPUT_CLASS}`}
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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

      {!readOnly && flexibleEntry && !canPost && (
        <p className="text-[11px] text-muted-foreground mt-3">
          Post requires {cfg.partyLabel.toLowerCase()}, {cfg.bankLabel.toLowerCase()}, and an amount
          greater than zero. Save Draft is available with partial entry.
        </p>
      )}

      {!readOnly && !flexibleEntry && !canPost && (partyLedger || bankCashLedger || numericAmount > 0) && (
        <p className="text-[11px] text-muted-foreground mt-3">
          Post requires {cfg.partyLabel.toLowerCase()}, {cfg.bankLabel.toLowerCase()}, and amount
          greater than zero. You can save as draft with partial details.
        </p>
      )}
    </AccountsPageShell>
  );
}
