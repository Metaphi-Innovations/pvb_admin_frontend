"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  customerMasterToTransactionFields,
  type CustomerTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import {
  formatCustomerDropdownLabel,
  formatCustomerDropdownSublabel,
} from "@/lib/masters/entity-display";
import { SearchableSelect } from "@/app/(app)/accounts/credit-notes/components/SearchableSelect";
import { MasterReadOnlyField } from "./MasterReadOnlyField";
import { PartyBranchAddressSelector } from "./PartyBranchAddressSelector";
import { PartyAddressDetailCards } from "./PartyAddressDetailCards";

export interface CustomerMasterPanelProps {
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
  allowSelect?: boolean;
  title?: string;
  /** Structured Bill To / Ship To cards with company, address, GSTIN */
  showStructuredAddresses?: boolean;
}

export function CustomerMasterPanel({
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
  allowSelect = true,
  title = "Customer",
  showStructuredAddresses = false,
}: CustomerMasterPanelProps) {
  const options = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: formatCustomerDropdownLabel(c),
        sub: formatCustomerDropdownSublabel(c),
      })),
    [customers],
  );

  const handleSelect = (id: string) => {
    const c = customers.find((x) => x.id === Number(id));
    onCustomerIdChange(id, c ? customerMasterToTransactionFields(c) : null);
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        {title} data is loaded from{" "}
        <Link href="/masters/customers" className="text-brand-700 hover:underline">
          Customer Master
        </Link>
        . Edit master records there — not on this form.
      </p>

      {allowSelect ? (
        <div className="max-w-md">
          <SearchableSelect
            label={`Select ${title}`}
            options={options}
            value={customerId}
            onChange={handleSelect}
            placeholder={`Search ${title.toLowerCase()}…`}
            disabled={disabled}
            required
          />
        </div>
      ) : null}

      {fields && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <MasterReadOnlyField label="Customer Name" value={fields.customerName} className="sm:col-span-2" />
            <MasterReadOnlyField label="Customer Code" value={fields.customerCode} mono />
            <MasterReadOnlyField label="Customer Ledger" value={fields.receivableLedger} />
            <MasterReadOnlyField label="GSTIN" value={fields.customerGst} mono />
            <MasterReadOnlyField label="PAN" value={fields.pan} mono />
            <MasterReadOnlyField label="State" value={fields.state} />
            <MasterReadOnlyField label="Contact Person" value={fields.contactPerson} />
            <MasterReadOnlyField label="Mobile" value={fields.customerMobile} />
            <MasterReadOnlyField label="Email" value={fields.customerEmail} />
            <MasterReadOnlyField label="Credit Days" value={String(fields.creditDays)} />
            <MasterReadOnlyField label="Payment Terms" value={fields.paymentTerms} />
          </div>

          <PartyBranchAddressSelector
            billToOptions={fields.billToOptions}
            shipToOptions={fields.shipToOptions}
            billToId={billToId}
            shipToId={shipToId}
            onBillToChange={onBillToChange}
            onShipToChange={onShipToChange}
            disabled={disabled}
          />

          {showStructuredAddresses ? (
            <PartyAddressDetailCards
              billToOptions={fields.billToOptions}
              shipToOptions={fields.shipToOptions}
              billToId={billToId}
              shipToId={shipToId}
              gstin={fields.customerGst}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Billing Address</p>
                <p className="text-xs py-2 px-2.5 bg-muted/25 rounded-md border border-border/50 min-h-[48px] whitespace-pre-wrap">
                  {billingAddress?.trim() ? billingAddress : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Shipping Address</p>
                <p className="text-xs py-2 px-2.5 bg-muted/25 rounded-md border border-border/50 min-h-[48px] whitespace-pre-wrap">
                  {shippingAddress?.trim() ? shippingAddress : "—"}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
