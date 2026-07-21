"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/accounts/money-format";
import { getOpenBillsForVendor } from "@/lib/accounts/payables-data";
import { getOpenInvoicesForCustomer } from "@/lib/accounts/receivables-data";
import { getOpenGenericBillWiseDocuments, isGenericBillWiseLedger } from "@/lib/accounts/generic-bill-wise-store";
import { resolveAutoPartyFromLedger, isCustomerPartyLedger, isVendorPartyLedger } from "@/lib/accounts/voucher-ledger-groups";
import { getCustomerById } from "@/lib/accounts/transaction-master-fetch";
import { getVendorById } from "@/app/(app)/masters/vendors/vendor-data";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import {
  VOUCHER_INPUT_CLASS,
  VoucherSelectContent,
} from "@/components/accounts/voucher-simple-form-ui";

export interface OpenVoucherDocument {
  id: number;
  no: string;
  documentDate: string;
  originalAmount: number;
  outstanding: number;
  href: string;
}

export interface VoucherPartyRef {
  contactId: number;
  kind: "customer" | "vendor";
}

export function resolveVoucherPartyRef(
  mode: "receipt" | "payment",
  partyLedger: ChartOfAccount | null,
  coaRecords: ChartOfAccount[],
): VoucherPartyRef | null {
  if (!partyLedger) return null;
  const auto = resolveAutoPartyFromLedger(partyLedger, coaRecords);
  if (!auto.contactId) return null;

  // Resolve by ledger nature so Receipt can allocate vendor refunds / Payment can allocate customers if needed.
  if (isCustomerPartyLedger(partyLedger, coaRecords)) {
    const customer = getCustomerById(auto.contactId);
    if (customer) return { contactId: auto.contactId, kind: "customer" };
  }
  if (isVendorPartyLedger(partyLedger, coaRecords)) {
    const vendor = getVendorById(auto.contactId);
    if (vendor) return { contactId: auto.contactId, kind: "vendor" };
  }

  // Fallback: voucher mode when ledger type is ambiguous
  if (mode === "receipt") {
    const customer = getCustomerById(auto.contactId);
    if (customer) return { contactId: auto.contactId, kind: "customer" };
  } else {
    const vendor = getVendorById(auto.contactId);
    if (vendor) return { contactId: auto.contactId, kind: "vendor" };
  }
  return null;
}

export function useOpenVoucherDocuments(
  mode: "receipt" | "payment",
  partyLedger: ChartOfAccount | null,
  coaRecords: ChartOfAccount[],
): OpenVoucherDocument[] {
  const partyRef = useMemo(
    () => resolveVoucherPartyRef(mode, partyLedger, coaRecords),
    [partyLedger, coaRecords, mode],
  );

  return useMemo(() => {
    if (partyRef) {
      if (partyRef.kind === "customer") {
        return getOpenInvoicesForCustomer(partyRef.contactId).map((inv) => ({
          id: inv.invoiceId,
          no: inv.invoiceNo,
          documentDate: inv.invoiceDate,
          originalAmount: inv.invoiceAmount,
          outstanding: inv.outstanding,
          href: `/accounts/invoices/${inv.invoiceId}`,
        }));
      }
      return getOpenBillsForVendor(partyRef.contactId).map((bill) => ({
        id: bill.billId,
        no: bill.billNo,
        documentDate: bill.billDate,
        originalAmount: bill.billAmount,
        outstanding: bill.outstanding,
        href: `/accounts/purchase-invoices/${bill.billId}`,
      }));
    }

    if (partyLedger?.id != null && isGenericBillWiseLedger(partyLedger.id)) {
      return getOpenGenericBillWiseDocuments(partyLedger.id);
    }

    return [];
  }, [partyRef, partyLedger?.id]);
}

interface VoucherInlineDocumentSelectProps {
  mode: "receipt" | "payment";
  partyLedger: ChartOfAccount | null;
  coaRecords: ChartOfAccount[];
  value: number | null;
  onChange: (doc: OpenVoucherDocument | null) => void;
  readOnly?: boolean;
  className?: string;
}

export function VoucherInlineDocumentSelect({
  mode,
  partyLedger,
  coaRecords,
  value,
  onChange,
  readOnly = false,
  className,
}: VoucherInlineDocumentSelectProps) {
  const partyRef = resolveVoucherPartyRef(mode, partyLedger, coaRecords);
  const documents = useOpenVoucherDocuments(mode, partyLedger, coaRecords);
  const selected = documents.find((d) => d.id === value);

  const disabledReason = !partyLedger
    ? mode === "receipt"
      ? "Select customer or vendor to allocate"
      : "Select vendor to allocate bill"
    : !partyRef
      ? mode === "receipt"
        ? "On-account — no invoice allocation"
        : "On-account (expense) — no bills"
      : null;

  const staticFieldClass = cn(
    VOUCHER_INPUT_CLASS,
    "flex items-center px-3 text-muted-foreground bg-muted/20 min-w-0",
  );

  if (readOnly) {
    if (!selected) {
      return (
        <div className={cn(staticFieldClass, className)}>
          <span className="truncate">{disabledReason ?? "On-account / advance"}</span>
        </div>
      );
    }
    return (
      <div className={cn(VOUCHER_INPUT_CLASS, "flex items-center gap-1.5 px-3 min-w-0", className)}>
        <span className="font-mono text-[13px] font-semibold text-brand-700 truncate">{selected.no}</span>
        <Link href={selected.href} className="text-muted-foreground hover:text-brand-600 shrink-0">
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  if (disabledReason) {
    return (
      <div className={cn(staticFieldClass, "cursor-not-allowed", className)} aria-disabled>
        <span className="truncate">{disabledReason}</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={cn(staticFieldClass, className)}>
        <span className="truncate">
          {mode === "receipt" ? "On-account / advance (no open invoices)" : "On-account / advance (no open bills)"}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 w-full", className)}>
      <Select
        value={value != null ? String(value) : "__none__"}
        onValueChange={(v) => {
          if (v === "__none__") {
            onChange(null);
            return;
          }
          const doc = documents.find((d) => d.id === Number(v)) ?? null;
          onChange(doc);
        }}
      >
        <SelectTrigger className={VOUCHER_INPUT_CLASS}>
          <SelectValue
            placeholder={
              partyRef?.kind === "vendor"
                ? "Select bill (optional)…"
                : "Select invoice (optional)…"
            }
          />
        </SelectTrigger>
        <VoucherSelectContent>
          <SelectItem value="__none__" className="text-[13px] text-muted-foreground">
            {partyRef?.kind === "vendor" ? "On-account / refund" : "On-account / advance"}
          </SelectItem>
          {documents.map((doc) => (
            <SelectItem key={doc.id} value={String(doc.id)} className="text-[13px]">
              <span className="font-mono">{doc.no}</span>
              <span className="text-muted-foreground ml-1.5">({formatMoney(doc.outstanding)})</span>
            </SelectItem>
          ))}
        </VoucherSelectContent>
      </Select>
    </div>
  );
}
