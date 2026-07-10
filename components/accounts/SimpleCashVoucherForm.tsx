"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Save, X } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import {
  VoucherInlineDocumentSelect,
  resolveVoucherPartyRef,
  useOpenVoucherDocuments,
  type OpenVoucherDocument,
} from "@/components/accounts/VoucherInlineDocumentSelect";
import {
  VOUCHER_AMOUNT_WIDTH,
  VOUCHER_BUTTON_CLASS,
  VOUCHER_ERROR_CLASS,
  VOUCHER_FIELD_DATE,
  VOUCHER_FIELD_MODE,
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
  VOUCHER_LEDGER_SELECT_COMPACT,
  VOUCHER_ROW_EQUAL_4,
} from "@/components/accounts/voucher-simple-form-ui";
import { formatMoney, roundMoney } from "@/lib/accounts/money-format";
import { ledgerMatchesVoucherScope } from "@/lib/accounts/voucher-quick-add-ledger";
import {
  applyAutoPartyToLines,
  isCustomerPartyLedger,
  isVendorPartyLedger,
} from "@/lib/accounts/voucher-ledger-groups";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { useCoaRecords } from "@/lib/accounts/use-coa-records";
import { getVendorById } from "@/lib/accounts/transaction-master-fetch";
import { getPaymentAllocationByVoucherId } from "@/lib/accounts/payables-data";
import { getReceiptAllocationByVoucherId } from "@/lib/accounts/receivables-data";
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
  VOUCHER_TYPE_LABELS,
  generateVoucherNumber,
  loadVouchers,
  canEditVoucher,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { findLedgerById } from "@/lib/accounts/coa-hierarchy";
import { executeManualVoucherPost } from "@/lib/accounts/voucher-posting-flow";
import { cn } from "@/lib/utils";
import { useClientMounted } from "@/lib/use-client-mounted";

type CashVoucherMode = "receipt" | "payment";

const PAYMENT_MODES = ["Cash", "Cheque", "NEFT/RTGS", "UPI", "IMPS", "Other"] as const;

interface SimpleCashVoucherFormProps {
  mode: CashVoucherMode;
  cancelHref: string;
  onDone: () => void;
  voucherId?: number;
  readOnly?: boolean;
  onEdit?: () => void;
}

const COPY: Record<
  CashVoucherMode,
  {
    subtitle: string;
    detailsSection: string;
    accountScope: "receipt_credit" | "payment_debit";
    modeLabel: string;
    numberLabel: string;
    bankLabel: string;
    bankPlaceholder: string;
    partyLabel: string;
    partyPlaceholder: string;
    invoiceLabel: string;
  }
> = {
  receipt: {
    subtitle: "Record money received from a customer, vendor refund, or income account.",
    detailsSection: "Receipt Details",
    accountScope: "receipt_credit",
    modeLabel: "Mode of Receipt",
    numberLabel: "Receipt No.",
    bankLabel: "Receipt Account (Dr)",
    bankPlaceholder: "Select bank, cash, OD or CC account…",
    partyLabel: "Ledger (Cr)",
    partyPlaceholder: "Select customer, vendor refund, income, capital…",
    invoiceLabel: "Against Invoice(s)",
  },
  payment: {
    subtitle: "Record payment to a vendor or expense account.",
    detailsSection: "Payment Details",
    accountScope: "payment_debit",
    modeLabel: "Mode of Payment",
    numberLabel: "Payment No.",
    bankLabel: "Payment Account (Cr)",
    bankPlaceholder: "Select bank, cash, OD or CC account…",
    partyLabel: "Ledger (Dr)",
    partyPlaceholder: "Select vendor, expense, payable…",
    invoiceLabel: "Against Invoice(s)",
  },
};

export function SimpleCashVoucherForm({
  mode,
  cancelHref,
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
}: SimpleCashVoucherFormProps) {
  const mounted = useClientMounted();
  const copy = COPY[mode];
  const label = VOUCHER_TYPE_LABELS[mode];
  const resolvedVoucherId = resolveVoucherFormId(voucherId);
  const isNew = resolvedVoucherId == null;
  const isEdit = !isNew && !readOnly;
  const isView = !isNew && readOnly;
  const existing = useMemo(
    () => (mounted && !isNew && resolvedVoucherId != null ? getVoucherById(resolvedVoucherId) : undefined),
    [resolvedVoucherId, mounted, isNew],
  );
  const parsed = useMemo(
    () => (existing ? parseCashVoucherFromLines(existing.lines, mode) : null),
    [existing, mode],
  );

  const [date, setDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentMode, setPaymentMode] = useState<string>("NEFT/RTGS");
  const [narration, setNarration] = useState("");
  const [amount, setAmount] = useState("");
  const [bankRemark, setBankRemark] = useState("");
  const [partyRemark, setPartyRemark] = useState("");
  const [partyLedger, setPartyLedger] = useState<ChartOfAccount | null>(null);
  const [bankCashLedger, setBankCashLedger] = useState<ChartOfAccount | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [deductTds, setDeductTds] = useState(false);
  const [tdsAmount, setTdsAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const coaRecords = useCoaRecords();
  const partyRef = useMemo(
    () => resolveVoucherPartyRef(mode, partyLedger, coaRecords),
    [mode, partyLedger, coaRecords],
  );
  const showAgainstInvoices = useMemo(() => {
    if (!partyLedger) return false;
    // Receipt: customer (sales invoices) or vendor/sundry creditor (purchase bill refunds)
    // Payment: vendor only
    if (mode === "receipt") {
      return (
        isCustomerPartyLedger(partyLedger, coaRecords) ||
        isVendorPartyLedger(partyLedger, coaRecords)
      );
    }
    return isVendorPartyLedger(partyLedger, coaRecords);
  }, [partyLedger, mode, coaRecords]);

  const allocationDocLabel = useMemo(() => {
    if (mode === "payment") return "Against Vendor Bill(s)";
    if (!partyLedger) return "Against Invoice(s)";
    if (isVendorPartyLedger(partyLedger, coaRecords)) return "Against Purchase Invoice(s)";
    if (isCustomerPartyLedger(partyLedger, coaRecords)) return "Against Sales Invoice(s)";
    return "Against Invoice(s)";
  }, [mode, partyLedger, coaRecords]);

  const allocationKind = useMemo<"invoice" | "bill" | null>(() => {
    if (!showAgainstInvoices || !partyLedger) return null;
    if (isVendorPartyLedger(partyLedger, coaRecords)) return "bill";
    if (isCustomerPartyLedger(partyLedger, coaRecords)) return "invoice";
    return null;
  }, [showAgainstInvoices, partyLedger, coaRecords]);
  const vendor = useMemo(
    () => (partyRef?.kind === "vendor" ? getVendorById(partyRef.contactId) : null),
    [partyRef],
  );
  const showTdsSection = mode === "payment" && (deductTds || Boolean(vendor?.tdsApplicable));
  const numericTds = showTdsSection ? Number(tdsAmount) || 0 : 0;

  useEffect(() => {
    if (!mounted) return;
    if (isNew) {
      setDate(new Date().toISOString().slice(0, 10));
      setReferenceNo("");
      setPaymentMode("NEFT/RTGS");
      setNarration("");
      setAmount("");
      setBankRemark("");
      setPartyRemark("");
      setTdsAmount("");
      setDeductTds(false);
      setPartyLedger(null);
      setBankCashLedger(null);
      setSelectedInvoiceId(null);
      setError(null);
      return;
    }
    if (!existing) return;

    setDate(existing.date);
    setReferenceNo(existing.referenceNo ?? "");
    setPaymentMode(existing.paymentMode ?? "NEFT/RTGS");
    setNarration(existing.narration ?? "");
    const accountAmt = parsed?.accountAmount ?? parsed?.bankAmount ?? parsed?.amount ?? 0;
    setAmount(accountAmt > 0 ? String(accountAmt) : "");
    setBankRemark(parsed?.bankLineRemarks ?? "");
    setPartyRemark(parsed?.partyLineRemarks ?? "");
    setTdsAmount(parsed?.tdsAmount ? String(parsed.tdsAmount) : "");
    setDeductTds((parsed?.tdsAmount ?? 0) > 0);
    setPartyLedger(
      parsed?.partyLedgerId
        ? findLedgerById(parsed.partyLedgerId) ?? null
        : parsed?.expenseHeadLedgerId
          ? findLedgerById(parsed.expenseHeadLedgerId) ?? null
          : null,
    );
    setBankCashLedger(
      parsed?.bankCashLedgerId ? findLedgerById(parsed.bankCashLedgerId) ?? null : null,
    );
    const alloc =
      mode === "receipt"
        ? getReceiptAllocationByVoucherId(resolvedVoucherId!)
        : getPaymentAllocationByVoucherId(resolvedVoucherId!);
    const paymentAlloc =
      mode === "receipt" ? getPaymentAllocationByVoucherId(resolvedVoucherId!) : null;
    const firstLine = alloc?.lines?.[0];
    const paymentLine = paymentAlloc?.lines?.[0];
    if (firstLine) {
      setSelectedInvoiceId((firstLine as { invoiceId: number }).invoiceId);
    } else if (paymentLine) {
      setSelectedInvoiceId((paymentLine as { billId: number }).billId);
    } else {
      setSelectedInvoiceId(null);
    }
    setError(null);
  }, [mounted, isNew, existing, parsed, resolvedVoucherId, mode]);

  useEffect(() => {
    if (!showAgainstInvoices) setSelectedInvoiceId(null);
  }, [showAgainstInvoices]);

  useEffect(() => {
    if (readOnly || mode !== "payment") return;
    if (vendor?.tdsApplicable) setDeductTds(true);
  }, [vendor?.id, vendor?.tdsApplicable, mode, readOnly]);

  const voucherNumber = mounted
    ? existing?.voucherNumber ?? generateVoucherNumber(mode, loadVouchers())
    : "";
  const voucherStatus = existing?.status ?? "draft";

  const numericPartyAmount = Number(amount) || 0;
  const numericBankAmount =
    mode === "payment" && numericTds > 0
      ? Math.max(0, numericPartyAmount - numericTds)
      : numericPartyAmount;

  const handleAmountChange = (v: number) => {
    setAmount(String(v));
  };

  const handleTdsAmountChange = (v: number) => {
    setTdsAmount(String(v));
  };

  const simpleInput = useMemo(
    () => ({
      partyLedgerId: partyLedger?.id ?? null,
      partyLedgerName: partyLedger?.accountName ?? "",
      expenseHeadLedgerId:
        mode === "payment" && partyLedger?.accountType === "Expense"
          ? partyLedger.id
          : null,
      expenseHeadLedgerName:
        mode === "payment" && partyLedger?.accountType === "Expense"
          ? partyLedger.accountName
          : "",
      bankCashLedgerId: bankCashLedger?.id ?? null,
      bankCashLedgerName: bankCashLedger?.accountName ?? "",
      amount: numericBankAmount,
      bankAmount: numericBankAmount,
      accountAmount: numericPartyAmount,
      bankLineRemarks: bankRemark,
      partyLineRemarks: partyRemark,
      tdsAmount: numericTds,
      tdsSectionMasterId: vendor?.tdsMasterId ?? null,
      referenceNo,
    }),
    [partyLedger, bankCashLedger, numericBankAmount, numericPartyAmount, numericTds, bankRemark, partyRemark, vendor?.tdsMasterId, referenceNo, mode],
  );

  const canPost = useMemo(() => {
    const err =
      mode === "receipt"
        ? validateReceiptVoucherForPost(simpleInput)
        : validatePaymentVoucherForPost(simpleInput);
    return err == null;
  }, [mode, simpleInput]);

  const builtLines = useMemo(() => {
    const raw =
      mode === "receipt"
        ? buildReceiptVoucherLines(simpleInput)
        : buildPaymentVoucherLines(simpleInput);
    return applyAutoPartyToLines(raw, coaRecords);
  }, [mode, simpleInput, coaRecords]);

  const accountFilter = useMemo(
    () => (ledger: ChartOfAccount) => {
      if (!ledgerMatchesVoucherScope(ledger, copy.accountScope, coaRecords)) return false;
      if (bankCashLedger && ledger.id === bankCashLedger.id) return false;
      return true;
    },
    [copy.accountScope, coaRecords, bankCashLedger],
  );

  const receiptDebitFilter = useMemo(
    () => (ledger: ChartOfAccount) =>
      ledgerMatchesVoucherScope(ledger, "receipt_debit", coaRecords),
    [coaRecords],
  );

  const paymentCreditFilter = useMemo(
    () => (ledger: ChartOfAccount) =>
      ledgerMatchesVoucherScope(ledger, "payment_credit", coaRecords),
    [coaRecords],
  );

  const handleInvoiceChange = (doc: OpenVoucherDocument | null) => {
    setSelectedInvoiceId(doc?.id ?? null);
    if (doc && doc.outstanding > 0) {
      handleAmountChange(doc.outstanding);
    }
  };

  const handlePartyChange = (ledger: ChartOfAccount | null) => {
    setPartyLedger(ledger);
    setSelectedInvoiceId(null);
  };

  const handleReceiptAccountChange = (ledger: ChartOfAccount | null) => {
    setBankCashLedger(ledger);
    if (ledger && partyLedger?.id === ledger.id) {
      setPartyLedger(null);
      setSelectedInvoiceId(null);
    }
  };

  const handlePaymentAccountChange = handleReceiptAccountChange;

  const persistVoucher = (status: "draft" | "posted"): AccountingVoucher => {
    const payload = {
      date,
      financialYearId: existing?.financialYearId ?? null,
      financialYearName: existing?.financialYearName ?? "",
      referenceNo,
      narration,
      paymentMode,
      lines: builtLines,
      status,
      entryMode: "simple" as const,
    };
    if (isEdit && resolvedVoucherId != null) {
      return updateVoucher(resolvedVoucherId, payload);
    }
    return createVoucher(mode, payload);
  };

  const handleSaveDraft = () => {
    setError(null);
    const draftErr = validateVoucherDraft({ date });
    if (draftErr) {
      setError(draftErr);
      return;
    }
    persistVoucher("draft");
    onDone();
  };

  const openDocuments = useOpenVoucherDocuments(mode, partyLedger, coaRecords);
  const selectedDocument = openDocuments.find((d) => d.id === selectedInvoiceId) ?? null;

  const excessWarning = useMemo(() => {
    if (!selectedDocument || numericBankAmount <= 0) return null;
    if (numericBankAmount > selectedDocument.outstanding + 0.009) {
      const excess = numericBankAmount - selectedDocument.outstanding;
      return `Amount exceeds ${mode === "receipt" ? "invoice" : "bill"} balance by ${formatMoney(excess)}. Excess will be treated as on-account / advance.`;
    }
    return null;
  }, [selectedDocument, numericBankAmount, mode]);

  const handlePost = () => {
    setError(null);
    if (!date) {
      setError("Date is required.");
      return;
    }

    const allocations =
      selectedInvoiceId != null && partyRef && numericBankAmount > 0 && allocationKind
        ? [
            {
              ...(allocationKind === "invoice"
                ? { invoiceId: selectedInvoiceId }
                : { billId: selectedInvoiceId }),
              amount: roundMoney(
                Math.min(
                  numericBankAmount,
                  selectedDocument?.outstanding ?? numericBankAmount,
                ),
              ),
              documentNo: selectedDocument?.no,
            },
          ].filter((a) => a.amount > 0.009)
        : undefined;

    const result = executeManualVoucherPost({
      voucherType: mode,
      voucherId: isEdit ? resolvedVoucherId : null,
      simpleCashInput: simpleInput,
      allocations,
      payload: {
        date,
        financialYearId: existing?.financialYearId ?? null,
        financialYearName: existing?.financialYearName ?? "",
        referenceNo,
        narration,
        paymentMode,
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
  const notFoundMessage =
    mode === "receipt" ? "Receipt voucher not found." : "Payment voucher not found.";

  if (mounted && !isNew && !existing) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", pageTitle, cancelHref)}
        title={pageTitle}
        description={copy.subtitle}
        layout="form"
        actions={
          <Button variant="outline" size="sm" className={cn(VOUCHER_BUTTON_CLASS, "gap-1")} onClick={onDone}>
            <X className="w-3.5 h-3.5" /> Back
          </Button>
        }
      >
        <VoucherNotFoundMessage message={notFoundMessage} />
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

            <VoucherFormField label={copy.numberLabel} className={VOUCHER_FIELD_NUMBER}>
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

            <VoucherFormField label={copy.modeLabel} className={VOUCHER_FIELD_MODE}>
              <Select value={paymentMode} onValueChange={setPaymentMode} disabled={readOnly}>
                <SelectTrigger className={VOUCHER_INPUT_CLASS}>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <VoucherSelectContent>
                  {PAYMENT_MODES.map((m) => (
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

        <VoucherFormSection title={copy.detailsSection}>
          {mode === "receipt" && (
            <div className="rounded-lg border border-border bg-muted/10 px-3 py-2.5 space-y-1.5 mb-2">
              <div className={VOUCHER_ROW_EQUAL_4}>
                <div className="min-w-0">
                  <VoucherFormField label={copy.bankLabel} required className="min-w-0">
                    {readOnly ? (
                      <p className={cn("h-8 flex items-center text-xs", VOUCHER_PREVIEW_TEXT_CLASS)}>
                        {bankCashLedger?.accountName ?? "—"}
                      </p>
                    ) : (
                      <GroupedLedgerSelect
                        value={bankCashLedger?.id ?? null}
                        fallbackLabel={bankCashLedger?.accountName}
                        onChange={handleReceiptAccountChange}
                        placeholder={copy.bankPlaceholder}
                        ledgerFilter={receiptDebitFilter}
                        quickAddScope="receipt_debit"
                        {...VOUCHER_LEDGER_SELECT_COMPACT}
                      />
                    )}
                  </VoucherFormField>
                  <VoucherLedgerCurBalance ledger={bankCashLedger} asOfDate={date} />
                </div>
                <div className="min-w-0 hidden sm:block" aria-hidden />
                <div className="min-w-0 hidden sm:block" aria-hidden />
                <div className="min-w-0 hidden sm:block" aria-hidden />
              </div>
              {bankCashLedger && numericBankAmount > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-brand-700">Dr</span>{" "}
                  {bankCashLedger.accountName}
                </p>
              )}
            </div>
          )}

          {mode === "payment" && (
            <div className="rounded-lg border border-border bg-muted/10 px-3 py-2.5 space-y-1.5 mb-2">
              <div className={VOUCHER_ROW_EQUAL_4}>
                <div className="min-w-0">
                  <VoucherFormField label={copy.bankLabel} required className="min-w-0">
                    {readOnly ? (
                      <p className={cn("h-8 flex items-center text-xs", VOUCHER_PREVIEW_TEXT_CLASS)}>
                        {bankCashLedger?.accountName ?? "—"}
                      </p>
                    ) : (
                      <GroupedLedgerSelect
                        value={bankCashLedger?.id ?? null}
                        fallbackLabel={bankCashLedger?.accountName}
                        onChange={handlePaymentAccountChange}
                        placeholder={copy.bankPlaceholder}
                        ledgerFilter={paymentCreditFilter}
                        quickAddScope="payment_credit"
                        {...VOUCHER_LEDGER_SELECT_COMPACT}
                      />
                    )}
                  </VoucherFormField>
                  <VoucherLedgerCurBalance ledger={bankCashLedger} asOfDate={date} />
                </div>
                <VoucherFormField label="Remark" className="min-w-0">
                  {readOnly ? (
                    <p className={cn("h-8 flex items-center text-xs", VOUCHER_PREVIEW_TEXT_CLASS)}>
                      {bankRemark || "—"}
                    </p>
                  ) : (
                    <Input
                      className={cn(VOUCHER_INPUT_CLASS, "h-8 text-xs")}
                      value={bankRemark}
                      onChange={(e) => setBankRemark(e.target.value)}
                      placeholder="Payment account remark…"
                    />
                  )}
                </VoucherFormField>
                <div className="min-w-0 hidden sm:block" aria-hidden />
                <div className="min-w-0 hidden sm:block" aria-hidden />
              </div>
              {bankCashLedger && numericBankAmount > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-navy-700">Cr</span>{" "}
                  {bankCashLedger.accountName}
                  <span className="tabular-nums ml-2">{formatMoney(numericBankAmount)}</span>
                </p>
              )}
            </div>
          )}

          <VoucherTransactionPanel>
            <VoucherDetailsTable>
              <VoucherDetailsTableRow columns={4}>
                <div className="min-w-0">
                  <VoucherFormField label={copy.partyLabel} required className="min-w-0">
                    {readOnly ? (
                      <p className={cn("h-8 flex items-center text-xs", VOUCHER_PREVIEW_TEXT_CLASS)}>
                        {partyLedger?.accountName ?? "—"}
                      </p>
                    ) : (
                      <GroupedLedgerSelect
                        value={partyLedger?.id ?? null}
                        fallbackLabel={partyLedger?.accountName}
                        onChange={handlePartyChange}
                        placeholder={copy.partyPlaceholder}
                        ledgerFilter={accountFilter}
                        quickAddScope={copy.accountScope}
                        {...VOUCHER_LEDGER_SELECT_COMPACT}
                      />
                    )}
                  </VoucherFormField>
                  <VoucherLedgerCurBalance ledger={partyLedger} asOfDate={date} />
                  {mode === "receipt" && partyLedger && numericPartyAmount > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      <span className="font-semibold text-navy-700">Cr</span>{" "}
                      {partyLedger.accountName}
                    </p>
                  )}
                  {mode === "payment" && partyLedger && numericPartyAmount > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      <span className="font-semibold text-brand-700">Dr</span>{" "}
                      {partyLedger.accountName}
                    </p>
                  )}
                  {showAgainstInvoices && (
                    <div className="mt-2">
                      <VoucherFormField label={allocationDocLabel} className="min-w-0">
                        <VoucherInlineDocumentSelect
                          mode={mode}
                          partyLedger={partyLedger}
                          coaRecords={coaRecords}
                          value={selectedInvoiceId}
                          onChange={handleInvoiceChange}
                          readOnly={readOnly}
                        />
                      </VoucherFormField>
                    </div>
                  )}
                </div>

                <VoucherFormField label="Remark" className="min-w-0">
                  {readOnly ? (
                    <p className={cn("h-8 flex items-center text-xs", VOUCHER_PREVIEW_TEXT_CLASS)}>
                      {partyRemark || "—"}
                    </p>
                  ) : (
                    <Input
                      className={cn(VOUCHER_INPUT_CLASS, "h-8 text-xs")}
                      value={partyRemark}
                      onChange={(e) => setPartyRemark(e.target.value)}
                      placeholder="Line remark…"
                    />
                  )}
                </VoucherFormField>

                <VoucherFormField label="Amount" required className="min-w-0">
                  {readOnly ? (
                    <p className={cn("h-8 flex items-center justify-end tabular-nums text-xs", VOUCHER_PREVIEW_TEXT_CLASS)}>
                      {numericPartyAmount > 0 ? formatMoney(numericPartyAmount) : "—"}
                    </p>
                  ) : (
                    <AccountsMoneyInput
                      compact={false}
                      className={cn(VOUCHER_INPUT_CLASS, VOUCHER_MONEY_INPUT_CLASS, "h-8 text-xs")}
                      value={numericPartyAmount}
                      onChange={handleAmountChange}
                    />
                  )}
                </VoucherFormField>

                <VoucherFormField label="Narration" className="min-w-0">
                  {readOnly ? (
                    <p className={cn("h-8 flex items-center text-xs", VOUCHER_PREVIEW_TEXT_CLASS)}>
                      {narration || "—"}
                    </p>
                  ) : (
                    <Input
                      className={cn(VOUCHER_INPUT_CLASS, "h-8 text-xs")}
                      value={narration}
                      onChange={(e) => setNarration(e.target.value)}
                      placeholder="Optional narration…"
                      maxLength={500}
                    />
                  )}
                </VoucherFormField>
              </VoucherDetailsTableRow>

            </VoucherDetailsTable>

            {mode === "receipt" && bankCashLedger && partyLedger && numericPartyAmount > 0 && (
              <div className="rounded-md border border-border/50 bg-muted/15 px-2.5 py-2 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Voucher Entry
                </p>
                <p className="text-[12px] text-foreground">
                  <span className="font-semibold text-brand-700">Dr</span>{" "}
                  {bankCashLedger.accountName}
                  <span className="tabular-nums text-muted-foreground ml-2">
                    {formatMoney(numericBankAmount)}
                  </span>
                </p>
                <p className="text-[12px] text-foreground">
                  <span className="font-semibold text-navy-700">Cr</span>{" "}
                  {partyLedger.accountName}
                  <span className="tabular-nums text-muted-foreground ml-2">
                    {formatMoney(numericPartyAmount)}
                  </span>
                </p>
              </div>
            )}

            {mode === "payment" && bankCashLedger && partyLedger && numericPartyAmount > 0 && (
              <div className="rounded-md border border-border/50 bg-muted/15 px-2.5 py-2 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Voucher Entry
                </p>
                <p className="text-[12px] text-foreground">
                  <span className="font-semibold text-brand-700">Dr</span>{" "}
                  {partyLedger.accountName}
                  <span className="tabular-nums text-muted-foreground ml-2">
                    {formatMoney(numericPartyAmount)}
                  </span>
                </p>
                <p className="text-[12px] text-foreground">
                  <span className="font-semibold text-navy-700">Cr</span>{" "}
                  {bankCashLedger.accountName}
                  <span className="tabular-nums text-muted-foreground ml-2">
                    {formatMoney(numericBankAmount)}
                  </span>
                </p>
                {numericTds > 0 && (
                  <p className="text-[12px] text-foreground">
                    <span className="font-semibold text-navy-700">Cr</span> TDS Payable
                    <span className="tabular-nums text-muted-foreground ml-2">
                      {formatMoney(numericTds)}
                    </span>
                  </p>
                )}
              </div>
            )}

            {excessWarning && (
              <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
                {excessWarning}
              </div>
            )}

            {showTdsSection && !readOnly && (
              <div className="rounded-md border border-border/40 bg-white p-2 space-y-2 max-w-[420px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={deductTds}
                    onCheckedChange={(c) => setDeductTds(Boolean(c))}
                  />
                  <span className={VOUCHER_PREVIEW_TEXT_CLASS}>Deduct TDS</span>
                  {vendor?.tdsApplicable && (
                    <span className="text-[11px] text-muted-foreground">(applicable for this vendor)</span>
                  )}
                </label>
                {deductTds && (
                  <VoucherFormField label="TDS Amount" className={VOUCHER_AMOUNT_WIDTH}>
                    <AccountsMoneyInput
                      compact={false}
                      className={cn(VOUCHER_INPUT_CLASS, VOUCHER_MONEY_INPUT_CLASS)}
                      value={numericTds}
                      onChange={handleTdsAmountChange}
                    />
                  </VoucherFormField>
                )}
              </div>
            )}

          </VoucherTransactionPanel>
        </VoucherFormSection>

        <VoucherFormSummary totalAmount={numericPartyAmount} />
      </div>
    </div>
  );

  if (!mounted) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", pageTitle, cancelHref)}
        title={pageTitle}
        description={copy.subtitle}
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
      description={copy.subtitle}
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
