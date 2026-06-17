"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { AlertCircle } from "lucide-react";
import type { GeoNode } from "@/app/(app)/masters/geography/geo-data";
import {
  type StructuredAddress,
  geoNodeLabel,
} from "@/lib/address/types";
import {
  getAddressStates,
  getAddressCitiesForState,
  getAddressPincodesForCity,
} from "@/lib/address/geo-address";

function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-[10px] leading-tight text-red-500 flex items-center gap-1">
          <AlertCircle className="flex-shrink-0 w-2.5 h-2.5" />
          {error}
        </p>
      )}
    </div>
  );
}

export interface AddressBlockProps {
  title?: string;
  value: StructuredAddress;
  onChange: (value: StructuredAddress) => void;
  geoNodes: GeoNode[];
  disabled?: boolean;
  errors?: Partial<Record<keyof StructuredAddress, string>>;
  /** When true, line1/state/city/pincode are required */
  required?: boolean;
}

export function AddressBlock({
  title,
  value,
  onChange,
  geoNodes,
  disabled = false,
  errors = {},
  required = false,
}: AddressBlockProps) {
  const states = useMemo(() => getAddressStates(geoNodes), [geoNodes]);
  const cities = useMemo(
    () => getAddressCitiesForState(value.stateId, geoNodes),
    [value.stateId, geoNodes],
  );
  const pincodes = useMemo(
    () => getAddressPincodesForCity(value.cityId, geoNodes),
    [value.cityId, geoNodes],
  );

  const stateOptions = useMemo(
    () => states.map((n) => ({ value: String(n.id), label: n.name })),
    [states],
  );
  const cityOptions = useMemo(
    () => cities.map((n) => ({ value: String(n.id), label: n.name })),
    [cities],
  );
  const pincodeOptions = useMemo(
    () => pincodes.map((n) => ({ value: String(n.id), label: geoNodeLabel(n) })),
    [pincodes],
  );

  const patch = (partial: Partial<StructuredAddress>) => {
    onChange({ ...value, ...partial });
  };

  const inp = (key: keyof StructuredAddress) =>
    cn("h-8 text-xs", errors[key] && "border-red-400");

  return (
    <div className="space-y-3">
      {title && (
        <p className="text-xs font-semibold text-foreground">{title}</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          label="Address Line 1"
          required={required}
          error={errors.line1}
          className="sm:col-span-2 lg:col-span-3"
        >
          <Input
            value={value.line1}
            onChange={(e) => patch({ line1: e.target.value })}
            placeholder="House / building / street"
            disabled={disabled}
            className={inp("line1")}
          />
        </Field>
        <Field
          label="Address Line 2"
          error={errors.line2}
          className="sm:col-span-2 lg:col-span-3"
        >
          <Input
            value={value.line2}
            onChange={(e) => patch({ line2: e.target.value })}
            placeholder="Area / landmark (optional)"
            disabled={disabled}
            className={inp("line2")}
          />
        </Field>
        <Field label="State" required={required} error={errors.stateId}>
          <AutocompleteSelect
            options={stateOptions}
            value={value.stateId ? String(value.stateId) : ""}
            onChange={(v) =>
              patch({
                stateId: v ? Number(v) : null,
                cityId: null,
                pincodeId: null,
              })
            }
            placeholder="Select state"
            searchPlaceholder="Search state…"
            disabled={disabled}
            error={!!errors.stateId}
            className="h-8 text-xs"
          />
        </Field>
        <Field label="City" required={required} error={errors.cityId}>
          <AutocompleteSelect
            options={cityOptions}
            value={value.cityId ? String(value.cityId) : ""}
            onChange={(v) =>
              patch({
                cityId: v ? Number(v) : null,
                pincodeId: null,
              })
            }
            placeholder={value.stateId ? "Select city" : "Select state first"}
            searchPlaceholder="Search city…"
            disabled={disabled || !value.stateId}
            error={!!errors.cityId}
            className="h-8 text-xs"
          />
        </Field>
        <Field label="Pincode" required={required} error={errors.pincodeId}>
          <AutocompleteSelect
            options={pincodeOptions}
            value={value.pincodeId ? String(value.pincodeId) : ""}
            onChange={(v) => patch({ pincodeId: v ? Number(v) : null })}
            placeholder={value.cityId ? "Select pincode" : "Select city first"}
            searchPlaceholder="Search pincode…"
            disabled={disabled || !value.cityId}
            error={!!errors.pincodeId}
            className="h-8 text-xs"
          />
        </Field>
      </div>
    </div>
  );
}
