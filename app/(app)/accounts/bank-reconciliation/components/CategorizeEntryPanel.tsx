"use client";

import { useEffect, useMemo, useState } from "react";
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
  DEPOSIT_CATEGORIES,
  WITHDRAWAL_CATEGORIES,
  categorizationToModule,
  resetEntryMatch,
  saveEntryMatch,
  customerSearchOptions,
  vendorSearchOptions,
  listUnpaidSalesInvoicesForCustomer,
  listUnpaidPurchaseInvoicesForVendor,
  type BankCategorization,
  type BankReconMatchingPayload,
  type BankStatementEntry,
  type UnpaidInvoiceOption,
} from "../bank-reconciliation-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import {
  bankReconLedgerFieldLabel,
  bankReconLedgerFilterForCategory,
} from "@/lib/accounts/bank-recon-coa-filters";
import type { BankReconAdjustmentRow } from "@/lib/accounts/bank-recon-adjustments";
import {
  mapUiStatusToMatchStatus,
  validateDocumentReconciliation,
  type InvoiceAllocationInput,
  type ReconUiStatus,
} from "@/lib/accounts/bank-recon-matching";
import { loadChartOfAccounts } from "../../data";
import { CreateLedgerModal } from "./CreateLedgerModal";
import { MatchStatusBadge } from "./MatchStatusBadge";
import { InvoiceAllocationPanel, buildAllocationSummary } from "./InvoiceAllocationPanel";
import { ReconciliationAdjustmentsPanel } from "./ReconciliationAdjustmentsPanel";
import type { ChartOfAccount } from "../../data";

function parseMatchingPayload(raw?: string): {
  allocations: Record<string, string>;
  adjustments: BankReconAdjustmentRow[];
} {
  if (!raw) return { allocations: {}, adjustments: [] };
  try {
    const parsed = JSON.parse(raw) as BankReconMatchingPayload;
    const allocations: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.allocations ?? {})) {
      allocations[k] = String(v);
    }
    return {
      allocations,
      adjustments: (parsed.adjustments ?? []).map((a) => ({
        id: a.id,
        adjustmentTypeId: a.adjustmentTypeId,
        ledgerId: a.ledgerId,
        ledgerName: a.ledgerName,
        amount: a.amount,
      })),
    };
  } catch {
    return { allocations: {}, adjustments: [] };
  }
}

function uiStatusLabel(status: ReconUiStatus): string {
  if (status === "matched") return "Matched";
  if (status === "partial") return "Partially Allocated";
  return "Uncategorized";
}

export function CategorizeEntryPanel({
  entries,
  onUpdated,
  onClose,
}: {
  entries: BankStatementEntry[];
  onUpdated: () => void;
  onClose?: () => void;
}) {
  const entry = entries[0] ?? null;
  const isWithdrawal = entry ? entry.debit > 0 : false;
  const isDeposit = entry ? entry.credit > 0 : false;
  const batchMode = entries.length > 1;
  const bankAmount = entry ? (entry.debit || entry.credit) : 0;
  const direction: "receipt" | "payment" = isDeposit ? "receipt" : "payment";

  const [category, setCategory] = useState<BankCategorization | "">("");
  const [ledgerId, setLedgerId] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [txnDate, setTxnDate] = useState("");
  const [amount, setAmount] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [description, setDescription] = useState("");
  const [createLedgerOpen, setCreateLedgerOpen] = useState(false);
  const [toBankLedgerId, setToBankLedgerId] = useState<number | null>(null);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [adjustments, setAdjustments] = useState<BankReconAdjustmentRow[]>([]);
  const [coaRefreshKey, setCoaRefreshKey] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const txnAmount = Number(amount) || bankAmount;

  useEffect(() => {
    if (!entry) return;
    const restored = parseMatchingPayload(entry.matchingPayload);
    setCategory((entry.bankCategory as BankCategorization) || "");
    setLedgerId(entry.ledgerId ?? null);
    setTxnDate(entry.transactionDate);
    setAmount(String(entry.debit || entry.credit || ""));
    setReferenceNo(entry.referenceNo || "");
    setDescription(entry.narration || "");
    setInvoiceNo(entry.matchedRecordLabel || "");
    setCustomerId("");
    setVendorId("");
    setToBankLedgerId(null);
    setAllocations(restored.allocations);
    setAdjustments(restored.adjustments);
    setValidationError(null);
  }, [entry?.id]);

  const categoryOptions = isWithdrawal ? WITHDRAWAL_CATEGORIES : DEPOSIT_CATEGORIES;

  const coaLedgerFilter = useMemo(
    () => bankReconLedgerFilterForCategory(category),
    [category, coaRefreshKey],
  );

  const transferLedgerFilter = useMemo(
    () => bankReconLedgerFilterForCategory("transfer"),
    [coaRefreshKey],
  );

  const liabilityLedgerFilter = useMemo(
    () => bankReconLedgerFilterForCategory("vendor_payment"),
    [coaRefreshKey],
  );

  const customers = useMemo(
    () => customerSearchOptions("").map((c) => ({ value: String(c.id), label: c.label })),
    [],
  );
  const vendors = useMemo(
    () => vendorSearchOptions("").map((v) => ({ value: String(v.id), label: v.label })),
    [],
  );

  const selectedCustomerName = customers.find((c) => c.value === customerId)?.label;
  const selectedVendorName = vendors.find((v) => v.value === vendorId)?.label;

  const customerInvoices = useMemo(() => {
    if (category !== "customer_receipt" || !customerId) return [];
    return listUnpaidSalesInvoicesForCustomer(Number(customerId), selectedCustomerName);
  }, [category, customerId, selectedCustomerName]);

  const vendorBills = useMemo(() => {
    if (category !== "vendor_payment" || !vendorId) return [];
    return listUnpaidPurchaseInvoicesForVendor(Number(vendorId), selectedVendorName);
  }, [category, vendorId, selectedVendorName]);

  const activeInvoices: UnpaidInvoiceOption[] =
    category === "customer_receipt"
      ? customerInvoices
      : category === "vendor_payment"
        ? vendorBills
        : [];

  const allocationInputs: InvoiceAllocationInput[] = useMemo(
    () =>
      activeInvoices.map((inv) => ({
        invoiceId: inv.id,
        outstanding: inv.balance,
        grandTotal: inv.grandTotal,
        taxableAmount: inv.taxableAmount,
        taxAmount: inv.taxAmount,
        appliedAmount: Number(allocations[String(inv.id)] || 0),
      })),
    [activeInvoices, allocations],
  );

  const validation = useMemo(() => {
    const isDocumentCategory = category === "customer_receipt" || category === "vendor_payment";
    if (!isDocumentCategory) {
      return validateDocumentReconciliation({
        bankAmount: txnAmount,
        direction,
        category,
        allocations: [],
        adjustments: [],
        directLedgerId: category === "transfer" ? toBankLedgerId : ledgerId,
      });
    }
    return validateDocumentReconciliation({
      bankAmount: txnAmount,
      direction,
      category,
      allocations: allocationInputs,
      adjustments,
      requiresDocument: true,
    });
  }, [
    txnAmount,
    direction,
    category,
    allocationInputs,
    adjustments,
    ledgerId,
    toBankLedgerId,
  ]);

  const resolveLedgerName = (id: number | null): string => {
    if (!id) return "";
    return loadChartOfAccounts().find((r) => r.id === id)?.accountName ?? "";
  };

  const handleSelectInvoice = (invoiceId: string) => {
    const inv = activeInvoices.find((i) => String(i.id) === invoiceId);
    if (!inv) return;
    const defaultApplied = Math.min(inv.balance, txnAmount);
    setAllocations((prev) => ({ ...prev, [invoiceId]: String(defaultApplied) }));
  };

  const handlePayInFull = (invoiceId: string, cap: number) => {
    setAllocations((prev) => ({ ...prev, [invoiceId]: String(cap) }));
  };

  if (!entry) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">Select a transaction to categorize</p>
      </div>
    );
  }

  const buildMatchingPayload = (): BankReconMatchingPayload => ({
    allocations: Object.fromEntries(
      Object.entries(allocations)
        .map(([k, v]) => [k, Number(v) || 0] as const)
        .filter(([, v]) => v > 0),
    ),
    adjustments: adjustments
      .filter((a) => a.ledgerId && a.amount > 0)
      .map((a) => ({
        id: a.id,
        adjustmentTypeId: a.adjustmentTypeId,
        ledgerId: a.ledgerId!,
        ledgerName: a.ledgerName,
        amount: a.amount,
      })),
  });

  const handleSave = () => {
    if (!category) return;
    if (!validation.canSave) {
      setValidationError(validation.error);
      return;
    }

    const resolvedModule = categorizationToModule(category);
    const customerOpt = customers.find((o) => o.value === customerId);
    const vendorOpt = vendors.find((o) => o.value === vendorId);
    const salesAlloc = buildAllocationSummary(customerInvoices, allocations);
    const purchaseAlloc = buildAllocationSummary(vendorBills, allocations);
    const adjRemarks = adjustments
      .filter((a) => a.amount > 0)
      .map((a) => `${a.adjustmentTypeId}:${a.amount}→${a.ledgerName}`)
      .join(", ");
    const combinedRemarks = [
      description,
      referenceNo ? `Ref: ${referenceNo}` : "",
      salesAlloc.remarks || purchaseAlloc.remarks,
      adjRemarks ? `Adj: ${adjRemarks}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    const matchStatus = mapUiStatusToMatchStatus(validation.status);
    const payload = buildMatchingPayload();

    entries.forEach((e) => {
      if (category === "transfer" && toBankLedgerId) {
        saveEntryMatch({
          entryId: e.id,
          matchedModule: "journal",
          bankCategory: category,
          ledgerId: toBankLedgerId,
          ledgerName: resolveLedgerName(toBankLedgerId),
          remarks: combinedRemarks,
          matchStatus,
          matchingPayload: payload,
        });
      } else if (category === "customer_receipt") {
        saveEntryMatch({
          entryId: e.id,
          matchedModule: "sales",
          bankCategory: category,
          matchedRecordId: salesAlloc.recordId,
          matchedRecordLabel: salesAlloc.label || customerOpt?.label || "",
          ledgerId,
          ledgerName: resolveLedgerName(ledgerId) || customerOpt?.label || "",
          remarks: combinedRemarks,
          matchStatus,
          matchingPayload: payload,
        });
      } else if (category === "vendor_payment") {
        saveEntryMatch({
          entryId: e.id,
          matchedModule: "purchase",
          bankCategory: category,
          matchedRecordId: purchaseAlloc.recordId,
          matchedRecordLabel: purchaseAlloc.label || vendorOpt?.label || "",
          ledgerId,
          ledgerName: resolveLedgerName(ledgerId) || vendorOpt?.label || "",
          remarks: combinedRemarks,
          matchStatus,
          matchingPayload: payload,
        });
      } else if (
        resolvedModule === "other" ||
        category === "expense" ||
        category === "bank_charges" ||
        category === "interest_income" ||
        category === "employee_claim_payment"
      ) {
        if (!ledgerId) return;
        saveEntryMatch({
          entryId: e.id,
          matchedModule: resolvedModule === "other" ? "other" : resolvedModule,
          bankCategory: category,
          ledgerId,
          ledgerName: resolveLedgerName(ledgerId),
          remarks: combinedRemarks,
          matchStatus,
          matchingPayload: payload,
        });
      } else {
        saveEntryMatch({
          entryId: e.id,
          matchedModule: resolvedModule,
          bankCategory: category,
          matchedRecordLabel: invoiceNo || vendorOpt?.label || customerOpt?.label || "",
          ledgerId,
          ledgerName: resolveLedgerName(ledgerId),
          remarks: combinedRemarks,
          matchStatus,
          matchingPayload: payload,
        });
      }
    });

    setValidationError(null);
    onUpdated();
    onClose?.();
  };

  const needsCoaLedger =
    category === "expense" ||
    category === "bank_charges" ||
    category === "employee_claim_payment" ||
    category === "interest_income";
  const needsOptionalLiabilityLedger = category === "vendor_payment";
  const needsTransfer = category === "transfer";
  const needsCustomer = isDeposit && category === "customer_receipt";
  const needsVendor = isWithdrawal && (category === "vendor_payment" || category === "expense");
  const isDocumentCategory = category === "customer_receipt" || category === "vendor_payment";

  const canReconcile = entry.matchStatus === "matched" && validation.canReconcile;

  const displayStatus: ReconUiStatus = validation.status;

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        <div className="shrink-0 px-4 py-3 border-b border-border/60 bg-slate-50/80">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">
            Categorize Manually
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {batchMode ? `${entries.length} transactions selected` : entry.transactionDate}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">{isWithdrawal ? "Withdrawal" : "Deposit"}</span>
              <span className={`font-semibold tabular-nums ${isDeposit ? "text-green-600" : "text-red-600"}`}>
                {formatMoney(txnAmount)}
              </span>
            </div>
            {entry.referenceNo && (
              <p className="text-[10px] font-mono text-muted-foreground">Ref# {entry.referenceNo}</p>
            )}
            <p className="whitespace-pre-wrap break-words text-muted-foreground">{entry.narration}</p>
            <MatchStatusBadge
              status={mapUiStatusToMatchStatus(displayStatus)}
              computedLabel={uiStatusLabel(displayStatus)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select
              value={category || undefined}
              onValueChange={(v) => {
                setCategory(v as BankCategorization);
                setLedgerId(null);
                setCustomerId("");
                setVendorId("");
                setInvoiceNo("");
                setToBankLedgerId(null);
                setAllocations({});
                setAdjustments([]);
                setValidationError(null);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsCoaLedger && coaLedgerFilter && (
            <GroupedLedgerSelect
              key={`coa-${category}-${coaRefreshKey}`}
              label={bankReconLedgerFieldLabel(category)}
              required
              value={ledgerId}
              onChange={(ledger) => setLedgerId(ledger.id)}
              ledgerFilter={coaLedgerFilter}
              placeholder={`Select ${bankReconLedgerFieldLabel(category).toLowerCase()}`}
              contentClassName="w-[min(340px,calc(100vw-3rem))]"
            />
          )}

          {needsOptionalLiabilityLedger && liabilityLedgerFilter && (
            <GroupedLedgerSelect
              key={`liability-${coaRefreshKey}`}
              label="Payable Account (optional)"
              value={ledgerId}
              onChange={(ledger) => setLedgerId(ledger.id)}
              ledgerFilter={liabilityLedgerFilter}
              placeholder="Select liability / payable account"
              contentClassName="w-[min(340px,calc(100vw-3rem))]"
            />
          )}

          {needsCustomer && (
            <>
              <SearchableSelect
                label="Customer"
                value={customerId}
                onChange={(v) => {
                  setCustomerId(v);
                  setAllocations({});
                  setAdjustments([]);
                }}
                options={customers}
                placeholder="Select customer"
                required
              />
              {customerId && (
                <InvoiceAllocationPanel
                  title="Invoice Details"
                  invoices={customerInvoices}
                  allocations={allocations}
                  transactionAmount={txnAmount}
                  amountLabel="Bank Received"
                  onAllocationChange={(id, value) =>
                    setAllocations((prev) => ({ ...prev, [id]: value }))
                  }
                  onPayInFull={handlePayInFull}
                  onClearAll={() => {
                    setAllocations({});
                    setAdjustments([]);
                  }}
                  onSelectInvoice={handleSelectInvoice}
                />
              )}
            </>
          )}

          {needsVendor && category === "vendor_payment" && (
            <>
              <SearchableSelect
                label="Supplier"
                value={vendorId}
                onChange={(v) => {
                  setVendorId(v);
                  setAllocations({});
                  setAdjustments([]);
                }}
                options={vendors}
                placeholder="Select supplier"
                required
              />
              {vendorId && (
                <InvoiceAllocationPanel
                  title="Bill Details"
                  invoices={vendorBills}
                  allocations={allocations}
                  transactionAmount={txnAmount}
                  amountLabel="Bank Paid"
                  onAllocationChange={(id, value) =>
                    setAllocations((prev) => ({ ...prev, [id]: value }))
                  }
                  onPayInFull={handlePayInFull}
                  onClearAll={() => {
                    setAllocations({});
                    setAdjustments([]);
                  }}
                  onSelectInvoice={handleSelectInvoice}
                />
              )}
            </>
          )}

          {isDocumentCategory && (
            <ReconciliationAdjustmentsPanel
              direction={direction}
              adjustments={adjustments}
              breakdown={validation.breakdown}
              onChange={setAdjustments}
            />
          )}

          {needsVendor && category === "expense" && (
            <SearchableSelect
              label="Supplier (optional)"
              value={vendorId}
              onChange={setVendorId}
              options={vendors}
              placeholder="Select supplier"
            />
          )}

          {needsTransfer && transferLedgerFilter && (
            <GroupedLedgerSelect
              key={`transfer-${coaRefreshKey}`}
              label={bankReconLedgerFieldLabel("transfer")}
              required
              value={toBankLedgerId}
              onChange={(ledger) => setToBankLedgerId(ledger.id)}
              ledgerFilter={transferLedgerFilter}
              placeholder="Select bank or cash account"
              contentClassName="w-[min(340px,calc(100vw-3rem))]"
            />
          )}

          {(validationError || validation.error) && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
              {validationError || validation.error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" className="h-9 text-xs" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount</Label>
              <Input
                type="number"
                className="h-9 text-xs tabular-nums"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                readOnly={!batchMode}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Reference No.</Label>
            <Input
              className="h-9 text-xs font-mono"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
            />
          </div>

          {category === "expense" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Invoice No.</Label>
              <Input className="h-9 text-xs" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              className="text-xs min-h-[72px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {needsCoaLedger && category === "expense" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs w-full"
              onClick={() => setCreateLedgerOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Create Expense Ledger
            </Button>
          )}
        </div>

        <div className="shrink-0 border-t border-border/60 px-4 py-3 space-y-2 bg-white">
          <Button
            className="w-full h-9 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            disabled={!validation.canSave || entry.matchStatus === "reconciled"}
            onClick={handleSave}
          >
            Save {batchMode ? `(${entries.length})` : ""}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 text-xs flex-1"
              disabled={!canReconcile || entry.matchStatus === "reconciled"}
              onClick={() => {
                if (!validation.canReconcile) {
                  setValidationError(validation.error);
                  return;
                }
                entries.forEach((e) => confirmEntryReconciliation(e.id));
                onUpdated();
              }}
            >
              Reconcile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs flex-1"
              onClick={() => {
                entries.forEach((e) => ignoreBankEntry(e.id));
                onUpdated();
              }}
            >
              Ignore
            </Button>
            {entry.matchStatus !== "unmatched" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs flex-1"
                onClick={() => {
                  entries.forEach((e) => resetEntryMatch(e.id));
                  onUpdated();
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      <CreateLedgerModal
        open={createLedgerOpen}
        onOpenChange={setCreateLedgerOpen}
        onCreated={(ledger: ChartOfAccount) => {
          setLedgerId(ledger.id);
          setCoaRefreshKey((k) => k + 1);
        }}
      />
    </>
  );
}
