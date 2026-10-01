"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { HrEmployee } from "../../../employees/employee-master-data";
import { hrInput } from "./hr-org-form";

/** Searchable active-employee picker for HR org forms (manager, head, etc.). */
export function HrEmployeePicker({
  employees,
  valueId,
  displayName,
  onChange,
  placeholder = "Select employee…",
  allowClear = true,
}: {
  employees: HrEmployee[];
  valueId: number | null;
  displayName?: string;
  onChange: (employee: HrEmployee | null) => void;
  placeholder?: string;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = useMemo(
    () => (valueId != null ? employees.find((e) => e.id === valueId) : undefined),
    [employees, valueId],
  );

  const label =
    selected
      ? `${selected.employeeName} (${selected.employeeCode})`
      : displayName?.trim() || "";

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter(
      (e) =>
        e.employeeName.toLowerCase().includes(term) ||
        e.employeeCode.toLowerCase().includes(term) ||
        (e.designation || "").toLowerCase().includes(term),
    );
  }, [employees, q]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            hrInput("flex w-full items-center gap-2 text-left font-normal"),
            "hover:bg-muted/30",
          )}
        >
          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className={cn("min-w-0 flex-1 truncate", label ? "text-foreground" : "text-muted-foreground")}>
            {label || placeholder}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-lg" align="start">
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
        <div className="max-h-52 overflow-y-auto p-1">
          {allowClear && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
                setQ("");
              }}
              className="flex w-full rounded-md px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/60"
            >
              None
            </button>
          )}
          {filtered.length === 0 && (
            <p className="px-2.5 py-3 text-xs text-muted-foreground">No employees found</p>
          )}
          {filtered.map((e) => {
            const active = valueId === e.id;
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
                  "flex w-full items-start gap-2 rounded-md px-2.5 py-1.5 text-left hover:bg-muted/60",
                  active && "bg-brand-50",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{e.employeeName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {e.employeeCode}
                    {e.designation ? ` · ${e.designation}` : ""}
                  </p>
                </div>
                {active && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
