"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  customerMasterToTransactionFields,
  resolveShipToGstin,
  type CustomerTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import {
  formatCustomerDropdownLabel,
  formatCustomerDropdownSublabel,
} from "@/lib/masters/entity-display";
import { SearchableSelect } from "@/app/(app)/accounts/credit-notes/components/SearchableSelect";

function DetailField({
  label,
  value,
  className,
  mono,
}: {
  label: string;
  value?: string | null;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p
        className={`text-xs font-medium py-1.5 px-2.5 bg-muted/25 rounded-md border border-border/50 min-h-[32px] flex items-center mt-1 ${mono ? "font-mono" : ""}`}
      >
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}

function AddressField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-xs py-2 px-2.5 bg-muted/25 rounded-md border border-border/50 min-h-[48px] whitespace-pre-wrap mt-1">
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}

const SHIP_TO_GSTIN_UNAVAILABLE = "No GSTIN Available";

export interface SalesInvoiceCustomerSectionProps {
  customers: Customer[];
  customerId: string;
  onCustomerIdChange: (id: string, fields: CustomerTransactionFields | null) => void;
  fields: CustomerTransactionFields | null;
  billToId: string;
  shipToId: string;
  onBillToChange: (id: string, address: string) => void;
  onShipToChange: (id: string, address: string) => void;
  billingAddress: string;
  shippingAddress: string;
  disabled?: boolean;
}

export function SalesInvoiceCustomerSection({
  customers,
  customerId,
  onCustomerIdChange,
  fields,
  billToId,
  shipToId,
  onBillToChange,
  onShipToChange,
  billingAddress,
  shippingAddress,
  disabled,
}: SalesInvoiceCustomerSectionProps) {
  const options = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: formatCustomerDropdownLabel(c),
        sub: formatCustomerDropdownSublabel(c),
      })),
    [customers],
  );

  const shipToGstin = useMemo(() => {
    if (!fields) return SHIP_TO_GSTIN_UNAVAILABLE;
    const gstin = resolveShipToGstin(fields, shipToId);
    return gstin || SHIP_TO_GSTIN_UNAVAILABLE;
  }, [fields, shipToId]);

  const handleSelect = (id: string) => {
    const c = customers.find((x) => x.id === Number(id));
    onCustomerIdChange(id, c ? customerMasterToTransactionFields(c) : null);
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Customer details are loaded from{" "}
        <Link href="/masters/customers" className="text-brand-700 hover:underline">
          Customer Master
        </Link>
        . To update master data, edit the customer record.
      </p>

      <SearchableSelect
        label="Customer Name"
        options={options}
        value={customerId}
        onChange={handleSelect}
        placeholder="Search customer…"
        disabled={disabled}
        required
      />

      {fields && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <DetailField label="Customer Code" value={fields.customerCode} mono />
            <DetailField label="Customer Ledger" value={fields.receivableLedger} />
            <DetailField label="GSTIN" value={fields.customerGst} mono />
            <DetailField label="PAN" value={fields.pan} mono />
            <DetailField label="State" value={fields.state} />
            <DetailField label="Contact Person" value={fields.contactPerson} />
            <DetailField label="Mobile" value={fields.customerMobile} />
            <DetailField label="Email" value={fields.customerEmail} />
            <DetailField label="Credit Days" value={String(fields.creditDays)} />
            <DetailField label="Payment Terms" value={fields.paymentTerms} />
          </div>

          {(fields.billToOptions.length > 0 || fields.shipToOptions.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.billToOptions.length > 0 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Bill To</Label>
                    <Select
                      value={billToId}
                      disabled={disabled}
                      onValueChange={(id) => {
                        const opt = fields.billToOptions.find((o) => o.id === id);
                        onBillToChange(id, opt?.formatted ?? "");
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select billing location…" />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.billToOptions.map((o) => (
                          <SelectItem key={o.id} value={o.id} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <AddressField label="Billing Address" value={billingAddress} />
                </div>
              )}
              {fields.shipToOptions.length > 0 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Ship To</Label>
                    <Select
                      value={shipToId}
                      disabled={disabled}
                      onValueChange={(id) => {
                        const opt = fields.shipToOptions.find((o) => o.id === id);
                        onShipToChange(id, opt?.formatted ?? "");
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select delivery location…" />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.shipToOptions.map((o) => (
                          <SelectItem key={o.id} value={o.id} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <AddressField label="Shipping Address" value={shippingAddress} />
                  <DetailField label="GST Number (GSTIN)" value={shipToGstin} mono />
                </div>
              )}
            </div>
          )}

          {fields.billToOptions.length === 0 && fields.shipToOptions.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AddressField label="Billing Address" value={billingAddress} />
              <div className="space-y-3">
                <AddressField label="Shipping Address" value={shippingAddress} />
                <DetailField label="GST Number (GSTIN)" value={shipToGstin} mono />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
