"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaginationProps {
  page: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function Pagination({
  page,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startItem = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalRecords);

  if (totalRecords === 0) return null;

  // Generate page numbers to show (up to 5 page numbers)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="px-4 py-3 border-t border-border bg-muted/10 flex items-center justify-between flex-wrap gap-3">
      {/* Left section: page info and page size selector */}
      <div className="flex items-center gap-3">
        <p className="text-[11px] text-muted-foreground whitespace-nowrap">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {startItem}–{endItem}
          </span>{" "}
          of <span className="font-semibold text-foreground">{totalRecords}</span> results
        </p>
        
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => onPageSizeChange(Number(val))}
            >
              <SelectTrigger className="h-7 w-16 text-[11px] rounded-lg border-border bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Right section: pagination buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-lg border-border"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        {pageNumbers[0] > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 text-xs rounded-lg border-border"
              onClick={() => onPageChange(1)}
            >
              1
            </Button>
            {pageNumbers[0] > 2 && (
              <span className="text-xs text-muted-foreground px-0.5 select-none">…</span>
            )}
          </>
        )}

        {pageNumbers.map((p) => {
          const isCurrent = p === page;
          return (
            <Button
              key={p}
              variant={isCurrent ? "default" : "outline"}
              size="icon"
              className={cn(
                "h-7 w-7 text-xs rounded-lg border-border",
                isCurrent && "bg-brand-600 hover:bg-brand-700 text-white border-brand-600 font-semibold"
              )}
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          );
        })}

        {pageNumbers[pageNumbers.length - 1] < totalPages && (
          <>
            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <span className="text-xs text-muted-foreground px-0.5 select-none">…</span>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 text-xs rounded-lg border-border"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </Button>
          </>
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-lg border-border"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
