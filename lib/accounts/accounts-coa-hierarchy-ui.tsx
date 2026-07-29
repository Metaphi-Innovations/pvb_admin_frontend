"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, FileText, FolderOpen, FolderTree, Landmark } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Four fixed COA hierarchy levels — same icons everywhere in Accounts. */
export type AccountsCoaHierarchyLevel =
  | "primary_head"
  | "account_group"
  | "sub_group"
  | "ledger";

export const ACCOUNTS_COA_HIERARCHY_ICON: Record<AccountsCoaHierarchyLevel, LucideIcon> = {
  primary_head: Landmark,
  account_group: FolderTree,
  sub_group: FolderOpen,
  ledger: FileText,
};

export const ACCOUNTS_COA_HIERARCHY_ICON_CLASS =
  "w-4 h-4 flex-shrink-0 text-muted-foreground/80";

export const ACCOUNTS_COA_HIERARCHY_INDENT: Record<AccountsCoaHierarchyLevel | "voucher", string> = {
  primary_head: "pl-3",
  account_group: "pl-7",
  sub_group: "pl-11",
  ledger: "pl-[3.75rem]",
  voucher: "pl-[4.75rem]",
};

/** Depth of each level in the 4-level COA tree (Primary → Group → Sub Group → Ledger). */
export const ACCOUNTS_COA_HIERARCHY_DEPTH: Record<AccountsCoaHierarchyLevel, number> = {
  primary_head: 0,
  account_group: 1,
  sub_group: 2,
  ledger: 3,
};

export const ACCOUNTS_COA_HIERARCHY_LABEL_CLASS: Record<AccountsCoaHierarchyLevel, string> = {
  primary_head: "text-sm font-bold text-foreground leading-snug",
  account_group: "text-xs font-bold text-foreground leading-snug",
  sub_group: "text-xs font-semibold text-foreground leading-snug",
  ledger: "text-xs font-normal text-foreground leading-snug",
};

export function formatAccountsLedgerCount(count: number): string {
  if (count === 1) return "1 Ledger";
  return `${count} Ledgers`;
}

export function AccountsCoaHierarchyIcon({
  level,
  className,
}: {
  level: AccountsCoaHierarchyLevel;
  className?: string;
}) {
  const Icon = ACCOUNTS_COA_HIERARCHY_ICON[level];
  return (
    <Icon
      className={cn(ACCOUNTS_COA_HIERARCHY_ICON_CLASS, className)}
      strokeWidth={level === "primary_head" ? 2 : 1.75}
      aria-hidden
    />
  );
}

interface HierarchyExpandChevronProps {
  visible: boolean;
  expanded: boolean;
  onClick?: () => void;
  className?: string;
}

function HierarchyExpandChevron({ visible, expanded, onClick, className }: HierarchyExpandChevronProps) {
  if (!visible) {
    return <span className={cn("w-4 h-4 flex-shrink-0", className)} aria-hidden />;
  }
  const icon = (
    <ChevronRight
      className={cn(
        "w-4 h-4 flex-shrink-0 text-muted-foreground/70 transition-transform duration-150",
        expanded && "rotate-90",
        className,
      )}
      strokeWidth={2}
      aria-hidden
    />
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="flex-shrink-0 rounded-sm hover:bg-muted/60 p-0.5 -m-0.5"
        aria-label={expanded ? "Collapse" : "Expand"}
      >
        {icon}
      </button>
    );
  }
  return icon;
}

/** Subtle vertical + elbow connector rails that render the parent-child nesting. */
function HierarchyTreeRails({ depth }: { depth: number }) {
  if (depth <= 0) return null;
  return (
    <>
      {Array.from({ length: depth }).map((_, i) => {
        const immediate = i === depth - 1;
        return (
          <span
            key={i}
            className="relative w-6 flex-shrink-0 self-stretch"
            aria-hidden
          >
            <span className="absolute left-1/2 top-0 bottom-0 w-px bg-border/70" />
            {immediate && (
              <span className="absolute left-1/2 right-0 top-[0.85rem] h-px bg-border/70" />
            )}
          </span>
        );
      })}
    </>
  );
}

interface AccountsCoaHierarchyRowLabelProps {
  level: AccountsCoaHierarchyLevel;
  name: string;
  nameHref?: string;
  ledgerCount?: number;
  expandable?: boolean;
  expanded?: boolean;
  /** When true, render tree connector rails for the level's depth. */
  showTreeGuides?: boolean;
  /** Override the auto depth derived from `level`. */
  depth?: number;
  /** When set, chevron becomes a button that toggles expand without following nameHref. */
  onExpandClick?: () => void;
  className?: string;
  nameClassName?: string;
  children?: React.ReactNode;
}

/** Particular column label — tree rails + icon + name + optional ledger count. */
export function AccountsCoaHierarchyRowLabel({
  level,
  name,
  nameHref,
  ledgerCount,
  expandable = false,
  expanded = false,
  showTreeGuides = false,
  depth,
  onExpandClick,
  className,
  nameClassName,
  children,
}: AccountsCoaHierarchyRowLabelProps) {
  const showCount = ledgerCount != null && ledgerCount > 0 && level !== "ledger";
  const effectiveDepth = depth ?? ACCOUNTS_COA_HIERARCHY_DEPTH[level];

  const nameNode = nameHref ? (
    <Link
      href={nameHref}
      className={cn(
        ACCOUNTS_COA_HIERARCHY_LABEL_CLASS[level],
        "text-foreground hover:text-brand-700 hover:underline",
        nameClassName,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {name}
    </Link>
  ) : (
    <span className={cn(ACCOUNTS_COA_HIERARCHY_LABEL_CLASS[level], nameClassName)}>{name}</span>
  );

  return (
    <div className={cn("flex items-stretch min-w-0 w-full", className)}>
      {showTreeGuides && <HierarchyTreeRails depth={effectiveDepth} />}
      <div className="flex items-start gap-1.5 min-w-0 flex-1">
        <HierarchyExpandChevron
          visible={expandable}
          expanded={expanded}
          onClick={onExpandClick}
        />
        <AccountsCoaHierarchyIcon level={level} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            {nameNode}
            {showCount && (
              <span className="inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium leading-none text-muted-foreground bg-muted/70 whitespace-nowrap">
                {ledgerCount} {ledgerCount === 1 ? "ledger" : "ledgers"}
              </span>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
