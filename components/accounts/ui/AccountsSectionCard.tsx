"use client";

import { cn } from "@/lib/utils";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import {
  ACCOUNTS_UI_SECTION_CARD_BODY_CLASS,
  ACCOUNTS_UI_SECTION_CARD_CLASS,
  ACCOUNTS_UI_SECTION_CARD_HEADER_CLASS,
  ACCOUNTS_UI_SECTION_TITLE_CLASS,
} from "@/lib/accounts/accounts-ui-tokens";
import { ACCOUNTS_HELPER_TEXT_CLASS } from "@/lib/accounts/accounts-typography";

export interface AccountsSectionCardProps {
  title: string;
  helper?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  flush?: boolean;
  headerActions?: React.ReactNode;
  /** Compact density (notes / dense vouchers) */
  compact?: boolean;
}

/**
 * Standard Accounts section card.
 * Delegates to VoucherFormSectionCard so voucher + non-voucher forms share one chrome.
 */
export function AccountsSectionCard(props: AccountsSectionCardProps) {
  return <VoucherFormSectionCard {...props} />;
}

export interface AccountsSectionHeaderProps {
  title: string;
  helper?: string;
  actions?: React.ReactNode;
  className?: string;
}

/** Heading strip only — for custom card bodies. */
export function AccountsSectionHeader({
  title,
  helper,
  actions,
  className,
}: AccountsSectionHeaderProps) {
  return (
    <div className={cn(ACCOUNTS_UI_SECTION_CARD_HEADER_CLASS, className)}>
      <div className="min-w-0">
        <h2 className={ACCOUNTS_UI_SECTION_TITLE_CLASS}>{title}</h2>
        {helper ? (
          <p className={cn(ACCOUNTS_HELPER_TEXT_CLASS, "mt-1 text-muted-foreground leading-snug")}>
            {helper}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2 flex-shrink-0">{actions}</div> : null}
    </div>
  );
}

export {
  ACCOUNTS_UI_SECTION_CARD_CLASS,
  ACCOUNTS_UI_SECTION_CARD_BODY_CLASS,
};
