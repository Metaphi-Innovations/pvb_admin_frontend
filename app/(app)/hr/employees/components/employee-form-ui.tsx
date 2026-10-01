"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * PVB HR Employee form tokens — matches Employee Profile sidebar density.
 * Typography lives in hr-module.css (.emp-label / .emp-fc / .emp-type / .emp-option)
 * so it wins over SelectTrigger text-sm (14px) and h-10 (40px). Do not restack
 * text-[12px] / h-9 / [&>span] / [&>svg] utilities on top of those defaults.
 */
export const EMP_CONTROL_H = "emp-fc";
export const EMP_LABEL = "emp-label text-foreground";
export const EMP_TEXT = "emp-type";
export const EMP_OPTION = "emp-option py-1.5";
export const EMP_HELPER = "emp-helper";
export const EMP_SUBHEAD = "emp-subhead text-muted-foreground";
export const EMP_TITLE = "emp-title text-foreground";

/**
 * Field layout spans for the EmpSection 12-column grid.
 * Packs related fields into rows; leftover columns stay empty (no forced fillers).
 *
 * Desktop (md+):
 *   xs/compact → 3 cols
 *   small      → 3 cols
 *   medium     → 4 cols
 *   wide       → 6 cols
 *   full       → 12 cols
 */
export type EmpControlWidth = "xs" | "compact" | "small" | "medium" | "wide" | "full";

export const EMP_SPAN: Record<EmpControlWidth, string> = {
  xs: "col-span-12 sm:col-span-6 md:col-span-3",
  compact: "col-span-12 sm:col-span-6 md:col-span-3",
  small: "col-span-12 sm:col-span-6 md:col-span-3",
  medium: "col-span-12 sm:col-span-6 md:col-span-4",
  wide: "col-span-12 md:col-span-6",
  full: "col-span-12",
};

/**
 * Content-fit control max-widths inside a grid cell (left-aligned).
 * Short/medium IDs and dates stay compact; wide/full use the cell.
 */
export const EMP_WIDTH: Record<EmpControlWidth, string> = {
  xs: "emp-w-xs",
  compact: "emp-w-compact",
  small: "emp-w-small",
  medium: "emp-w-medium",
  wide: "emp-w-wide",
  full: "emp-w-full",
};

export const EMP_INPUT = cn(
  "emp-fc emp-type",
  "rounded-lg border border-border bg-white px-2.5",
  "focus-visible:ring-2 focus-visible:ring-brand-300/50 focus-visible:border-brand-500",
);

export const EMP_SELECT_TRIGGER = cn(
  EMP_INPUT,
  "flex items-center justify-between gap-2",
  "[&>span]:truncate",
);

export const EMP_SELECT_CONTENT =
  "emp-option max-h-60 rounded-lg shadow-md border-border";

export const EMP_SELECT_ITEM = cn(EMP_OPTION, "pl-8 pr-2");

export function EmpField({
  label,
  required,
  helper,
  error,
  children,
  className,
  width = "wide",
  /** When true, control stays content-width (e.g. Gender chips) inside its span. */
  fitContent,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  /**
   * Grid column span for EmpSection 12-col layout.
   * Default `wide` (6/12) preserves two-up layout for forms that omit width.
   */
  width?: EmpControlWidth;
  fitContent?: boolean;
}) {
  return (
    <div className={cn(EMP_SPAN[width], "space-y-1.5 min-w-0", className)}>
      <label className={EMP_LABEL}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div
        className={cn(
          "min-w-0",
          fitContent ? "w-fit max-w-full" : EMP_WIDTH[width],
        )}
      >
        {children}
      </div>
      {error && <p className={cn(EMP_HELPER, "text-red-500")}>{error}</p>}
      {!error && helper && (
        <p className={cn(EMP_HELPER, "text-muted-foreground")}>{helper}</p>
      )}
    </div>
  );
}

export function EmpSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="pb-2 border-b border-border">
        <h3 className={EMP_SUBHEAD}>{title}</h3>
      </div>
      <div className="grid grid-cols-12 gap-x-5 gap-y-4">{children}</div>
    </div>
  );
}

/**
 * Education-style form container — one clean bordered panel for editable profile forms.
 * Use for master-data sections and child-record Add/Edit forms.
 */
export function EmpFormPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/10 p-3 space-y-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Bottom-right actions for child-record forms (Cancel / Add / Update). */
export function EmpFormActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-2 pt-0.5">{children}</div>;
}

export function EmpInput(props: React.ComponentProps<typeof Input>) {
  return <Input {...props} className={cn(EMP_INPUT, props.className)} />;
}

export function EmpTextarea(props: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      {...props}
      className={cn(
        "emp-type min-h-[80px] rounded-lg border border-border px-2.5 py-2",
        "focus-visible:ring-2 focus-visible:ring-brand-300/50 focus-visible:border-brand-500",
        props.className,
      )}
    />
  );
}

export function EmpSelect({
  value,
  onValueChange,
  placeholder,
  disabled,
  options,
  allowEmpty,
  emptyLabel = "Select…",
  width = "full",
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  options: readonly string[] | { value: string; label: string }[];
  allowEmpty?: boolean;
  emptyLabel?: string;
  width?: EmpControlWidth;
}) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <div className={cn(EMP_WIDTH[width], "min-w-0")}>
      <Select value={value || undefined} disabled={disabled} onValueChange={onValueChange}>
        <SelectTrigger className={cn(EMP_SELECT_TRIGGER, "w-full")}>
          <SelectValue placeholder={placeholder ?? emptyLabel} />
        </SelectTrigger>
        <SelectContent className={EMP_SELECT_CONTENT} position="popper">
          {allowEmpty && (
            <SelectItem value="__none__" className={EMP_SELECT_ITEM}>
              {emptyLabel}
            </SelectItem>
          )}
          {normalized.map((o) => (
            <SelectItem key={o.value} value={o.value} className={EMP_SELECT_ITEM}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function EmpReadValue({ children }: { children: React.ReactNode }) {
  return (
    <p className={cn(EMP_CONTROL_H, "flex items-center", EMP_TEXT, "text-foreground border border-transparent px-0")}>
      {children || <span className="text-muted-foreground">—</span>}
    </p>
  );
}

export function ProfileSectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 pb-3 border-b border-border flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className={EMP_TITLE}>{title}</h2>
        {description && (
          <p className={cn(EMP_TEXT, "text-muted-foreground mt-0.5")}>{description}</p>
        )}
      </div>
      {actions ? <div className="flex-shrink-0">{actions}</div> : null}
    </div>
  );
}

/** Registered by the active editable profile section for header Cancel | Update. */
export type ProfileSectionEditor = {
  save: () => boolean;
  discard: () => void;
};

export function EmptyProfileState({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/15 px-4 py-10 text-center space-y-3">
      <p className={cn(EMP_TEXT, "text-muted-foreground max-w-sm mx-auto")}>{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
