"use client";

/**
 * Compact customer detail for Pending Invoices / Sales Invoice listings.
 * Page-scoped to invoice workflows — not used outside Accounts Sales Invoice flows.
 */

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/accounts/money-format";
import { loadCustomers, type Customer } from "@/app/(app)/masters/customers/customer-data";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface CustomerPartyInfo {
  customerName: string;
  customerCode?: string;
  gstin?: string;
  billingAddress?: string;
  shippingAddress?: string;
  placeOfSupply?: string;
  paymentTerms?: string;
  branch?: string;
  creditLimit?: number | null;
  customerType?: string;
  salesperson?: string;
}

function formatBranchAddress(addr: {
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
} | null | undefined): string {
  if (!addr) return "—";
  const parts = [
    addr.address || addr.addressLine1,
    addr.addressLine2,
    [addr.city, addr.state].filter(Boolean).join(", "),
    addr.pincode,
  ].filter((p) => p && String(p).trim());
  return parts.length ? parts.join(", ") : "—";
}

export function resolveCustomerPartyInfo(
  customerName: string,
  extras?: Partial<CustomerPartyInfo>,
): CustomerPartyInfo {
  const name = customerName?.trim() || "";
  const customers = typeof window !== "undefined" ? loadCustomers() : [];
  const match =
    customers.find((c) => c.customerName.trim().toLowerCase() === name.toLowerCase()) ??
    customers.find((c) => c.customerCode && extras?.customerCode && c.customerCode === extras.customerCode);

  const branch = match?.branches?.[0];
  return {
    customerName: name || "—",
    customerCode: extras?.customerCode || match?.customerCode || "—",
    gstin: extras?.gstin || match?.gstin || branch?.billingAddress?.gstin || "—",
    billingAddress:
      extras?.billingAddress ||
      formatBranchAddress(branch?.billingAddress) ||
      match?.address ||
      "—",
    shippingAddress:
      extras?.shippingAddress || formatBranchAddress(branch?.shippingAddress) || "—",
    placeOfSupply:
      extras?.placeOfSupply || match?.stateName || branch?.billingAddress?.state || "—",
    paymentTerms: extras?.paymentTerms || match?.paymentTerms || "—",
    branch: extras?.branch || match?.branch || branch?.branchName || "—",
    creditLimit:
      extras?.creditLimit !== undefined
        ? extras.creditLimit
        : match?.creditLimit != null
          ? match.creditLimit
          : null,
    customerType: extras?.customerType || match?.customerType || undefined,
    salesperson: extras?.salesperson || match?.salesManName || undefined,
  };
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="so-info-row-label text-[11px] text-muted-foreground">{label}</span>
      <span className="so-info-row-value text-xs font-medium text-foreground break-words">{value ?? "—"}</span>
    </div>
  );
}

export function CustomerPartyInfoDialog({
  open,
  onClose,
  info,
}: {
  open: boolean;
  onClose: () => void;
  info: CustomerPartyInfo | null;
}) {
  if (!info) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sales-order-invoice-form-compact sales-order-invoice-dialog max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="so-dialog-title">{info.customerName}</DialogTitle>
          <DialogDescription className="so-dialog-desc">Customer details</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-border bg-muted/20 px-3 py-1">
          <InfoRow label="Customer Code" value={info.customerCode || "—"} />
          <InfoRow label="GSTIN" value={info.gstin || "—"} />
          <InfoRow label="Billing Address" value={info.billingAddress || "—"} />
          <InfoRow label="Shipping Address" value={info.shippingAddress || "—"} />
          <InfoRow label="Place of Supply" value={info.placeOfSupply || "—"} />
          <InfoRow label="Branch" value={info.branch || "—"} />
          {info.customerType ? (
            <InfoRow label="Customer Type" value={info.customerType} />
          ) : null}
          {info.salesperson ? (
            <InfoRow label="Sales Person" value={info.salesperson} />
          ) : null}
          <InfoRow label="Payment Terms" value={info.paymentTerms || "—"} />
          <InfoRow
            label="Credit Limit"
            value={
              info.creditLimit != null && info.creditLimit > 0
                ? formatMoney(info.creditLimit)
                : "—"
            }
          />
        </div>
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" className="h-8" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Name + info icon that opens customer detail dialog. */
export function CustomerPartyInfoButton({
  customerName,
  customerCode,
  branch,
  gstin,
  billingAddress,
  shippingAddress,
  placeOfSupply,
  paymentTerms,
  creditLimit,
  customerType,
  salesperson,
  className,
}: {
  customerName: string;
  customerCode?: string;
  branch?: string;
  gstin?: string;
  billingAddress?: string;
  shippingAddress?: string;
  placeOfSupply?: string;
  paymentTerms?: string;
  creditLimit?: number | null;
  customerType?: string;
  salesperson?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const info = useMemo(
    () =>
      resolveCustomerPartyInfo(customerName, {
        customerCode,
        branch,
        gstin,
        billingAddress,
        shippingAddress,
        placeOfSupply,
        paymentTerms,
        creditLimit,
        customerType,
        salesperson,
      }),
    [
      customerName,
      customerCode,
      branch,
      gstin,
      billingAddress,
      shippingAddress,
      placeOfSupply,
      paymentTerms,
      creditLimit,
      customerType,
      salesperson,
    ],
  );
  if (!customerName?.trim()) return null;
  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-brand-700",
          className,
        )}
        aria-label={`Customer details for ${customerName}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      <CustomerPartyInfoDialog open={open} onClose={() => setOpen(false)} info={info} />
    </>
  );
}

/** Name + info icon that opens customer detail dialog. */
export function CustomerPartyNameCell({
  customerName,
  customerCode,
  branch,
  className,
}: {
  customerName: string;
  customerCode?: string;
  branch?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const info = useMemo(
    () => resolveCustomerPartyInfo(customerName, { customerCode, branch }),
    [customerName, customerCode, branch],
  );

  return (
    <>
      <div className={cn("inline-flex items-center gap-1 min-w-0 max-w-full", className)}>
        <span className="text-xs font-semibold text-foreground truncate">{customerName || "—"}</span>
        {customerName?.trim() ? (
          <button
            type="button"
            className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-brand-700"
            aria-label={`Customer details for ${customerName}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
      <CustomerPartyInfoDialog open={open} onClose={() => setOpen(false)} info={info} />
    </>
  );
}

/** Resolve display helpers without unused Customer import warnings. */
export type { Customer };
