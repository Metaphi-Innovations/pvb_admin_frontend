export interface WarehouseLocation {
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

const STORAGE_KEY = "ds_masters_warehouses";

const SEED: WarehouseLocation[] = [
  {
    code: "WH-001",
    name: "Central Warehouse",
    address: "Plot 12, MIDC",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411019",
  },
  {
    code: "WH-002",
    name: "North Zone Hub",
    address: "Sector 22, Industrial",
    city: "Nagpur",
    state: "Maharashtra",
    pincode: "440018",
  },
  {
    code: "WH-003",
    name: "South Zone Depot",
    address: "NH-44 Bypass",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500032",
  },
  {
    code: "WH-004",
    name: "East Zone Depot",
    address: "Near Bhubaneswar Ring",
    city: "Bhubaneswar",
    state: "Odisha",
    pincode: "751002",
  },
];

export function loadWarehouseLocations(): WarehouseLocation[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED;
    return parsed
      .map((x) => ({
        code: String(x.code ?? ""),
        name: String(x.name ?? ""),
        address: String(x.address ?? ""),
        city: String(x.city ?? ""),
        state: String(x.state ?? ""),
        pincode: String(x.pincode ?? ""),
      }))
      .filter((x) => x.code && x.name);
  } catch {
    return SEED;
  }
}
