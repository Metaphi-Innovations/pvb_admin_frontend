"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PHONE_COUNTRY_CODES = [
  { value: "+91", label: "+91", country: "India", digits: 10 },
  { value: "+1", label: "+1", country: "USA", digits: 10 },
  { value: "+44", label: "+44", country: "UK", digits: 10 },
  { value: "+971", label: "+971", country: "UAE", digits: 9 },
  { value: "+65", label: "+65", country: "Singapore", digits: 8 },
] as const;

export type PhoneCountryCode = (typeof PHONE_COUNTRY_CODES)[number]["value"];

export interface PhoneInputProps {
  countryCode?: string;
  onCountryCodeChange?: (code: string) => void;
  value?: string;
  onChange?: (nationalNumber: string) => void;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  id?: string;
  error?: string;
}

function digitsForCode(code: string): number {
  return PHONE_COUNTRY_CODES.find((c) => c.value === code)?.digits ?? 10;
}

/** Global phone field: [ country ▼ ] [ national number ] — default +91 */
export function PhoneInput({
  countryCode = "+91",
  onCountryCodeChange,
  value = "",
  onChange,
  disabled,
  className,
  inputClassName,
  placeholder = "Mobile number",
  id,
  error,
}: PhoneInputProps) {
  const maxDigits = digitsForCode(countryCode);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex gap-2">
        <Select
          value={countryCode}
          onValueChange={(v) => onCountryCodeChange?.(v)}
          disabled={disabled}
        >
          <SelectTrigger
            className="h-8 w-[88px] shrink-0 text-table font-medium bg-white"
            aria-label="Country code"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PHONE_COUNTRY_CODES.map((c) => (
              <SelectItem key={c.value} value={c.value} className="text-xs">
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          disabled={disabled}
          value={value}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, maxDigits);
            onChange?.(digits);
          }}
          placeholder={placeholder}
          className={cn("h-8 flex-1 text-table", inputClassName)}
        />
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

/** Validate Indian mobile (default +91) */
export function validatePhoneNumber(
  nationalNumber: string,
  countryCode = "+91",
): string | null {
  const digits = nationalNumber.replace(/\D/g, "");
  if (!digits) return "Mobile number is required.";
  if (countryCode === "+91") {
    if (!/^[6-9]\d{9}$/.test(digits)) return "Enter a valid 10-digit mobile number.";
  } else if (digits.length < 6) {
    return "Enter a valid phone number.";
  }
  return null;
}

export function formatPhoneDisplay(countryCode: string, nationalNumber: string): string {
  if (!nationalNumber) return "—";
  return `${countryCode} ${nationalNumber}`;
}
