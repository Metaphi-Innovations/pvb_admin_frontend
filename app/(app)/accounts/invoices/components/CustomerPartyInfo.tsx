"use client";

/**
 * Compact customer detail for Pending Invoices / Sales Invoice listings.
 * Loads live Customer master data only — no localStorage / seed fallbacks.
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
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CustomerListService } from "@/services/customer-list.service";

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
  linkedLedger?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isCustomerUuid(id?: string | null): id is string {
  return Boolean(id && UUID_RE.test(id));
}

function formatJoinAddress(parts: Array<string | null | undefined>): string {
  return parts.filter((p) => p && String(p).trim()).join(", ");
}

/** Format payment_type + credit_days + advance from Customer master. */
export function formatCustomerMasterPaymentTerms(params: {
  paymentType?: string | null;
  creditDays?: number | string | null;
  advance?: number | string | null;
}): string {
  const type = params.paymentType?.trim().toLowerCase();
  if (!type) return "";
  if (type === "immediate") return "Immediate";
  if (type === "advance") {
    const pct =
      params.advance != null && params.advance !== ""
        ? Number(params.advance)
        : NaN;
    return Number.isFinite(pct) && pct > 0 ? `Advance ${pct}%` : "Advance";
  }
  if (type === "credit") {
    const days =
      params.creditDays != null && params.creditDays !== ""
        ? Number(params.creditDays)
        : NaN;
    return Number.isFinite(days) ? `Credit ${days} Days` : "Credit";
  }
  return params.paymentType!.trim();
}

/**
 * Resolve a backend customer UUID for live fetch.
 * Uses UUID prop when present, otherwise Customer list search (includes inactive).
 */
async function resolveCustomerFetchId(
  info: CustomerPartyInfo,
): Promise<string | null> {
  if (isCustomerUuid(info.customerId)) return info.customerId;

  const search =
    (info.customerCode && info.customerCode !== "—"
      ? info.customerCode.trim()
      : "") ||
    (info.customerName && info.customerName !== "—"
      ? info.customerName.trim()
      : "");
  if (!search) return null;

  try {
    const { items } = await CustomerListService.list({
      page: 1,
      pageSize: 20,
      search,
      status: "all",
    });
    const code = info.customerCode?.trim().toLowerCase();
    const name = info.customerName?.trim().toLowerCase();
    const byCode =
      code && code !== "—"
        ? items.find((c) => c.customerCode.trim().toLowerCase() === code)
        : undefined;
    const byName =
      !byCode && name && name !== "—"
        ? items.find((c) => c.customerName.trim().toLowerCase() === name)
        : undefined;
    const hit = byCode || byName || items[0];
    return isCustomerUuid(hit?.customerUuid) ? hit!.customerUuid : null;
  } catch {
    return null;
  }
}

function formatBranchRows(branches: unknown[] | undefined): {
  billingAddress: string;
  shippingAddress: string;
  placeOfSupply: string;
  branchName: string;
} {
  const list = Array.isArray(branches) ? branches : [];
  const main =
    list.find(
      (b) =>
        b &&
        typeof b === "object" &&
        Boolean((b as { is_main_branch?: boolean }).is_main_branch),
    ) || list[0];
  if (!main || typeof main !== "object") {
    return {
      billingAddress: "",
      shippingAddress: "",
      placeOfSupply: "",
      branchName: "",
    };
  }
  const b = main as Record<string, unknown>;
  return {
    billingAddress: formatJoinAddress([
      b.billing_address_line_1 as string,
      b.billing_address_line_2 as string,
      b.billing_city as string,
      b.billing_state as string,
      b.billing_pincode as string,
    ]),
    shippingAddress: formatJoinAddress([
      b.shipping_address_line_1 as string,
      b.shipping_address_line_2 as string,
      b.shipping_city as string,
      b.shipping_state as string,
      b.shipping_pincode as string,
    ]),
    placeOfSupply: String(b.billing_state ?? "").trim(),
    branchName: String(b.branch_name ?? "").trim(),
  };
}

/** Skeleton from props only — never reads localStorage / seed customers. */
export function resolveCustomerPartyInfo(
  customerName: string,
  extras?: Partial<CustomerPartyInfo>,
): CustomerPartyInfo {
  const name = customerName?.trim() || "";
  return {
    customerId: extras?.customerId || undefined,
    customerName: name || "—",
    customerCode: extras?.customerCode || "—",
    gstin: extras?.gstin || "—",
    billingAddress: extras?.billingAddress || "—",
    shippingAddress: extras?.shippingAddress || "—",
    placeOfSupply: extras?.placeOfSupply || "—",
    paymentTerms: extras?.paymentTerms || "—",
    branch: extras?.branch || "—",
    creditLimit: extras?.creditLimit !== undefined ? extras.creditLimit : null,
    customerType: extras?.customerType || undefined,
    salesperson: extras?.salesperson || undefined,
    linkedLedger: extras?.linkedLedger || undefined,
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
  info: initialInfo,
}: {
  open: boolean;
  onClose: () => void;
  info: CustomerPartyInfo | null;
}) {
  const [info, setInfo] = useState<CustomerPartyInfo | null>(initialInfo);
  const [loading, setLoading] = useState(false);

  const fetchKey = [
    initialInfo?.customerId ?? "",
    initialInfo?.customerCode ?? "",
    initialInfo?.customerName ?? "",
  ].join("|");

  useEffect(() => {
    setInfo(initialInfo);
    if (!open || !initialInfo) return;

    let cancelled = false;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const fetchId = await resolveCustomerFetchId(initialInfo);
        if (cancelled || !fetchId) return;

        const res = await CustomerListService.view(fetchId);
        if (cancelled || !res) return;

        const branchInfo = formatBranchRows(res.branches);
        const livePaymentTerms = formatCustomerMasterPaymentTerms({
          paymentType: res.paymentType,
          creditDays: res.creditDays,
          advance: res.advance,
        });

        setInfo({
          customerId: fetchId,
          customerName: res.customerName || initialInfo.customerName,
          customerCode: res.customerCode || initialInfo.customerCode,
          gstin: res.gstinNo || initialInfo.gstin || "—",
          billingAddress:
            branchInfo.billingAddress || initialInfo.billingAddress || "—",
          shippingAddress:
            branchInfo.shippingAddress || initialInfo.shippingAddress || "—",
          placeOfSupply:
            branchInfo.placeOfSupply || initialInfo.placeOfSupply || "—",
          paymentTerms: livePaymentTerms || "—",
          branch: branchInfo.branchName || initialInfo.branch || "—",
          creditLimit: res.creditLimit != null ? res.creditLimit : null,
          customerType: res.customerType || undefined,
          salesperson: initialInfo.salesperson,
          linkedLedger: initialInfo.linkedLedger,
        });
      } catch (err) {
        console.error("Failed to fetch customer details from backend:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchDetails();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchKey captures identity fields
  }, [open, fetchKey]);

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
          {info.linkedLedger ? (
            <InfoRow label="Linked Ledger" value={info.linkedLedger} />
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
  linkedLedger,
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
  linkedLedger?: string;
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
        linkedLedger,
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
      linkedLedger,
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
