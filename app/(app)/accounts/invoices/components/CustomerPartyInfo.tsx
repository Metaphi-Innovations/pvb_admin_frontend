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
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SalesOrderService } from "@/services/sales-order.service";

export interface CustomerPartyInfo {
  customerId?: string;
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
    customerId: extras?.customerId || match?.customerUuid || undefined,
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

function formatPaymentTerms(paymentType?: string, creditDays?: number | string): string {
  if (!paymentType) return "—";
  const type = paymentType.toLowerCase();
  if (type === "advance") return "Advance";
  if (type === "credit") {
    const days = creditDays ? Number(creditDays) : 30;
    return `Net ${days}`;
  }
  return paymentType;
}

export function CustomerPartyInfoDialog({
  open,
  onClose,
  info: initialInfo,
}: {
  open: boolean;
  onClose: () => void;
  info: CustomerPartyInfo | null;
}) {
  const [info, setInfo] = useState<CustomerPartyInfo | null>(initialInfo);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInfo(initialInfo);
    if (!open || !initialInfo) return;

    const { customerId } = initialInfo;
    if (!customerId) return;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(customerId);
    
    if (isUuid) {
      const fetchDetails = async () => {
        setLoading(true);
        try {
          const res = await SalesOrderService.getCustomerDetails(customerId);
          if (res) {
            const mainBranch = res.branches?.find((b: any) => b.is_main_branch) || res.branches?.[0];
            const billingAddress = mainBranch
              ? [
                  mainBranch.billing_address_line_1,
                  mainBranch.billing_address_line_2,
                  mainBranch.billing_city,
                  mainBranch.billing_state,
                  mainBranch.billing_pincode,
                ].filter(Boolean).join(", ")
              : "";
              
            const shippingAddress = mainBranch
              ? [
                  mainBranch.shipping_address_line_1,
                  mainBranch.shipping_address_line_2,
                  mainBranch.shipping_city,
                  mainBranch.shipping_state,
                  mainBranch.shipping_pincode,
                ].filter(Boolean).join(", ")
              : "";
              
            setInfo({
              customerId: initialInfo.customerId,
              customerName: res.customer_name || initialInfo.customerName,
              customerCode: res.customer_code || initialInfo.customerCode,
              gstin: res.gstin_no || initialInfo.gstin,
              billingAddress: initialInfo.billingAddress && initialInfo.billingAddress !== "—" ? initialInfo.billingAddress : (billingAddress || "—"),
              shippingAddress: initialInfo.shippingAddress && initialInfo.shippingAddress !== "—" ? initialInfo.shippingAddress : (shippingAddress || "—"),
              placeOfSupply: initialInfo.placeOfSupply && initialInfo.placeOfSupply !== "—" ? initialInfo.placeOfSupply : (mainBranch?.billing_state || "—"),
              paymentTerms: formatPaymentTerms(res.payment_type, res.credit_days) || initialInfo.paymentTerms || "—",
              branch: initialInfo.branch,
              creditLimit: res.credit_limit ? Number(res.credit_limit) : initialInfo.creditLimit,
              customerType: res.customer_type?.customer_type_name || initialInfo.customerType,
              salesperson: initialInfo.salesperson,
            });
          }
        } catch (err) {
          console.error("Failed to fetch customer details from backend:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchDetails();
    }
  }, [open, initialInfo]);

  if (!info) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sales-order-invoice-form-compact sales-order-invoice-dialog max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="so-dialog-title">{info.customerName}</DialogTitle>
          <DialogDescription className="so-dialog-desc">
            {loading ? "Loading customer details..." : "Customer details"}
          </DialogDescription>
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
  customerId,
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
  customerId?: string;
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
        customerId,
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
      customerId,
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
  customerId,
  customerName,
  customerCode,
  branch,
  gstin,
  className,
}: {
  customerId?: string;
  customerName: string;
  customerCode?: string;
  branch?: string;
  gstin?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const info = useMemo(
    () => resolveCustomerPartyInfo(customerName, { customerCode, branch, gstin, customerId }),
    [customerName, customerCode, branch, gstin, customerId],
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
