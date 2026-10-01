import {
  getActiveRecordsByPincode,
  hydratePostalMaster,
} from "@/lib/geography/postal-master-store";

export interface PostalPincodeLocation {
  pincode: string;
  city: string;
  town: string;
  district: string;
  state: string;
}

function recordToLocation(
  record: {
    pincode: string;
    stateName: string;
    district: string;
    city: string;
    town: string;
  },
): PostalPincodeLocation {
  const district = record.district?.trim() || "";
  const rawCity = record.city?.trim() || "";
  const city =
    rawCity && rawCity.toLowerCase() !== "na" ? rawCity : district;

  return {
    pincode: record.pincode,
    city,
    town: record.town?.trim() || "",
    district,
    state: record.stateName?.trim() || "",
  };
}

/** Return unique town names for a 6-digit pincode from Geography / Postal Master. */
export function getTownsForPincode(pincode: string): string[] {
  const matches = getActiveRecordsByPincode(pincode);
  const towns = matches.map((r) => r.town?.trim() || "").filter(Boolean);
  return [...new Set(towns)].sort((a, b) => a.localeCompare(b));
}

/** Resolve city, town, district, and state from Geography / Postal Master for a pincode. */
export function lookupPostalPincode(
  pincode: string,
  preferredTown?: string,
): PostalPincodeLocation | null {
  const matches = getActiveRecordsByPincode(pincode);
  if (matches.length === 0) return null;

  const preferred = preferredTown?.trim().toLowerCase();
  const record =
    (preferred
      ? matches.find((r) => r.town?.trim().toLowerCase() === preferred)
      : null) ?? matches[0];

  return recordToLocation(record);
}

/** Ensure postal master is loaded before pincode lookup (e.g. on form mount). */
export async function ensurePostalMasterReady(): Promise<void> {
  await hydratePostalMaster();
}

export function isValidPincodeFormat(pincode: string): boolean {
  return /^\d{6}$/.test(pincode.replace(/\D/g, "").slice(0, 6));
}
