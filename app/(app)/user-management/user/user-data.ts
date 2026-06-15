export interface UserRecord {
  id: number;
  employeeId: string;
  fullName: string;
  email: string;
  mobile: string;
  department: string;
  role: string;
  reportingManager: string;
  stateAccess: string[];
  territoryAccess: string[];
  status: string;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

const STORAGE_KEY = "ds_user_management_users_v1";

export const USER_SEED: UserRecord[] = [
  {
    id: 1,
    employeeId: "EMP-001",
    fullName: "Rajesh Kumar",
    email: "rajesh@dharitrisutra.com",
    mobile: "9876543210",
    department: "Sales",
    role: "Manager",
    reportingManager: "Admin",
    stateAccess: ["Maharashtra", "Gujarat"],
    territoryAccess: ["Mumbai", "Pune"],
    status: "active",
    createdBy: "System",
    createdDate: "2024-01-10",
    updatedBy: "System",
    updatedDate: "2024-01-10",
  },
  {
    id: 2,
    employeeId: "EMP-002",
    fullName: "Priya Sharma",
    email: "priya@dharitrisutra.com",
    mobile: "9876543211",
    department: "HR",
    role: "Admin",
    reportingManager: "CEO",
    stateAccess: ["All States"],
    territoryAccess: ["All Territories"],
    status: "active",
    createdBy: "System",
    createdDate: "2024-01-10",
    updatedBy: "System",
    updatedDate: "2024-01-10",
  },
];

export function loadUsers(): UserRecord[] {
  if (typeof window === "undefined") return USER_SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(USER_SEED));
      return USER_SEED;
    }
    return JSON.parse(raw) as UserRecord[];
  } catch {
    return USER_SEED;
  }
}

export function saveUsers(list: UserRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getUserById(id: number): UserRecord | undefined {
  return loadUsers().find((u) => u.id === id);
}
