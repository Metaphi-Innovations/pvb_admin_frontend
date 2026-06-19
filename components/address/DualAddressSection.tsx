"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { GeoNode } from "@/app/(app)/masters/geography/geo-data";
import {
  type StructuredAddress,
  copyStructuredAddress,
} from "@/lib/address/types";
import { AddressBlock } from "./AddressBlock";

export interface DualAddressSectionProps {
  current: StructuredAddress;
  permanent: StructuredAddress;
  onCurrentChange: (value: StructuredAddress) => void;
  onPermanentChange: (value: StructuredAddress) => void;
  sameAsCurrent: boolean;
  onSameAsCurrentChange: (checked: boolean) => void;
  geoNodes: GeoNode[];
  currentErrors?: Partial<Record<keyof StructuredAddress, string>>;
  permanentErrors?: Partial<Record<keyof StructuredAddress, string>>;
}

export function DualAddressSection({
  current,
  permanent,
  onCurrentChange,
  onPermanentChange,
  sameAsCurrent,
  onSameAsCurrentChange,
  geoNodes,
  currentErrors,
  permanentErrors,
}: DualAddressSectionProps) {
  const handleSameAsChange = (checked: boolean) => {
    onSameAsCurrentChange(checked);
    if (checked) {
      onPermanentChange(copyStructuredAddress(current));
    }
  };

  const handleCurrentChange = (value: StructuredAddress) => {
    onCurrentChange(value);
    if (sameAsCurrent) {
      onPermanentChange(copyStructuredAddress(value));
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <AddressBlock
        title="Current Address"
        value={current}
        onChange={handleCurrentChange}
        geoNodes={geoNodes}
        errors={currentErrors}
        required
      />
      <div>
        <div className="flex items-center justify-between mb-3 min-h-[20px]">
          <p className="text-xs font-semibold text-foreground">Permanent Address</p>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={sameAsCurrent}
              onChange={(e) => handleSameAsChange(e.target.checked)}
              className="w-3.5 h-3.5 accent-brand-600 rounded"
            />
            <span className="text-[11px] text-muted-foreground">Same as current address</span>
          </label>
        </div>
        <div className={cn(sameAsCurrent && "opacity-60")}>
          <AddressBlock
            value={permanent}
            onChange={onPermanentChange}
            geoNodes={geoNodes}
            disabled={sameAsCurrent}
            errors={permanentErrors}
            required
          />
        </div>
      </div>
    </div>
  );
}
