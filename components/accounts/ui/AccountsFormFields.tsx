"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ACCOUNTS_UI_FORM_GRID_2_CLASS,
  ACCOUNTS_UI_FORM_GRID_CLASS,
  ACCOUNTS_UI_HELPER_CLASS,
  ACCOUNTS_UI_LABEL_CLASS,
  ACCOUNTS_UI_READONLY_VALUE_CLASS,
} from "@/lib/accounts/accounts-ui-tokens";

export function AccountsFormGrid({
  children,
  columns = 3,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={cn(
        columns === 2
          ? ACCOUNTS_UI_FORM_GRID_2_CLASS
          : columns === 4
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-2.5"
            : ACCOUNTS_UI_FORM_GRID_CLASS,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AccountsField({
  label,
  required,
  error,
  helper,
  children,
  className,
  htmlFor,
}: {
  label: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("space-y-1 min-w-0", className)}>
      <Label htmlFor={htmlFor} className={ACCOUNTS_UI_LABEL_CLASS}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      {!error && helper ? <p className={ACCOUNTS_UI_HELPER_CLASS}>{helper}</p> : null}
    </div>
  );
}

export function AccountsReadOnlyField({
  label,
  value,
  className,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={cn("space-y-1 min-w-0", className)}>
      <p className={ACCOUNTS_UI_LABEL_CLASS}>{label}</p>
      <div
        className={cn(
          ACCOUNTS_UI_READONLY_VALUE_CLASS,
          mono && "font-mono text-xs font-semibold text-brand-700",
        )}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}
