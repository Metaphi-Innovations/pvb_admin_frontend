// ── Geography Master — shared types, seed data, storage helpers ───────────────

export type GeoLevel = "Zone" | "State" | "Region" | "Area" | "Territory" | "Locality" | "City";

export interface GeoNode {
  id: number;
  level: GeoLevel;
  name: string;
  code: string;
  parentId: number | null;
  pincode: string;
  status: "active" | "inactive";
  createdDate: string;
  updatedDate: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
export const LEVELS: GeoLevel[] = ["Zone", "State", "Region", "Area", "Territory", "Locality", "City"];

export const LEVEL_INDEX: Record<GeoLevel, number> = {
  Zone: 0, State: 1, Region: 2, Area: 3, Territory: 4, Locality: 5, City: 6,
};

export const PARENT_LEVEL: Record<GeoLevel, GeoLevel | null> = {
  Zone: null, State: "Zone", Region: "State",
  Area: "Region", Territory: "Area", Locality: "Territory", City: "Locality",
};

export const CHILD_LEVEL: Record<GeoLevel, GeoLevel | null> = {
  Zone: "State", State: "Region", Region: "Area",
  Area: "Territory", Territory: "Locality", Locality: "City", City: null,
};

// ── Seed data ─────────────────────────────────────────────────────────────────
export const SEED_NODES: GeoNode[] = [
  // Zones
  { id: 1,  level: "Zone",      name: "West Zone",              code: "WZ",  parentId: null, pincode: "", status: "active", createdDate: "2024-01-01", updatedDate: "2024-01-01" },
  { id: 2,  level: "Zone",      name: "South Zone",             code: "SZ",  parentId: null, pincode: "", status: "active", createdDate: "2024-01-01", updatedDate: "2024-01-01" },
  // States
  { id: 3,  level: "State",     name: "Maharashtra",            code: "MH",  parentId: 1,    pincode: "", status: "active", createdDate: "2024-01-01", updatedDate: "2024-01-01" },
  { id: 4,  level: "State",     name: "Gujarat",                code: "GJ",  parentId: 1,    pincode: "", status: "active", createdDate: "2024-01-01", updatedDate: "2024-01-01" },
  { id: 5,  level: "State",     name: "Karnataka",              code: "KA",  parentId: 2,    pincode: "", status: "active", createdDate: "2024-01-01", updatedDate: "2024-01-01" },
  { id: 6,  level: "State",     name: "Tamil Nadu",             code: "TN",  parentId: 2,    pincode: "", status: "active", createdDate: "2024-01-01", updatedDate: "2024-01-01" },
  // Regions
  { id: 7,  level: "Region",    name: "Mumbai Region",          code: "",    parentId: 3,    pincode: "", status: "active", createdDate: "2024-01-02", updatedDate: "2024-01-02" },
  { id: 8,  level: "Region",    name: "Pune Region",            code: "",    parentId: 3,    pincode: "", status: "active", createdDate: "2024-01-02", updatedDate: "2024-01-02" },
  { id: 9,  level: "Region",    name: "Ahmedabad Region",       code: "",    parentId: 4,    pincode: "", status: "active", createdDate: "2024-01-02", updatedDate: "2024-01-02" },
  { id: 10, level: "Region",    name: "Surat Region",           code: "",    parentId: 4,    pincode: "", status: "active", createdDate: "2024-01-02", updatedDate: "2024-01-02" },
  { id: 11, level: "Region",    name: "Bangalore Region",       code: "",    parentId: 5,    pincode: "", status: "active", createdDate: "2024-01-02", updatedDate: "2024-01-02" },
  { id: 12, level: "Region",    name: "Mysore Region",          code: "",    parentId: 5,    pincode: "", status: "active", createdDate: "2024-01-02", updatedDate: "2024-01-02" },
  { id: 13, level: "Region",    name: "Chennai Region",         code: "",    parentId: 6,    pincode: "", status: "active", createdDate: "2024-01-02", updatedDate: "2024-01-02" },
  { id: 14, level: "Region",    name: "Coimbatore Region",      code: "",    parentId: 6,    pincode: "", status: "active", createdDate: "2024-01-02", updatedDate: "2024-01-02" },
  // Areas
  { id: 15, level: "Area",      name: "Mumbai Central Area",    code: "",    parentId: 7,    pincode: "", status: "active", createdDate: "2024-01-03", updatedDate: "2024-01-03" },
  { id: 16, level: "Area",      name: "Mumbai North Area",      code: "",    parentId: 7,    pincode: "", status: "active", createdDate: "2024-01-03", updatedDate: "2024-01-03" },
  { id: 17, level: "Area",      name: "Mumbai South Area",      code: "",    parentId: 7,    pincode: "", status: "active", createdDate: "2024-01-03", updatedDate: "2024-01-03" },
  { id: 18, level: "Area",      name: "Pune Central Area",      code: "",    parentId: 8,    pincode: "", status: "active", createdDate: "2024-01-03", updatedDate: "2024-01-03" },
  { id: 19, level: "Area",      name: "Bangalore East Area",    code: "",    parentId: 11,   pincode: "", status: "active", createdDate: "2024-01-03", updatedDate: "2024-01-03" },
  { id: 20, level: "Area",      name: "Bangalore West Area",    code: "",    parentId: 11,   pincode: "", status: "active", createdDate: "2024-01-03", updatedDate: "2024-01-03" },
  { id: 21, level: "Area",      name: "Chennai Central Area",   code: "",    parentId: 13,   pincode: "", status: "active", createdDate: "2024-01-03", updatedDate: "2024-01-03" },
  { id: 22, level: "Area",      name: "Chennai South Area",     code: "",    parentId: 13,   pincode: "", status: "active", createdDate: "2024-01-03", updatedDate: "2024-01-03" },
  // Territories
  { id: 23, level: "Territory", name: "Dadar-Parel Territory",    code: "",  parentId: 15,   pincode: "", status: "active", createdDate: "2024-01-04", updatedDate: "2024-01-04" },
  { id: 24, level: "Territory", name: "Matunga Territory",        code: "",  parentId: 15,   pincode: "", status: "active", createdDate: "2024-01-04", updatedDate: "2024-01-04" },
  { id: 25, level: "Territory", name: "Borivali-Kandivali Terr.", code: "",  parentId: 16,   pincode: "", status: "active", createdDate: "2024-01-04", updatedDate: "2024-01-04" },
  { id: 26, level: "Territory", name: "Malad Territory",          code: "",  parentId: 16,   pincode: "", status: "active", createdDate: "2024-01-04", updatedDate: "2024-01-04" },
  { id: 27, level: "Territory", name: "Indiranagar Territory",    code: "",  parentId: 19,   pincode: "", status: "active", createdDate: "2024-01-04", updatedDate: "2024-01-04" },
  { id: 28, level: "Territory", name: "Whitefield Territory",     code: "",  parentId: 19,   pincode: "", status: "active", createdDate: "2024-01-04", updatedDate: "2024-01-04" },
  { id: 29, level: "Territory", name: "T. Nagar Territory",       code: "",  parentId: 21,   pincode: "", status: "active", createdDate: "2024-01-04", updatedDate: "2024-01-04" },
  { id: 30, level: "Territory", name: "Nungambakkam Territory",   code: "",  parentId: 21,   pincode: "", status: "active", createdDate: "2024-01-04", updatedDate: "2024-01-04" },
  // Localities
  { id: 31, level: "Locality",  name: "Dadar Locality",        code: "",  parentId: 23,  pincode: "", status: "active", createdDate: "2024-01-05", updatedDate: "2024-01-05" },
  { id: 32, level: "Locality",  name: "Parel Locality",        code: "",  parentId: 23,  pincode: "", status: "active", createdDate: "2024-01-05", updatedDate: "2024-01-05" },
  { id: 33, level: "Locality",  name: "Borivali East Locality",code: "",  parentId: 25,  pincode: "", status: "active", createdDate: "2024-01-05", updatedDate: "2024-01-05" },
  { id: 34, level: "Locality",  name: "Indiranagar Locality",  code: "",  parentId: 27,  pincode: "", status: "active", createdDate: "2024-01-05", updatedDate: "2024-01-05" },
  { id: 35, level: "Locality",  name: "T. Nagar Locality",     code: "",  parentId: 29,  pincode: "", status: "active", createdDate: "2024-01-05", updatedDate: "2024-01-05" },
  // Cities
  { id: 36, level: "City",      name: "Dadar",         code: "",  parentId: 31,  pincode: "400014", status: "active", createdDate: "2024-01-06", updatedDate: "2024-01-06" },
  { id: 37, level: "City",      name: "Parel",         code: "",  parentId: 32,  pincode: "400012", status: "active", createdDate: "2024-01-06", updatedDate: "2024-01-06" },
  { id: 38, level: "City",      name: "Borivali East", code: "",  parentId: 33,  pincode: "400066", status: "active", createdDate: "2024-01-06", updatedDate: "2024-01-06" },
  { id: 39, level: "City",      name: "Indiranagar",   code: "",  parentId: 34,  pincode: "560038", status: "active", createdDate: "2024-01-06", updatedDate: "2024-01-06" },
  { id: 40, level: "City",      name: "T. Nagar",      code: "",  parentId: 35,  pincode: "600017", status: "active", createdDate: "2024-01-06", updatedDate: "2024-01-06" },
];

// ── localStorage helpers ──────────────────────────────────────────────────────
const GEO_KEY = "ds_geo_nodes";

export function loadGeoNodes(): GeoNode[] {
  if (typeof window === "undefined") return [...SEED_NODES];
  try {
    const raw = localStorage.getItem(GEO_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GeoNode[];
      // If stored data has no Locality nodes, it's from the old 6-level hierarchy — reset to seed
      const hasLocality = parsed.some(n => n.level === "Locality");
      if (!hasLocality) {
        localStorage.setItem(GEO_KEY, JSON.stringify(SEED_NODES));
        return [...SEED_NODES];
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return [...SEED_NODES];
}

export function saveGeoNodes(nodes: GeoNode[]): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(GEO_KEY, JSON.stringify(nodes)); } catch { /* ignore */ }
}

// ── Utility helpers ───────────────────────────────────────────────────────────
export function nextGeoId(nodes: GeoNode[]): number {
  return Math.max(0, ...nodes.map(n => n.id)) + 1;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns [root → ... → node] inclusive */
export function getAncestorPath(node: GeoNode, nodes: GeoNode[]): GeoNode[] {
  const path: GeoNode[] = [];
  let cur: GeoNode | undefined = node;
  while (cur) {
    path.unshift(cur);
    if (cur.parentId === null) break;
    cur = nodes.find(n => n.id === cur!.parentId);
  }
  return path;
}

/** Direct children only */
export function getChildren(nodeId: number, nodes: GeoNode[]): GeoNode[] {
  return nodes.filter(n => n.parentId === nodeId);
}

/** True if any descendant at any depth is active */
export function hasActiveDescendants(nodeId: number, nodes: GeoNode[]): boolean {
  for (const child of nodes.filter(n => n.parentId === nodeId)) {
    if (child.status === "active") return true;
    if (hasActiveDescendants(child.id, nodes)) return true;
  }
  return false;
}
