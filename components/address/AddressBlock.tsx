"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { AlertCircle } from "lucide-react";
import { hydratePostalMaster } from "@/lib/geography/postal-master-store";
import { type StructuredAddress } from "@/lib/address/types";
import { getTownsForPincode, lookupPostalPincode } from "@/lib/address/postal-lookup";
import {
  getTownsForPincodeFromApi,
  lookupPincodeFromApi,
} from "@/lib/address/pincode-api-lookup";

function Field({
  label,
  required,
  error,
  warning,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  warning?: string;
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
      {warning && !error && (
        <p className="text-[10px] leading-tight text-amber-600 flex items-center gap-1">
          <AlertCircle className="flex-shrink-0 w-2.5 h-2.5" />
          {warning}
        </p>
      )}
    </div>
  );
}

export interface AddressBlockProps {
  title?: string;
  value: StructuredAddress;
  onChange: (value: StructuredAddress) => void;
  disabled?: boolean;
  errors?: Partial<Record<keyof StructuredAddress, string>>;
  warnings?: Partial<Record<keyof StructuredAddress, string>>;
  required?: boolean;
  usePincodeApi?: boolean;
}

export function AddressBlock({
  title,
  value,
  onChange,
  disabled = false,
  errors = {},
  warnings = {},
  required = false,
  usePincodeApi = false,
}: AddressBlockProps) {
  const [postalReady, setPostalReady] = useState(usePincodeApi);
  const [townOptions, setTownOptions] = useState<string[]>([]);
  const [pincodeLookupReady, setPincodeLookupReady] = useState(false);

  useEffect(() => {
    if (usePincodeApi) {
      setPostalReady(true);
      return;
    }

    let active = true;
    hydratePostalMaster().then(() => {
      if (active) setPostalReady(true);
    });
    return () => {
      active = false;
    };
  }, [usePincodeApi]);

  useEffect(() => {
    if (!postalReady || value.pincode.length !== 6) {
      setTownOptions([]);
      setPincodeLookupReady(false);
      return;
    }

    let active = true;

    const loadTowns = async () => {
      const towns = usePincodeApi
        ? await getTownsForPincodeFromApi(value.pincode)
        : getTownsForPincode(value.pincode);

      if (!active) return;
      setTownOptions(towns);
      setPincodeLookupReady(true);
    };

    void loadTowns();

    return () => {
      active = false;
    };
  }, [postalReady, usePincodeApi, value.pincode]);

  const pincodeResolved = useMemo(() => {
    if (!postalReady || value.pincode.length !== 6) return null;
    if (usePincodeApi) {
      if (!pincodeLookupReady) return null;
      if (value.state || value.district || value.town || value.city) {
        return {
          pincode: value.pincode,
          city: value.city,
          town: value.town,
          district: value.district,
          state: value.state,
        };
      }
      return null;
    }
    return lookupPostalPincode(value.pincode, value.town);
  }, [
    postalReady,
    pincodeLookupReady,
    usePincodeApi,
    value.pincode,
    value.town,
    value.city,
    value.district,
    value.state,
  ]);

  const pincodeWarning =
    warnings.pincode ||
    (value.pincode.length === 6 &&
    postalReady &&
    pincodeLookupReady &&
    !pincodeResolved
      ? "Pincode not found."
      : undefined);

  const geographyLocked = Boolean(pincodeResolved);

  const patch = (partial: Partial<StructuredAddress>) => {
    onChange({ ...value, ...partial });
  };

  const applyPostalLocation = async (digits: string, preferredTown?: string) => {
    if (usePincodeApi) {
      const loc = await lookupPincodeFromApi(digits, preferredTown);
      if (loc) {
        return {
          ...value,
          pincode: digits,
          city: loc.city,
          town: loc.town,
          district: loc.district,
          state: loc.state,
        };
      }
      return {
        ...value,
        pincode: digits,
        city: "",
        town: "",
        district: "",
        state: "",
      };
    }

    const loc = lookupPostalPincode(digits, preferredTown);
    if (loc) {
      return {
        ...value,
        pincode: digits,
        city: loc.city,
        town: loc.town,
        district: loc.district,
        state: loc.state,
      };
    }
    return {
      ...value,
      pincode: digits,
      city: "",
      town: "",
      district: "",
      state: "",
    };
  };

  const handlePincodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    if (digits.length === 6 && postalReady) {
      void applyPostalLocation(digits).then((next) => onChange(next));
    } else if (digits.length < 6) {
      onChange({
        ...value,
        pincode: digits,
        city: "",
        town: "",
        district: "",
        state: "",
      });
      setPincodeLookupReady(false);
    } else {
      patch({ pincode: digits });
    }
  };

  const handleTownChange = (town: string) => {
    if (!value.pincode || value.pincode.length !== 6) {
      patch({ town });
      return;
    }
    void applyPostalLocation(value.pincode, town).then((next) => onChange(next));
  };

  const inp = (key: keyof StructuredAddress) =>
    cn("h-8 text-xs", errors[key] && "border-red-400");

  const townSelectOptions = useMemo(
    () => townOptions.map((t) => ({ value: t, label: t })),
    [townOptions],
  );

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
        <Field
          label="Pincode"
          required={required}
          error={errors.pincode}
          warning={pincodeWarning}
        >
          <Input
            value={value.pincode}
            onChange={(e) => handlePincodeChange(e.target.value)}
            placeholder="6-digit pincode"
            disabled={disabled}
            inputMode="numeric"
            maxLength={6}
            className={cn(inp("pincode"), "font-mono")}
          />
        </Field>
        <Field label="City" required={required} error={errors.city}>
          <Input
            value={value.city}
            onChange={(e) => patch({ city: e.target.value })}
            placeholder={
              value.pincode.length === 6
                ? "Auto-filled from pincode"
                : "Enter pincode first"
            }
            disabled={disabled || geographyLocked || value.pincode.length !== 6}
            className={inp("city")}
          />
        </Field>
        <Field label="Town" required={required} error={errors.town}>
          {townSelectOptions.length > 1 ? (
            <AutocompleteSelect
              options={townSelectOptions}
              value={value.town}
              onChange={(v) => handleTownChange(String(v))}
              placeholder="Select town"
              searchPlaceholder="Search town…"
              disabled={disabled || !value.pincode || value.pincode.length !== 6}
              error={!!errors.town}
              className="h-8 text-xs"
            />
          ) : (
            <Input
              value={value.town}
              onChange={(e) => handleTownChange(e.target.value)}
              placeholder={
                value.pincode.length === 6
                  ? "Auto-filled from pincode"
                  : "Enter pincode first"
              }
              disabled={disabled || geographyLocked || value.pincode.length !== 6}
              className={inp("town")}
            />
          )}
        </Field>
        <Field label="District" required={required} error={errors.district}>
          <Input
            value={value.district}
            onChange={(e) => patch({ district: e.target.value })}
            placeholder="Auto-filled from pincode"
            disabled={disabled || geographyLocked}
            className={inp("district")}
          />
        </Field>
        <Field label="State" required={required} error={errors.state}>
          <Input
            value={value.state}
            onChange={(e) => patch({ state: e.target.value })}
            placeholder="Auto-filled from pincode"
            disabled={disabled || geographyLocked}
            className={inp("state")}
          />
        </Field>
      </div>
    </div>
  );
}
