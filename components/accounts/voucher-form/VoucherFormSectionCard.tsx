"use client";

import { cn } from "@/lib/utils";
import { ACCOUNTS_HELPER_TEXT_CLASS } from "@/lib/accounts/accounts-typography";

export interface VoucherFormSectionCardProps {
  title: string;
  helper?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Flush body padding (e.g. full-bleed tables). */
  flush?: boolean;
  /** Right-side header actions (e.g. GST Applicable switch). */
  headerActions?: React.ReactNode;
  /**
   * Compact note density (Credit / Debit Note only).
   * Default false — Payment / Receipt / Contra / Journal unchanged.
   */
  compact?: boolean;
  /**
   * Emphasize this section (slightly stronger header / border) —
   * used for Accounting Impact.
   */
  highlight?: boolean;
}

/**
 * Compact section card for Accounts voucher forms.
 * Orange premium header for clear visual hierarchy across transaction modules.
 */
export function VoucherFormSectionCard({
  title,
  helper,
  children,
  className,
  bodyClassName,
  flush = false,
  headerActions,
  compact = false,
  highlight = false,
}: VoucherFormSectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-white shadow-sm overflow-hidden",
        "border-l-[3px] border-l-brand-500",
        compact && "voucher-note-section-card rounded-lg shadow-none",
        highlight && "shadow-card border-l-[4px] border-l-brand-600",
        className,
      )}
    >
      <div
        className={cn(
          "border-b border-brand-100/80 bg-[#FFF4E8] flex items-center justify-between gap-3",
          compact
            ? "voucher-note-section-card__header px-3 py-1 min-h-[28px]"
            : "px-3.5 py-1.5 min-h-[32px]",
          highlight && "bg-brand-50",
        )}
      >
        <div className={cn("min-w-0", compact && "voucher-note-section-card__accent")}>
          <h2
            className={cn(
              "font-semibold uppercase tracking-[0.08em] leading-tight text-[#9A3412]",
              compact
                ? "voucher-note-section-card__title text-[10px]"
                : "text-[11px]",
            )}
          >
            {title}
          </h2>
          {helper ? (
            <p
              className={cn(
                ACCOUNTS_HELPER_TEXT_CLASS,
                "mt-0.5 text-muted-foreground leading-snug",
                compact && "text-[10px] font-normal",
              )}
            >
              {helper}
            </p>
          ) : null}
        </div>
        {headerActions ? (
          <div className="flex items-center gap-2 flex-shrink-0">{headerActions}</div>
        ) : null}
      </div>
      <div
        className={cn(
          flush
            ? cn("p-0", compact && "voucher-note-section-card__body--flush")
            : compact
              ? "voucher-note-section-card__body px-3 py-1.5"
              : "px-3.5 py-2",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
