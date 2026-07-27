"use client";

import {
  AccountsListingInitialEmpty,
  AccountsListingNoResults,
} from "@/components/accounts/AccountsListingStates";
import { FileText, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AccountsEmptyStateProps {
  variant?: "empty" | "no-results";
  /** When rendering inside a table row */
  colSpan?: number;
  entityLabel: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

/**
 * Empty / no-results for Accounts tables and panels.
 */
export function AccountsEmptyState({
  variant = "empty",
  colSpan,
  entityLabel,
  onAction,
  actionLabel,
  className,
}: AccountsEmptyStateProps) {
  if (colSpan != null) {
    if (variant === "no-results") {
      return (
        <AccountsListingNoResults
          colSpan={colSpan}
          entityLabel={entityLabel}
          onClearFilters={onAction}
        />
      );
    }
    return (
      <AccountsListingInitialEmpty
        colSpan={colSpan}
        entityLabel={entityLabel}
        onCreate={onAction}
        createLabel={actionLabel}
      />
    );
  }

  const Icon = variant === "no-results" ? SearchX : FileText;
  return (
    <div className={cn("flex flex-col items-center gap-2 py-14 text-center", className)}>
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">
        {variant === "no-results"
          ? `No ${entityLabel} match the selected filters.`
          : `No ${entityLabel} have been created yet.`}
      </p>
      {onAction && actionLabel ? (
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs mt-1 bg-brand-600 hover:bg-brand-700 text-white"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
      {variant === "no-results" && onAction && !actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="text-xs text-brand-600 hover:underline mt-0.5"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
