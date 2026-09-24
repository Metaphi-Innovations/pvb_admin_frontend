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
  useBusinessGeographyTree,
} from "@/hooks/masters";

interface CheckOption {
  value: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  assignedBadge?: string;
  /** When set, options with the same group are shown under one header in a single list. */
  groupLabel?: string;
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
  listMaxHeightClass = "max-h-48",
}: {
  label: string;
  options: CheckOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  error?: string;
  emptyMessage?: string;
  loading?: boolean;
  searchPlaceholder?: string;
  listMaxHeightClass?: string;
}) {
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.groupLabel && opt.groupLabel.toLowerCase().includes(q)) ||
        (opt.assignedBadge && opt.assignedBadge.toLowerCase().includes(q)),
    );
  }, [options, search]);

  const enabledFilteredOptions = useMemo(
    () => filteredOptions.filter((opt) => !opt.disabled),
    [filteredOptions],
  );

  const optionValues = useMemo(
    () => new Set(options.map((o) => o.value)),
    [options],
  );

  const selectedInListCount = useMemo(
    () => selected.filter((v) => optionValues.has(v)).length,
    [selected, optionValues],
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

  const clearListSelection = () => {
    onChange(selected.filter((v) => !optionValues.has(v)));
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
            {selectedInListCount > 0 && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground hover:underline"
                  onClick={clearListSelection}
                >
                  Clear ({selectedInListCount})
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
          "rounded-lg border overflow-y-auto p-2 space-y-1 bg-white",
          listMaxHeightClass,
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
          filteredOptions.map((opt, index) => {
            const isChecked = selected.includes(opt.value);
            const prevGroup = filteredOptions[index - 1]?.groupLabel;
            const showGroupHeader =
              Boolean(opt.groupLabel) && opt.groupLabel !== prevGroup;
            return (
              <div key={`${opt.groupLabel ?? ""}:${opt.value}`}>
                {showGroupHeader && (
                  <p className="sticky top-0 z-[1] bg-white/95 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1.5 pt-2 pb-1 border-b border-border/40 mb-0.5">
                    {opt.groupLabel}
                  </p>
                )}
                <label
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
                    <span
                      className={cn(
                        "truncate",
                        opt.disabled && "text-muted-foreground font-medium",
                      )}
                    >
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
              </div>
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
  areaId,
  selectedIds,
  onChange,
  error,
}: {
  regionId: string | null;
  /** When editing, the current area keeps its own districts selectable. */
  areaId?: string | null;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  const districtsQuery = useBgLookupDistricts(regionId);
  const statesQuery = useBgLookupStates();
  const treeQuery = useBusinessGeographyTree();

  const regionStateIds = useMemo(() => {
    if (!regionId) return [] as string[];
    const region = (treeQuery.data ?? []).find(
      (item) => item.id === regionId && item.level === "Region",
    );
    return region?.stateIds ?? [];
  }, [regionId, treeQuery.data]);

  /** District → owning Area (excluding the area being edited). */
  const districtOwnerById = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const item of treeQuery.data ?? []) {
      if (item.level !== "Area") continue;
      if (areaId && item.id === areaId) continue;
      // Prefer same-region siblings; also cover areas whose parent matches
      if (regionId && item.parentId && item.parentId !== regionId) continue;
      for (const districtId of item.districtIds ?? []) {
        if (!districtId || map.has(districtId)) continue;
        map.set(districtId, { id: item.id, name: item.name });
      }
    }
    return map;
  }, [treeQuery.data, areaId, regionId]);

  const districtSections = useMemo(() => {
    const stateNameById = new Map(
      (statesQuery.data ?? []).map((s) => [s.id, s.label] as const),
    );
    const byState = new Map<string, CheckOption[]>();
    const ungrouped: CheckOption[] = [];

    for (const district of districtsQuery.data ?? []) {
      const owner = districtOwnerById.get(district.id);
      const option: CheckOption = {
        value: district.id,
        label: district.label,
        disabled: Boolean(owner),
        assignedBadge: owner?.name,
      };
      const stateId = district.parentId?.trim() || "";
      if (!stateId) {
        ungrouped.push(option);
        continue;
      }
      if (!byState.has(stateId)) byState.set(stateId, []);
      byState.get(stateId)!.push(option);
    }

    // API returned districts but without state ids — keep a single usable list
    if (byState.size === 0 && ungrouped.length > 0) {
      return [
        {
          stateId: "__all__",
          stateLabel: "All",
          label: "Select District(s) *",
          options: ungrouped,
        },
      ];
    }

    const nameOf = (stateId: string) =>
      stateNameById.get(stateId) ?? "State";

    const orderedStateIds: string[] = [];
    const seen = new Set<string>();

    // Prefer parent-region state order, then any extra states present in district data
    for (const stateId of regionStateIds) {
      if (!stateId || seen.has(stateId)) continue;
      seen.add(stateId);
      orderedStateIds.push(stateId);
    }
    for (const stateId of Array.from(byState.keys()).sort((a, b) =>
      nameOf(a).localeCompare(nameOf(b)),
    )) {
      if (seen.has(stateId)) continue;
      seen.add(stateId);
      orderedStateIds.push(stateId);
    }

    const sections = orderedStateIds.map((stateId) => {
      const stateLabel = nameOf(stateId);
      return {
        stateId,
        stateLabel,
        label: `Select District(s) * — ${stateLabel}`,
        options: byState.get(stateId) ?? [],
      };
    });

    if (ungrouped.length > 0) {
      sections.push({
        stateId: "__other__",
        stateLabel: "Other",
        label: "Select District(s) * — Other",
        options: ungrouped,
      });
    }

    return sections;
  }, [
    districtOwnerById,
    districtsQuery.data,
    regionStateIds,
    statesQuery.data,
  ]);

  const initialLoading =
    Boolean(regionId) &&
    ((districtsQuery.isLoading && !districtsQuery.data) ||
      (statesQuery.isLoading && !statesQuery.data) ||
      (treeQuery.isLoading && !treeQuery.data));

  if (!regionId) {
    return (
      <MultiCheckList
        label="Select District(s) *"
        options={[]}
        selected={selectedIds}
        onChange={onChange}
        error={error}
        loading={false}
        emptyMessage="Select a parent Region first."
      />
    );
  }

  if (initialLoading && districtSections.length === 0) {
    return (
      <MultiCheckList
        label="Select District(s) *"
        options={[]}
        selected={selectedIds}
        onChange={onChange}
        error={error}
        loading
        emptyMessage="No districts available for this region."
      />
    );
  }

  if (!initialLoading && districtSections.length === 0) {
    return (
      <MultiCheckList
        label="Select District(s) *"
        options={[]}
        selected={selectedIds}
        onChange={onChange}
        error={error}
        loading={false}
        emptyMessage={
          districtsQuery.isError
            ? "Failed to load districts. Try again."
            : "No states mapped to this region."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {districtSections.map((section) => (
        <MultiCheckList
          key={section.stateId}
          label={section.label}
          options={section.options}
          selected={selectedIds}
          onChange={onChange}
          loading={initialLoading && section.options.length === 0}
          emptyMessage={`No districts available for ${section.stateLabel}.`}
        />
      ))}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
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
  const treeQuery = useBusinessGeographyTree();
  const locationsQuery = useBgLookupLocations(areaId);
  const pincodesQuery = useBgLookupPincodes(
    selectedLocationIds,
    territoryId ?? undefined,
  );

  const parentArea = useMemo(() => {
    if (!areaId) return null;
    return (
      (treeQuery.data ?? []).find(
        (item) => item.id === areaId && item.level === "Area",
      ) ?? null
    );
  }, [areaId, treeQuery.data]);

  const areaDistrictIds = parentArea?.districtIds ?? [];
  const districtsQuery = useBgLookupDistricts(parentArea?.regionId ?? null);

  const locationSections = useMemo(() => {
    const districtNameById = new Map(
      (districtsQuery.data ?? []).map((d) => [d.id, d.label] as const),
    );
    const byDistrict = new Map<string, CheckOption[]>();
    const ungrouped: CheckOption[] = [];

    for (const loc of locationsQuery.data ?? []) {
      const option = {
        value: loc.id,
        label: loc.extra ? `${loc.label} (${loc.extra})` : loc.label,
      };
      const districtId = loc.parentId?.trim() || "";
      if (!districtId) {
        ungrouped.push(option);
        continue;
      }
      if (!byDistrict.has(districtId)) byDistrict.set(districtId, []);
      byDistrict.get(districtId)!.push(option);
    }

    if (byDistrict.size === 0 && ungrouped.length > 0) {
      return [
        {
          groupId: "__all__",
          groupLabel: "All",
          label: "Select Location(s) *",
          options: ungrouped,
        },
      ];
    }

    const nameOf = (districtId: string) =>
      districtNameById.get(districtId) ?? "District";

    const orderedDistrictIds: string[] = [];
    const seen = new Set<string>();

    for (const districtId of areaDistrictIds) {
      if (!districtId || seen.has(districtId)) continue;
      seen.add(districtId);
      orderedDistrictIds.push(districtId);
    }
    for (const districtId of Array.from(byDistrict.keys()).sort((a, b) =>
      nameOf(a).localeCompare(nameOf(b)),
    )) {
      if (seen.has(districtId)) continue;
      seen.add(districtId);
      orderedDistrictIds.push(districtId);
    }

    const sections = orderedDistrictIds.map((districtId) => {
      const groupLabel = nameOf(districtId);
      return {
        groupId: districtId,
        groupLabel,
        label: `Select Location(s) * — ${groupLabel}`,
        options: byDistrict.get(districtId) ?? [],
      };
    });

    if (ungrouped.length > 0) {
      sections.push({
        groupId: "__other__",
        groupLabel: "Other",
        label: "Select Location(s) * — Other",
        options: ungrouped,
      });
    }

    return sections;
  }, [areaDistrictIds, districtsQuery.data, locationsQuery.data]);

  const locationLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of locationsQuery.data ?? []) {
      map.set(
        loc.id,
        loc.extra ? `${loc.label} (${loc.extra})` : loc.label,
      );
    }
    return map;
  }, [locationsQuery.data]);

  const locationDistrictById = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of locationsQuery.data ?? []) {
      const districtId = loc.parentId?.trim() || "";
      if (districtId) map.set(loc.id, districtId);
    }
    return map;
  }, [locationsQuery.data]);

  const districtNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of districtsQuery.data ?? []) {
      map.set(d.id, d.label);
    }
    return map;
  }, [districtsQuery.data]);

  const pincodeSections = useMemo(() => {
    if (selectedLocationIds.length === 0) return [];

    const selectedSet = new Set(selectedLocationIds);
    const byDistrict = new Map<string, CheckOption[]>();
    const other: CheckOption[] = [];

    for (const pin of pincodesQuery.data ?? []) {
      const locationId = pin.parentId?.trim() || "";
      if (!locationId || !selectedSet.has(locationId)) continue;

      const locationLabel =
        locationLabelById.get(locationId) ?? pin.extra ?? "";
      const option: CheckOption = {
        value: pin.id,
        // Include city/village so district sections stay readable
        label: locationLabel ? `${pin.label} — ${locationLabel}` : pin.label,
        disabled: Boolean(pin.assignedGeography),
        assignedBadge: pin.assignedGeography?.name,
      };

      const districtId = locationDistrictById.get(locationId) ?? "";
      if (!districtId) {
        other.push(option);
        continue;
      }
      if (!byDistrict.has(districtId)) byDistrict.set(districtId, []);
      byDistrict.get(districtId)!.push(option);
    }

    const nameOf = (districtId: string) =>
      districtNameById.get(districtId) ?? "District";

    const orderedDistrictIds: string[] = [];
    const seen = new Set<string>();

    // Prefer area district order, then any remaining districts that have selected locations
    for (const districtId of areaDistrictIds) {
      if (!districtId || seen.has(districtId) || !byDistrict.has(districtId)) {
        continue;
      }
      seen.add(districtId);
      orderedDistrictIds.push(districtId);
    }
    for (const districtId of Array.from(byDistrict.keys()).sort((a, b) =>
      nameOf(a).localeCompare(nameOf(b)),
    )) {
      if (seen.has(districtId)) continue;
      seen.add(districtId);
      orderedDistrictIds.push(districtId);
    }

    const sections = orderedDistrictIds.map((districtId) => {
      const groupLabel = nameOf(districtId);
      return {
        groupId: districtId,
        groupLabel,
        label: `Select Pincode(s) * — ${groupLabel}`,
        options: byDistrict.get(districtId) ?? [],
      };
    });

    if (other.length > 0) {
      sections.push({
        groupId: "__other__",
        groupLabel: "Other",
        label: "Select Pincode(s) * — Other",
        options: other,
      });
    }

    return sections;
  }, [
    areaDistrictIds,
    districtNameById,
    locationDistrictById,
    locationLabelById,
    pincodesQuery.data,
    selectedLocationIds,
  ]);

  const locationsLoading =
    Boolean(areaId) &&
    ((locationsQuery.isLoading && !locationsQuery.data) ||
      (districtsQuery.isLoading && !districtsQuery.data && Boolean(parentArea?.regionId)) ||
      (treeQuery.isLoading && !treeQuery.data));

  const pincodesLoading =
    selectedLocationIds.length > 0 &&
    (pincodesQuery.isLoading || pincodesQuery.isFetching) &&
    !pincodesQuery.data;

  const handleLocationsChange = (next: string[]) => {
    onChangeLocations(next);
    onChangePincodes([]);
  };

  return (
    <div className="space-y-4">
      {!areaId ? (
        <MultiCheckList
          label="Select Location(s) *"
          options={[]}
          selected={selectedLocationIds}
          onChange={handleLocationsChange}
          error={errors?.locations}
          loading={false}
          emptyMessage="Select a parent Area first."
        />
      ) : locationsLoading && locationSections.length === 0 ? (
        <MultiCheckList
          label="Select Location(s) *"
          options={[]}
          selected={selectedLocationIds}
          onChange={handleLocationsChange}
          error={errors?.locations}
          loading
          emptyMessage="No locations available for this area."
        />
      ) : locationSections.length === 0 ? (
        <MultiCheckList
          label="Select Location(s) *"
          options={[]}
          selected={selectedLocationIds}
          onChange={handleLocationsChange}
          error={errors?.locations}
          loading={false}
          emptyMessage={
            locationsQuery.isError
              ? "Failed to load locations. Try again."
              : "No locations available for this area."
          }
        />
      ) : (
        <div className="space-y-4">
          {locationSections.map((section) => (
            <MultiCheckList
              key={section.groupId}
              label={section.label}
              options={section.options}
              selected={selectedLocationIds}
              onChange={handleLocationsChange}
              loading={locationsLoading && section.options.length === 0}
              emptyMessage={`No locations available for ${section.groupLabel}.`}
            />
          ))}
          {errors?.locations && (
            <p className="text-[11px] text-red-600">{errors.locations}</p>
          )}
        </div>
      )}

      {selectedLocationIds.length === 0 ? (
        <MultiCheckList
          label="Select Pincode(s) *"
          options={[]}
          selected={selectedPincodeIds}
          onChange={onChangePincodes}
          error={errors?.pincodes}
          loading={false}
          emptyMessage="Select at least one location to view pincodes."
        />
      ) : pincodesLoading && pincodeSections.every((s) => s.options.length === 0) ? (
        <MultiCheckList
          label="Select Pincode(s) *"
          options={[]}
          selected={selectedPincodeIds}
          onChange={onChangePincodes}
          error={errors?.pincodes}
          loading
          emptyMessage="No pincodes found for the selected locations."
        />
      ) : pincodesQuery.isError &&
        pincodeSections.every((s) => s.options.length === 0) ? (
        <MultiCheckList
          label="Select Pincode(s) *"
          options={[]}
          selected={selectedPincodeIds}
          onChange={onChangePincodes}
          error={errors?.pincodes}
          loading={false}
          emptyMessage="Failed to load pincodes. Try again."
        />
      ) : (
        <div className="space-y-4">
          {pincodeSections.map((section) => (
            <MultiCheckList
              key={section.groupId}
              label={section.label}
              options={section.options}
              selected={selectedPincodeIds}
              onChange={onChangePincodes}
              loading={pincodesLoading && section.options.length === 0}
              searchPlaceholder={`Search pincode in ${section.groupLabel}…`}
              emptyMessage={`No pincodes available for ${section.groupLabel}.`}
            />
          ))}
          {errors?.pincodes && (
            <p className="text-[11px] text-red-600">{errors.pincodes}</p>
          )}
        </div>
      )}

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
