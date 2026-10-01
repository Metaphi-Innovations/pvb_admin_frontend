/**
 * Pre-built indexes for fast geography dropdowns over large postal datasets.
 */

import type { PostalMasterRecord } from "./postal-master-store";

export interface PostalMasterIndexes {
  states: string[];
  districtsByState: Map<string, string[]>;
  citiesByStateDistrict: Map<string, string[]>;
  townsByStateDistrictCity: Map<string, string[]>;
}

function sortUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function stateKey(state: string): string {
  return state.trim().toLowerCase();
}

function districtKey(state: string, district: string): string {
  return `${stateKey(state)}|${district.trim().toLowerCase()}`;
}

function cityKey(state: string, district: string, city: string): string {
  return `${districtKey(state, district)}|${city.trim().toLowerCase()}`;
}

export function buildPostalMasterIndexes(records: PostalMasterRecord[]): PostalMasterIndexes {
  const active = records.filter(
    (r) => String(r.status ?? "active").trim().toLowerCase() === "active",
  );
  const states = sortUnique(active.map((r) => r.stateName));

  const districtsByState = new Map<string, string[]>();
  const citiesByStateDistrict = new Map<string, string[]>();
  const townsByStateDistrictCity = new Map<string, string[]>();

  for (const r of active) {
    const sk = stateKey(r.stateName);
    const dk = districtKey(r.stateName, r.district);
    const ck = cityKey(r.stateName, r.district, r.city);

    if (!districtsByState.has(sk)) districtsByState.set(sk, []);
    districtsByState.get(sk)!.push(r.district);

    if (!citiesByStateDistrict.has(dk)) citiesByStateDistrict.set(dk, []);
    citiesByStateDistrict.get(dk)!.push(r.city);

    if (!townsByStateDistrictCity.has(ck)) townsByStateDistrictCity.set(ck, []);
    townsByStateDistrictCity.get(ck)!.push(r.town);
  }

  for (const [key, values] of districtsByState) {
    districtsByState.set(key, sortUnique(values));
  }
  for (const [key, values] of citiesByStateDistrict) {
    citiesByStateDistrict.set(key, sortUnique(values));
  }
  for (const [key, values] of townsByStateDistrictCity) {
    townsByStateDistrictCity.set(key, sortUnique(values));
  }

  return { states, districtsByState, citiesByStateDistrict, townsByStateDistrictCity };
}

export function getIndexedStates(indexes: PostalMasterIndexes): string[] {
  return indexes.states;
}

export function getIndexedDistricts(indexes: PostalMasterIndexes, state: string): string[] {
  if (!state) return [];
  return indexes.districtsByState.get(stateKey(state)) ?? [];
}

export function getIndexedCities(indexes: PostalMasterIndexes, state: string, district: string): string[] {
  if (!state || !district) return [];
  return indexes.citiesByStateDistrict.get(districtKey(state, district)) ?? [];
}

export function getIndexedTowns(
  indexes: PostalMasterIndexes,
  state: string,
  district: string,
  city: string,
): string[] {
  if (!state || !district || !city) return [];
  return indexes.townsByStateDistrictCity.get(cityKey(state, district, city)) ?? [];
}
