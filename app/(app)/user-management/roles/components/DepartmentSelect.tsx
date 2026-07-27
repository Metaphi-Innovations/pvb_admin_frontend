"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, Check, ChevronsUpDown, Search } from "lucide-react";
import { useDepartmentsDropdown } from "@/hooks/user-management";

interface DepartmentSelectProps {
  label?: string;
  placeholder?: string;
  value: string | null;
  onChange: (id: string | null) => void;
  error?: string;
  required?: boolean;
}

export default function DepartmentSelect({
  label = "Department",
  placeholder = "Select department…",
  value,
  onChange,
  error,
  required,
}: DepartmentSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownQuery = useDepartmentsDropdown();

  const options = useMemo(
    () =>
      (dropdownQuery.data ?? []).map((item) => ({
        id: item.id,
        name: item.name || item.label,
      })),
    [dropdownQuery.data],
  );

  const selected = options.find((item) => item.id === value);
  const filtered = options.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full h-9 px-3 text-sm text-left border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30 transition-colors",
              error ? "border-red-400" : "border-border",
            )}
          >
            <span className={selected ? "text-foreground" : "text-muted-foreground"}>
              {dropdownQuery.isLoading ? "Loading departments…" : selected ? selected.name : placeholder}
            </span>
            <ChevronsUpDown className="flex-shrink-0 w-4 h-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-center text-muted-foreground">No departments found</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-lg transition-colors hover:bg-muted/60",
                    value === item.id && "bg-brand-50",
                  )}
                >
                  <span className="flex-1 truncate">{item.name}</span>
                  {value === item.id && <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
