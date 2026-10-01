/**
 * Frontend mock state/city data for City Category Master (internal management).
 * Replace load/save with API when backend is ready.
 */

import { policyToday } from "@/lib/hr/policy-common";
import { CURRENT_USER } from "@/lib/hr/config";

export const STATE_CITY_MOCK_SEED: Record<string, string[]> = {
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  Uttarakhand: ["Dehradun", "Haridwar", "Rishikesh", "Roorkee"],
  Delhi: ["New Delhi"],
  Karnataka: ["Bengaluru"],
  "Tamil Nadu": ["Chennai"],
  Telangana: ["Hyderabad"],
  "West Bengal": ["Kolkata"],
  "Madhya Pradesh": ["Indore"],
};

const STORAGE_KEY = "ds_sf_tada_state_city_mock_v8";

export interface MockStateEntry {
  name: string;
  status: "active" | "inactive";
  remarks: string;
  updatedBy: string;
  updatedAt: string;
}

export interface MockCityEntry {
  state: string;
  city: string;
  status: "active" | "inactive";
  remarks: string;
  updatedBy: string;
  updatedAt: string;
}

interface MockStore {
  states: MockStateEntry[];
  cities: MockCityEntry[];
}

function cityKey(state: string, city: string): string {
  return `${state.trim().toLowerCase()}|${city.trim().toLowerCase()}`;
}

function stampState(entry: Omit<MockStateEntry, "updatedBy" | "updatedAt">): MockStateEntry {
  return { ...entry, updatedBy: CURRENT_USER, updatedAt: policyToday() };
}

function stampCity(entry: Omit<MockCityEntry, "updatedBy" | "updatedAt">): MockCityEntry {
  return { ...entry, updatedBy: CURRENT_USER, updatedAt: policyToday() };
}

function buildInitialStore(): MockStore {
  const states: MockStateEntry[] = Object.keys(STATE_CITY_MOCK_SEED).map((name) =>
    stampState({ name, status: "active", remarks: "" }),
  );
  const cities: MockCityEntry[] = [];
  for (const [state, cityList] of Object.entries(STATE_CITY_MOCK_SEED)) {
    for (const city of cityList) {
      cities.push(stampCity({ state, city, status: "active", remarks: "" }));
    }
  }
  return { states, cities };
}

export function loadMockStore(): MockStore {
  if (typeof window === "undefined") return buildInitialStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = buildInitialStore();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as MockStore;
  } catch {
    return buildInitialStore();
  }
}

export function saveMockStore(store: MockStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getMockStates(): MockStateEntry[] {
  return [...loadMockStore().states].sort((a, b) => a.name.localeCompare(b.name));
}

export function getActiveMockStateNames(): string[] {
  return getMockStates()
    .filter((s) => s.status === "active")
    .map((s) => s.name);
}

export function getMockStateByName(name: string): MockStateEntry | undefined {
  const n = name.trim().toLowerCase();
  return getMockStates().find((s) => s.name.toLowerCase() === n);
}

export function addMockState(
  name: string,
  status: "active" | "inactive" = "active",
  remarks = "",
): MockStateEntry {
  const trimmed = name.trim();
  const store = loadMockStore();
  const existing = store.states.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;
  const entry = stampState({ name: trimmed, status, remarks });
  store.states.push(entry);
  saveMockStore(store);
  return entry;
}

export function updateMockState(
  currentName: string,
  patch: { name?: string; status?: "active" | "inactive"; remarks?: string },
): { entry: MockStateEntry; renamedFrom?: string; renamedTo?: string } {
  const store = loadMockStore();
  const idx = store.states.findIndex((s) => s.name.toLowerCase() === currentName.trim().toLowerCase());
  if (idx < 0) throw new Error("State not found");
  const prev = store.states[idx];
  const newName = patch.name?.trim() || prev.name;
  const renamed = newName.toLowerCase() !== prev.name.toLowerCase();
  if (renamed) {
    const clash = store.states.some(
      (s, i) => i !== idx && s.name.toLowerCase() === newName.toLowerCase(),
    );
    if (clash) throw new Error("State name already exists");
    store.cities = store.cities.map((c) =>
      c.state.toLowerCase() === prev.name.toLowerCase() ? { ...c, state: newName } : c,
    );
  }
  const entry = stampState({
    name: newName,
    status: patch.status ?? prev.status,
    remarks: patch.remarks ?? prev.remarks,
  });
  store.states[idx] = entry;
  saveMockStore(store);
  return renamed
    ? { entry, renamedFrom: prev.name, renamedTo: newName }
    : { entry };
}

export function getCitiesForState(state: string): MockCityEntry[] {
  const n = state.trim().toLowerCase();
  return loadMockStore()
    .cities.filter((c) => c.state.toLowerCase() === n)
    .sort((a, b) => a.city.localeCompare(b.city));
}

export function getActiveCitiesForState(state: string): string[] {
  return getCitiesForState(state)
    .filter((c) => c.status === "active")
    .map((c) => c.city);
}

export function getMockCity(state: string, city: string): MockCityEntry | undefined {
  const key = cityKey(state, city);
  return getCitiesForState(state).find((c) => cityKey(c.state, c.city) === key);
}

export function addMockCity(
  state: string,
  city: string,
  status: "active" | "inactive" = "active",
  remarks = "",
): MockCityEntry {
  const trimmedState = state.trim();
  const trimmedCity = city.trim();
  const store = loadMockStore();
  const key = cityKey(trimmedState, trimmedCity);
  const existingIdx = store.cities.findIndex((c) => cityKey(c.state, c.city) === key);
  const entry = stampCity({ state: trimmedState, city: trimmedCity, status, remarks });
  if (existingIdx >= 0) {
    store.cities[existingIdx] = entry;
  } else {
    store.cities.push(entry);
  }
  saveMockStore(store);
  return entry;
}

export function updateMockCity(
  state: string,
  currentCity: string,
  patch: { city?: string; status?: "active" | "inactive"; remarks?: string },
): { entry: MockCityEntry; renamedFrom?: string; renamedTo?: string } {
  const store = loadMockStore();
  const key = cityKey(state, currentCity);
  const idx = store.cities.findIndex((c) => cityKey(c.state, c.city) === key);
  if (idx < 0) throw new Error("City not found");
  const prev = store.cities[idx];
  const newCity = patch.city?.trim() || prev.city;
  const renamed = newCity.toLowerCase() !== prev.city.toLowerCase();
  if (renamed) {
    const clash = store.cities.some(
      (c, i) => i !== idx && cityKey(c.state, c.city) === cityKey(prev.state, newCity),
    );
    if (clash) throw new Error("City name already exists in this state");
  }
  const entry = stampCity({
    state: prev.state,
    city: newCity,
    status: patch.status ?? prev.status,
    remarks: patch.remarks ?? prev.remarks,
  });
  store.cities[idx] = entry;
  saveMockStore(store);
  return renamed
    ? { entry, renamedFrom: prev.city, renamedTo: newCity }
    : { entry };
}

export function findMockCity(cityName: string, state?: string): MockCityEntry | undefined {
  const n = cityName.trim().toLowerCase();
  if (!n) return undefined;
  if (state) {
    return getCitiesForState(state).find((e) => e.city.toLowerCase() === n);
  }
  for (const s of getActiveMockStateNames()) {
    const hit = getCitiesForState(s).find((e) => e.city.toLowerCase() === n);
    if (hit) return hit;
  }
  return undefined;
}
