"use client";

import { cn } from "@/lib/utils";
import {
  ACCOUNTS_CARD_TITLE_CLASS,
  ACCOUNTS_HELPER_TEXT_CLASS,
} from "@/lib/accounts/accounts-typography";

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
}

/**
 * Compact section card for Accounts voucher forms only.
 * Section titles use accounts card-title scale so headers stay scannable.
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
}: VoucherFormSectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-white shadow-sm overflow-hidden",
        compact && "voucher-note-section-card rounded-lg shadow-none",
        className,
      )}
    >
      <div
        className={cn(
          "border-b border-border bg-muted/40 flex items-center justify-between gap-3",
          compact
            ? "voucher-note-section-card__header px-3 py-1.5"
            : "px-4 py-2.5",
        )}
      >
        <div className={cn("min-w-0", compact && "voucher-note-section-card__accent")}>
          <h2
            className={cn(
              compact
                ? "voucher-note-section-card__title text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground leading-tight"
                : cn(ACCOUNTS_CARD_TITLE_CLASS, "text-navy-700"),
            )}
          >
            {title}
          </h2>
          {helper ? (
            <p
              className={cn(
                ACCOUNTS_HELPER_TEXT_CLASS,
                "mt-1 text-muted-foreground leading-snug",
                compact && "mt-0.5 text-[10px] font-normal",
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
              ? "voucher-note-section-card__body px-3 py-2.5"
              : "px-4 py-3.5",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
