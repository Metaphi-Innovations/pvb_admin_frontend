"use client";

/**
 * Unified Accounting Impact panel for Accounts transaction screens.
 * Combines live Debit/Credit preview (when provided) with COA / reports / source docs.
 * Read-only — never drives posting, validation, or calculations.
 */

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAccountingImpactDoc,
  type AccountingImpactDocKey,
  type AccountingCoaPath,
} from "@/lib/accounts/accounting-impact-docs";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";

const ORIGIN_LABEL: Record<NonNullable<AccountingCoaPath["origin"]>, string> = {
  selected: "User-selected",
  system: "System COA",
  master: "From master",
  voucher: "Voucher entry",
  auto: "Auto / bootstrap",
};

function CoaTreeSimple({ tree }: { tree: AccountingCoaPath }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/10 px-2.5 py-1.5 text-[11px] leading-4 text-foreground">
      {tree.path.map((segment, i) => (
        <div
          key={`${segment}-${i}`}
          className={cn(
            "font-mono",
            i === tree.path.length - 1 ? "font-semibold text-[#9A3412]" : "text-muted-foreground",
          )}
          style={{ paddingLeft: `${i * 10}px` }}
        >
          {i === 0 ? segment : `└── ${segment}`}
        </div>
      ))}
      {tree.origin ? (
        <p className="mt-1 font-sans text-[10px] text-muted-foreground">
          {ORIGIN_LABEL[tree.origin]}
        </p>
      ) : null}
    </div>
  );
}

function SubsectionTitle({
  children,
  compact,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <p
      className={cn(
        "uppercase tracking-widest text-[#9A3412]",
        compact ? "text-[10px] font-semibold mb-1" : "text-[10px] font-bold mb-1.5",
      )}
    >
      {children}
    </p>
  );
}

/** Collapsed-by-default doc block — keeps Accounting Entry visible above the fold. */
function CollapsibleDocBlock({
  title,
  compact,
  children,
}: {
  title: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-md border border-border/50 bg-muted/5 open:bg-muted/10">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-1.5 select-none",
          "px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#9A3412]",
          "[&::-webkit-details-marker]:hidden",
          compact && "py-1",
        )}
      >
        <ChevronRight className="w-3 h-3 text-brand-600 transition-transform group-open:rotate-90 flex-shrink-0" />
        {title}
      </summary>
      <div className={cn("px-2.5 pb-2 pt-0.5", compact && "pb-1.5")}>{children}</div>
    </details>
  );
}

export function AccountingImpactSection({
  docKey,
  className,
  compact = false,
  /** Live Debit/Credit + Posting Visibility preview (from form state). */
  entryPreview,
}: {
  docKey: AccountingImpactDocKey;
  className?: string;
  compact?: boolean;
  entryPreview?: React.ReactNode;
}) {
  const doc = getAccountingImpactDoc(docKey);

  return (
    <VoucherFormSectionCard
      title="Accounting Impact"
      helper={
        doc.docNote ??
        "Live entry preview and COA / report impact. Draft saves do not post to ledgers."
      }
      className={className}
      compact={compact}
      highlight
    >
      <div className={cn(compact ? "space-y-2" : "space-y-2.5")}>
        {entryPreview ? (
          <div>{entryPreview}</div>
        ) : (
          <div>
            <SubsectionTitle compact={compact}>Accounting Entry</SubsectionTitle>
            <div className="rounded-md border border-border/60 bg-muted/10 px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-foreground space-y-0.5">
              {doc.entryLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            {doc.secondaryEntryTitle && doc.secondaryEntryLines?.length ? (
              <div className="mt-1.5">
                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
                  {doc.secondaryEntryTitle}
                </p>
                <div className="rounded-md border border-border/60 bg-muted/10 px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-foreground space-y-0.5">
                  {doc.secondaryEntryLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        <CollapsibleDocBlock title="COA Impact" compact={compact}>
          <div className={cn("grid gap-1.5", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
            {doc.coaTrees.map((tree, i) => (
              <CoaTreeSimple key={`${tree.path.join("-")}-${i}`} tree={tree} />
            ))}
          </div>
        </CollapsibleDocBlock>

        <CollapsibleDocBlock title="Reports Updated" compact={compact}>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
            {doc.reportsUpdated.map((r) => (
              <li
                key={r}
                className="text-[11px] text-foreground flex items-start gap-1.5 leading-snug"
              >
                <span className="text-brand-600 font-semibold flex-shrink-0" aria-hidden>
                  ✓
                </span>
                {r}
              </li>
            ))}
          </ul>
        </CollapsibleDocBlock>

        <CollapsibleDocBlock title="Source / Ledger Mapping" compact={compact}>
          <ul className="space-y-0.5">
            {doc.sources.map((s) => (
              <li
                key={s}
                className="text-[11px] text-muted-foreground leading-snug flex gap-1.5"
              >
                <span className="text-brand-500 flex-shrink-0">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </CollapsibleDocBlock>
      </div>
    </VoucherFormSectionCard>
  );
}
