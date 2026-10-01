"use client";

import React from "react";
import {
  Search,
  SlidersHorizontal,
  Columns3,
  Rows3,
  RefreshCw,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import { cn } from "@/lib/utils";
import type { HrDensity } from "../../settings/organization/_components";
import type { EmployeeFilterOption } from "../employee-display";

export type EmployeeDirectoryFilters = {
  branch: string;
  department: string;
  designation: string;
  managerId: string;
  employeeType: string;
  employmentStatus: string;
  dojFrom: string;
  dojTo: string;
};

export const EMPTY_EMPLOYEE_FILTERS: EmployeeDirectoryFilters = {
  branch: "all",
  department: "all",
  designation: "all",
  managerId: "all",
  employeeType: "all",
  employmentStatus: "all",
  dojFrom: "",
  dojTo: "",
};

export function EmployeeListingToolbar({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  filterOptions,
  density,
  onDensityChange,
  columns,
  visibleColumns,
  onVisibleColumnsChange,
  onRefresh,
  selectedCount = 0,
  bulkActions,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  filters: EmployeeDirectoryFilters;
  onFiltersChange: (f: EmployeeDirectoryFilters) => void;
  filterOptions: {
    branches: EmployeeFilterOption[];
    departments: EmployeeFilterOption[];
    designations: EmployeeFilterOption[];
    managers: EmployeeFilterOption[];
    employeeTypes: EmployeeFilterOption[];
    employmentStatuses: EmployeeFilterOption[];
  };
  density: HrDensity;
  onDensityChange: (v: HrDensity) => void;
  columns: { id: string; label: string }[];
  visibleColumns: string[];
  onVisibleColumnsChange: (ids: string[]) => void;
  onRefresh: () => void;
  selectedCount?: number;
  bulkActions?: React.ReactNode;
}) {
  const moreFilterCount = [
    filters.designation !== "all",
    filters.managerId !== "all",
    filters.employeeType !== "all",
    filters.employmentStatus !== "all",
    !!filters.dojFrom,
    !!filters.dojTo,
  ].filter(Boolean).length;

  const activeFilterCount =
    moreFilterCount +
    (filters.branch !== "all" ? 1 : 0) +
    (filters.department !== "all" ? 1 : 0);

  const setFilter = <K extends keyof EmployeeDirectoryFilters>(
    key: K,
    value: EmployeeDirectoryFilters[K],
  ) => onFiltersChange({ ...filters, [key]: value });

  const clearFilters = () => onFiltersChange({ ...EMPTY_EMPLOYEE_FILTERS });

  const toggleColumn = (id: string) => {
    if (visibleColumns.includes(id)) {
      if (visibleColumns.length <= 2) return;
      onVisibleColumnsChange(visibleColumns.filter((c) => c !== id));
    } else {
      onVisibleColumnsChange([...visibleColumns, id]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* LEFT: search + common filters + more */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search employees…"
            className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
            aria-label="Search employees"
          />
        </div>

        <InlineFilterSelect
          label="Branch"
          value={filters.branch}
          onChange={(v) => setFilter("branch", v)}
          options={filterOptions.branches}
          className="w-[140px]"
        />

        <InlineFilterSelect
          label="Department"
          value={filters.department}
          onChange={(v) => setFilter("department", v)}
          options={filterOptions.departments}
          className="w-[150px]"
        />

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                moreFilterCount > 0
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              More Filters
              {moreFilterCount > 0 && (
                <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                  {moreFilterCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[320px] p-0">
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-xs font-semibold text-foreground">More Filters</p>
            </div>
            <div className="px-3 py-3 space-y-2.5 max-h-[360px] overflow-y-auto">
              <FilterSelect
                label="Designation"
                value={filters.designation}
                onChange={(v) => setFilter("designation", v)}
                options={filterOptions.designations}
              />
              <FilterSelect
                label="Reporting Manager"
                value={filters.managerId}
                onChange={(v) => setFilter("managerId", v)}
                options={filterOptions.managers}
              />
              <FilterSelect
                label="Employee Type"
                value={filters.employeeType}
                onChange={(v) => setFilter("employeeType", v)}
                options={filterOptions.employeeTypes}
              />
              <FilterSelect
                label="Employment Status"
                value={filters.employmentStatus}
                onChange={(v) => setFilter("employmentStatus", v)}
                options={filterOptions.employmentStatuses}
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-foreground">DOJ from</p>
                  <HrDateInput
                    value={filters.dojFrom}
                    onChange={(v) => setFilter("dojFrom", v)}
                    className="h-8 text-xs"
                    aria-label="DOJ from"
                    max={filters.dojTo || undefined}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-foreground">DOJ to</p>
                  <HrDateInput
                    value={filters.dojTo}
                    onChange={(v) => setFilter("dojTo", v)}
                    className="h-8 text-xs"
                    aria-label="DOJ to"
                    min={filters.dojFrom || undefined}
                  />
                </div>
              </div>
            </div>
            {moreFilterCount > 0 && (
              <div className="px-3 py-2 border-t border-border">
                <button
                  type="button"
                  onClick={() =>
                    onFiltersChange({
                      ...filters,
                      designation: "all",
                      managerId: "all",
                      employeeType: "all",
                      employmentStatus: "all",
                      dojFrom: "",
                      dojTo: "",
                    })
                  }
                  className="text-xs text-brand-600 hover:underline"
                >
                  Clear more filters
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <div className="flex-1 min-w-[8px]" />

        {/* RIGHT: view controls only — Export lives in page header */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-8 px-2.5 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 text-muted-foreground hover:bg-muted font-medium"
            >
              <Columns3 className="w-3.5 h-3.5" />
              Columns
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-0">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold">Visible columns</p>
            </div>
            <div className="px-3 py-2 space-y-1.5 max-h-64 overflow-y-auto">
              {columns.map((c) => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    className="rounded accent-brand-600"
                    checked={visibleColumns.includes(c.id)}
                    onChange={() => toggleColumn(c.id)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <button
          type="button"
          onClick={() => onDensityChange(density === "compact" ? "comfortable" : "compact")}
          className="h-8 px-2.5 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 text-muted-foreground hover:bg-muted font-medium"
          title="Toggle density"
        >
          <Rows3 className="w-3.5 h-3.5" />
          {density === "compact" ? "Compact" : "Comfortable"}
        </button>

        <button
          type="button"
          onClick={onRefresh}
          className="h-8 w-8 inline-flex items-center justify-center border border-border rounded-lg text-muted-foreground hover:bg-muted"
          aria-label="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.branch !== "all" && (
            <Chip
              label={`Branch: ${filterOptions.branches.find((b) => b.value === filters.branch)?.label ?? filters.branch}`}
              onClear={() => setFilter("branch", "all")}
            />
          )}
          {filters.department !== "all" && (
            <Chip label={`Dept: ${filters.department}`} onClear={() => setFilter("department", "all")} />
          )}
          {filters.designation !== "all" && (
            <Chip label={`Desig: ${filters.designation}`} onClear={() => setFilter("designation", "all")} />
          )}
          {filters.managerId !== "all" && (
            <Chip
              label={`Manager: ${filterOptions.managers.find((m) => m.value === filters.managerId)?.label ?? filters.managerId}`}
              onClear={() => setFilter("managerId", "all")}
            />
          )}
          {filters.employeeType !== "all" && (
            <Chip
              label={`Type: ${filterOptions.employeeTypes.find((t) => t.value === filters.employeeType)?.label ?? filters.employeeType}`}
              onClear={() => setFilter("employeeType", "all")}
            />
          )}
          {filters.employmentStatus !== "all" && (
            <Chip
              label={`Employment: ${
                filterOptions.employmentStatuses.find((s) => s.value === filters.employmentStatus)
                  ?.label ?? filters.employmentStatus
              }`}
              onClear={() => setFilter("employmentStatus", "all")}
            />
          )}
          {(filters.dojFrom || filters.dojTo) && (
            <Chip
              label={`DOJ: ${filters.dojFrom || "…"} → ${filters.dojTo || "…"}`}
              onClear={() => onFiltersChange({ ...filters, dojFrom: "", dojTo: "" })}
            />
          )}
          <button type="button" onClick={clearFilters} className="text-[11px] text-brand-600 hover:underline ml-1">
            Clear all
          </button>
        </div>
      )}

      {selectedCount > 0 && bulkActions && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border border-brand-200 bg-brand-50/60">
          <span className="text-xs font-medium text-brand-800">{selectedCount} selected</span>
          <div className="flex flex-wrap items-center gap-1.5 ml-auto">{bulkActions}</div>
        </div>
      )}
    </div>
  );
}

function InlineFilterSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: EmployeeFilterOption[];
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-8 text-xs rounded-lg",
          value !== "all" && "border-brand-400 bg-brand-50 text-brand-700",
          className,
        )}
        aria-label={label}
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-xs">
          {label === "Branch" ? "All Branches" : label === "Department" ? "All Departments" : `All ${label}s`}
        </SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: EmployeeFilterOption[];
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-foreground">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={`All ${label}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">
            All
          </SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
      {label}
      <button type="button" onClick={onClear} aria-label={`Clear ${label}`}>
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
