import type { GeoNode } from "@/app/(app)/masters/geography/geo-data";

/** Structured address used across User, Employee, Customer, Supplier, etc. */
export interface StructuredAddress {
  line1: string;
  line2: string;
  pincode: string;
  city: string;
  town: string;
  district: string;
  state: string;
}

export const EMPTY_STRUCTURED_ADDRESS: StructuredAddress = {
  line1: "",
  line2: "",
  pincode: "",
  city: "",
  town: "",
  district: "",
  state: "",
};

export type AddressFieldKey = keyof StructuredAddress;

export function geoNodeLabel(node: GeoNode): string {
  if (node.level === "Pincode") return node.pincode || node.name;
  return node.name;
}

/** Flatten structured address to a single line for legacy display / exports */
export function formatStructuredAddress(addr: StructuredAddress): string {
  return [
    addr.line1,
    addr.line2,
    addr.town,
    addr.city,
    addr.district,
    addr.state,
    addr.pincode,
  ]
    .filter((p) => p && String(p).trim())
    .join(", ");
}

export function structuredAddressesEqual(
  a: StructuredAddress,
  b: StructuredAddress,
): boolean {
  return (
    a.line1 === b.line1 &&
    a.line2 === b.line2 &&
    a.pincode === b.pincode &&
    a.city === b.city &&
    a.town === b.town &&
    a.district === b.district &&
    a.state === b.state
  );
}

export function copyStructuredAddress(addr: StructuredAddress): StructuredAddress {
  return { ...addr };
}

/** Build structured address from legacy geo-node ID fields (backward compat). */
export function structuredAddressFromLegacyIds(
  line1: string,
  line2: string,
  stateId: number | null | undefined,
  cityId: number | null | undefined,
  pincodeId: number | null | undefined,
  nodes: GeoNode[],
): StructuredAddress {
  const state = nodes.find((n) => n.id === stateId);
  const city = nodes.find((n) => n.id === cityId);
  const pincode = nodes.find((n) => n.id === pincodeId);
  return {
    line1: line1 || "",
    line2: line2 || "",
    pincode: pincode?.pincode || pincode?.name || "",
    city: city?.name || "",
    town: "",
    district: "",
    state: state?.name || "",
  };
}

/** Migrate legacy combined locality field into city/town. */
export function structuredAddressFromLegacyLocality(
  base: Omit<StructuredAddress, "city" | "town"> & {
    cityTownLocality?: string;
    city?: string;
    town?: string;
  },
): StructuredAddress {
  const city = base.city?.trim() || "";
  const town = base.town?.trim() || base.cityTownLocality?.trim() || "";
  return {
    line1: base.line1,
    line2: base.line2,
    pincode: base.pincode,
    city,
    town,
    district: base.district,
    state: base.state,
  };
}
