"use client";

/**
 * HR Employee Management form control primitives — icon inputs, gender, nationality, phone.
 * Scoped to Employee Profile / create forms; does not alter non-HR modules.
 */

import React, { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PHONE_COUNTRY_CODES,
  formatPhoneDisplay,
  validatePhoneNumber,
} from "@/components/ui/PhoneInput";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EMP_CONTROL_H,
  EMP_INPUT,
  EMP_SELECT_CONTENT,
  EMP_SELECT_ITEM,
  EMP_SELECT_TRIGGER,
  EMP_TEXT,
  type EmpControlWidth,
} from "../employees/components/employee-form-ui";

export { formatPhoneDisplay, validatePhoneNumber };

/** Strip leading country code from stored phone; return national digits. */
export function nationalPhoneDigits(raw: string, defaultCode = "+91"): string {
  let s = (raw || "").trim();
  if (!s) return "";
  if (s.startsWith(defaultCode)) s = s.slice(defaultCode.length);
  else if (s.startsWith("+")) {
    s = s.replace(/^\+\d{1,3}\s*/, "");
  }
  return s.replace(/\D/g, "");
}

/**
 * Leading-icon input — flex row centers icon + text (no absolute top/translate hacks).
 * Icon stays put on focus/type; placeholder and value share the same text start.
 */
export function EmpIconInput({
  icon: Icon,
  className,
  disabled,
  ...props
}: React.ComponentProps<"input"> & { icon?: LucideIcon }) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border border-border bg-white px-2.5",
        EMP_CONTROL_H,
        "focus-within:ring-2 focus-within:ring-brand-300/50 focus-within:border-brand-500",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {Icon ? (
        <Icon
          size={14}
          className="shrink-0 text-muted-foreground"
          aria-hidden
        />
      ) : null}
      <input
        {...props}
        disabled={disabled}
        className={cn(
          "emp-type min-w-0 flex-1 bg-transparent border-0 outline-none shadow-none ring-0",
          "disabled:cursor-not-allowed",
        )}
      />
    </div>
  );
}

/** Compact country-code + number — matched heights, flex-centered */
export function EmpPhoneField({
  value,
  onChange,
  countryCode = "+91",
  onCountryCodeChange,
  placeholder = "98765 43210",
  disabled,
  error,
  id,
}: {
  value: string;
  onChange: (national: string) => void;
  countryCode?: string;
  onCountryCodeChange?: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
}) {
  const [code, setCode] = useState(countryCode);
  const national = nationalPhoneDigits(value, code);
  const maxDigits =
    PHONE_COUNTRY_CODES.find((c) => c.value === code)?.digits ?? 10;

  return (
    <div className="min-w-0 space-y-1">
      <div className="flex min-w-0 items-center gap-2">
        <Select
          value={code}
          onValueChange={(c) => {
            setCode(c);
            onCountryCodeChange?.(c);
          }}
          disabled={disabled}
        >
          <SelectTrigger
            className={cn(EMP_SELECT_TRIGGER, "w-[118px] shrink-0 px-2")}
            aria-label="Country code"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={cn(EMP_SELECT_CONTENT, "min-w-[160px]")} position="popper">
            {PHONE_COUNTRY_CODES.map((c) => (
              <SelectItem key={c.value} value={c.value} className={EMP_SELECT_ITEM}>
                {c.label} ({c.country})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          disabled={disabled}
          value={national}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, maxDigits);
            onChange(digits);
          }}
          placeholder={placeholder}
          className={cn(EMP_INPUT, "min-w-0 flex-1")}
        />
      </div>
      {error && <p className="emp-helper text-red-500">{error}</p>}
    </div>
  );
}

const GENDER_CHOICES = [
  { value: "Male", label: "Male", glyph: "♂" },
  { value: "Female", label: "Female", glyph: "♀" },
  { value: "Other", label: "Other", glyph: "◇" },
] as const;

/** Visual segmented Gender control — compact content-fit chips (not full-row stretch) */
export function EmpGenderSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const extra = value && !GENDER_CHOICES.some((c) => c.value === value) ? value : null;

  return (
    <div className="emp-gender">
      {GENDER_CHOICES.map((c) => {
        const active = value === c.value;
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={cn(
              "emp-gender-opt",
              EMP_CONTROL_H,
              "px-2 rounded-lg border font-medium inline-flex items-center justify-center gap-1.5 transition-colors",
              EMP_TEXT,
              active
                ? "border-brand-500 bg-brand-50 text-brand-800 ring-1 ring-brand-200"
                : "border-border bg-white text-foreground hover:bg-muted/40",
            )}
            aria-pressed={active}
          >
            <span className="emp-type text-muted-foreground" aria-hidden>
              {c.glyph}
            </span>
            {c.label}
          </button>
        );
      })}
      {extra && extra !== "Prefer not to say" && (
        <button
          type="button"
          onClick={() => onChange(extra)}
          className={cn(
            "emp-gender-opt-wide",
            EMP_CONTROL_H,
            "px-2 rounded-lg border font-medium inline-flex items-center justify-center transition-colors",
            EMP_TEXT,
            value === extra
              ? "border-brand-500 bg-brand-50 text-brand-800"
              : "border-border bg-white hover:bg-muted/40",
          )}
        >
          {extra}
        </button>
      )}
    </div>
  );
}

const NATIONALITY_OPTIONS = [
  "India",
  "Nepal",
  "Bangladesh",
  "Sri Lanka",
  "United Arab Emirates",
  "United States",
  "United Kingdom",
  "Singapore",
  "Canada",
  "Australia",
  "Other",
] as const;

/** Searchable nationality / country selector — content-fit medium width by default */
export function EmpNationalitySelect({
  value,
  onChange,
  placeholder = "Select nationality",
  width = "medium",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: EmpControlWidth;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [...NATIONALITY_OPTIONS];
    return NATIONALITY_OPTIONS.filter((n) => n.toLowerCase().includes(term));
  }, [q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(EMP_SELECT_TRIGGER, "w-full text-left")}
        >
          <span className={cn("truncate", value ? "text-foreground" : "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-lg" align="start">
        <div className="border-b border-border p-1.5">
          <div className="flex h-8 items-center gap-2 rounded-md border border-border px-2">
            <Search size={14} className="shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="emp-type min-w-0 flex-1 bg-transparent outline-none"
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto p-1">
          {filtered.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                onChange(n);
                setOpen(false);
                setQ("");
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left hover:bg-muted/60",
                EMP_TEXT,
                value === n && "bg-brand-50",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{n}</span>
              {value === n && <Check size={14} className="shrink-0 text-brand-600" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="emp-helper px-2 py-3 text-center text-muted-foreground">No matches</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
