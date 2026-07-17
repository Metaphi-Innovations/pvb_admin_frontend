import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { PostalPincodeLocation } from "@/lib/address/postal-lookup";

export interface PincodeApiRecord {
  id: string;
  pincode: string;
  district: string | null;
  statename: string | null;
  circlename?: string | null;
  regionname?: string | null;
  divisionname?: string | null;
  officename?: string | null;
  towns: string[];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value != null ? String(value) : "";
}

function mapApiRecord(
  data: PincodeApiRecord,
  preferredTown?: string,
): PostalPincodeLocation {
  const towns = data.towns ?? [];
  const preferred = preferredTown?.trim().toLowerCase();
  const town =
    (preferred ? towns.find((t) => t.toLowerCase() === preferred) : null) ||
    towns[0] ||
    "";
  const district = asString(data.district).trim();

  return {
    pincode: data.pincode,
    city: district,
    town,
    district,
    state: asString(data.statename).trim(),
  };
}

function mapPayloadToRecords(payloadData: unknown): PincodeApiRecord[] {
  const rows = Array.isArray(payloadData)
    ? payloadData
    : payloadData && typeof payloadData === "object"
      ? [payloadData]
      : [];

  return rows
    .map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      const townsFromArray = Array.isArray(item.towns)
        ? item.towns.map((t) => asString(t).trim()).filter(Boolean)
        : [];
      const officeName = asString(item.officename).trim();
      const towns = townsFromArray.length
        ? townsFromArray
        : officeName
          ? [officeName]
          : [];

      return {
        id: asString(item.id),
        pincode: asString(item.pincode),
        district: asString(item.district) || null,
        statename: asString(item.statename) || null,
        circlename: asString(item.circlename) || null,
        regionname: asString(item.regionname) || null,
        divisionname: asString(item.divisionname) || null,
        officename: officeName || null,
        towns,
      };
    })
    .filter((record) => Boolean(record.pincode));
}

export async function lookupPincodeFromApi(
  pincode: string,
  preferredTown?: string,
): Promise<PostalPincodeLocation | null> {
  if (pincode.length !== 6) return null;

  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.USER_MANAGEMENT.PINCODE.BY_CODE(pincode),
    );
    const payload = response.data as Record<string, unknown>;
    const records = mapPayloadToRecords(payload.data);
    if (!records.length) return null;

    const merged: PincodeApiRecord = {
      ...records[0],
      towns: [
        ...new Set(
          records
            .flatMap((r) => r.towns)
            .map((town) => town.trim())
            .filter(Boolean),
        ),
      ],
    };

    return mapApiRecord(merged, preferredTown);
  } catch {
    return null;
  }
}

export async function getTownsForPincodeFromApi(pincode: string): Promise<string[]> {
  if (pincode.length !== 6) return [];

  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.USER_MANAGEMENT.PINCODE.BY_CODE(pincode),
    );
    const payload = response.data as Record<string, unknown>;
    const records = mapPayloadToRecords(payload.data);
    if (!records.length) return [];

    return records
      .flatMap((record) => record.towns)
      .map((town) => town.trim())
      .filter(Boolean)
      .filter((town, idx, arr) => arr.indexOf(town) === idx)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}
