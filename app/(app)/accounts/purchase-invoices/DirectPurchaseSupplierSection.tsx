"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { DP_LABEL_CLASS, DP_SELECT_CLASS } from "./direct-purchase-form-ui";

export type DirectPurchaseSupplierOption = {
  id: string;
  name: string;
  code: string;
};

export function DirectPurchaseSupplierSection({
  suppliers,
  supplierId,
  onSupplierSelect,
  disabled,
  hideLabel = false,
  className,
}: {
  suppliers: DirectPurchaseSupplierOption[];
  supplierId: string;
  onSupplierSelect: (id: string) => void;
  disabled?: boolean;
  hideLabel?: boolean;
  className?: string;
}) {
  const options = useMemo(
    () =>
      suppliers.map((s) => ({
        value: s.id,
        label: s.name,
        sublabel: s.code || undefined,
      })),
    [suppliers],
  );

  return (
    <div className={hideLabel ? "min-w-0" : "space-y-0.5"}>
      {!hideLabel ? (
        <Label className={DP_LABEL_CLASS}>
          Supplier <span className="text-red-500">*</span>
        </Label>
      ) : null}
      <AutocompleteSelect
        options={options}
        value={supplierId}
        onChange={onSupplierSelect}
        placeholder="Select supplier…"
        searchPlaceholder="Search suppliers…"
        disabled={disabled}
        className={className ?? DP_SELECT_CLASS}
      />
    </div>
  );
}
