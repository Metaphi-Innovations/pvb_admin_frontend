import type { Farmer, FarmingPracticeType } from "./farmer-data";

export function splitListItems(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,;]|(?:\s+and\s+)/i)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function parseAreaValue(value: string): number {
  const numericValue = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

export function formatArea(value: number) {
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${formatted} Acres`;
}

export function getOwnedLeasedTotals(farmer: Farmer) {
  const ownedTotal = farmer.cropEntries
    .filter((entry) => entry.ownershipType === "Owned")
    .reduce((sum, entry) => sum + parseAreaValue(entry.landSize), 0);
  const leasedTotal = farmer.cropEntries
    .filter((entry) => entry.ownershipType === "Leased")
    .reduce((sum, entry) => sum + parseAreaValue(entry.landSize), 0);

  return { ownedTotal, leasedTotal };
}

export function getCurrentCropItems(farmer: Farmer): string[] {
  const fromEntries = Array.from(
    new Set(
      farmer.cropEntries
        .map((entry) => entry.produceCropName.trim())
        .filter(Boolean),
    ),
  );
  if (fromEntries.length > 0) return fromEntries;
  return splitListItems(farmer.currentCrop);
}

export function getCropRotationItems(farmer: Farmer): string[] {
  const fromEntries = Array.from(
    new Set(
      farmer.cropEntries.flatMap((entry) =>
        entry.cropRotation
          .split(/->|→/)
          .map((part) => part.trim())
          .filter(Boolean),
      ),
    ),
  ).filter((part) => !["fallow", "parcel based"].includes(part.toLowerCase()));

  if (fromEntries.length > 0) return fromEntries;
  return splitListItems(farmer.cropRotation);
}

export function getLandSummary(farmer: Farmer) {
  const { ownedTotal, leasedTotal } = getOwnedLeasedTotals(farmer);
  const ownership = farmer.ownershipType;

  return {
    total: farmer.farmlandSize,
    owned: ownedTotal > 0 ? formatArea(ownedTotal) : null,
    leased: leasedTotal > 0 ? formatArea(leasedTotal) : null,
    showOwned: ownership === "Owned" || ownership === "Owned + Leased",
    showLeased: ownership === "Leased" || ownership === "Owned + Leased",
  };
}

export function parseFarmingPractice(value: string): {
  practice: FarmingPracticeType;
  chemicalPercent?: number;
  biologicalPercent?: number;
} {
  const chemicalMatch = value.match(/Chemical\s*(\d+)/i);
  const biologicalMatch = value.match(/Biological\s*(\d+)/i);
  const chemicalPercent = chemicalMatch ? Number(chemicalMatch[1]) : undefined;
  const biologicalPercent = biologicalMatch ? Number(biologicalMatch[1]) : undefined;

  if (
    chemicalPercent !== undefined &&
    biologicalPercent !== undefined &&
    chemicalPercent > 0 &&
    biologicalPercent > 0
  ) {
    if (chemicalPercent >= 95) return { practice: "Chemical", chemicalPercent, biologicalPercent };
    if (biologicalPercent >= 95) return { practice: "Biological", chemicalPercent, biologicalPercent };
    return { practice: "Both", chemicalPercent, biologicalPercent };
  }

  if (/chemical only/i.test(value)) return { practice: "Chemical", chemicalPercent: 100, biologicalPercent: 0 };
  if (/biological only/i.test(value)) return { practice: "Biological", chemicalPercent: 0, biologicalPercent: 100 };

  return { practice: "Both", chemicalPercent, biologicalPercent };
}

export function farmerInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatOwnershipLabel(type: Farmer["ownershipType"]) {
  if (type === "Owned + Leased") return "Both";
  return type;
}

export function googleMapsHref(latLong: string) {
  const coords = latLong.trim();
  if (!coords) return undefined;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`;
}

export function formatIndianMobile(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits}`;
  }
  return phone.startsWith("+") ? phone : `+91 ${digits}`;
}

export function parseLatLong(latLong: string): { latitude: string; longitude: string } {
  const parts = latLong.split(",").map((p) => p.trim());
  return {
    latitude: parts[0] || "—",
    longitude: parts[1] || "—",
  };
}

export function formatDobAge(age: number): string {
  return `${age} years`;
}

/** SFA address mapping — village/town used when dedicated address lines are absent */
export function getAddressLine1(farmer: Farmer): string {
  return farmer.village || "—";
}

export function getAddressLine2(farmer: Farmer): string {
  if (farmer.town && farmer.town !== farmer.village) return farmer.town;
  if (farmer.city && farmer.city !== farmer.village) return farmer.city;
  return "—";
}
