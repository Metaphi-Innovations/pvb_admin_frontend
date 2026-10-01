"use client";

import React, { useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import { getBranchDisplayLabel } from "@/app/(app)/hr/employees/employee-display";

const LIST_MAX_HEIGHT = 280;

export function HrLetterEmployeePicker({
  employees,
  valueId,
  onChange,
  error,
  disabled,
  placeholder = "Select employee…",
}: {
  employees: HrEmployee[];
  valueId: number | null;
  onChange: (employee: HrEmployee | null) => void;
  error?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = useMemo(
    () => (valueId != null ? employees.find((e) => e.id === valueId) : undefined),
    [employees, valueId],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((e) => {
      const branch = getBranchDisplayLabel(e.branch) || e.branch;
      return (
        e.employeeName.toLowerCase().includes(term) ||
        e.employeeCode.toLowerCase().includes(term) ||
        (e.designation || "").toLowerCase().includes(term) ||
        branch.toLowerCase().includes(term)
      );
    });
  }, [employees, q]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQ("");
      setPortalContainer(null);
      return;
    }
    const dialog = triggerRef.current?.closest('[role="dialog"]');
    setPortalContainer(dialog instanceof HTMLElement ? dialog : null);
  };

  return (
    <Popover open={disabled ? false : open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label="Employee"
          disabled={disabled}
          className={cn(
            "w-full min-h-9 px-3 py-1.5 text-left border border-border rounded-lg bg-white",
            "flex items-center gap-2",
            "hover:bg-muted/30 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400",
            disabled && "opacity-80 cursor-default bg-muted/30 hover:bg-muted/30",
            error && "border-red-400 focus-visible:ring-red-300",
          )}
        >
          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          {selected ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-foreground">
                {selected.employeeName}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {selected.employeeCode}
                {selected.designation ? ` · ${selected.designation}` : ""}
                {selected.branch
                  ? ` · ${getBranchDisplayLabel(selected.branch) || selected.branch}`
                  : ""}
              </span>
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {placeholder}
            </span>
          )}
          {!disabled ? (
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        portalContainer={portalContainer}
        align="start"
        side="bottom"
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] p-0 z-[400] overflow-hidden rounded-[10px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border p-1.5">
          <div className="flex h-8 items-center gap-2 rounded-md border border-border px-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or code…"
              className="min-w-0 flex-1 bg-transparent text-xs outline-none"
            />
          </div>
        </div>
        <div className="overflow-y-auto p-1" style={{ maxHeight: LIST_MAX_HEIGHT }}>
          {filtered.length === 0 ? (
            <p className="px-2.5 py-3 text-xs text-muted-foreground">No employees found</p>
          ) : (
            filtered.map((e) => {
              const active = valueId === e.id;
              const branch = getBranchDisplayLabel(e.branch) || e.branch;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    onChange(e);
                    setOpen(false);
                    setQ("");
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left hover:bg-muted/60",
                    active && "bg-brand-50",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{e.employeeName}</p>
                    <p className="truncate font-mono text-[11px] font-semibold text-brand-700">
                      {e.employeeCode}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {e.designation || "—"}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">{branch || "—"}</p>
                  </div>
                  {active ? (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
