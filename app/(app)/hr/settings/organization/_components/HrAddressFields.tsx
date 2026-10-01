"use client";

/**
 * Shared HR address block — Address Line 1/2, PIN → City/State/Country autofill.
 * Uses ERP Geography / Postal Master via lib/address/postal-lookup (no HR-only pincode dataset).
 * Plain inputs (no decorative icons) for a clean enterprise form.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  ensurePostalMasterReady,
  isValidPincodeFormat,
  lookupPostalPincode,
} from "@/lib/address/postal-lookup";
import { getActiveRecordsByPincode } from "@/lib/geography/postal-master-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { HrOrgField } from "./HrOrgField";
import { hrInput, hrSelect } from "./hr-org-form";

export type HrAddressValue = {
  addressLine1: string;
  addressLine2: string;
  pincode: string;
  city: string;
  state: string;
  country: string;
};

export function HrAddressFields({
  value,
  onChange,
  errors = {},
  required = true,
}: {
  value: HrAddressValue;
  onChange: (patch: Partial<HrAddressValue>) => void;
  errors?: Partial<Record<keyof HrAddressValue, string>>;
  required?: boolean;
}) {
  const [pinResolved, setPinResolved] = useState(false);

  useEffect(() => {
    void ensurePostalMasterReady();
  }, []);

  const cityOptions = useMemo(() => {
    if (!isValidPincodeFormat(value.pincode)) return [] as string[];
    const matches = getActiveRecordsByPincode(value.pincode);
    const cities = matches.map((r) => {
      const raw = r.city?.trim() || "";
      const district = r.district?.trim() || "";
      return raw && raw.toLowerCase() !== "na" ? raw : district;
    }).filter(Boolean);
    return [...new Set(cities)].sort((a, b) => a.localeCompare(b));
  }, [value.pincode]);

  const applyPincode = (raw: string) => {
    const pin = raw.replace(/\D/g, "").slice(0, 6);
    if (!isValidPincodeFormat(pin)) {
      setPinResolved(false);
      onChange({ pincode: pin });
      return;
    }
    const loc = lookupPostalPincode(pin);
    if (!loc) {
      setPinResolved(false);
      onChange({ pincode: pin });
      return;
    }
    setPinResolved(true);
    onChange({
      pincode: pin,
      city: loc.city || "",
      state: loc.state || "",
      country: value.country?.trim() || "India",
    });
  };

  useEffect(() => {
    if (!isValidPincodeFormat(value.pincode)) {
      setPinResolved(false);
      return;
    }
    const loc = lookupPostalPincode(value.pincode);
    setPinResolved(!!loc);
  }, [value.pincode]);

  const geoLocked = pinResolved && cityOptions.length <= 1;
  const stateLocked = geoLocked || (pinResolved && !!value.state);

  return (
    <>
      <HrOrgField
        label="Address Line 1"
        required={required}
        size="full"
        error={errors.addressLine1}
        id="addr1"
      >
        <Input
          id="addr1"
          value={value.addressLine1}
          onChange={(e) => onChange({ addressLine1: e.target.value })}
          placeholder="e.g. Office No., Building, Street"
          className={hrInput(undefined, errors.addressLine1 ? "error" : "default")}
        />
      </HrOrgField>

      <HrOrgField label="Address Line 2" size="full" id="addr2">
        <Input
          id="addr2"
          value={value.addressLine2}
          onChange={(e) => onChange({ addressLine2: e.target.value })}
          placeholder="e.g. Area, Landmark"
          className={hrInput()}
        />
      </HrOrgField>

      <HrOrgField
        label="PIN Code"
        required={required}
        size="sm"
        error={errors.pincode}
        id="pin"
      >
        <Input
          id="pin"
          value={value.pincode}
          onChange={(e) => applyPincode(e.target.value)}
          className={hrInput("font-mono", errors.pincode ? "error" : "default")}
          placeholder="e.g. 380015"
          inputMode="numeric"
          maxLength={6}
        />
      </HrOrgField>

      <HrOrgField label="City" required={required} size="md" error={errors.city} id="city">
        {cityOptions.length > 1 ? (
          <Select
            value={value.city || undefined}
            onValueChange={(v) => onChange({ city: v })}
          >
            <SelectTrigger className={hrSelect(undefined, errors.city ? "error" : "default")}>
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              {cityOptions.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="city"
            value={value.city}
            onChange={(e) => onChange({ city: e.target.value })}
            readOnly={geoLocked}
            placeholder="Auto-filled from PIN"
            className={cn(
              hrInput(undefined, errors.city ? "error" : "default"),
              geoLocked && "bg-muted/30",
            )}
          />
        )}
      </HrOrgField>

      <HrOrgField label="State" required={required} size="md" error={errors.state} id="state">
        <Input
          id="state"
          value={value.state}
          onChange={(e) => onChange({ state: e.target.value })}
          readOnly={stateLocked}
          placeholder="Auto-filled from PIN"
          className={cn(
            hrInput(undefined, errors.state ? "error" : "default"),
            stateLocked && "bg-muted/30",
          )}
        />
      </HrOrgField>

      <HrOrgField label="Country" required={required} size="md" error={errors.country} id="country">
        <Input
          id="country"
          value={value.country}
          onChange={(e) => onChange({ country: e.target.value })}
          readOnly={pinResolved}
          placeholder="India"
          className={cn(
            hrInput(undefined, errors.country ? "error" : "default"),
            pinResolved && "bg-muted/30",
          )}
        />
      </HrOrgField>
    </>
  );
}
