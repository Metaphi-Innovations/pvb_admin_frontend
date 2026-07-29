"use client";

import React from "react";
import { SkeletonRow } from "@/components/ui/Loaders";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileText, SearchX } from "lucide-react";

/** Initial empty — no records exist yet. */
export function AccountsListingInitialEmpty({
  colSpan,
  entityLabel,
  onCreate,
  createLabel,
}: {
  colSpan: number;
  entityLabel: string;
  onCreate?: () => void;
  createLabel?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="accounts-table-empty py-14">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            No {entityLabel} have been created yet.
          </p>
          {onCreate && createLabel ? (
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs mt-1 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={onCreate}
            >
              {createLabel}
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

/** Filtered no-results — records exist but filters matched nothing. */
export function AccountsListingNoResults({
  colSpan,
  entityLabel,
  onClearFilters,
}: {
  colSpan: number;
  entityLabel: string;
  onClearFilters?: () => void;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="accounts-table-empty py-12">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <SearchX className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            No {entityLabel} match the selected filters.
          </p>
          {onClearFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs text-brand-600 hover:underline mt-0.5"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

/** Loading skeleton rows matching table structure. */
export function AccountsListingTableSkeleton({
  colSpan,
  rows = 5,
}: {
  colSpan: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={colSpan} />
      ))}
    </>
  );
}

/** Pick empty vs no-results vs loading for listing tables. */
export function AccountsListingTableBodyState({
  colSpan,
  mounted,
  totalRecords,
  filteredRecords,
  entityLabel,
  onCreate,
  createLabel,
  onClearFilters,
  children,
}: {
  colSpan: number;
  mounted: boolean;
  totalRecords: number;
  filteredRecords: number;
  entityLabel: string;
  onCreate?: () => void;
  createLabel?: string;
  onClearFilters?: () => void;
  children: React.ReactNode;
}) {
  if (!mounted) {
    return <AccountsListingTableSkeleton colSpan={colSpan} />;
  }
  if (totalRecords === 0) {
    return (
      <AccountsListingInitialEmpty
        colSpan={colSpan}
        entityLabel={entityLabel}
        onCreate={onCreate}
        createLabel={createLabel}
      />
    );
  }
  if (filteredRecords === 0) {
    return (
      <AccountsListingNoResults
        colSpan={colSpan}
        entityLabel={entityLabel}
        onClearFilters={onClearFilters}
      />
    );
  }
  return <>{children}</>;
}
