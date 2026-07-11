"use client";

import { useMemo, useState } from "react";
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
  VOUCHER_INPUT_CLASS,
  VOUCHER_LEDGER_SELECT_COMPACT,
  VOUCHER_MONEY_INPUT_CLASS,
  VOUCHER_PREVIEW_TEXT_CLASS,
  VOUCHER_ROW_EQUAL_3,
  VOUCHER_ROW_EQUAL_4,
  VoucherFormField,
  VoucherSelectContent,
  VoucherLedgerCurBalance,
} from "@/components/accounts/voucher-simple-form-ui";
import { VoucherEntryAllocationDialog } from "@/components/accounts/voucher-form/VoucherEntryAllocationDialog";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import type { VoucherFormEntry, VoucherEntryType } from "@/lib/accounts/voucher-form-model";
import {
  defaultEntryReferenceType,
  getAvailableReferenceTypes,
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
  showEntryType?: boolean;
  /** When false, Amount is hidden and synced from the other entry (receipt/payment bank side). */
  showAmount?: boolean;
  onQuickAddSuccess?: () => void;
  onChange: (patch: Partial<VoucherFormEntry>) => void;
  className?: string;
}

export function VoucherEntryBlock({
  entry,
  voucherType,
  voucherDate,
  coaRecords,
  readOnly = false,
  accountLabel,
  accountPlaceholder = "Select an account…",
  ledgerFilter,
  quickAddScope,
  showEntryType = false,
  showAmount = true,
  onQuickAddSuccess,
  onChange,
  className,
}: VoucherEntryBlockProps) {
  const [allocOpen, setAllocOpen] = useState(false);

  const ledger = entry.accountId ? findLedgerById(entry.accountId, coaRecords) ?? null : null;

  const allocationMode = useMemo((): "receipt" | "payment" | null => {
    if (!ledger || !supportsInvoiceAllocation(voucherType, ledger, coaRecords)) return null;
    if (voucherType === "receipt" && entry.entryType === "CREDIT") return "receipt";
    if (voucherType === "payment" && entry.entryType === "DEBIT") return "payment";
    if (voucherType === "journal") {
      if (isCustomerPartyLedger(ledger, coaRecords)) return "receipt";
      if (isVendorPartyLedger(ledger, coaRecords)) return "payment";
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

  const showAgainstRef = referenceTypeShowsAllocationPicker(entry.referenceType)
    ? Boolean(allocationMode)
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

  return (
    <div className={cn("rounded-lg border border-border bg-muted/10 px-3 py-2.5 space-y-2", className)}>
      <div className="overflow-x-auto -mx-1 px-1">
      <div
        className={cn(
          "min-w-[640px]",
          showEntryType
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-start"
            : showAmount
              ? VOUCHER_ROW_EQUAL_4
              : VOUCHER_ROW_EQUAL_3,
        )}
      >
        <div className={cn("min-w-0", showEntryType ? "lg:col-span-1" : "")}>
          <VoucherFormField label={accountLabel} required className="min-w-0">
            {readOnly ? (
              <p className={cn("h-8 flex items-center text-xs", VOUCHER_PREVIEW_TEXT_CLASS)}>
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
                onQuickAddSuccess={onQuickAddSuccess ? () => onQuickAddSuccess() : undefined}
                {...VOUCHER_LEDGER_SELECT_COMPACT}
              />
            )}
          </VoucherFormField>
          <VoucherLedgerCurBalance ledger={ledger} asOfDate={voucherDate} />
        </div>

        {showEntryType && (
          <VoucherFormField label="Entry Type" required className="min-w-0">
            {readOnly ? (
              <p className={cn("h-8 flex items-center text-xs", VOUCHER_PREVIEW_TEXT_CLASS)}>
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
                <SelectTrigger className={cn(VOUCHER_INPUT_CLASS, "h-8 text-xs")}>
                  <SelectValue />
                </SelectTrigger>
                <VoucherSelectContent>
                  <SelectItem value="DEBIT" className="text-xs">
                    Debit
                  </SelectItem>
                  <SelectItem value="CREDIT" className="text-xs">
                    Credit
                  </SelectItem>
                </VoucherSelectContent>
              </Select>
            )}
          </VoucherFormField>
        )}

        <VoucherFormField label="Reference Type" className="min-w-0">
          {readOnly ? (
            <p className={cn("h-8 flex items-center text-xs", VOUCHER_PREVIEW_TEXT_CLASS)}>
              {VOUCHER_REFERENCE_TYPE_LABELS[entry.referenceType] ?? entry.referenceType}
            </p>
          ) : (
            <Select
              value={entry.referenceType}
              onValueChange={(v) => setReferenceType(v as VoucherReferenceType)}
            >
              <SelectTrigger className={cn(VOUCHER_INPUT_CLASS, "h-8 text-xs")}>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <VoucherSelectContent>
                {refTypes.map((rt) => (
                  <SelectItem key={rt} value={rt} className="text-xs">
                    {VOUCHER_REFERENCE_TYPE_LABELS[rt]}
                  </SelectItem>
                ))}
              </VoucherSelectContent>
            </Select>
          )}
        </VoucherFormField>

        <VoucherFormField label="Against Reference" className="min-w-0">
          {!showAgainstRef ? (
            <p className={cn("h-8 flex items-center text-xs text-muted-foreground", VOUCHER_PREVIEW_TEXT_CLASS)}>
              —
            </p>
          ) : referenceTypeShowsAllocationPicker(entry.referenceType) ? (
            readOnly ? (
              <p className={cn("h-8 flex items-center text-xs truncate", VOUCHER_PREVIEW_TEXT_CLASS)}>
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
                  <SelectTrigger className={cn(VOUCHER_INPUT_CLASS, "h-8 text-xs flex-1 min-w-0")}>
                    <SelectValue placeholder={openDocuments.length ? "Select…" : "No open docs"} />
                  </SelectTrigger>
                  <VoucherSelectContent>
                    {openDocuments.map((doc) => (
                      <SelectItem key={doc.id} value={String(doc.id)} className="text-xs">
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
                    className="h-8 px-2 shrink-0"
                    onClick={() => setAllocOpen(true)}
                    title="Allocate across multiple invoices"
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )
          ) : readOnly ? (
            <p className={cn("h-8 flex items-center text-xs truncate", VOUCHER_PREVIEW_TEXT_CLASS)}>
              {textReference || "—"}
            </p>
          ) : (
            <Input
              className={cn(VOUCHER_INPUT_CLASS, "h-8 text-xs")}
              value={textReference}
              onChange={(e) => setTextReference(e.target.value)}
              placeholder="UTR / cheque / ref…"
            />
          )}
        </VoucherFormField>

        {showAmount && (
          <VoucherFormField label="Amount" required className="min-w-0">
            {readOnly ? (
              <p className={cn("h-8 flex items-center tabular-nums text-xs justify-end", VOUCHER_PREVIEW_TEXT_CLASS)}>
                {entry.amount > 0 ? formatMoney(entry.amount) : "—"}
              </p>
            ) : (
              <AccountsMoneyInput
                compact={false}
                className={cn(VOUCHER_INPUT_CLASS, VOUCHER_MONEY_INPUT_CLASS, "h-8 text-xs")}
                value={entry.amount}
                onChange={(v) => onChange({ amount: v })}
              />
            )}
          </VoucherFormField>
        )}
      </div>
      </div>

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
