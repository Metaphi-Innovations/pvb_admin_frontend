/**
 * Geography coverage definitions — resolve postal master selections to pincode keys.
 */

import type { GeographyRecord, GeographyType } from "./geography-master-data";
import { getGeographyById, loadGeographies } from "./geography-master-data";
import { getActivePostalRecords, type PostalRecord } from "@/lib/geography/postal-records";
import {
  type PincodeRecord,
  pincodeComboKey,
} from "./pincode-data";

function pincodeRecordKey(r: PostalRecord): string {
  return pincodeComboKey(r.pincode, r.state, r.district, r.city, r.town);
}

export type CoverageType = "District" | "City" | "Town" | "Pincode";

export const COVERAGE_TYPES: CoverageType[] = ["District", "City", "Town", "Pincode"];

export interface CoverageSelection {
  coverageType: CoverageType;
  state: string;
  district: string;
  city: string;
  districts: string[];
  cities: string[];
  towns: string[];
  pincodeKeys: string[];
}

export interface GeographyPostalScope {
  states: string[];
  districts: string[];
  cities: string[];
  towns: string[];
  pincodeKeys: string[];
}

export interface GeographyCoverageDefinition {
  geographyId: number;
  geographyType: GeographyType;
  states: string[];
  districts: string[];
  cities: string[];
  towns: string[];
  pincodeKeys: string[];
}

export interface CoverageSummary {
  statesCovered: number;
  districtsCovered: number;
  citiesCovered: number;
  townsCovered: number;
  pincodesCovered: number;
}

const DEFINITIONS_KEY = "ds_geography_coverage_definitions_v1";
const DEFINITIONS_SCHEMA_KEY = "ds_geography_coverage_definitions_schema";

export const COVERAGE_DEFINITIONS_SCHEMA = "geography-v7-india-post";

export const EMPTY_POSTAL_SCOPE: GeographyPostalScope = {
  states: [],
  districts: [],
  cities: [],
  towns: [],
  pincodeKeys: [],
};

export const EMPTY_COVERAGE_SELECTION: CoverageSelection = {
  coverageType: "District",
  state: "",
  district: "",
  city: "",
  districts: [],
  cities: [],
  towns: [],
  pincodeKeys: [],
};

export const PARENT_LEVEL_FOR: Record<GeographyType, GeographyType | null> = {
  Zone: null,
  Region: "Zone",
  Area: "Region",
  Territory: "Area",
};

export const CHILD_LEVEL_FOR: Record<GeographyType, GeographyType | null> = {
  Zone: "Region",
  Region: "Area",
  Area: "Territory",
  Territory: null,
};

export function getDefaultLevelForParent(
  parentId: number | null,
  geographies: GeographyRecord[],
): GeographyType {
  if (parentId == null) return "Zone";
  const parent = geographies.find((g) => g.id === parentId);
  if (!parent) return "Territory";
  const child = CHILD_LEVEL_FOR[normalizeLevel(String(parent.geographyType))];
  return child ?? "Territory";
}

function normalizeLevel(level: string): GeographyType {
  const allowed: GeographyType[] = ["Zone", "Region", "Area", "Territory"];
  return (allowed.includes(level as GeographyType) ? level : "Territory") as GeographyType;
}

export function getParentOptionsForLevel(
  level: GeographyType,
  geographies: GeographyRecord[],
  excludeId?: number,
): Array<{ id: number; name: string; geographyType: string }> {
  const requiredParent = PARENT_LEVEL_FOR[level];
  if (requiredParent == null) return [];
  return geographies
    .filter((g) => g.id !== excludeId && g.geographyType === requiredParent && g.status === "active")
    .map((g) => ({ id: g.id, name: g.name, geographyType: String(g.geographyType) }));
}

export function validateParentForLevel(
  level: GeographyType,
  parentId: number | null,
  geographies: GeographyRecord[],
): string | null {
  const requiredParent = PARENT_LEVEL_FOR[level];
  if (requiredParent == null) {
    return parentId != null ? "Zone level geographies cannot have a parent." : null;
  }
  if (parentId == null) return `${level} requires a parent ${requiredParent}.`;
  const parent = geographies.find((g) => g.id === parentId);
  if (!parent) return "Parent geography not found.";
  if (parent.geographyType !== requiredParent) {
    return `${level} must be under a ${requiredParent} (selected: ${parent.geographyType}).`;
  }
  return null;
}

function toPostalRecord(r: PincodeRecord): PostalRecord {
  return {
    state: r.stateName,
    district: r.district,
    city: r.city,
    town: r.town,
    pincode: r.pincode,
    deliveryStatus: r.deliveryStatus ?? "Non-Delivery",
    status: r.status,
  };
}

function filterActivePostal(records?: PincodeRecord[]): PostalRecord[] {
  if (records) return records.filter((p) => p.status === "active").map(toPostalRecord);
  return getActivePostalRecords();
}

export function scopeFromDefinition(def: GeographyCoverageDefinition | null): GeographyPostalScope {
  if (!def) return { ...EMPTY_POSTAL_SCOPE };
  return {
    states: [...def.states],
    districts: [...def.districts],
    cities: [...def.cities],
    towns: [...def.towns],
    pincodeKeys: [...def.pincodeKeys],
  };
}

export function getRegionStates(geographyId: number): string[] {
  return getCoverageDefinition(geographyId)?.states ?? [];
}

export function getAreaDistricts(geographyId: number): string[] {
  return getCoverageDefinition(geographyId)?.districts ?? [];
}

export function getParentRegionStates(areaId: number): string[] {
  const area = getGeographyById(areaId);
  if (!area?.parentId) return [];
  return getRegionStates(area.parentId);
}

export function getEffectiveRegionStates(
  regionStates: string[],
  areaDistricts: string[],
  records?: PincodeRecord[],
): string[] {
  if (regionStates.length > 0) return regionStates;
  if (areaDistricts.length === 0) return [];
  const list = filterActivePostal(records);
  return [
    ...new Set(list.filter((p) => areaDistricts.includes(p.district)).map((p) => p.state)),
  ].sort((a, b) => a.localeCompare(b));
}

function matchesAreaPostalScope(
  p: PostalRecord,
  regionStates: string[],
  areaDistricts: string[],
  records?: PincodeRecord[],
): boolean {
  if (areaDistricts.length === 0) return false;
  if (!areaDistricts.includes(p.district)) return false;
  const states = getEffectiveRegionStates(regionStates, areaDistricts, records);
  if (states.length > 0 && !states.includes(p.state)) return false;
  return true;
}

export function getDistrictsForStates(states: string[], records?: PincodeRecord[]): string[] {
  const list = filterActivePostal(records);
  return [
    ...new Set(list.filter((p) => states.includes(p.state)).map((p) => p.district)),
  ].sort((a, b) => a.localeCompare(b));
}

export function getCitiesForDistricts(
  states: string[],
  districts: string[],
  records?: PincodeRecord[],
): string[] {
  if (districts.length === 0) return [];
  const list = filterActivePostal(records);
  return [
    ...new Set(
      list
        .filter((p) => matchesAreaPostalScope(p, states, districts, records))
        .map((p) => p.city),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function getTownsForCities(
  states: string[],
  districts: string[],
  cities: string[],
  records?: PincodeRecord[],
): string[] {
  if (districts.length === 0) return [];
  const list = filterActivePostal(records);
  return [
    ...new Set(
      list
        .filter(
          (p) =>
            matchesAreaPostalScope(p, states, districts, records) &&
            (cities.length === 0 || cities.includes(p.city)),
        )
        .map((p) => p.town),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export interface PincodeScopeOption {
  key: string;
  label: string;
  pincode: string;
  town: string;
}

export function getPincodeOptionsForScope(
  states: string[],
  districts: string[],
  cities: string[],
  towns: string[],
  records?: PincodeRecord[],
): PincodeScopeOption[] {
  if (cities.length === 0 && towns.length === 0) return [];
  const list = filterActivePostal(records).filter(
    (p) =>
      matchesAreaPostalScope(p, states, districts, records) &&
      (cities.length === 0 || cities.includes(p.city)) &&
      (towns.length === 0 || towns.includes(p.town)),
  );
  return list.map((p) => ({
    key: pincodeRecordKey(p),
    label: `${p.pincode} - ${p.town}`,
    pincode: p.pincode,
    town: p.town,
  }));
}

/** Pincode keys already owned by sibling territories under the same Area. */
export function getSiblingTerritoryPincodeOwners(
  parentAreaId: number | null,
  excludeGeographyId?: number,
): Map<string, string> {
  const owners = new Map<string, string>();
  if (parentAreaId == null) return owners;
  for (const sib of siblingGeographies(parentAreaId, "Territory", excludeGeographyId)) {
    const def = getCoverageDefinition(sib.id);
    if (!def) continue;
    for (const key of resolvePincodeKeysFromDefinition(def)) {
      owners.set(key.toLowerCase(), sib.name);
    }
  }
  return owners;
}

export interface SiblingTerritoryAllocation {
  towns: Set<string>;
  pincodeKeys: Set<string>;
}

/** Towns and pincodes already owned by sibling territories under the same Area. */
export function getSiblingTerritoryAllocations(
  parentAreaId: number | null,
  excludeGeographyId?: number,
): SiblingTerritoryAllocation {
  const towns = new Set<string>();
  const pincodeKeys = new Set<string>();
  if (parentAreaId == null) return { towns, pincodeKeys };
  for (const sib of siblingGeographies(parentAreaId, "Territory", excludeGeographyId)) {
    const def = getCoverageDefinition(sib.id);
    if (!def) continue;
    def.towns.forEach((t) => towns.add(t));
    def.pincodeKeys.forEach((k) => pincodeKeys.add(k.toLowerCase()));
  }
  return { towns, pincodeKeys };
}

export function getSiblingAreaAllocatedDistricts(
  parentRegionId: number | null,
  excludeGeographyId?: number,
): Set<string> {
  const districts = new Set<string>();
  if (parentRegionId == null) return districts;
  for (const sib of siblingGeographies(parentRegionId, "Area", excludeGeographyId)) {
    getAreaDistricts(sib.id).forEach((d) => districts.add(d));
  }
  return districts;
}

export function getSiblingAreaAllocatedDistrictOwners(
  parentRegionId: number | null,
  excludeGeographyId?: number,
): Map<string, string> {
  const owners = new Map<string, string>();
  if (parentRegionId == null) return owners;
  for (const sib of siblingGeographies(parentRegionId, "Area", excludeGeographyId)) {
    for (const d of getAreaDistricts(sib.id)) {
      if (!owners.has(d)) owners.set(d, sib.name);
    }
  }
  return owners;
}

export function getSiblingRegionAllocatedStates(
  parentZoneId: number | null,
  excludeGeographyId?: number,
): Set<string> {
  const states = new Set<string>();
  if (parentZoneId == null) return states;
  for (const sib of siblingGeographies(parentZoneId, "Region", excludeGeographyId)) {
    getRegionStates(sib.id).forEach((s) => states.add(s));
  }
  return states;
}

export function getSiblingRegionAllocatedStateOwners(
  parentZoneId: number | null,
  excludeGeographyId?: number,
): Map<string, string> {
  const owners = new Map<string, string>();
  if (parentZoneId == null) return owners;
  for (const sib of siblingGeographies(parentZoneId, "Region", excludeGeographyId)) {
    for (const s of getRegionStates(sib.id)) {
      if (!owners.has(s)) owners.set(s, sib.name);
    }
  }
  return owners;
}

/** Resolve territory coverage to explicitly selected pincode keys only. */
export function resolveTerritoryPincodeKeys(
  scope: Pick<GeographyPostalScope, "cities" | "towns" | "pincodeKeys">,
  areaDistricts: string[],
  regionStates: string[],
  records?: PincodeRecord[],
): string[] {
  if (scope.pincodeKeys.length === 0) return [];
  const list = filterActivePostal(records);
  const allowed = new Set(
    list
      .filter((p) => matchesAreaPostalScope(p, regionStates, areaDistricts, records))
      .map((p) => pincodeRecordKey(p).toLowerCase()),
  );
  return scope.pincodeKeys.filter((k) => allowed.has(k.toLowerCase()));
}

export function resolvePincodeKeysFromDefinition(
  def: GeographyCoverageDefinition,
  records?: PincodeRecord[],
): string[] {
  if (def.geographyType === "Territory") {
    const area = getGeographyById(
      loadGeographies().find((g) => g.id === def.geographyId)?.parentId ?? -1,
    );
    const regionStates = area?.parentId ? getRegionStates(area.parentId) : [];
    const areaDistricts = area ? getAreaDistricts(area.id) : [];
    const explicit = resolveTerritoryPincodeKeys(def, areaDistricts, regionStates, records);
    if (explicit.length > 0) return explicit;
    return expandLegacyTerritoryPincodeKeys(def, areaDistricts, regionStates, records);
  }
  return def.pincodeKeys;
}

/** Legacy territories may have town/city scope without explicit pincode keys saved. */
function expandLegacyTerritoryPincodeKeys(
  scope: Pick<GeographyPostalScope, "cities" | "towns" | "pincodeKeys">,
  areaDistricts: string[],
  regionStates: string[],
  records?: PincodeRecord[],
): string[] {
  const list = filterActivePostal(records).filter((p) =>
    matchesAreaPostalScope(p, regionStates, areaDistricts, records),
  );
  const keys = new Set<string>();
  const explicitKeys = new Set(scope.pincodeKeys.map((k) => k.toLowerCase()));

  for (const p of list) {
    const key = pincodeRecordKey(p);
    const keyLower = key.toLowerCase();
    if (explicitKeys.has(keyLower)) keys.add(key);
    if (scope.towns.length > 0 && scope.towns.includes(p.town)) keys.add(key);
    if (scope.cities.length > 0 && scope.cities.includes(p.city)) keys.add(key);
  }

  return [...keys];
}

export function computeScopeSummary(scope: GeographyPostalScope, records?: PincodeRecord[]): CoverageSummary {
  const list = filterActivePostal(records);
  const filtered = list.filter((p) => {
    if (scope.states.length > 0 && !scope.states.includes(p.state)) return false;
    if (scope.districts.length > 0 && !scope.districts.includes(p.district)) return false;
    if (scope.cities.length > 0 && !scope.cities.includes(p.city)) return false;
    if (scope.towns.length > 0 && !scope.towns.includes(p.town)) return false;
    return true;
  });
  return {
    statesCovered: new Set(filtered.map((p) => p.state)).size,
    districtsCovered: new Set(filtered.map((p) => p.district)).size,
    citiesCovered: new Set(filtered.map((p) => p.city)).size,
    townsCovered: new Set(filtered.map((p) => p.town)).size,
    pincodesCovered: filtered.length,
  };
}

function siblingGeographies(
  parentId: number | null,
  level: GeographyType,
  excludeId?: number,
): GeographyRecord[] {
  return loadGeographies().filter(
    (g) =>
      g.id !== excludeId &&
      g.parentId === parentId &&
      g.geographyType === level &&
      g.status === "active",
  );
}

export function validatePostalScopeForLevel(
  level: GeographyType,
  parentId: number | null,
  scope: GeographyPostalScope,
  options?: {
    excludeGeographyId?: number;
    allowSharedScope?: boolean;
    areaDistricts?: string[];
    regionStates?: string[];
  },
): Record<string, string> {
  const errors: Record<string, string> = {};
  const allowShared = options?.allowSharedScope ?? false;

  if (level === "Region") {
    if (scope.states.length === 0) errors.states = "Select at least one state.";
    if (!allowShared && parentId != null) {
      for (const sib of siblingGeographies(parentId, "Region", options?.excludeGeographyId)) {
        const sibStates = getRegionStates(sib.id);
        const overlap = scope.states.filter((s) => sibStates.includes(s));
        if (overlap.length > 0) {
          errors.states = `State(s) ${overlap.join(", ")} already assigned to ${sib.name}. Enable Allow Shared Scope to proceed.`;
          break;
        }
      }
    }
  }

  if (level === "Area") {
    if (scope.districts.length === 0) errors.districts = "Select at least one district.";
    if (!allowShared && parentId != null) {
      for (const sib of siblingGeographies(parentId, "Area", options?.excludeGeographyId)) {
        const sibDistricts = getAreaDistricts(sib.id);
        const overlap = scope.districts.filter((d) => sibDistricts.includes(d));
        if (overlap.length > 0) {
          errors.districts = `District(s) ${overlap.join(", ")} already assigned to ${sib.name}. Enable Allow Shared Scope to proceed.`;
          break;
        }
      }
    }
  }

  if (level === "Territory") {
    const areaDistricts = options?.areaDistricts ?? [];
    const regionStates = options?.regionStates ?? [];
    const selectedPincodes = scope.pincodeKeys;

    if (
      scope.cities.length === 0 &&
      scope.towns.length === 0 &&
      selectedPincodes.length === 0
    ) {
      errors.cities = "Select at least one city, town, or pincode.";
    }
    if (selectedPincodes.length === 0) {
      errors.pincodeKeys = "Please select at least one pincode for this territory.";
    }
    if (!allowShared && parentId != null && selectedPincodes.length > 0) {
      const owners = getSiblingTerritoryPincodeOwners(parentId, options?.excludeGeographyId);
      const overlap = selectedPincodes.filter((k) => owners.has(k.toLowerCase()));
      if (overlap.length > 0) {
        const ownerName = owners.get(overlap[0].toLowerCase()) ?? "another territory";
        errors.pincodeKeys = `Pincode(s) already assigned to ${ownerName}. Use reassignment flow or enable Allow Shared Scope.`;
      }
    }
  }

  return errors;
}

export function definitionFromScope(
  geographyId: number,
  geographyType: GeographyType,
  scope: GeographyPostalScope,
  parentId?: number | null,
): GeographyCoverageDefinition {
  let pincodeKeys = [...scope.pincodeKeys];
  if (geographyType === "Territory" && parentId != null) {
    const area = getGeographyById(parentId);
    const regionStates = area?.parentId ? getRegionStates(area.parentId) : [];
    const areaDistricts = area ? getAreaDistricts(area.id) : [];
    pincodeKeys = resolveTerritoryPincodeKeys(scope, areaDistricts, regionStates);
  }
  return {
    geographyId,
    geographyType,
    states: [...scope.states],
    districts: [...scope.districts],
    cities: [...scope.cities],
    towns: [...scope.towns],
    pincodeKeys,
  };
}

function buildSeedCoverageDefinitions(): GeographyCoverageDefinition[] {
  return [];
}

function seedDefinitions(): GeographyCoverageDefinition[] {
  return buildSeedCoverageDefinitions();
}

export function loadCoverageDefinitions(): GeographyCoverageDefinition[] {
  if (typeof window === "undefined") return seedDefinitions();
  const schema = localStorage.getItem(DEFINITIONS_SCHEMA_KEY);
  if (schema !== COVERAGE_DEFINITIONS_SCHEMA) {
    const seeded = seedDefinitions();
    localStorage.setItem(DEFINITIONS_KEY, JSON.stringify(seeded));
    localStorage.setItem(DEFINITIONS_SCHEMA_KEY, COVERAGE_DEFINITIONS_SCHEMA);
    return seeded;
  }
  const stored = localStorage.getItem(DEFINITIONS_KEY);
  if (!stored) {
    const seeded = seedDefinitions();
    localStorage.setItem(DEFINITIONS_KEY, JSON.stringify(seeded));
    localStorage.setItem(DEFINITIONS_SCHEMA_KEY, COVERAGE_DEFINITIONS_SCHEMA);
    return seeded;
  }
  try {
    return JSON.parse(stored) as GeographyCoverageDefinition[];
  } catch {
    return seedDefinitions();
  }
}

export function saveCoverageDefinitions(defs: GeographyCoverageDefinition[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEFINITIONS_KEY, JSON.stringify(defs));
}

export function getCoverageDefinition(geographyId: number): GeographyCoverageDefinition | null {
  return loadCoverageDefinitions().find((d) => d.geographyId === geographyId) ?? null;
}

export function upsertCoverageDefinition(def: GeographyCoverageDefinition): void {
  const all = loadCoverageDefinitions();
  const idx = all.findIndex((d) => d.geographyId === def.geographyId);
  const next = [...all];
  if (idx >= 0) next[idx] = def;
  else next.push(def);
  saveCoverageDefinitions(next);
}

export function getCoverageTypeLabel(geographyId: number): string {
  const def = getCoverageDefinition(geographyId);
  if (!def) return "—";
  if (def.geographyType === "Region") return def.states.join(", ") || "—";
  if (def.geographyType === "Area") return def.districts.join(", ") || "—";
  if (def.geographyType === "Territory") {
    const parts: string[] = [];
    if (def.cities.length) parts.push(`${def.cities.length} cities`);
    if (def.towns.length) parts.push(`${def.towns.length} towns`);
    if (def.pincodeKeys.length) parts.push(`${def.pincodeKeys.length} pincodes`);
    return parts.join(" · ") || "—";
  }
  return "—";
}

export function getResolvedCoverageCount(geographyId: number): number {
  const def = getCoverageDefinition(geographyId);
  if (!def) return 0;
  return resolvePincodeKeysFromDefinition(def).length;
}

export function formatCoverageCountLabel(geographyId: number): string {
  const count = getResolvedCoverageCount(geographyId);
  if (count === 0) return "0 Pincodes";
  return `${count} Pincode${count === 1 ? "" : "s"}`;
}

export function buildPincodeKey(
  pincode: string,
  state: string,
  district: string,
  city: string,
  town: string,
): string {
  return pincodeComboKey(pincode, state, district, city, town);
}
