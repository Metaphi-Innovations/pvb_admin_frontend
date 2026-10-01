import {
  type GeoNode,
  loadGeoNodes,
  getActiveChildrenAtLevel,
} from "@/app/(app)/masters/geography/geo-data";

export function getAddressStates(nodes?: GeoNode[]): GeoNode[] {
  const list = nodes ?? loadGeoNodes();
  return list
    .filter((n) => n.level === "State" && n.status === "active")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getAddressCitiesForState(
  stateId: number | null,
  nodes?: GeoNode[],
): GeoNode[] {
  if (!stateId) return [];
  const list = nodes ?? loadGeoNodes();
  return getActiveChildrenAtLevel(stateId, "City", list).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function getAddressPincodesForCity(
  cityId: number | null,
  nodes?: GeoNode[],
): GeoNode[] {
  if (!cityId) return [];
  const list = nodes ?? loadGeoNodes();
  return getActiveChildrenAtLevel(cityId, "Pincode", list).sort((a, b) =>
    (a.pincode || a.name).localeCompare(b.pincode || b.name),
  );
}
