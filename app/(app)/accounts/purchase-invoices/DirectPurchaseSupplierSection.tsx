"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import {
  formatVendorDropdownLabel,
  formatVendorDropdownSublabel,
} from "@/lib/masters/entity-display";
import {
  vendorMasterToTransactionFields,
  type VendorTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import type { Vendor } from "@/app/(app)/masters/vendors/vendor-data";
import { DP_LABEL_CLASS, DP_SELECT_CLASS } from "./direct-purchase-form-ui";

export function DirectPurchaseSupplierSection({
  vendors,
  vendorId,
  onVendorSelect,
  disabled,
}: {
  vendors: Vendor[];
  vendorId: string;
  onVendorSelect: (id: string, vendorFields: VendorTransactionFields | null) => void;
  disabled?: boolean;
}) {
  const options = useMemo(
    () =>
      vendors.map((v) => ({
        value: String(v.id),
        label: formatVendorDropdownLabel(v),
        sublabel: formatVendorDropdownSublabel(v),
      })),
    [vendors],
  );

  const handleSelect = (id: string) => {
    const v = vendors.find((x) => x.id === Number(id));
    onVendorSelect(id, v ? vendorMasterToTransactionFields(v) : null);
  };

  return (
    <div className="space-y-0.5">
      <Label className={DP_LABEL_CLASS}>
        Supplier <span className="text-red-500">*</span>
      </Label>
      <AutocompleteSelect
        options={options}
        value={vendorId}
        onChange={handleSelect}
        placeholder="Select supplier…"
        searchPlaceholder="Search suppliers…"
        disabled={disabled}
        className={DP_SELECT_CLASS}
      />
    </div>
  );
}
