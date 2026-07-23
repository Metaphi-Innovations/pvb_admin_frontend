"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface AccountsPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Optional label override, e.g. "vouchers" */
  entityLabel?: string;
}

/**
 * Compact Accounts pagination footer — does not change caller data logic.
 */
export function AccountsPagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
  entityLabel = "records",
}: AccountsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-1.5 border-t border-border bg-muted/20",
        className,
      )}
    >
      <p className="text-[11px] text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">
          {from}–{to}
        </span>{" "}
        of <span className="font-medium text-foreground">{total}</span> {entityLabel}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="h-6 w-6 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] tabular-nums text-foreground px-1.5">
          {safePage} / {totalPages}
        </span>
        <button
          type="button"
          className="h-6 w-6 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
