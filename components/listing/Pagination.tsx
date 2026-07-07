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
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const startItem = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalRecords);
  const [pageInput, setPageInput] = useState(String(page));

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
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
        "flex-shrink-0 border-t border-border bg-muted/20 flex items-center flex-wrap gap-x-2 gap-y-1",
        isCompact ? "px-4 py-2.5 justify-between" : "px-4 py-2.5 justify-between",
      )}
    >
      <div className={cn("flex items-center flex-wrap", isCompact ? "gap-2" : "gap-3")}>
        <p className="text-xs text-muted-foreground whitespace-nowrap">
          {totalRecords === 0 ? (
            <>Showing <span className="font-medium text-foreground">0</span> {recordLabel}</>
          ) : (
            <>
              Showing{" "}
              <span className="font-medium text-foreground">
                {startItem}–{endItem}
              </span>{" "}
              of <span className="font-medium text-foreground">{totalRecords}</span> {recordLabel}
            </>
          )}
        </p>

        {onPageSizeChange && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {isCompact ? "Rows:" : "Rows per page:"}
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => onPageSizeChange(Number(val))}
            >
              <SelectTrigger className="h-6 w-[46px] text-[10px] rounded border-border bg-white px-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="!min-w-[75px] !w-[75px]">
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className={cn("flex items-center flex-wrap", isCompact ? "gap-0.5 ml-auto" : "gap-1")}>
        <Button
          variant="outline"
          size="icon"
          className={cn("rounded border-border", isCompact ? "h-6 w-6" : "h-6 w-6")}
          disabled={page <= 1 || totalRecords === 0}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className={isCompact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        </Button>

        {isCompact ? (
          totalRecords > 0 && (
            <span className="h-6 min-w-[1.5rem] px-1.5 inline-flex items-center justify-center text-[10px] font-semibold rounded bg-brand-600 text-white">
              {page}
            </span>
          )
        ) : (
          <>
            {totalRecords > 0 && pageNumbers[0] > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 text-[10px] rounded border-border"
                  onClick={() => onPageChange(1)}
                >
                  1
                </Button>
                {pageNumbers[0] > 2 && (
                  <span className="text-xs text-muted-foreground px-0.5 select-none">…</span>
                )}
              </>
            )}

            {totalRecords > 0 &&
              pageNumbers.map((p) => {
                const isCurrent = p === page;
                return (
                  <Button
                    key={p}
                    variant={isCurrent ? "default" : "outline"}
                    size="icon"
                    className={cn(
                      "h-6 w-6 text-[10px] rounded border-border",
                      isCurrent && "bg-brand-600 hover:bg-brand-700 text-white border-brand-600 font-semibold",
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
                  <span className="text-xs text-muted-foreground px-0.5 select-none">…</span>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 text-[10px] rounded border-border"
                  onClick={() => onPageChange(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}
          </>
        )}

        <Button
          variant="outline"
          size="icon"
          className={cn("rounded border-border", isCompact ? "h-6 w-6" : "h-6 w-6")}
          disabled={page >= totalPages || totalRecords === 0}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className={isCompact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        </Button>

        {!isCompact && (
          <div className="flex items-center gap-1 ml-1 pl-1 border-l border-border/60">
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
              className="h-6 w-9 px-1 text-[10px] text-center border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
              aria-label="Page number"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-[10px] rounded border-border"
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
