"use client";

import { useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getAreaDistricts,
  getCitiesForDistricts,
  getDistrictsForStates,
  getEffectiveRegionStates,
  getParentRegionStates,
  getPincodeOptionsForScope,
  getRegionStates,
  getSiblingAreaAllocatedDistrictOwners,
  getSiblingRegionAllocatedStateOwners,
  getSiblingTerritoryAllocations,
  getSiblingTerritoryPincodeOwners,
  getTownsForCities,
  type GeographyPostalScope,
} from "../geography-coverage-data";
import { getGeographyById } from "../geography-master-data";
import {
  getDistinctStates,
  getPostalRecords,
  POSTAL_MASTER_EMPTY_MESSAGE,
} from "../pincode-data";

const IS_DEV = process.env.NODE_ENV === "development";

function postalEmptyMessage(alternate: string): string {
  return getPostalRecords().length > 0 ? alternate : POSTAL_MASTER_EMPTY_MESSAGE;
}

interface CheckOption {
  value: string;
  disabled?: boolean;
  disabledReason?: string;
}

function MultiCheckList({
  label,
  options,
  selected,
  onChange,
  error,
  emptyMessage,
}: {
  label: string;
  options: CheckOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  error?: string;
  emptyMessage?: string;
}) {
  const toggle = (opt: CheckOption) => {
    if (opt.disabled && !selected.includes(opt.value)) return;
    onChange(
      selected.includes(opt.value)
        ? selected.filter((v) => v !== opt.value)
        : [...selected, opt.value],
    );
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className={cn("rounded-lg border max-h-36 overflow-y-auto p-2 space-y-1", error && "border-red-500")}>
        {options.length === 0 ? (
          <p className="text-[11px] text-muted-foreground px-1 py-2">{emptyMessage ?? "No options available."}</p>
        ) : (
          options.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex items-start gap-2 text-xs rounded px-1 py-0.5",
                opt.disabled && !selected.includes(opt.value)
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-pointer hover:bg-muted/30",
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selected.includes(opt.value)}
                disabled={opt.disabled && !selected.includes(opt.value)}
                onChange={() => toggle(opt)}
              />
              <span className="min-w-0">
                <span>{opt.value}</span>
                {opt.disabled && opt.disabledReason ? (
                  <span className="block text-[10px] text-muted-foreground">{opt.disabledReason}</span>
                ) : null}
              </span>
            </label>
          ))
        )}
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

export function RegionStateSelector({
  scope,
  onChange,
  errors,
  parentZoneId,
  excludeGeographyId,
  allowSharedCoverage = false,
  postalRecordCount = 0,
}: {
  scope: GeographyPostalScope;
  onChange: (scope: GeographyPostalScope) => void;
  errors?: Record<string, string>;
  parentZoneId?: number | null;
  excludeGeographyId?: number;
  allowSharedCoverage?: boolean;
  postalRecordCount?: number;
}) {
  const allStates = useMemo(() => getDistinctStates(), [postalRecordCount]);
  const stateOwners = useMemo(
    () =>
      allowSharedCoverage
        ? new Map<string, string>()
        : getSiblingRegionAllocatedStateOwners(parentZoneId ?? null, excludeGeographyId),
    [parentZoneId, excludeGeographyId, allowSharedCoverage, postalRecordCount],
  );

  const stateOptions = useMemo(
    () =>
      allStates.map((s) => {
        const owner = stateOwners.get(s);
        const disabled = Boolean(owner) && !scope.states.includes(s);
        return {
          value: s,
          disabled,
          disabledReason: disabled && owner ? `Already assigned to ${owner}` : undefined,
        };
      }),
    [allStates, stateOwners, scope.states],
  );

  useEffect(() => {
    if (!IS_DEV) return;
    console.log("[Business Geography] postal records count:", getPostalRecords().length);
    console.log("[Business Geography] unique states:", allStates);
  }, [allStates, postalRecordCount]);

  return (
    <MultiCheckList
      label="Select State(s) *"
      options={stateOptions}
      selected={scope.states}
      onChange={(states) => onChange({ ...scope, states })}
      error={errors?.states}
      emptyMessage={postalEmptyMessage("No states available in Postal Master.")}
    />
  );
}

export function AreaDistrictSelector({
  parentRegionId,
  scope,
  onChange,
  errors,
  excludeGeographyId,
  allowSharedCoverage = false,
  postalRecordCount = 0,
}: {
  parentRegionId: number | null;
  scope: GeographyPostalScope;
  onChange: (scope: GeographyPostalScope) => void;
  errors?: Record<string, string>;
  excludeGeographyId?: number;
  allowSharedCoverage?: boolean;
  postalRecordCount?: number;
}) {
  const regionStates = useMemo(
    () => (parentRegionId != null ? getRegionStates(parentRegionId) : []),
    [parentRegionId, postalRecordCount],
  );
  const allDistricts = useMemo(
    () => getDistrictsForStates(regionStates),
    [regionStates, postalRecordCount],
  );
  const districtOwners = useMemo(
    () =>
      allowSharedCoverage
        ? new Map<string, string>()
        : getSiblingAreaAllocatedDistrictOwners(parentRegionId, excludeGeographyId),
    [parentRegionId, excludeGeographyId, allowSharedCoverage, postalRecordCount],
  );

  const districtOptions = useMemo(
    () =>
      allDistricts.map((d) => {
        const owner = districtOwners.get(d);
        const disabled = Boolean(owner) && !scope.districts.includes(d);
        return {
          value: d,
          disabled,
          disabledReason: disabled && owner ? `Already assigned to ${owner}` : undefined,
        };
      }),
    [allDistricts, districtOwners, scope.districts],
  );

  useEffect(() => {
    if (!IS_DEV) return;
    console.log("[Business Geography] selected parent region states:", regionStates);
    console.log("[Business Geography] resolved area districts:", allDistricts);
  }, [regionStates, allDistricts, postalRecordCount]);

  return (
    <div className="space-y-2">
      {regionStates.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Districts from region states: {regionStates.join(", ")}
        </p>
      )}
      <MultiCheckList
        label="Select District(s) *"
        options={districtOptions}
        selected={scope.districts}
        onChange={(districts) => onChange({ ...scope, districts })}
        error={errors?.districts}
        emptyMessage={
          parentRegionId == null
            ? "Select a parent Region first."
            : postalEmptyMessage("No districts in Postal Master for this region.")
        }
      />
    </div>
  );
}

export function TerritoryCoverageSelector({
  parentAreaId,
  scope,
  onChange,
  errors,
  excludeGeographyId,
  allowSharedCoverage = false,
  postalRecordCount = 0,
}: {
  parentAreaId: number | null;
  scope: GeographyPostalScope;
  onChange: (scope: GeographyPostalScope) => void;
  errors?: Record<string, string>;
  excludeGeographyId?: number;
  allowSharedCoverage?: boolean;
  postalRecordCount?: number;
}) {
  const area = parentAreaId != null ? getGeographyById(parentAreaId) : undefined;
  const areaDistricts = parentAreaId != null ? getAreaDistricts(parentAreaId) : [];
  const regionStates = parentAreaId != null ? getParentRegionStates(parentAreaId) : [];
  const effectiveStates = useMemo(
    () => getEffectiveRegionStates(regionStates, areaDistricts),
    [regionStates, areaDistricts, postalRecordCount],
  );

  const pincodeOwners = useMemo(
    () =>
      allowSharedCoverage
        ? new Map<string, string>()
        : getSiblingTerritoryPincodeOwners(parentAreaId, excludeGeographyId),
    [parentAreaId, excludeGeographyId, allowSharedCoverage, postalRecordCount],
  );

  const allLocations = useMemo(
    () => getCitiesForDistricts(effectiveStates, areaDistricts),
    [effectiveStates, areaDistricts, postalRecordCount],
  );

  const canShowPincodes = scope.cities.length > 0;
  const pincodeOptions = useMemo(
    () =>
      canShowPincodes
        ? getPincodeOptionsForScope(effectiveStates, areaDistricts, scope.cities, [])
        : [],
    [canShowPincodes, effectiveStates, areaDistricts, scope.cities, postalRecordCount],
  );

  const togglePincode = (key: string) => {
    const owner = pincodeOwners.get(key.toLowerCase());
    if (owner && !allowSharedCoverage && !scope.pincodeKeys.includes(key)) return;
    const next = scope.pincodeKeys.includes(key)
      ? scope.pincodeKeys.filter((k) => k !== key)
      : [...scope.pincodeKeys, key];
    onChange({ ...scope, pincodeKeys: next });
  };

  const handleLocationsChange = (nextLocations: string[]) => {
    const validOptions = getPincodeOptionsForScope(
      effectiveStates,
      areaDistricts,
      nextLocations,
      [],
    );
    const validKeySet = new Set(validOptions.map((o) => o.key.toLowerCase()));
    const nextKeys = scope.pincodeKeys.filter((k) => validKeySet.has(k.toLowerCase()));

    onChange({
      ...scope,
      cities: nextLocations,
      towns: [],
      pincodeKeys: nextKeys,
    });
  };

  const selectedPincodeCount = scope.pincodeKeys.length;

  useEffect(() => {
    if (!IS_DEV) return;
    console.log("[Business Geography] resolved area districts (territory):", areaDistricts);
    console.log("[Business Geography] selected parent region states (territory):", regionStates);
  }, [areaDistricts, regionStates, postalRecordCount]);

  return (
    <div className="space-y-3">
      {area && (
        <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-3 text-xs space-y-1">
          <p><span className="text-muted-foreground">Parent Area:</span> <strong>{area.name}</strong></p>
          <p><span className="text-muted-foreground">Allowed Districts:</span> {areaDistricts.join(", ") || "—"}</p>
        </div>
      )}

      <MultiCheckList
        label="Select Location(s)"
        options={allLocations.map((c) => ({ value: c }))}
        selected={scope.cities}
        onChange={handleLocationsChange}
        error={errors?.cities}
        emptyMessage={
          parentAreaId == null
            ? "Select a parent Area first."
            : postalEmptyMessage("No locations in Postal Master for this area.")
        }
      />

      <div className="space-y-1">
        <Label className="text-xs">Select Pincode(s)</Label>
        <div className={cn("rounded-lg border max-h-40 overflow-y-auto p-2 space-y-1", errors?.pincodeKeys && "border-red-500")}>
          {!canShowPincodes ? (
            <p className="text-[11px] text-muted-foreground px-1 py-2">
              Select at least one location to view pincodes.
            </p>
          ) : pincodeOptions.length === 0 ? (
            <p className="text-[11px] text-muted-foreground px-1 py-2">
              {postalEmptyMessage("No pincodes found in Postal Master for the current selection.")}
            </p>
          ) : (
            pincodeOptions.map((opt) => {
              const owner = pincodeOwners.get(opt.key.toLowerCase());
              const isAssignedElsewhere = Boolean(owner) && !allowSharedCoverage;
              const checked = scope.pincodeKeys.includes(opt.key);
              return (
                <label
                  key={opt.key}
                  className={cn(
                    "flex items-start gap-2 text-xs rounded px-1 py-0.5",
                    isAssignedElsewhere
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer hover:bg-muted/30",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={checked}
                    disabled={isAssignedElsewhere}
                    onChange={() => togglePincode(opt.key)}
                  />
                  <span className="min-w-0">
                    <span className="font-mono">{opt.label}</span>
                    {isAssignedElsewhere && owner ? (
                      <span className="block text-[10px] text-muted-foreground">
                        Already assigned to {owner}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })
          )}
        </div>
        {errors?.pincodeKeys && <p className="text-[11px] text-red-600">{errors.pincodeKeys}</p>}
      </div>

      <p className="text-[11px] text-brand-800 font-medium">
        Resolved: {selectedPincodeCount} pincode{selectedPincodeCount === 1 ? "" : "s"}
      </p>

      <div className="rounded-lg border border-border/60 bg-white p-3 space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground uppercase">Coverage Summary</p>
        <p className="text-xs">
          <span className="text-muted-foreground">Locations selected:</span>{" "}
          <span className="font-medium tabular-nums">{scope.cities.length}</span>
        </p>
        <p className="text-xs">
          <span className="text-muted-foreground">Pincodes selected:</span>{" "}
          <span className="font-medium tabular-nums">{selectedPincodeCount}</span>
        </p>
      </div>
    </div>
  );
}
