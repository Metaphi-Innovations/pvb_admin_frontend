"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

interface PaginationProps {
  page: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onPageJumpError?: (message: string) => void;
  recordLabel?: string;
  /** compact = accounts-style footer without page-jump input */
  variant?: "full" | "compact";
}

export function Pagination({
  page,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  onPageJumpError,
  recordLabel = "records",
  variant = "full",
}: PaginationProps) {
  const isCompact = variant === "compact";
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 25;
  const totalPages = Math.max(1, Math.ceil(totalRecords / safePageSize));
  const safePage = Math.min(Math.max(1, page || 1), totalPages);
  const startItem = totalRecords === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const endItem = Math.min(safePage * safePageSize, totalRecords);
  const [pageInput, setPageInput] = useState(String(safePage));
  const pageSizeOptions = (PAGE_SIZE_OPTIONS as readonly number[]).includes(safePageSize)
    ? PAGE_SIZE_OPTIONS
    : [...PAGE_SIZE_OPTIONS, safePageSize].sort((a, b) => a - b);

  useEffect(() => {
    setPageInput(String(safePage));
  }, [safePage]);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, safePage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handlePageJump = () => {
    const trimmed = pageInput.trim();
    if (!/^\d+$/.test(trimmed)) {
      onPageJumpError?.("Enter a valid page number.");
      return;
    }
    const target = Number(trimmed);
    if (target < 1 || target > totalPages) {
      onPageJumpError?.(`Page must be between 1 and ${totalPages}.`);
      return;
    }
    onPageChange(target);
  };

  return (
    <div
      className={cn(
        "accounts-pagination-footer flex-shrink-0 border-t border-border bg-muted/20 flex items-center flex-wrap gap-x-3 gap-y-2",
        isCompact ? "px-2 py-1.5 justify-between" : "px-4 py-2.5 justify-between",
      )}
    >
      <div className={cn("flex items-center flex-wrap", isCompact ? "gap-2" : "gap-3")}>
        <p className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
          {totalRecords === 0 ? (
            <>Showing <span className="font-medium text-foreground">0</span> {recordLabel}</>
          ) : (
            <>
              Showing{" "}
              <span className="font-medium text-foreground">
                {startItem.toLocaleString()}–{endItem.toLocaleString()}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {totalRecords.toLocaleString()}
              </span>{" "}
              {recordLabel}
            </>
          )}
        </p>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {isCompact ? "Rows:" : "Rows per page:"}
            </span>
            <Select
              value={String(safePageSize)}
              onValueChange={(val) => {
                const next = Number(val);
                if (Number.isFinite(next) && next > 0) onPageSizeChange(next);
              }}
            >
              <SelectTrigger
                className={cn(
                  "h-7 text-[11px] rounded border-border bg-white px-2 gap-1 shrink-0",
                  "w-[4.25rem] min-w-[4.25rem] [&>span]:truncate [&>svg]:h-3 [&>svg]:w-3",
                )}
              >
                <SelectValue placeholder={String(safePageSize)}>
                  {safePageSize}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="!min-w-[75px] !w-[75px]">
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className={cn("flex items-center flex-wrap", isCompact ? "gap-1 ml-auto" : "gap-1.5")}>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded border-border shrink-0"
          disabled={safePage <= 1 || totalRecords === 0}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        {totalRecords > 0 && pageNumbers[0] > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-7 min-w-7 px-2 text-[11px] rounded border-border tabular-nums shrink-0"
              onClick={() => onPageChange(1)}
            >
              1
            </Button>
            {pageNumbers[0] > 2 && (
              <span className="text-xs text-muted-foreground px-0.5 select-none shrink-0">
                …
              </span>
            )}
          </>
        )}

        {totalRecords > 0 &&
          pageNumbers.map((p) => {
            const isCurrent = p === safePage;
            return (
              <Button
                key={p}
                variant={isCurrent ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-7 min-w-7 px-2 text-[11px] rounded border-border tabular-nums shrink-0",
                  isCurrent &&
                    "bg-brand-600 hover:bg-brand-700 text-white border-brand-600 font-semibold",
                )}
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            );
          })}

        {totalRecords > 0 && pageNumbers[pageNumbers.length - 1] < totalPages && (
          <>
            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <span className="text-xs text-muted-foreground px-0.5 select-none shrink-0">
                …
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 min-w-7 px-2 text-[11px] rounded border-border tabular-nums shrink-0"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </Button>
          </>
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded border-border shrink-0"
          disabled={safePage >= totalPages || totalRecords === 0}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 ml-1.5 pl-1.5 border-l border-border/60 shrink-0">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">Go to</span>
            <input
              type="text"
              inputMode="numeric"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handlePageJump();
                }
              }}
              className="h-7 w-10 px-1 text-[11px] text-center border border-border rounded bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-300"
              aria-label="Page number"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px] rounded border-border"
              disabled={totalRecords === 0}
              onClick={handlePageJump}
            >
              Go
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
