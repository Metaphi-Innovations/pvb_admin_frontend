"use client";

import React, { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "./types";

interface DateRangeFilterProps {
  value?: DateRange;
  onChange: (value: DateRange | undefined) => void;
  header: string;
}

export function DateRangeFilter({ value, onChange, header }: DateRangeFilterProps) {
  const [fromDate, setFromDate] = useState(value?.fromDate || "");
  const [toDate, setToDate] = useState(value?.toDate || "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setFromDate(value?.fromDate || "");
    setToDate(value?.toDate || "");
  }, [value]);

  const handleApply = () => {
    if (fromDate || toDate) {
      onChange({ fromDate, toDate });
    } else {
      onChange(undefined);
    }
    setOpen(false);
  };

  const handleClear = () => {
    setFromDate("");
    setToDate("");
    onChange(undefined);
    setOpen(false);
  };

  const isFiltered = !!(value?.fromDate || value?.toDate);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "p-1 rounded-md hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors outline-none",
            isFiltered && "text-brand-600 bg-brand-50 hover:bg-brand-100 hover:text-brand-700"
          )}
        >
          <Filter className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 space-y-3 rounded-xl border border-border bg-white p-3.5 shadow-lg"
      >
        <div className="flex items-center justify-between border-b pb-2">
          <span className="text-xs font-semibold text-foreground">Filter {header}</span>
          {isFiltered && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded-md text-muted-foreground hover:text-foreground"
              onClick={handleClear}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        <div className="space-y-2.5">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">From Date</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 rounded-lg border-border bg-white text-xs shadow-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">To Date</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 rounded-lg border-border bg-white text-xs shadow-sm"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 text-xs px-2.5"
          >
            Clear
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            className="h-7 text-xs px-2.5 bg-brand-600 hover:bg-brand-700 text-white"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
