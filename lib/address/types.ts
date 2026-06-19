import type { GeoNode } from "@/app/(app)/masters/geography/geo-data";

/** Structured address used across User, Employee, Customer, Supplier, etc. */
export interface StructuredAddress {
  line1: string;
  line2: string;
  stateId: number | null;
  cityId: number | null;
  pincodeId: number | null;
}

export const EMPTY_STRUCTURED_ADDRESS: StructuredAddress = {
  line1: "",
  line2: "",
  stateId: null,
  cityId: null,
  pincodeId: null,
};

export type AddressFieldKey = keyof StructuredAddress;

export function geoNodeLabel(node: GeoNode): string {
  if (node.level === "Pincode") return node.pincode || node.name;
  return node.name;
}

/** Flatten structured address to a single line for legacy display / exports */
export function formatStructuredAddress(
  addr: StructuredAddress,
  nodes: GeoNode[],
): string {
  const state = nodes.find((n) => n.id === addr.stateId);
  const city = nodes.find((n) => n.id === addr.cityId);
  const pincode = nodes.find((n) => n.id === addr.pincodeId);
  const pin = pincode ? pincode.pincode || pincode.name : "";
  return [addr.line1, addr.line2, city?.name, state?.name, pin]
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
    a.stateId === b.stateId &&
    a.cityId === b.cityId &&
    a.pincodeId === b.pincodeId
  );
}

export function copyStructuredAddress(addr: StructuredAddress): StructuredAddress {
  return { ...addr };
}
