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
  "bg-white rounded-xl border border-border shadow-sm p-3 h-full";
export const INVOICE_FORM_CARD_TITLE_CLASS = cn(ACCOUNTS_CARD_TITLE_CLASS, "text-navy-700");
export const INVOICE_FORM_GRID_CLASS = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-2.5";
export const INVOICE_FORM_TABLE_TH_CLASS =
  "accounts-table-th px-2.5 py-2 text-[11px] font-semibold text-foreground whitespace-nowrap";
export const INVOICE_FORM_TABLE_TD_CLASS = "px-2.5 py-2 text-xs text-foreground align-middle";

export function InvoiceFormLayout({
  title,
  subtitle,
  breadcrumb,
  backHref,
  onBackClick,
  actions,
  stickyFooter,
  children,
}: {
  title: string;
  subtitle?: string;
  breadcrumb: { label: string; href?: string }[];
  backHref: string;
  /** When set, overrides default back navigation (e.g. unsaved-changes guard). */
  onBackClick?: () => void;
  /** Legacy: actions in sticky header. Prefer stickyFooter for voucher-standard footers. */
  actions?: React.ReactNode;
  /** Sticky bottom action bar (Cancel · Save Draft · Save & Post). */
  stickyFooter?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleBack = () => {
    if (onBackClick) onBackClick();
    else router.push(backHref);
  };

  return (
    <div
      className={cn(
        "bg-background flex flex-col -m-3",
        stickyFooter ? "h-full min-h-0" : "min-h-full",
      )}
    >
      <header className="bg-white border-b border-border px-5 py-2 flex-shrink-0 sticky top-0 z-20 shadow-sm">
        <div className="w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={handleBack}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-border/70 hover:bg-muted/40 flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <h1 className={cn(ACCOUNTS_PAGE_TITLE_CLASS, "truncate")}>{title}</h1>
              <p className={cn(ACCOUNTS_PAGE_SUBTITLE_CLASS, "truncate")}>
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
                {subtitle ? (
                  <>
                    <span className="mx-1">·</span>
                    <span>{subtitle}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          {!stickyFooter && actions ? (
            <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
          ) : null}
        </div>
      </header>
      <main
        className={cn(
          "flex-1 min-h-0 overflow-y-auto overscroll-contain",
          stickyFooter ? "px-5 py-2 pb-3" : "px-5 py-3",
        )}
      >
        <div className="w-full max-w-none space-y-3">{children}</div>
      </main>
      {stickyFooter ? (
        <div className="flex-shrink-0 bg-white border-t border-border px-5 py-1.5 z-20 shadow-[0_-2px_8px_rgba(15,23,42,0.05)]">
          <div className="w-full">{stickyFooter}</div>
        </div>
      ) : null}
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
