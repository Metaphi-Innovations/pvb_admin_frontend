"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Save, X } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import {
  VOUCHER_BUTTON_CLASS,
  VOUCHER_ERROR_CLASS,
  VOUCHER_FIELD_DATE,
  VOUCHER_FIELD_MODE,
  VOUCHER_FIELD_NARRATION,
  VOUCHER_FIELD_NUMBER,
  VOUCHER_FIELD_REFERENCE,
  VOUCHER_FORM_CARD,
  VOUCHER_FORM_OUTER,
  VOUCHER_HEADER_GRID,
  VOUCHER_INPUT_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
  VOUCHER_PREVIEW_TEXT_CLASS,
  resolveVoucherFormId,
  VoucherFormField,
  VoucherFormSection,
  VoucherFormSummary,
  VoucherNotFoundMessage,
  VoucherSelectContent,
  VoucherTransactionPanel,
  VoucherDetailsTable,
  VoucherDetailsTableRow,
  VoucherLedgerCurBalance,
} from "@/components/accounts/voucher-simple-form-ui";
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
  validateVoucherDraft,
  VOUCHER_TYPE_LABELS,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { findLedgerById } from "@/lib/accounts/coa-hierarchy";
import { executeManualVoucherPost } from "@/lib/accounts/voucher-posting-flow";
import { cn } from "@/lib/utils";
import { useClientMounted } from "@/lib/use-client-mounted";

const TRANSFER_MODES = ["Bank Transfer", "Cash Deposit", "Cash Withdrawal", "Cheque", "Other"] as const;

interface SimpleContraVoucherFormProps {
  cancelHref: string;
  onDone: () => void;
  voucherId?: number;
  readOnly?: boolean;
  onEdit?: () => void;
}

export function SimpleContraVoucherForm({
  cancelHref,
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
}: SimpleContraVoucherFormProps) {
  const mounted = useClientMounted();
  const label = VOUCHER_TYPE_LABELS.contra;
  const resolvedVoucherId = resolveVoucherFormId(voucherId);
  const isNew = resolvedVoucherId == null;
  const isEdit = !isNew && !readOnly;
  const isView = !isNew && readOnly;
  const existing = useMemo(
    () => (mounted && !isNew && resolvedVoucherId != null ? getVoucherById(resolvedVoucherId) : undefined),
    [resolvedVoucherId, mounted, isNew],
  );
  const parsed = useMemo(
    () => (existing ? parseContraVoucherFromLines(existing.lines) : null),
    [existing],
  );

  const [date, setDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [transferMode, setTransferMode] = useState<string>("Bank Transfer");
  const [narration, setNarration] = useState("");
  const [amount, setAmount] = useState("");
  const [fromRemark, setFromRemark] = useState("");
  const [toRemark, setToRemark] = useState("");
  const [fromLedger, setFromLedger] = useState<ChartOfAccount | null>(null);
  const [toLedger, setToLedger] = useState<ChartOfAccount | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    if (isNew) {
      setDate(new Date().toISOString().slice(0, 10));
      setReferenceNo("");
      setTransferMode("Bank Transfer");
      setNarration("");
      setAmount("");
      setFromRemark("");
      setToRemark("");
      setFromLedger(null);
      setToLedger(null);
      setError(null);
      return;
    }
    if (!existing) return;

    setDate(existing.date);
    setReferenceNo(existing.referenceNo ?? "");
    setTransferMode(existing.paymentMode ?? "Bank Transfer");
    setNarration(existing.narration ?? "");
    setAmount(parsed?.amount ? String(parsed.amount) : "");
    setFromRemark(parsed?.fromLineRemarks ?? "");
    setToRemark(parsed?.toLineRemarks ?? "");
    setFromLedger(
      parsed?.fromLedgerId ? findLedgerById(parsed.fromLedgerId) ?? null : null,
    );
    setToLedger(parsed?.toLedgerId ? findLedgerById(parsed.toLedgerId) ?? null : null);
    setError(null);
  }, [mounted, isNew, existing, parsed]);

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
      fromLineRemarks: fromRemark,
      toLineRemarks: toRemark,
    }),
    [fromLedger, toLedger, numericAmount, referenceNo, fromRemark, toRemark],
  );

  const canPost = useMemo(
    () => validateContraVoucherForPost(simpleInput) == null,
    [simpleInput],
  );

  const bankCashFilter = useMemo(
    () => (ledger: ChartOfAccount) => ledgerMatchesVoucherScope(ledger, "bank_cash", coaRecords),
    [coaRecords],
  );

  const builtLines = useMemo(() => buildContraVoucherLines(simpleInput), [simpleInput]);

  const persistVoucher = (status: "draft" | "posted") => {
    const payload = {
      date,
      financialYearId: existing?.financialYearId ?? null,
      financialYearName: existing?.financialYearName ?? "",
      referenceNo,
      narration,
      paymentMode: transferMode,
      lines: builtLines,
      status,
      entryMode: "simple" as const,
    };
    if (isEdit && resolvedVoucherId != null) {
      updateVoucher(resolvedVoucherId, payload);
    } else {
      createVoucher("contra", payload);
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
    if (!date) {
      setError("Date is required.");
      return;
    }

    const result = executeManualVoucherPost({
      voucherType: "contra",
      voucherId: isEdit ? resolvedVoucherId : null,
      simpleContraInput: simpleInput,
      payload: {
        date,
        financialYearId: existing?.financialYearId ?? null,
        financialYearName: existing?.financialYearName ?? "",
        referenceNo,
        narration,
        paymentMode: transferMode,
        lines: builtLines,
        status: "draft",
        entryMode: "simple",
      },
    });

    if (!result.success) {
      setError(result.error ?? "Failed to post voucher.");
      return;
    }

    onDone();
  };

  const pageTitle = isView ? `View ${label}` : isEdit ? `Edit ${label}` : `New ${label}`;

  if (mounted && !isNew && !existing) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", pageTitle, cancelHref)}
        title={pageTitle}
        description="Transfer between cash and bank accounts."
        layout="form"
        actions={
          <Button variant="outline" size="sm" className={cn(VOUCHER_BUTTON_CLASS, "gap-1")} onClick={onDone}>
            <X className="w-3.5 h-3.5" /> Back
          </Button>
        }
      >
        <VoucherNotFoundMessage message="Contra voucher not found." />
      </AccountsPageShell>
    );
  }

  const formBody = (
    <div className={cn(VOUCHER_FORM_OUTER)}>
      {error && <div className={VOUCHER_ERROR_CLASS}>{error}</div>}
      <div className={VOUCHER_FORM_CARD}>
        <VoucherFormSection title="Voucher Details">
          <div className={VOUCHER_HEADER_GRID}>
            <VoucherFormField label="Date" required className={VOUCHER_FIELD_DATE}>
              <Input
                className={VOUCHER_INPUT_CLASS}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={readOnly}
              />
            </VoucherFormField>

            <VoucherFormField label="Contra No." className={VOUCHER_FIELD_NUMBER}>
              <Input
                className={cn(VOUCHER_INPUT_CLASS, "font-mono bg-muted/30")}
                value={voucherNumber}
                readOnly
                disabled
              />
            </VoucherFormField>

            <VoucherFormField label="Reference No." className={VOUCHER_FIELD_REFERENCE}>
              <Input
                className={VOUCHER_INPUT_CLASS}
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Cheque / UTR…"
                disabled={readOnly}
              />
            </VoucherFormField>

            <VoucherFormField label="Transfer Mode" className={VOUCHER_FIELD_MODE}>
              <Select value={transferMode} onValueChange={setTransferMode} disabled={readOnly}>
                <SelectTrigger className={VOUCHER_INPUT_CLASS}>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <VoucherSelectContent>
                  {TRANSFER_MODES.map((m) => (
                    <SelectItem key={m} value={m} className="text-[13px]">
                      {m}
                    </SelectItem>
                  ))}
                </VoucherSelectContent>
              </Select>
            </VoucherFormField>

            {isView && (
              <VoucherFormField label="Status">
                <div className="h-9 flex items-center">
                  <StatusBadge status={voucherStatus} />
                </div>
              </VoucherFormField>
            )}
          </div>
        </VoucherFormSection>

        <VoucherFormSection title="Transfer Details">
          <VoucherTransactionPanel>
            <VoucherDetailsTable>
              <VoucherDetailsTableRow columns={2}>
                <div className="min-w-0">
                  <VoucherFormField label="Transfer From Account" required className="min-w-0">
                    {readOnly ? (
                      <p className={cn("h-9 flex items-center", VOUCHER_PREVIEW_TEXT_CLASS)}>
                        {fromLedger?.accountName ?? "—"}
                      </p>
                    ) : (
                      <GroupedLedgerSelect
                        value={fromLedger?.id ?? null}
                        fallbackLabel={fromLedger?.accountName}
                        onChange={setFromLedger}
                        placeholder="Select bank or cash account…"
                        ledgerFilter={bankCashFilter}
                        quickAddScope="bank_cash"
                        className="text-[13px]"
                        listMaxHeight={260}
                      />
                    )}
                  </VoucherFormField>
                  <VoucherLedgerCurBalance ledger={fromLedger} asOfDate={date} />
                </div>

                <VoucherFormField label="Remark" className="min-w-0">
                  {readOnly ? (
                    <p className={cn("h-9 flex items-center", VOUCHER_PREVIEW_TEXT_CLASS)}>
                      {fromRemark || "—"}
                    </p>
                  ) : (
                    <Input
                      className={VOUCHER_INPUT_CLASS}
                      value={fromRemark}
                      onChange={(e) => setFromRemark(e.target.value)}
                      placeholder="Line remark…"
                    />
                  )}
                </VoucherFormField>
              </VoucherDetailsTableRow>

              <VoucherDetailsTableRow columns={2}>
                <div className="min-w-0">
                  <VoucherFormField label="Transfer To Account" required className="min-w-0">
                    {readOnly ? (
                      <p className={cn("h-9 flex items-center", VOUCHER_PREVIEW_TEXT_CLASS)}>
                        {toLedger?.accountName ?? "—"}
                      </p>
                    ) : (
                      <GroupedLedgerSelect
                        value={toLedger?.id ?? null}
                        fallbackLabel={toLedger?.accountName}
                        onChange={setToLedger}
                        placeholder="Select bank or cash account…"
                        ledgerFilter={bankCashFilter}
                        quickAddScope="bank_cash"
                        className="text-[13px]"
                        listMaxHeight={260}
                      />
                    )}
                  </VoucherFormField>
                  <VoucherLedgerCurBalance ledger={toLedger} asOfDate={date} />
                </div>

                <VoucherFormField label="Amount" required className="min-w-0">
                  {readOnly ? (
                    <p className={cn("h-9 flex items-center justify-end tabular-nums", VOUCHER_PREVIEW_TEXT_CLASS)}>
                      {numericAmount > 0 ? formatMoney(numericAmount) : "—"}
                    </p>
                  ) : (
                    <AccountsMoneyInput
                      compact={false}
                      className={cn(VOUCHER_INPUT_CLASS, VOUCHER_MONEY_INPUT_CLASS)}
                      value={numericAmount}
                      onChange={(v) => setAmount(String(v))}
                    />
                  )}
                </VoucherFormField>
              </VoucherDetailsTableRow>
            </VoucherDetailsTable>

            <VoucherFormField label="Narration" className={VOUCHER_FIELD_NARRATION}>
              <Textarea
                className={cn(VOUCHER_INPUT_CLASS, "min-h-[44px] max-h-20 h-auto py-1.5 resize-y")}
                rows={2}
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Optional narration…"
                disabled={readOnly}
              />
            </VoucherFormField>
          </VoucherTransactionPanel>
        </VoucherFormSection>

        <VoucherFormSummary totalAmount={numericAmount} />
      </div>
    </div>
  );

  if (!mounted) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", pageTitle, cancelHref)}
        title={pageTitle}
        description="Move funds between your bank and cash accounts."
        layout="form"
      >
        <div className={cn(VOUCHER_FORM_OUTER, "border border-border rounded-xl bg-muted/10 h-48 animate-pulse")} />
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Transactions", pageTitle, cancelHref)}
      title={pageTitle}
      description="Move funds between your bank and cash accounts."
      layout="form"
      actions={
        readOnly ? (
          <>
            <Button variant="outline" size="sm" className={cn(VOUCHER_BUTTON_CLASS, "gap-1")} onClick={onDone}>
              <X className="w-3.5 h-3.5" /> Back
            </Button>
            {existing && canEditVoucher(existing) && onEdit && (
              <Button
                size="sm"
                className={cn(VOUCHER_BUTTON_CLASS, "bg-brand-600 hover:bg-brand-700 text-white gap-1")}
                onClick={onEdit}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" className={cn(VOUCHER_BUTTON_CLASS, "gap-1")} onClick={onDone}>
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(VOUCHER_BUTTON_CLASS, "gap-1")}
              onClick={handleSaveDraft}
            >
              <Save className="w-4 h-4" /> Save Draft
            </Button>
            <Button
              size="sm"
              className={cn(VOUCHER_BUTTON_CLASS, "bg-brand-600 hover:bg-brand-700 text-white gap-1")}
              onClick={handlePost}
              disabled={!canPost}
            >
              <Save className="w-3.5 h-3.5" /> Post Voucher
            </Button>
          </>
        )
      }
    >
      {formBody}
    </AccountsPageShell>
  );
}
