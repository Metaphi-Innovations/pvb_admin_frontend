// Warehouse Master - data types, seed data & localStorage helpers

export type WarehouseStatus = "active" | "inactive" | "under_maintenance" | "closed";
export type WarehouseType = "Central Warehouse" | "Regional Warehouse" | "State Warehouse" | "Distributor Warehouse" | "Transit Warehouse" | "Cold Storage Warehouse";
export type OperatedBy = "C&F Agent" | "Self";

export interface WarehouseMaster {
  id: number;
  warehouseCode: string;       // Auto Generated, e.g. "WH-0001"
  warehouseName: string;
  warehouseType: WarehouseType;
  gstNumber: string;
  contactPerson: string;
  mobileNumber: string;
  emailAddress: string;
  address: string;             // Textarea
  state: string;
  district: string;
  city: string;
  pincode: string;
  capacity: number;            // Decimal
  manager: string;
  status: WarehouseStatus;
  operatedBy: OperatedBy;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Static dropdown options ───────────────────────────────────────
export const WAREHOUSE_TYPES: WarehouseType[] = [
  "Central Warehouse",
  "Regional Warehouse",
  "State Warehouse",
  "Distributor Warehouse",
  "Transit Warehouse",
  "Cold Storage Warehouse",
];

export const WAREHOUSE_STATUSES: { value: WarehouseStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "under_maintenance", label: "Under Maintenance" },
  { value: "closed", label: "Closed" },
];

export const OPERATED_BY_OPTIONS: OperatedBy[] = ["C&F Agent", "Self"];

export const STATE_OPTIONS = [
  "Maharashtra", "Gujarat", "Rajasthan", "Madhya Pradesh", "Karnataka",
  "Tamil Nadu", "Telangana", "Andhra Pradesh", "Uttar Pradesh", "Bihar",
  "West Bengal", "Odisha", "Punjab", "Haryana", "Kerala",
];

export const DISTRICT_OPTIONS: Record<string, string[]> = {
  "Maharashtra": ["Pune", "Mumbai", "Nagpur", "Nashik", "Aurangabad", "Kolhapur"],
  "Gujarat": ["Ahmedabad", "Surat", "Rajkot", "Vadodara", "Bhavnagar"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"],
  "Karnataka": ["Bangalore Urban", "Mysore", "Belgaum", "Hubli-Dharwad", "Mangalore"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"],
  "Telangana": ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Allahabad"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur", "Asansol"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"],
  "Haryana": ["Gurugram", "Faridabad", "Hisar", "Karnal", "Panipat"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"],
};

export const CITY_OPTIONS: Record<string, string[]> = {
  "Pune": ["Pune", "Pimpri-Chinchwad", "Hinjewadi"],
  "Mumbai": ["Mumbai", "Navi Mumbai", "Thane"],
  "Nagpur": ["Nagpur", "Kamptee"],
  "Ahmedabad": ["Ahmedabad", "Gandhinagar"],
  "Surat": ["Surat", "Navsari"],
  "Jaipur": ["Jaipur"],
  "Bhopal": ["Bhopal"],
  "Indore": ["Indore"],
  "Bangalore Urban": ["Bangalore", "Whitefield"],
  "Chennai": ["Chennai", "Ambattur"],
  "Hyderabad": ["Hyderabad", "Secunderabad"],
  "Visakhapatnam": ["Visakhapatnam"],
  "Lucknow": ["Lucknow"],
  "Patna": ["Patna"],
  "Kolkata": ["Kolkata", "Salt Lake"],
  "Bhubaneswar": ["Bhubaneswar"],
  "Ludhiana": ["Ludhiana"],
  "Gurugram": ["Gurugram"],
  "Thiruvananthapuram": ["Thiruvananthapuram"],
  "Kochi": ["Kochi", "Ernakulam"],
};

export const MANAGER_OPTIONS = [
  "Suresh Mehta", "Priya Kulkarni", "Raju Bhandari", "Anil Patil",
  "Mohan Sharma", "Kavya Reddy", "Ramesh Thakur", "Deepak Gupta",
  "Vinod Kumar", "Neha Singh",
];

export function getDistrictsForState(state: string): string[] {
  return DISTRICT_OPTIONS[state] ?? [];
}

export function getCitiesForDistrict(district: string): string[] {
  if (!district) return [];
  return CITY_OPTIONS[district] ?? [district];
}

// ─── Seed data ─────────────────────────────────────────────────────
const STORAGE_KEY = "ds_warehouse_masters";
const SEED_VERSION = 2;

const SEED: WarehouseMaster[] = [
  {
    id: 1, warehouseCode: "WH-0001", warehouseName: "Central Distribution Hub",
    warehouseType: "Central Warehouse", gstNumber: "27AABCT1234F1ZA",
    contactPerson: "Suresh Mehta", mobileNumber: "9876543210", emailAddress: "suresh@pvb.com",
    address: "Plot 12, MIDC Industrial Area, Hadapsar", state: "Maharashtra", district: "Pune", city: "Pune",
    pincode: "411028", capacity: 50000, manager: "Suresh Mehta", status: "active", operatedBy: "Self",
    createdBy: "Admin", createdDate: "2026-01-10", updatedBy: "Admin", updatedDate: "2026-01-10",
  },
  {
    id: 2, warehouseCode: "WH-0002", warehouseName: "North Zone Regional Store",
    warehouseType: "Regional Warehouse", gstNumber: "27AABCT5678G2ZB",
    contactPerson: "Priya Kulkarni", mobileNumber: "9876543211", emailAddress: "priya@pvb.com",
    address: "Sector 22, Industrial Estate", state: "Maharashtra", district: "Nagpur", city: "Nagpur",
    pincode: "440018", capacity: 20000, manager: "Priya Kulkarni", status: "active", operatedBy: "Self",
    createdBy: "Admin", createdDate: "2026-01-15", updatedBy: "Admin", updatedDate: "2026-01-15",
  },
  {
    id: 3, warehouseCode: "WH-0003", warehouseName: "South Zone Depot",
    warehouseType: "State Warehouse", gstNumber: "36AABCT9012H3ZC",
    contactPerson: "Raju Bhandari", mobileNumber: "9876543212", emailAddress: "raju@pvb.com",
    address: "NH-44 Bypass Road, Near Outer Ring Road", state: "Telangana", district: "Hyderabad", city: "Hyderabad",
    pincode: "500032", capacity: 15000, manager: "Raju Bhandari", status: "active", operatedBy: "C&F Agent",
    createdBy: "Admin", createdDate: "2026-02-01", updatedBy: "Admin", updatedDate: "2026-02-01",
  },
  {
    id: 4, warehouseCode: "WH-0004", warehouseName: "East Zone Depot",
    warehouseType: "Regional Warehouse", gstNumber: "21AABCT3456I4ZD",
    contactPerson: "Anil Patil", mobileNumber: "9876543213", emailAddress: "anil@pvb.com",
    address: "Near Ring Road, Industrial Park", state: "Odisha", district: "Bhubaneswar", city: "Bhubaneswar",
    pincode: "751002", capacity: 12000, manager: "Anil Patil", status: "inactive", operatedBy: "C&F Agent",
    createdBy: "Admin", createdDate: "2026-02-05", updatedBy: "Admin", updatedDate: "2026-02-05",
  },
  {
    id: 5, warehouseCode: "WH-0005", warehouseName: "Gujarat Distribution Center",
    warehouseType: "Distributor Warehouse", gstNumber: "24AABCT7890J5ZE",
    contactPerson: "Mohan Sharma", mobileNumber: "9876543214", emailAddress: "mohan@pvb.com",
    address: "GIDC Estate, Phase 2, Naroda", state: "Gujarat", district: "Ahmedabad", city: "Ahmedabad",
    pincode: "382330", capacity: 18000, manager: "Mohan Sharma", status: "active", operatedBy: "Self",
    createdBy: "Admin", createdDate: "2026-02-10", updatedBy: "Admin", updatedDate: "2026-02-10",
  },
  {
    id: 6, warehouseCode: "WH-0006", warehouseName: "Mumbai Transit Point",
    warehouseType: "Transit Warehouse", gstNumber: "27AABCT2345K6ZF",
    contactPerson: "Kavya Reddy", mobileNumber: "9876543215", emailAddress: "kavya@pvb.com",
    address: "Bhiwandi Warehousing Complex, Unit 8", state: "Maharashtra", district: "Mumbai", city: "Thane",
    pincode: "421302", capacity: 8000, manager: "Kavya Reddy", status: "under_maintenance", operatedBy: "C&F Agent",
    createdBy: "Admin", createdDate: "2026-02-15", updatedBy: "Admin", updatedDate: "2026-03-20",
  },
  {
    id: 7, warehouseCode: "WH-0007", warehouseName: "Chennai Cold Storage",
    warehouseType: "Cold Storage Warehouse", gstNumber: "33AABCT6789L7ZG",
    contactPerson: "Ramesh Thakur", mobileNumber: "9876543216", emailAddress: "ramesh@pvb.com",
    address: "Ambattur Industrial Estate, Plot 45", state: "Tamil Nadu", district: "Chennai", city: "Ambattur",
    pincode: "600058", capacity: 5000, manager: "Ramesh Thakur", status: "closed", operatedBy: "Self",
    createdBy: "Admin", createdDate: "2026-03-01", updatedBy: "Admin", updatedDate: "2026-04-10",
  },
  {
    id: 8, warehouseCode: "WH-0008", warehouseName: "Jaipur State Warehouse",
    warehouseType: "State Warehouse", gstNumber: "08AABCT4567M8ZH",
    contactPerson: "Deepak Gupta", mobileNumber: "9876543217", emailAddress: "deepak@pvb.com",
    address: "Sitapura Industrial Area, Block C", state: "Rajasthan", district: "Jaipur", city: "Jaipur",
    pincode: "302022", capacity: 22000, manager: "Deepak Gupta", status: "active", operatedBy: "Self",
    createdBy: "Admin", createdDate: "2026-03-10", updatedBy: "Admin", updatedDate: "2026-03-10",
  },
];

export function loadWarehouses(): WarehouseMaster[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, data: SEED }));
      return SEED;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.version || parsed.version < SEED_VERSION) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, data: SEED }));
      return SEED;
    }
    return parsed.data as WarehouseMaster[];
  } catch {
    return SEED;
  }
}

export function saveWarehouses(records: WarehouseMaster[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, data: records }));
}

export function nextWarehouseId(records: WarehouseMaster[]): number {
  if (records.length === 0) return 1;
  return Math.max(...records.map(r => r.id)) + 1;
}

export function generateWarehouseCode(id: number): string {
  return `WH-${String(id).padStart(4, "0")}`;
}

export function formatStatus(status: WarehouseStatus): string {
  return WAREHOUSE_STATUSES.find(s => s.value === status)?.label ?? status;
}

export interface WarehouseLocation {
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export function loadWarehouseLocations(): WarehouseLocation[] {
  const warehouses = loadWarehouses();
  return warehouses.map(w => ({
    code: w.warehouseCode,
    name: w.warehouseName,
    address: w.address,
    city: w.city,
    state: w.state,
    pincode: w.pincode,
  }));
}

