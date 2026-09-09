import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

const BG = API_ENDPOINTS.USER_MANAGEMENT.BUSINESS_GEOGRAPHY;

export type BusinessGeoLevel = "Zone" | "Region" | "Area" | "Territory";

export interface BusinessGeoListItem {
  id: string;
  name: string;
  level: BusinessGeoLevel;
  parentId: string | null;
  parentName: string;
  effectiveDate: string;
  status: "active" | "inactive";
  coverageLabel: string;
  pincodeCount: number;
  zoneId?: string;
  regionId?: string;
  areaId?: string;
  stateIds?: string[];
  districtIds?: string[];
  locationIds?: string[];
  pincodeIds?: string[];
  code?: string;
}

export interface BgLookupOption {
  id: string;
  label: string;
  code?: string;
  extra?: string;
  assignedGeography?: { id: string; name: string } | null;
}

export interface CreateZonePayload {
  zone_name: string;
  zone_code?: string;
  effective_date?: string;
  status?: boolean;
}

export interface CreateRegionPayload {
  region_name: string;
  region_code?: string;
  zone_id: string;
  effective_date?: string;
  status?: boolean;
  state_ids: string[];
}

export interface CreateAreaPayload {
  area_name: string;
  area_code?: string;
  region_id: string;
  effective_date?: string;
  status?: boolean;
  district_ids: string[];
}

export interface CreateTerritoryPayload {
  territory_name: string;
  territory_code?: string;
  area_id: string;
  effective_date?: string;
  status?: boolean;
  location_ids: string[];
  pincode_ids: string[];
}

export type UpdateZonePayload = Partial<CreateZonePayload>;
export type UpdateRegionPayload = Partial<CreateRegionPayload>;
export type UpdateAreaPayload = Partial<CreateAreaPayload>;
export type UpdateTerritoryPayload = Partial<CreateTerritoryPayload>;

export interface BusinessGeoSaveInput {
  level: BusinessGeoLevel;
  name: string;
  code?: string;
  parentId: string | null;
  effectiveDate: string;
  status: "active" | "inactive";
  stateIds?: string[];
  districtIds?: string[];
  locationIds?: string[];
  pincodeIds?: string[];
}

const TREE_PAGE_LIMIT = 100;

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function toStatus(value: unknown): "active" | "inactive" {
  return value === true || value === "active" ? "active" : "inactive";
}

function toDateOnly(value: unknown): string {
  if (!value) return "";
  const raw = asString(value);
  if (!raw) return "";
  return raw.slice(0, 10);
}

function unwrapData(payload: Record<string, unknown>): unknown {
  return payload.data;
}

function assertSuccess(body: Record<string, unknown>, fallback: string): void {
  if (body.success === false) {
    throw new Error(asString(body.message) || fallback);
  }
}

function plural(count: number, singular: string, pluralWord?: string): string {
  return `${count} ${count === 1 ? singular : pluralWord ?? `${singular}s`}`;
}

function mapZone(raw: Record<string, unknown>): BusinessGeoListItem {
  return {
    id: asString(raw.id),
    name: asString(raw.zone_name),
    level: "Zone",
    parentId: null,
    parentName: "—",
    effectiveDate: toDateOnly(raw.effective_date),
    status: toStatus(raw.status),
    coverageLabel: "—",
    pincodeCount: 0,
    code: asString(raw.zone_code) || undefined,
  };
}

function mapRegion(raw: Record<string, unknown>): BusinessGeoListItem {
  const zone = (raw.zone ?? {}) as Record<string, unknown>;
  const states = Array.isArray(raw.states) ? raw.states : [];
  const stateIds = states
    .map((row) => {
      const mapping = (row ?? {}) as Record<string, unknown>;
      return asString(mapping.state_id || (mapping.state as Record<string, unknown> | undefined)?.id);
    })
    .filter(Boolean);

  return {
    id: asString(raw.id),
    name: asString(raw.region_name),
    level: "Region",
    parentId: asString(raw.zone_id) || null,
    parentName: asString(zone.zone_name) || "—",
    effectiveDate: toDateOnly(raw.effective_date),
    status: toStatus(raw.status),
    coverageLabel: plural(stateIds.length, "state"),
    pincodeCount: 0,
    zoneId: asString(raw.zone_id) || undefined,
    stateIds,
    code: asString(raw.region_code) || undefined,
  };
}

function mapArea(raw: Record<string, unknown>): BusinessGeoListItem {
  const region = (raw.region ?? {}) as Record<string, unknown>;
  const districts = Array.isArray(raw.districts) ? raw.districts : [];
  const districtIds = districts
    .map((row) => {
      const mapping = (row ?? {}) as Record<string, unknown>;
      return asString(
        mapping.district_id ||
          (mapping.district as Record<string, unknown> | undefined)?.id,
      );
    })
    .filter(Boolean);

  return {
    id: asString(raw.id),
    name: asString(raw.area_name),
    level: "Area",
    parentId: asString(raw.region_id) || null,
    parentName: asString(region.region_name) || "—",
    effectiveDate: toDateOnly(raw.effective_date),
    status: toStatus(raw.status),
    coverageLabel: plural(districtIds.length, "district"),
    pincodeCount: 0,
    regionId: asString(raw.region_id) || undefined,
    zoneId: asString(region.zone_id) || undefined,
    districtIds,
    code: asString(raw.area_code) || undefined,
  };
}

function mapTerritory(raw: Record<string, unknown>): BusinessGeoListItem {
  const area = (raw.area ?? {}) as Record<string, unknown>;
  const locations = Array.isArray(raw.locations) ? raw.locations : [];
  const pincodes = Array.isArray(raw.pincodes) ? raw.pincodes : [];

  const locationIds = locations
    .map((row) => {
      const mapping = (row ?? {}) as Record<string, unknown>;
      return asString(
        mapping.location_id ||
          (mapping.location as Record<string, unknown> | undefined)?.id,
      );
    })
    .filter(Boolean);

  const pincodeIds = pincodes
    .map((row) => {
      const mapping = (row ?? {}) as Record<string, unknown>;
      return asString(
        mapping.pincode_id ||
          (mapping.pincode as Record<string, unknown> | undefined)?.id,
      );
    })
    .filter(Boolean);

  const cityLabel = plural(locationIds.length, "city", "cities");
  const pinLabel = plural(pincodeIds.length, "pincode");

  return {
    id: asString(raw.id),
    name: asString(raw.territory_name),
    level: "Territory",
    parentId: asString(raw.area_id) || null,
    parentName: asString(area.area_name) || "—",
    effectiveDate: toDateOnly(raw.effective_date),
    status: toStatus(raw.status),
    coverageLabel: `${cityLabel} · ${pinLabel}`,
    pincodeCount: pincodeIds.length,
    areaId: asString(raw.area_id) || undefined,
    regionId: asString(area.region_id) || undefined,
    locationIds,
    pincodeIds,
    code: asString(raw.territory_code) || undefined,
  };
}

function mapByLevel(level: BusinessGeoLevel, raw: Record<string, unknown>): BusinessGeoListItem {
  switch (level) {
    case "Zone":
      return mapZone(raw);
    case "Region":
      return mapRegion(raw);
    case "Area":
      return mapArea(raw);
    case "Territory":
      return mapTerritory(raw);
  }
}

async function listLevel(
  level: BusinessGeoLevel,
  listUrl: string,
  signal?: AbortSignal,
): Promise<BusinessGeoListItem[]> {
  const response = await axiosInstance.post(
    `${listUrl}?page=1&limit=${TREE_PAGE_LIMIT}&search=&ordering=`,
    { filters: {} },
    { signal },
  );
  const payload = response.data as Record<string, unknown>;
  const data = unwrapData(payload);
  if (!Array.isArray(data)) {
    throw new Error(`Unexpected ${level} list response shape.`);
  }
  return data.map((row) => mapByLevel(level, (row ?? {}) as Record<string, unknown>));
}

function levelRank(level: BusinessGeoLevel): number {
  switch (level) {
    case "Zone":
      return 0;
    case "Region":
      return 1;
    case "Area":
      return 2;
    case "Territory":
      return 3;
  }
}

function sortTreeFriendly(items: BusinessGeoListItem[]): BusinessGeoListItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));

  const pathKey = (item: BusinessGeoListItem): string => {
    const parts: string[] = [];
    let cur: BusinessGeoListItem | undefined = item;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      parts.unshift(`${levelRank(cur.level)}:${cur.name.toLowerCase()}`);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return parts.join("/");
  };

  return [...items].sort((a, b) => pathKey(a).localeCompare(pathKey(b)));
}

function endpointsForLevel(level: BusinessGeoLevel) {
  switch (level) {
    case "Zone":
      return BG.ZONE;
    case "Region":
      return BG.REGION;
    case "Area":
      return BG.AREA;
    case "Territory":
      return BG.TERRITORY;
  }
}

function buildCreatePayload(input: BusinessGeoSaveInput): Record<string, unknown> {
  const status = input.status === "active";
  const effective = input.effectiveDate || undefined;
  const code = input.code?.trim() || undefined;

  switch (input.level) {
    case "Zone":
      return {
        zone_name: input.name.trim(),
        ...(code ? { zone_code: code } : {}),
        ...(effective ? { effective_date: effective } : {}),
        status,
      } satisfies CreateZonePayload;
    case "Region":
      return {
        region_name: input.name.trim(),
        ...(code ? { region_code: code } : {}),
        zone_id: input.parentId!,
        ...(effective ? { effective_date: effective } : {}),
        status,
        state_ids: input.stateIds ?? [],
      } satisfies CreateRegionPayload;
    case "Area":
      return {
        area_name: input.name.trim(),
        ...(code ? { area_code: code } : {}),
        region_id: input.parentId!,
        ...(effective ? { effective_date: effective } : {}),
        status,
        district_ids: input.districtIds ?? [],
      } satisfies CreateAreaPayload;
    case "Territory":
      return {
        territory_name: input.name.trim(),
        ...(code ? { territory_code: code } : {}),
        area_id: input.parentId!,
        ...(effective ? { effective_date: effective } : {}),
        status,
        location_ids: input.locationIds ?? [],
        pincode_ids: input.pincodeIds ?? [],
      } satisfies CreateTerritoryPayload;
  }
}

function mapLookupRow(
  row: Record<string, unknown>,
  labelKeys: string[],
  codeKey?: string,
): BgLookupOption {
  let label = "";
  for (const key of labelKeys) {
    const value = asString(row[key]);
    if (value) {
      label = value;
      break;
    }
  }
  return {
    id: asString(row.id),
    label,
    code: codeKey ? asString(row[codeKey]) || undefined : undefined,
  };
}

export const BusinessGeographyService = {
  async listAllForTree(signal?: AbortSignal): Promise<BusinessGeoListItem[]> {
    const [zones, regions, areas, territories] = await Promise.all([
      listLevel("Zone", BG.ZONE.LIST, signal),
      listLevel("Region", BG.REGION.LIST, signal),
      listLevel("Area", BG.AREA.LIST, signal),
      listLevel("Territory", BG.TERRITORY.LIST, signal),
    ]);
    return sortTreeFriendly([...zones, ...regions, ...areas, ...territories]);
  },

  async getById(
    level: BusinessGeoLevel,
    id: string,
    signal?: AbortSignal,
  ): Promise<BusinessGeoListItem> {
    const response = await axiosInstance.get(endpointsForLevel(level).VIEW(id), {
      signal,
    });
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, `Failed to load ${level}.`);
    const data = (unwrapData(payload) ?? {}) as Record<string, unknown>;
    return mapByLevel(level, data);
  },

  async create(input: BusinessGeoSaveInput): Promise<void> {
    const response = await axiosInstance.post(
      endpointsForLevel(input.level).CREATE,
      buildCreatePayload(input),
    );
    assertSuccess(response.data as Record<string, unknown>, `Failed to create ${input.level}.`);
  },

  async update(id: string, input: BusinessGeoSaveInput): Promise<void> {
    const response = await axiosInstance.put(
      endpointsForLevel(input.level).UPDATE(id),
      buildCreatePayload(input),
    );
    assertSuccess(response.data as Record<string, unknown>, `Failed to update ${input.level}.`);
  },

  async toggleStatus(level: BusinessGeoLevel, id: string): Promise<void> {
    const response = await axiosInstance.patch(
      endpointsForLevel(level).STATUS_UPDATE(id),
    );
    assertSuccess(
      response.data as Record<string, unknown>,
      `Failed to update ${level} status.`,
    );
  },

  async lookupZones(signal?: AbortSignal): Promise<BgLookupOption[]> {
    const response = await axiosInstance.get(BG.LOOKUP.ZONES, { signal });
    const data = unwrapData(response.data as Record<string, unknown>);
    if (!Array.isArray(data)) return [];
    return data.map((row) =>
      mapLookupRow((row ?? {}) as Record<string, unknown>, ["zone_name"], "zone_code"),
    );
  },

  async lookupRegions(
    zoneId?: string | null,
    signal?: AbortSignal,
  ): Promise<BgLookupOption[]> {
    const response = await axiosInstance.get(BG.LOOKUP.REGIONS, {
      params: zoneId ? { zone_id: zoneId } : {},
      signal,
    });
    const data = unwrapData(response.data as Record<string, unknown>);
    if (!Array.isArray(data)) return [];
    return data.map((row) =>
      mapLookupRow((row ?? {}) as Record<string, unknown>, ["region_name"], "region_code"),
    );
  },

  async lookupAreas(
    regionId?: string | null,
    signal?: AbortSignal,
  ): Promise<BgLookupOption[]> {
    const response = await axiosInstance.get(BG.LOOKUP.AREAS, {
      params: regionId ? { region_id: regionId } : {},
      signal,
    });
    const data = unwrapData(response.data as Record<string, unknown>);
    if (!Array.isArray(data)) return [];
    return data.map((row) =>
      mapLookupRow((row ?? {}) as Record<string, unknown>, ["area_name"], "area_code"),
    );
  },

  async lookupStates(signal?: AbortSignal): Promise<BgLookupOption[]> {
    const response = await axiosInstance.get(BG.LOOKUP.STATES, { signal });
    const data = unwrapData(response.data as Record<string, unknown>);
    if (!Array.isArray(data)) return [];
    return data.map((row) =>
      mapLookupRow((row ?? {}) as Record<string, unknown>, ["state_name"], "state_code"),
    );
  },

  async lookupDistricts(
    regionId: string,
    signal?: AbortSignal,
  ): Promise<BgLookupOption[]> {
    const response = await axiosInstance.get(BG.LOOKUP.DISTRICTS, {
      params: { region_id: regionId },
      signal,
    });
    const data = unwrapData(response.data as Record<string, unknown>);
    if (!Array.isArray(data)) return [];
    return data.map((row) =>
      mapLookupRow((row ?? {}) as Record<string, unknown>, ["district_name"], "district_code"),
    );
  },

  async lookupLocations(
    areaId: string,
    signal?: AbortSignal,
  ): Promise<BgLookupOption[]> {
    const response = await axiosInstance.get(BG.LOOKUP.LOCATIONS, {
      params: { area_id: areaId },
      signal,
    });
    const data = unwrapData(response.data as Record<string, unknown>);
    if (!Array.isArray(data)) return [];
    return data.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        ...mapLookupRow(item, ["location_name"], "location_code"),
        extra: asString(item.location_type) || undefined,
      };
    });
  },

  async lookupPincodes(
    locationIds: string[],
    excludeTerritoryId?: string,
    signal?: AbortSignal,
  ): Promise<BgLookupOption[]> {
    if (locationIds.length === 0) return [];
    const response = await axiosInstance.get(BG.LOOKUP.PINCODES, {
      params: {
        location_ids: locationIds.join(","),
        ...(excludeTerritoryId ? { exclude_territory_id: excludeTerritoryId } : {}),
      },
      signal,
    });
    const data = unwrapData(response.data as Record<string, unknown>);
    if (!Array.isArray(data)) return [];
    return data.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      const pincode = asString(item.pincode);
      const office = asString(item.officename);
      const locationName = asString(item.location_name);
      const label = [pincode, office || locationName].filter(Boolean).join(" · ");
      const assigned = item.assigned_territory as { id: string; name: string } | null | undefined;
      return {
        id: asString(item.id),
        label,
        code: pincode || undefined,
        extra: locationName || undefined,
        assignedGeography: assigned
          ? { id: asString(assigned.id), name: asString(assigned.name) }
          : null,
      };
    });
  },
};

export function nextBusinessGeoLevel(
  parentLevel: BusinessGeoLevel | null | undefined,
): BusinessGeoLevel {
  if (!parentLevel) return "Zone";
  if (parentLevel === "Zone") return "Region";
  if (parentLevel === "Region") return "Area";
  return "Territory";
}

export function generateGeoCode(
  level: BusinessGeoLevel,
  existingRecords: BusinessGeoListItem[] = [],
): string {
  const prefixMap: Record<BusinessGeoLevel, string> = {
    Zone: "ZN",
    Region: "REG",
    Area: "AR",
    Territory: "TER",
  };
  const prefix = prefixMap[level] || "GEO";
  const matching = existingRecords.filter((r) => r.level === level);
  let maxNum = 0;
  const regex = new RegExp(`^${prefix}-(\\d+)$`, "i");

  for (const item of matching) {
    if (item.code) {
      const match = item.code.trim().match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  const nextNum = maxNum > 0 ? maxNum + 1 : matching.length + 1;
  return `${prefix}-${String(nextNum).padStart(3, "0")}`;
}

