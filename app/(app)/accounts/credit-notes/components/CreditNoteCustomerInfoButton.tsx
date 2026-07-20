"use client";

import { Info } from "lucide-react";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMoney } from "@/lib/accounts/money-format";
import { getCustomerOutstandingDetail } from "@/lib/accounts/receivables-data";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";

export function CreditNoteCustomerInfoButton({
  customer,
  placeOfSupply,
}: {
  customer: Customer | null | undefined;
  placeOfSupply?: string;
}) {
  const [open, setOpen] = useState(false);

  const outstanding = useMemo(() => {
    if (!customer?.id || typeof window === "undefined") return null;
    try {
      return getCustomerOutstandingDetail(customer.id)?.currentOutstanding ?? null;
    } catch {
      return null;
    }
  }, [customer?.id, open]);

  if (!customer) return null;

  const regType = customer.gstApplicable
    ? customer.gstin?.trim()
      ? "Registered"
      : "GST applicable"
    : "Unregistered / Non-GST";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cnz-info-btn"
          aria-label="Customer information"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" className="cnz-info-pop p-0">
        <div className="px-2.5 py-2 border-b border-border">
          <p className="text-xs font-semibold text-foreground truncate">{customer.customerName}</p>
        </div>
        <div className="px-2.5 py-1.5">
          <div className="cnz-info-pop__row">
            <span>Customer Code</span>
            <span className="font-mono">{customer.customerCode || "—"}</span>
          </div>
          <div className="cnz-info-pop__row">
            <span>GSTIN</span>
            <span className="font-mono">{customer.gstin?.trim() || "—"}</span>
          </div>
          <div className="cnz-info-pop__row">
            <span>Registration</span>
            <span>{regType}</span>
          </div>
          <div className="cnz-info-pop__row">
            <span>Billing State</span>
            <span>{customer.stateName || "—"}</span>
          </div>
          <div className="cnz-info-pop__row">
            <span>Place of Supply</span>
            <span>{placeOfSupply || customer.stateName || "—"}</span>
          </div>
          <div className="cnz-info-pop__row">
            <span>Payment Terms</span>
            <span>{customer.paymentTerms || "—"}</span>
          </div>
          <div className="cnz-info-pop__row">
            <span>Outstanding</span>
            <span>
              {outstanding != null ? formatMoney(outstanding) : "—"}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
