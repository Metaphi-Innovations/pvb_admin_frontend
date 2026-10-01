"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PHONE_COUNTRY_CODES } from "@/components/ui/PhoneInput";
import { hrInput, HR_ERROR_CLASS } from "./hr-org-form";

/**
 * HR-only phone composite (does not change shared PhoneInput defaults).
 * Country code ~96px · number flex · 40px height · orange focus.
 */
export function HrPhoneField({
  countryCode,
  onCountryCodeChange,
  value,
  onChange,
  disabled,
  error,
  placeholder = "Phone number",
  className,
  id,
}: {
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  value: string;
  onChange: (national: string) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const maxDigits =
    PHONE_COUNTRY_CODES.find((c) => c.value === countryCode)?.digits ?? 10;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex gap-2 min-w-0">
        <Select
          value={countryCode}
          onValueChange={onCountryCodeChange}
          disabled={disabled}
        >
          <SelectTrigger
            className={cn(
              hrInput("w-[96px] shrink-0 px-2 font-medium"),
              error && "border-red-400",
            )}
            aria-label="Country code"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PHONE_COUNTRY_CODES.map((c) => (
              <SelectItem key={c.value} value={c.value} className="text-sm">
                {c.label} ({c.country})
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
            onChange(digits);
          }}
          placeholder={placeholder}
          className={hrInput("flex-1 min-w-0", error ? "error" : "default")}
        />
      </div>
      {error && <p className={HR_ERROR_CLASS}>{error}</p>}
    </div>
  );
}
