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
import {
  INVOICE_FORM_GRID_CLASS,
  INVOICE_FORM_HELPER_CLASS,
  INVOICE_FORM_INPUT_CLASS,
  INVOICE_FORM_LABEL_CLASS,
  InvoiceFormAddress,
  InvoiceFormReadOnly,
} from "@/app/(app)/accounts/components/InvoiceFormLayout";

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
      <p className={INVOICE_FORM_HELPER_CLASS}>
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
          <div className={INVOICE_FORM_GRID_CLASS}>
            <InvoiceFormReadOnly label="Customer Code" value={fields.customerCode} mono />
            <InvoiceFormReadOnly label="Customer Ledger" value={fields.receivableLedger} />
            <InvoiceFormReadOnly label="GSTIN" value={fields.customerGst} mono />
            <InvoiceFormReadOnly label="PAN" value={fields.pan} mono />
            <InvoiceFormReadOnly label="State" value={fields.state} />
            <InvoiceFormReadOnly label="Contact Person" value={fields.contactPerson} />
            <InvoiceFormReadOnly label="Mobile" value={fields.customerMobile} />
            <InvoiceFormReadOnly label="Email" value={fields.customerEmail} />
            <InvoiceFormReadOnly label="Credit Days" value={String(fields.creditDays)} />
            <InvoiceFormReadOnly label="Payment Terms" value={fields.paymentTerms} />
          </div>

          {(fields.billToOptions.length > 0 || fields.shipToOptions.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.billToOptions.length > 0 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className={INVOICE_FORM_LABEL_CLASS}>Bill To</Label>
                    <Select
                      value={billToId}
                      disabled={disabled}
                      onValueChange={(id) => {
                        const opt = fields.billToOptions.find((o) => o.id === id);
                        onBillToChange(id, opt?.formatted ?? "");
                      }}
                    >
                      <SelectTrigger className={INVOICE_FORM_INPUT_CLASS}>
                        <SelectValue placeholder="Select billing location…" />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.billToOptions.map((o) => (
                          <SelectItem key={o.id} value={o.id} className="text-sm">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <InvoiceFormAddress label="Billing Address" value={billingAddress} />
                </div>
              )}
              {fields.shipToOptions.length > 0 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className={INVOICE_FORM_LABEL_CLASS}>Ship To</Label>
                    <Select
                      value={shipToId}
                      disabled={disabled}
                      onValueChange={(id) => {
                        const opt = fields.shipToOptions.find((o) => o.id === id);
                        onShipToChange(id, opt?.formatted ?? "");
                      }}
                    >
                      <SelectTrigger className={INVOICE_FORM_INPUT_CLASS}>
                        <SelectValue placeholder="Select delivery location…" />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.shipToOptions.map((o) => (
                          <SelectItem key={o.id} value={o.id} className="text-sm">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <InvoiceFormAddress label="Shipping Address" value={shippingAddress} />
                  <InvoiceFormReadOnly label="GST Number" value={shipToGstin} mono />
                </div>
              )}
            </div>
          )}

          {fields.billToOptions.length === 0 && fields.shipToOptions.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InvoiceFormAddress label="Billing Address" value={billingAddress} />
              <div className="space-y-3">
                <InvoiceFormAddress label="Shipping Address" value={shippingAddress} />
                <InvoiceFormReadOnly label="GST Number" value={shipToGstin} mono />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
