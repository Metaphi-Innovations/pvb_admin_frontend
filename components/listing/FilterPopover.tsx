"use client";

import React, { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, X, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnConfig, FilterValue } from "./types";

import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";

interface FilterPopoverProps {
  column: ColumnConfig;
  value?: FilterValue;
  onChange: (value: FilterValue | undefined) => void;
  onOpen?: () => void;
}

export function FilterPopover({ column, value, onChange, onOpen }: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [tempText, setTempText] = useState("");
  const [selectedDropdownValues, setSelectedDropdownValues] = useState<string[]>([]);

  useEffect(() => {
    if (column.filterType === "text") {
      setTempText((value as string) || "");
    } else if (column.filterType === "dropdown") {
      setSelectedDropdownValues((value as string[]) || []);
    }
  }, [value, column.filterType]);

  const handleApplyText = () => {
    onChange(tempText.trim() ? tempText : undefined);
    setOpen(false);
  };

  const handleClearText = () => {
    setTempText("");
    onChange(undefined);
    setOpen(false);
  };

  const toggleDropdownValue = (val: string) => {
    setSelectedDropdownValues((prev) => {
      const next = prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val];
      onChange(next.length > 0 ? next : undefined);
      return next;
    });
  };

  const handleClearDropdown = () => {
    setSelectedDropdownValues([]);
    onChange(undefined);
    setOpen(false);
  };

  const isFiltered = Array.isArray(value) ? value.length > 0 : !!value;

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen && onOpen) onOpen();
      }}>
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
        className="w-60 space-y-3 rounded-xl border border-border bg-white p-3 shadow-lg"
      >
        <div className="flex items-center justify-between border-b pb-2">
          <span className="text-xs font-semibold text-foreground">Filter by {column.header}</span>
          {isFiltered && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded-md text-muted-foreground hover:text-foreground"
              onClick={column.filterType === "text" ? handleClearText : handleClearDropdown}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {column.filterType === "text" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground" />
              <Input
                placeholder={`Search ${column.header.toLowerCase()}...`}
                value={tempText}
                onChange={(e) => setTempText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyText()}
                className="h-9 rounded-lg border-border bg-white pl-8 text-xs shadow-sm"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearText}
                className="h-7 text-xs px-2.5"
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleApplyText}
                className="h-7 text-xs px-2.5 bg-brand-600 hover:bg-brand-700 text-white"
              >
                Apply
              </Button>
            </div>
          </div>
        )}

        {column.filterType === "dropdown" && (
          <div className="space-y-3">
            <AutocompleteSelect
              options={column.filterOptions || []}
              value={selectedDropdownValues[0] || ""}
              onChange={(val) => {
                setSelectedDropdownValues(val ? [val] : []);
              }}
              placeholder="Select option..."
              searchPlaceholder={`Search ${column.header.toLowerCase()}...`}
              className="h-9 rounded-lg border-border bg-white text-xs shadow-sm"
            />
            <div className="flex items-center justify-end gap-2 pt-1 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearDropdown}
                className="h-7 text-[11px] px-3 font-semibold uppercase tracking-wide border border-border rounded-lg hover:bg-muted text-foreground"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onChange(selectedDropdownValues.length > 0 ? selectedDropdownValues : undefined);
                  setOpen(false);
                }}
                className="h-7 text-[11px] px-3 font-semibold uppercase tracking-wide bg-brand-600 hover:bg-brand-700 text-white rounded-lg"
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
