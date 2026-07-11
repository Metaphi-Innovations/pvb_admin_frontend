"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ACCOUNTS_CARD_TITLE_CLASS,
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FORM_LABEL_CLASS,
  ACCOUNTS_HELPER_TEXT_CLASS,
  ACCOUNTS_PAGE_SUBTITLE_CLASS,
  ACCOUNTS_PAGE_TITLE_CLASS,
} from "@/lib/accounts/accounts-typography";

/** Shared invoice form field styling — Sales & Purchase transaction invoices */
export const INVOICE_FORM_LABEL_CLASS = ACCOUNTS_FORM_LABEL_CLASS;
export const INVOICE_FORM_INPUT_CLASS = cn(
  ACCOUNTS_FILTER_CONTROL_CLASS,
  "placeholder:text-[13px] placeholder:text-muted-foreground",
);
export const INVOICE_FORM_READONLY_CLASS = cn(
  INVOICE_FORM_INPUT_CLASS,
  "bg-muted/30 text-foreground cursor-default",
);
export const INVOICE_FORM_HELPER_CLASS = ACCOUNTS_HELPER_TEXT_CLASS;
export const INVOICE_FORM_CARD_CLASS =
  "bg-white rounded-lg border border-border p-3 h-full";
export const INVOICE_FORM_CARD_TITLE_CLASS = cn(ACCOUNTS_CARD_TITLE_CLASS, "text-foreground");
export const INVOICE_FORM_GRID_CLASS = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3";
export const INVOICE_FORM_TABLE_TH_CLASS =
  "px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap";
export const INVOICE_FORM_TABLE_TD_CLASS = "px-2.5 py-2 text-[13px] text-foreground align-middle";

export function InvoiceFormLayout({
  title,
  subtitle,
  breadcrumb,
  backHref,
  onBackClick,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  breadcrumb: { label: string; href?: string }[];
  backHref: string;
  /** When set, overrides default back navigation (e.g. unsaved-changes guard). */
  onBackClick?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleBack = () => {
    if (onBackClick) onBackClick();
    else router.push(backHref);
  };

  return (
    <div className="min-h-full bg-background flex flex-col -m-3">
      <header className="bg-white border-b border-border px-5 py-3 flex-shrink-0 sticky top-0 z-20 shadow-sm">
        <div className="w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBack}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted/40 flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                {breadcrumb.map((b, i) => (
                  <span key={`${b.label}-${i}`}>
                    {i > 0 && <span className="mx-1">/</span>}
                    {b.href ? (
                      <Link href={b.href} className="hover:text-brand-600">
                        {b.label}
                      </Link>
                    ) : (
                      <span>{b.label}</span>
                    )}
                  </span>
                ))}
              </p>
              <h1 className={cn(ACCOUNTS_PAGE_TITLE_CLASS, "truncate")}>{title}</h1>
              {subtitle ? (
                <p className={cn(ACCOUNTS_PAGE_SUBTITLE_CLASS, "truncate")}>{subtitle}</p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex items-center gap-2 flex-shrink-0">{actions}</div> : null}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-5 py-4">
        <div className="w-full max-w-none space-y-4">{children}</div>
      </main>
    </div>
  );
}

export function InvoiceFormCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(INVOICE_FORM_CARD_CLASS, className)}>
      <h2 className={cn(INVOICE_FORM_CARD_TITLE_CLASS, "mb-3")}>{title}</h2>
      {children}
    </div>
  );
}

export function InvoiceFormField({
  label,
  required,
  helper,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className={INVOICE_FORM_LABEL_CLASS}>
        {label}
        {required ? <span className="text-red-500 ml-0.5">*</span> : null}
      </Label>
      {children}
      {helper ? <p className={INVOICE_FORM_HELPER_CLASS}>{helper}</p> : null}
    </div>
  );
}

export function InvoiceFormReadOnly({
  label,
  value,
  className,
  mono,
}: {
  label: string;
  value?: string | null;
  className?: string;
  mono?: boolean;
}) {
  return (
    <InvoiceFormField label={label} className={className}>
      <div
        className={cn(
          INVOICE_FORM_READONLY_CLASS,
          "min-h-9 flex items-center px-2.5 text-sm",
          mono && "font-mono",
        )}
      >
        {value?.trim() ? value : "—"}
      </div>
    </InvoiceFormField>
  );
}

export function InvoiceFormAddress({
  label,
  value,
  className,
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <InvoiceFormField label={label} className={className}>
      <div
        className={cn(
          INVOICE_FORM_READONLY_CLASS,
          "min-h-[72px] px-2.5 py-2 text-sm whitespace-pre-wrap",
        )}
      >
        {value?.trim() ? value : "—"}
      </div>
    </InvoiceFormField>
  );
}

export function InvoiceFormInput(props: React.ComponentProps<typeof Input>) {
  return <Input className={cn(INVOICE_FORM_INPUT_CLASS, props.className)} {...props} />;
}

export function InvoiceFormTextarea(props: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      className={cn(INVOICE_FORM_INPUT_CLASS, "min-h-[72px] resize-y", props.className)}
      {...props}
    />
  );
}

export function InvoiceFormSection({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className={INVOICE_FORM_CARD_TITLE_CLASS}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function InvoiceFormItemTable({
  children,
  minWidth,
}: {
  children: React.ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto border border-border rounded-lg bg-white">
      <table className="w-full" style={minWidth ? { minWidth } : undefined}>
        {children}
      </table>
    </div>
  );
}

export function InvoiceFormItemTableHead({
  columns,
}: {
  columns: { key: string; label: string; align?: "left" | "right" }[];
}) {
  return (
    <thead className="border-b border-border bg-muted/30">
      <tr>
        {columns.map((col) => (
          <th
            key={col.key}
            className={cn(
              INVOICE_FORM_TABLE_TH_CLASS,
              col.align === "right" ? "text-right" : "text-left",
            )}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}
