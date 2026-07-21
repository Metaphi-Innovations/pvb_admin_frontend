"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import {
  RECEIPT_INPUT_CLASS,
  RECEIPT_LABEL_CLASS,
  RECEIPT_LEDGER_SELECT,
  RECEIPT_MONEY_INPUT_CLASS,
  RECEIPT_PREVIEW_TEXT_CLASS,
  RECEIPT_ROW_GAP,
  VOUCHER_INPUT_CLASS,
  VOUCHER_LEDGER_SELECT_COMPACT,
  VOUCHER_MONEY_INPUT_CLASS,
  VOUCHER_PREVIEW_TEXT_CLASS,
  VOUCHER_ROW_EQUAL_3,
  VOUCHER_ROW_EQUAL_4,
  VoucherFormField,
  VoucherSelectContent,
} from "@/components/accounts/voucher-simple-form-ui";
import { VoucherEntryAllocationDialog } from "@/components/accounts/voucher-form/VoucherEntryAllocationDialog";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import type { VoucherFormEntry, VoucherEntryType } from "@/lib/accounts/voucher-form-model";
import {
  defaultEntryReferenceType,
  getAvailableReferenceTypes,
  isBankCashEntry,
  isBillWiseEnabledLedger,
  referenceTypeAllowsTextReference,
  referenceTypeShowsAllocationPicker,
  supportsInvoiceAllocation,
  VOUCHER_REFERENCE_TYPE_LABELS,
  type VoucherReferenceType,
} from "@/lib/accounts/voucher-reference-types";
import {
  useOpenVoucherDocuments,
  type OpenVoucherDocument,
} from "@/components/accounts/VoucherInlineDocumentSelect";
import { findLedgerById } from "@/lib/accounts/coa-hierarchy";
import { isCustomerPartyLedger, isVendorPartyLedger } from "@/lib/accounts/voucher-ledger-groups";
import { formatMoney, roundMoney } from "@/lib/accounts/money-format";
import { loadCostCenters } from "@/lib/accounts/cost-centers-data";
import { cn } from "@/lib/utils";
import { ListChecks } from "lucide-react";

export interface VoucherEntryBlockProps {
  entry: VoucherFormEntry;
  voucherType: VoucherTypeCode;
  voucherDate: string;
  coaRecords: ChartOfAccount[];
  readOnly?: boolean;
  accountLabel: string;
  accountPlaceholder?: string;
  ledgerFilter: (ledger: ChartOfAccount) => boolean;
  quickAddScope?: string;
  /** When false, hide Create New Sub Group Ledger in the account dropdown. */
  enableQuickAdd?: boolean;
  showEntryType?: boolean;
  /** When false, Amount is hidden and synced from the other entry (receipt/payment bank side). */
  showAmount?: boolean;
  /** When false, hide per-line remark (receipt voucher uses voucher-level narration only). */
  showLineRemark?: boolean;
  /** Compact inner layout — used in receipt premium sections. */
  compact?: boolean;
  /** Optional trailing cell (e.g. remove-row action on journal grid). */
  rowAction?: ReactNode;
  onQuickAddSuccess?: () => void;
  onChange: (patch: Partial<VoucherFormEntry>) => void;
  className?: string;
}

export function VoucherEntryBlock({
  entry,
  voucherType,
  coaRecords,
  readOnly = false,
  accountLabel,
  accountPlaceholder = "Select an account…",
  ledgerFilter,
  quickAddScope,
  enableQuickAdd = true,
  showEntryType = false,
  showAmount = true,
  showLineRemark = true,
  compact = false,
  rowAction,
  onQuickAddSuccess,
  onChange,
  className,
}: VoucherEntryBlockProps) {
  const [allocOpen, setAllocOpen] = useState(false);

  const ledger = entry.accountId ? findLedgerById(entry.accountId, coaRecords) ?? null : null;
  const costCentreApplicable = ledger?.costCenterApplicable === true;
  const costCenterOptions = useMemo(
    () => (costCentreApplicable ? loadCostCenters().filter((c) => c.status === "active") : []),
    [costCentreApplicable],
  );

  const allocationMode = useMemo((): "receipt" | "payment" | null => {
    if (!ledger || !supportsInvoiceAllocation(voucherType, ledger, coaRecords)) return null;
    if (voucherType === "receipt" && entry.entryType === "CREDIT") return "receipt";
    if (voucherType === "payment" && entry.entryType === "DEBIT") return "payment";
    if (voucherType === "journal") {
      if (isCustomerPartyLedger(ledger, coaRecords)) return "receipt";
      if (isVendorPartyLedger(ledger, coaRecords)) return "payment";
      // Generic bill-wise ledger: treat like receipt for open-reference picker
      if (ledger.billWiseAccounting) return "receipt";
    }
    return null;
  }, [ledger, voucherType, entry.entryType, coaRecords]);

  const openDocuments = useOpenVoucherDocuments(
    allocationMode ?? "receipt",
    allocationMode ? ledger : null,
    coaRecords,
  );

  const refTypes = useMemo(
    () => getAvailableReferenceTypes(voucherType, entry.entryType, ledger, coaRecords),
    [voucherType, entry.entryType, ledger, coaRecords],
  );

  const showReferenceControls =
    voucherType === "contra" ||
    isBankCashEntry(ledger, coaRecords) ||
    supportsInvoiceAllocation(voucherType, ledger, coaRecords) ||
    isBillWiseEnabledLedger(ledger) ||
    (voucherType === "receipt" && entry.entryType === "DEBIT") ||
    (voucherType === "payment" && entry.entryType === "CREDIT");

  const showAgainstRef = referenceTypeShowsAllocationPicker(entry.referenceType)
    ? Boolean(allocationMode) || (ledger != null && isBillWiseEnabledLedger(ledger))
    : referenceTypeAllowsTextReference(entry.referenceType);

  const textReference =
    entry.allocations[0]?.documentNumber ??
    (entry.referenceId == null ? "" : "");

  const selectedDoc = openDocuments.find((d) => d.id === entry.referenceId) ?? null;
  const multiAllocCount = entry.allocations.filter((a) => a.allocatedAmount > 0).length;

  const excessGuidance = useMemo(() => {
    if (!allocationMode || entry.amount <= 0) return null;
    if (!referenceTypeShowsAllocationPicker(entry.referenceType)) return null;

    if (selectedDoc && entry.amount > selectedDoc.outstanding + 0.009) {
      return "Allocation exceeds the selected invoice outstanding. Allocate the excess as Advance or On Account.";
    }

    const hasOverAllocation = entry.allocations.some(
      (a) => a.allocatedAmount > a.outstandingAmount + 0.009,
    );
    if (hasOverAllocation) {
      return "Allocation exceeds the selected invoice outstanding. Allocate the excess as Advance or On Account.";
    }

    return null;
  }, [allocationMode, entry.amount, entry.referenceType, entry.allocations, selectedDoc]);

  const setAccount = (account: ChartOfAccount | null) => {
    const refType = account
      ? defaultEntryReferenceType(voucherType, entry.entryType)
      : entry.referenceType;
    onChange({
      accountId: account?.id ?? null,
      accountName: account?.accountName ?? "",
      referenceType: refType,
      referenceId: null,
      allocations: [],
      costCenterId: null,
      costCenterName: "",
      billWiseDueDate: "",
    });
  };

  const setReferenceType = (refType: VoucherReferenceType) => {
    onChange({
      referenceType: refType,
      referenceId: null,
      allocations: [],
    });
  };

  const setSingleDocument = (doc: OpenVoucherDocument | null) => {
    if (!doc) {
      onChange({ referenceId: null, allocations: [] });
      return;
    }
    const docType = allocationMode === "payment" ? "bill" : "invoice";
    onChange({
      referenceId: doc.id,
      allocations: [
        {
          documentType: docType,
          documentId: doc.id,
          documentNumber: doc.no,
          outstandingAmount: doc.outstanding,
          allocatedAmount: Math.min(roundMoney(entry.amount) || doc.outstanding, doc.outstanding),
        },
      ],
    });
  };

  const setTextReference = (text: string) => {
    onChange({
      referenceId: null,
      allocations: text
        ? [
            {
              documentType: "other",
              documentId: null,
              documentNumber: text,
              outstandingAmount: 0,
              allocatedAmount: 0,
            },
          ]
        : [],
    });
  };

  const inputClass = compact ? RECEIPT_INPUT_CLASS : VOUCHER_INPUT_CLASS;
  const moneyInputClass = compact ? RECEIPT_MONEY_INPUT_CLASS : VOUCHER_MONEY_INPUT_CLASS;
  const previewClass = compact ? RECEIPT_PREVIEW_TEXT_CLASS : VOUCHER_PREVIEW_TEXT_CLASS;
  const labelClass = compact ? RECEIPT_LABEL_CLASS : undefined;
  const fieldSpacing = compact ? "space-y-1" : "space-y-1";
  const previewHeight = compact ? "h-9" : "h-8";
  const selectItemClass = compact ? "text-[12px]" : "text-xs";
  const ledgerSelectProps = compact ? RECEIPT_LEDGER_SELECT : VOUCHER_LEDGER_SELECT_COMPACT;
  const rowGap = compact ? RECEIPT_ROW_GAP : undefined;

  return (
    <div
      className={cn(
        compact
          ? "space-y-1.5"
          : "rounded-lg border border-border bg-muted/10 px-3 py-2.5 space-y-2",
        className,
      )}
    >
      <div className="overflow-x-auto -mx-1 px-1">
      <div
        className={cn(
          "min-w-[640px]",
          showEntryType
            ? cn(
                "grid grid-cols-1 sm:grid-cols-2 gap-3 items-start",
                rowAction
                  ? "lg:grid-cols-[minmax(0,1.4fr)_minmax(100px,0.7fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(110px,0.8fr)_40px]"
                  : "lg:grid-cols-5",
              )
            : showAmount
              ? cn(VOUCHER_ROW_EQUAL_4, rowGap)
              : cn(VOUCHER_ROW_EQUAL_3, rowGap),
        )}
      >
        <div className={cn("min-w-0", showEntryType ? "lg:col-span-1" : "")}>
          <VoucherFormField
            label={accountLabel}
            required
            className="min-w-0"
            labelClassName={labelClass}
            spacingClassName={fieldSpacing}
          >
            {readOnly ? (
              <p className={cn(previewHeight, "flex items-center", previewClass)}>
                {entry.accountName || "—"}
              </p>
            ) : (
              <GroupedLedgerSelect
                value={entry.accountId}
                fallbackLabel={entry.accountName}
                onChange={setAccount}
                placeholder={accountPlaceholder}
                ledgerFilter={ledgerFilter}
                quickAddScope={quickAddScope as never}
                enableQuickAdd={enableQuickAdd}
                onQuickAddSuccess={onQuickAddSuccess ? () => onQuickAddSuccess() : undefined}
                {...ledgerSelectProps}
              />
            )}
          </VoucherFormField>
        </div>

        {showEntryType && (
          <VoucherFormField
            label="Entry Type"
            required
            className="min-w-0"
            labelClassName={labelClass}
            spacingClassName={fieldSpacing}
          >
            {readOnly ? (
              <p className={cn(previewHeight, "flex items-center", previewClass)}>
                {entry.entryType === "DEBIT" ? "Debit" : "Credit"}
              </p>
            ) : (
              <Select
                value={entry.entryType}
                onValueChange={(v) =>
                  onChange({
                    entryType: v as VoucherEntryType,
                    referenceType: defaultEntryReferenceType(voucherType, v as VoucherEntryType),
                    referenceId: null,
                    allocations: [],
                  })
                }
              >
                <SelectTrigger className={cn(inputClass, !compact && "h-8 text-xs")}>
                  <SelectValue />
                </SelectTrigger>
                <VoucherSelectContent>
                  <SelectItem value="DEBIT" className={selectItemClass}>
                    Debit
                  </SelectItem>
                  <SelectItem value="CREDIT" className={selectItemClass}>
                    Credit
                  </SelectItem>
                </VoucherSelectContent>
              </Select>
            )}
          </VoucherFormField>
        )}

        <VoucherFormField
          label="Reference Type"
          className="min-w-0"
          labelClassName={labelClass}
          spacingClassName={fieldSpacing}
        >
          {!showReferenceControls ? (
            <p className={cn(previewHeight, "flex items-center text-muted-foreground", previewClass)}>
              —
            </p>
          ) : readOnly ? (
            <p className={cn(previewHeight, "flex items-center", previewClass)}>
              {VOUCHER_REFERENCE_TYPE_LABELS[entry.referenceType] ?? entry.referenceType}
            </p>
          ) : (
            <Select
              value={entry.referenceType}
              onValueChange={(v) => setReferenceType(v as VoucherReferenceType)}
            >
              <SelectTrigger className={cn(inputClass, !compact && "h-8 text-xs")}>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <VoucherSelectContent>
                {refTypes.map((rt) => (
                  <SelectItem key={rt} value={rt} className={selectItemClass}>
                    {VOUCHER_REFERENCE_TYPE_LABELS[rt]}
                  </SelectItem>
                ))}
              </VoucherSelectContent>
            </Select>
          )}
        </VoucherFormField>

        <VoucherFormField
          label="Against Reference"
          className="min-w-0"
          labelClassName={labelClass}
          spacingClassName={fieldSpacing}
        >
          {!showReferenceControls || !showAgainstRef ? (
            <p className={cn(previewHeight, "flex items-center text-muted-foreground", previewClass)}>
              —
            </p>
          ) : referenceTypeShowsAllocationPicker(entry.referenceType) ? (
            readOnly ? (
              <p className={cn(previewHeight, "flex items-center truncate", previewClass)}>
                {multiAllocCount > 1
                  ? `${multiAllocCount} invoices`
                  : selectedDoc?.no ?? entry.allocations[0]?.documentNumber ?? "—"}
              </p>
            ) : (
              <div className="flex gap-1 min-w-0">
                <Select
                  value={entry.referenceId ? String(entry.referenceId) : ""}
                  onValueChange={(v) => {
                    const doc = openDocuments.find((d) => String(d.id) === v) ?? null;
                    setSingleDocument(doc);
                  }}
                  disabled={!allocationMode || openDocuments.length === 0}
                >
                  <SelectTrigger className={cn(inputClass, !compact && "h-8 text-xs", "flex-1 min-w-0")}>
                    <SelectValue placeholder={openDocuments.length ? "Select…" : "No open docs"} />
                  </SelectTrigger>
                  <VoucherSelectContent>
                    {openDocuments.map((doc) => (
                      <SelectItem key={doc.id} value={String(doc.id)} className={selectItemClass}>
                        {doc.no} · {formatMoney(doc.outstanding)}
                      </SelectItem>
                    ))}
                  </VoucherSelectContent>
                </Select>
                {allocationMode && openDocuments.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(compact ? "h-[38px]" : "h-8", "px-2 shrink-0")}
                    onClick={() => setAllocOpen(true)}
                    title="Allocate across multiple invoices"
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )
          ) : readOnly ? (
            <p className={cn(previewHeight, "flex items-center truncate", previewClass)}>
              {textReference || "—"}
            </p>
          ) : (
            <Input
              className={cn(inputClass, !compact && "h-8 text-xs")}
              value={textReference}
              onChange={(e) => setTextReference(e.target.value)}
              placeholder={
                entry.referenceType === "new_reference"
                  ? "New reference no…"
                  : "UTR / cheque / ref…"
              }
            />
          )}
        </VoucherFormField>

        {showAmount && (
          <VoucherFormField
            label="Amount"
            required
            className="min-w-0"
            labelClassName={labelClass}
            spacingClassName={fieldSpacing}
          >
            {readOnly ? (
              <p className={cn(previewHeight, "flex items-center tabular-nums justify-end", previewClass)}>
                {entry.amount > 0 ? formatMoney(entry.amount) : "—"}
              </p>
            ) : (
              <AccountsMoneyInput
                compact={false}
                className={cn(inputClass, moneyInputClass, !compact && "h-8 text-xs")}
                value={entry.amount}
                onChange={(v) => onChange({ amount: v })}
              />
            )}
          </VoucherFormField>
        )}

        {rowAction && (
          <VoucherFormField
            label={compact ? "\u00a0" : " "}
            labelClassName={cn(labelClass, "select-none")}
            spacingClassName={fieldSpacing}
            className="min-w-0"
          >
            <div className={cn(compact ? "h-9" : "h-8", "flex items-center justify-center")}>
              {rowAction}
            </div>
          </VoucherFormField>
        )}
      </div>
      </div>

      {costCentreApplicable && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <VoucherFormField
            label="Cost Centre"
            className="min-w-0"
            labelClassName={labelClass}
            spacingClassName={fieldSpacing}
          >
            {readOnly ? (
              <p className={cn(previewHeight, "flex items-center", previewClass)}>
                {entry.costCenterName || "—"}
              </p>
            ) : (
              <Select
                value={entry.costCenterId != null ? String(entry.costCenterId) : ""}
                onValueChange={(v) => {
                  const cc = costCenterOptions.find((c) => String(c.id) === v);
                  onChange({
                    costCenterId: cc?.id ?? null,
                    costCenterName: cc ? `${cc.code} — ${cc.name}` : "",
                  });
                }}
              >
                <SelectTrigger className={cn(inputClass, !compact && "h-8 text-xs")}>
                  <SelectValue placeholder="Select cost centre…" />
                </SelectTrigger>
                <VoucherSelectContent>
                  {costCenterOptions.map((cc) => (
                    <SelectItem key={cc.id} value={String(cc.id)} className={selectItemClass}>
                      {cc.code} — {cc.name}
                    </SelectItem>
                  ))}
                </VoucherSelectContent>
              </Select>
            )}
          </VoucherFormField>
          {entry.referenceType === "new_reference" && (
            <VoucherFormField
              label="Due Date"
              className="min-w-0"
              labelClassName={labelClass}
              spacingClassName={fieldSpacing}
            >
              {readOnly ? (
                <p className={cn(previewHeight, "flex items-center", previewClass)}>
                  {entry.billWiseDueDate || "—"}
                </p>
              ) : (
                <Input
                  type="date"
                  className={cn(inputClass, !compact && "h-8 text-xs")}
                  value={entry.billWiseDueDate ?? ""}
                  onChange={(e) => onChange({ billWiseDueDate: e.target.value })}
                />
              )}
            </VoucherFormField>
          )}
        </div>
      )}

      {!costCentreApplicable && entry.referenceType === "new_reference" && (
        <div className="max-w-xs">
          <VoucherFormField
            label="Due Date"
            className="min-w-0"
            labelClassName={labelClass}
            spacingClassName={fieldSpacing}
          >
            {readOnly ? (
              <p className={cn(previewHeight, "flex items-center", previewClass)}>
                {entry.billWiseDueDate || "—"}
              </p>
            ) : (
              <Input
                type="date"
                className={cn(inputClass, !compact && "h-8 text-xs")}
                value={entry.billWiseDueDate ?? ""}
                onChange={(e) => onChange({ billWiseDueDate: e.target.value })}
              />
            )}
          </VoucherFormField>
        </div>
      )}

      {showLineRemark && (
        <VoucherFormField label="Line Remark" className="min-w-0 w-full">
          {readOnly ? (
            <p className={cn("h-8 flex items-center text-xs", VOUCHER_PREVIEW_TEXT_CLASS)}>
              {entry.remark || "—"}
            </p>
          ) : (
            <Input
              className={cn(VOUCHER_INPUT_CLASS, "h-8 text-xs w-full")}
              value={entry.remark}
              onChange={(e) => onChange({ remark: e.target.value })}
              placeholder="Line remark…"
            />
          )}
        </VoucherFormField>
      )}

      {multiAllocCount > 1 && (
        <p className="text-[11px] text-muted-foreground">
          Allocated across {multiAllocCount} documents ·{" "}
          {formatMoney(entry.allocations.reduce((s, a) => s + a.allocatedAmount, 0))}
        </p>
      )}

      {excessGuidance && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
          {excessGuidance}
        </div>
      )}

      {allocationMode && (
        <VoucherEntryAllocationDialog
          open={allocOpen}
          onOpenChange={setAllocOpen}
          mode={allocationMode}
          partyLedger={ledger}
          coaRecords={coaRecords}
          entryAmount={entry.amount}
          allocations={entry.allocations}
          onSave={(allocations, total) => {
            onChange({
              allocations,
              amount: total > 0 ? total : entry.amount,
              referenceId: allocations.length === 1 ? allocations[0].documentId : null,
            });
          }}
        />
      )}
    </div>
  );
}
