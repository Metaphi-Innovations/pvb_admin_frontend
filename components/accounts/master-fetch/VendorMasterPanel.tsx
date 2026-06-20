"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  vendorMasterToTransactionFields,
  type VendorTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import type { Vendor } from "@/app/(app)/masters/vendors/vendor-data";
import {
  formatVendorDropdownLabel,
  formatVendorDropdownSublabel,
} from "@/lib/masters/entity-display";
import { SearchableSelect } from "@/app/(app)/accounts/credit-notes/components/SearchableSelect";
import { MasterReadOnlyField, MasterReadOnlyAddress } from "./MasterReadOnlyField";
import { PartyBranchAddressSelector } from "./PartyBranchAddressSelector";
import { MasterFetchedBadge } from "./MasterFetchedBadge";

export interface VendorMasterPanelProps {
  vendors: Vendor[];
  vendorId: string;
  onVendorIdChange: (id: string, fields: VendorTransactionFields | null) => void;
  fields: VendorTransactionFields | null;
  billToId: string;
  shipToId: string;
  onBillToChange: (id: string, address: string) => void;
  onShipToChange: (id: string, address: string) => void;
  billingAddress: string;
  shippingAddress: string;
  disabled?: boolean;
  allowSelect?: boolean;
  title?: string;
}

export function VendorMasterPanel({
  vendors,
  vendorId,
  onVendorIdChange,
  fields,
  billToId,
  shipToId,
  onBillToChange,
  onShipToChange,
  billingAddress,
  shippingAddress,
  disabled,
  allowSelect = true,
  title = "Vendor",
}: VendorMasterPanelProps) {
  const options = useMemo(
    () =>
      vendors.map((v) => ({
        value: String(v.id),
        label: formatVendorDropdownLabel(v),
        sub: formatVendorDropdownSublabel(v),
      })),
    [vendors],
  );

  const handleSelect = (id: string) => {
    const v = vendors.find((x) => x.id === Number(id));
    onVendorIdChange(id, v ? vendorMasterToTransactionFields(v) : null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {title} data is loaded from{" "}
          <Link href="/masters/vendors" className="text-brand-700 hover:underline">
            Vendor Master
          </Link>
          . Edit master records there — not on this form.
        </p>
        <MasterFetchedBadge />
      </div>

      {allowSelect ? (
        <div className="max-w-md">
          <SearchableSelect
            label={`Select ${title}`}
            options={options}
            value={vendorId}
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
            <MasterReadOnlyField label="Vendor Name" value={fields.vendorName} className="sm:col-span-2" />
            <MasterReadOnlyField label="Vendor Code" value={fields.vendorCode} mono />
            <MasterReadOnlyField label="Trade Payables Ledger" value={fields.payableLedger} />
            <MasterReadOnlyField label="GSTIN" value={fields.vendorGst} mono />
            <MasterReadOnlyField label="PAN" value={fields.pan} mono />
            <MasterReadOnlyField label="Contact Person" value={fields.contactPerson} />
            <MasterReadOnlyField label="Mobile" value={fields.vendorMobile} />
            <MasterReadOnlyField label="Email" value={fields.vendorEmail} />
            <MasterReadOnlyField label="Payment Terms" value={fields.paymentTerms} />
            <MasterReadOnlyField label="Credit Days" value={String(fields.creditDays)} />
          </div>

          {(fields.bankName || fields.accountNumber) && (
            <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Bank: </span>
                <span className="font-medium">{fields.bankName || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Branch: </span>
                <span className="font-medium">{fields.bankBranch || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">A/C: </span>
                <span className="font-mono font-medium">{fields.accountNumber || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">IFSC: </span>
                <span className="font-mono font-medium">{fields.ifscCode || "—"}</span>
              </div>
            </div>
          )}

          <PartyBranchAddressSelector
            billToOptions={fields.billToOptions}
            shipToOptions={fields.shipToOptions}
            billToId={billToId}
            shipToId={shipToId}
            onBillToChange={onBillToChange}
            onShipToChange={onShipToChange}
            disabled={disabled}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MasterReadOnlyAddress label="Billing Address" value={billingAddress} />
            <MasterReadOnlyAddress label="Shipping / Delivery Address" value={shippingAddress} />
          </div>
        </>
      )}
    </div>
  );
}
