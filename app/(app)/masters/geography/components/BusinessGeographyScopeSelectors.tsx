"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  useBgLookupDistricts,
  useBgLookupLocations,
  useBgLookupPincodes,
  useBgLookupStates,
} from "@/hooks/masters";

interface CheckOption {
  value: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  assignedBadge?: string;
}

function MultiCheckList({
  label,
  options,
  selected,
  onChange,
  error,
  emptyMessage,
  loading,
  searchPlaceholder,
}: {
  label: string;
  options: CheckOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  error?: string;
  emptyMessage?: string;
  loading?: boolean;
  searchPlaceholder?: string;
}) {
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.assignedBadge && opt.assignedBadge.toLowerCase().includes(q)),
    );
  }, [options, search]);

  const enabledFilteredOptions = useMemo(
    () => filteredOptions.filter((opt) => !opt.disabled),
    [filteredOptions],
  );

  const isAllFilteredSelected =
    enabledFilteredOptions.length > 0 &&
    enabledFilteredOptions.every((opt) => selected.includes(opt.value));

  const toggle = (opt: CheckOption) => {
    if (opt.disabled) return;
    onChange(
      selected.includes(opt.value)
        ? selected.filter((v) => v !== opt.value)
        : [...selected, opt.value],
    );
  };

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const enabledValues = new Set(enabledFilteredOptions.map((o) => o.value));
      onChange(selected.filter((v) => !enabledValues.has(v)));
    } else {
      const newSelected = new Set(selected);
      enabledFilteredOptions.forEach((o) => newSelected.add(o.value));
      onChange(Array.from(newSelected));
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium">{label}</Label>
        {options.length > 0 && (
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              className="text-brand-600 hover:text-brand-700 font-medium hover:underline disabled:opacity-50"
              onClick={toggleSelectAllFiltered}
              disabled={enabledFilteredOptions.length === 0}
            >
              {isAllFilteredSelected ? "Deselect All" : "Select All"}
            </button>
            {selected.length > 0 && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground hover:underline"
                  onClick={() => onChange([])}
                >
                  Clear ({selected.length})
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {options.length > 5 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder ?? `Search ${label.replace(/\*|\(.*?\)/g, "").trim()}…`}
            className="h-8 pl-8 pr-7 text-xs bg-muted/20 focus-visible:bg-white"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      <div
        className={cn(
          "rounded-lg border max-h-48 overflow-y-auto p-2 space-y-1 bg-white",
          error && "border-red-500",
        )}
      >
        {loading ? (
          <p className="text-[11px] text-muted-foreground px-1 py-2">Loading…</p>
        ) : options.length === 0 ? (
          <p className="text-[11px] text-muted-foreground px-1 py-2">
            {emptyMessage ?? "No options available."}
          </p>
        ) : filteredOptions.length === 0 ? (
          <p className="text-[11px] text-muted-foreground px-1 py-2">
            No matching results for &ldquo;{search}&rdquo;.
          </p>
        ) : (
          filteredOptions.map((opt) => {
            const isChecked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center justify-between gap-2 text-xs rounded px-1.5 py-1 transition-colors",
                  opt.disabled
                    ? "bg-muted/40 cursor-not-allowed opacity-80"
                    : "cursor-pointer hover:bg-muted/30",
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    className="shrink-0 accent-brand-600 rounded disabled:opacity-75"
                    checked={isChecked}
                    disabled={opt.disabled}
                    onChange={() => toggle(opt)}
                  />
                  <span className={cn("truncate", opt.disabled && "text-muted-foreground font-medium")}>
                    {opt.label}
                  </span>
                </div>

                {opt.assignedBadge && (
                  <span
                    className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80"
                    title={`Assigned to ${opt.assignedBadge}`}
                  >
                    Assigned: {opt.assignedBadge}
                  </span>
                )}
                {!opt.assignedBadge && opt.disabled && opt.disabledReason && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {opt.disabledReason}
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

export function RegionStateSelector({
  selectedIds,
  onChange,
  error,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  const statesQuery = useBgLookupStates();
  const options =
    statesQuery.data?.map((s) => ({
      value: s.id,
      label: s.label,
    })) ?? [];

  return (
    <MultiCheckList
      label="Select State(s) *"
      options={options}
      selected={selectedIds}
      onChange={onChange}
      error={error}
      loading={statesQuery.isLoading}
      emptyMessage="No states available."
    />
  );
}

export function AreaDistrictSelector({
  regionId,
  selectedIds,
  onChange,
  error,
}: {
  regionId: string | null;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  const districtsQuery = useBgLookupDistricts(regionId);
  const options =
    districtsQuery.data?.map((d) => ({
      value: d.id,
      label: d.label,
    })) ?? [];

  return (
    <MultiCheckList
      label="Select District(s) *"
      options={options}
      selected={selectedIds}
      onChange={onChange}
      error={error}
      loading={Boolean(regionId) && districtsQuery.isLoading}
      emptyMessage={
        regionId == null
          ? "Select a parent Region first."
          : "No districts available for this region."
      }
    />
  );
}

export function TerritoryCoverageSelector({
  areaId,
  territoryId,
  selectedLocationIds,
  selectedPincodeIds,
  onChangeLocations,
  onChangePincodes,
  errors,
}: {
  areaId: string | null;
  territoryId?: string | null;
  selectedLocationIds: string[];
  selectedPincodeIds: string[];
  onChangeLocations: (ids: string[]) => void;
  onChangePincodes: (ids: string[]) => void;
  errors?: { locations?: string; pincodes?: string };
}) {
  const locationsQuery = useBgLookupLocations(areaId);
  const pincodesQuery = useBgLookupPincodes(
    selectedLocationIds,
    territoryId ?? undefined,
  );

  const locationOptions =
    locationsQuery.data?.map((loc) => ({
      value: loc.id,
      label: loc.extra ? `${loc.label} (${loc.extra})` : loc.label,
    })) ?? [];

  const pincodeOptions =
    pincodesQuery.data?.map((pin) => {
      const isAssignedToOther = Boolean(pin.assignedGeography);
      return {
        value: pin.id,
        label: pin.label,
        disabled: isAssignedToOther,
        assignedBadge: pin.assignedGeography?.name,
      };
    }) ?? [];

  return (
    <div className="space-y-3">
      <MultiCheckList
        label="Select Location(s) *"
        options={locationOptions}
        selected={selectedLocationIds}
        onChange={(next) => {
          onChangeLocations(next);
          onChangePincodes([]);
        }}
        error={errors?.locations}
        loading={Boolean(areaId) && locationsQuery.isLoading}
        emptyMessage={
          areaId == null
            ? "Select a parent Area first."
            : "No locations available for this area."
        }
      />

      <MultiCheckList
        label="Select Pincode(s) *"
        options={pincodeOptions}
        selected={selectedPincodeIds}
        onChange={onChangePincodes}
        error={errors?.pincodes}
        loading={selectedLocationIds.length > 0 && pincodesQuery.isLoading}
        emptyMessage={
          selectedLocationIds.length === 0
            ? "Select at least one location to view pincodes."
            : "No pincodes found for the selected locations."
        }
      />

      <div className="rounded-lg border border-border/60 bg-white p-3 space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground uppercase">
          Coverage Summary
        </p>
        <p className="text-xs">
          <span className="text-muted-foreground">Locations selected:</span>{" "}
          <span className="font-medium tabular-nums">{selectedLocationIds.length}</span>
        </p>
        <p className="text-xs">
          <span className="text-muted-foreground">Pincodes selected:</span>{" "}
          <span className="font-medium tabular-nums">{selectedPincodeIds.length}</span>
        </p>
      </div>
    </div>
  );
}
