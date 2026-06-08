import { CURRENT_USER } from "@/lib/hr/config";
import { getRoleDisplayName, resolveRoleIdFromDesignation } from "../sales-force-policy/tada-policy-data";

export type HolidayType =
  | "National Holiday"
  | "State Holiday"
  | "Company Holiday"
  | "Territory Holiday";

export type ApplicableTo =
  | "All Sales Force"
  | "Specific State"
  | "Specific Territory"
  | "Specific Role";

export interface SfHoliday {
  id: number;
  holidayName: string;
  holidayDate: string;
  holidayType: HolidayType;
  applicableTo: ApplicableTo;
  state: string;
  territory: string;
  role: string;
  status: "active" | "inactive";
  remarks: string;
  updatedBy: string;
  updatedAt: string;
}

const STORAGE_KEY = "ds_hr_sf_holidays_v1";

export const HOLIDAY_TYPES: HolidayType[] = [
  "National Holiday",
  "State Holiday",
  "Company Holiday",
  "Territory Holiday",
];

export const APPLICABLE_TO_OPTIONS: ApplicableTo[] = [
  "All Sales Force",
  "Specific State",
  "Specific Territory",
  "Specific Role",
];

export const STATE_OPTIONS = ["Maharashtra", "Uttarakhand", "Karnataka", "Delhi"];
export const TERRITORY_OPTIONS = ["Pune HQ", "Mumbai", "Nagpur", "Aurangabad", "Dehradun"];

const SEED: SfHoliday[] = [
  {
    id: 1,
    holidayName: "Independence Day",
    holidayDate: "2026-08-15",
    holidayType: "National Holiday",
    applicableTo: "All Sales Force",
    state: "",
    territory: "",
    role: "",
    status: "active",
    remarks: "National holiday — all Sales Force",
    updatedBy: "Admin",
    updatedAt: "2026-01-10T10:00:00.000Z",
  },
  {
    id: 2,
    holidayName: "Republic Day",
    holidayDate: "2026-01-26",
    holidayType: "National Holiday",
    applicableTo: "All Sales Force",
    state: "",
    territory: "",
    role: "",
    status: "active",
    remarks: "",
    updatedBy: "Admin",
    updatedAt: "2026-01-10T10:00:00.000Z",
  },
  {
    id: 3,
    holidayName: "Uttarakhand Foundation Day",
    holidayDate: "2026-11-09",
    holidayType: "State Holiday",
    applicableTo: "Specific State",
    state: "Uttarakhand",
    territory: "",
    role: "",
    status: "active",
    remarks: "State holiday for Uttarakhand territory employees",
    updatedBy: "Admin",
    updatedAt: "2026-02-01T09:00:00.000Z",
  },
  {
    id: 4,
    holidayName: "Maharashtra Day",
    holidayDate: "2026-05-01",
    holidayType: "State Holiday",
    applicableTo: "Specific State",
    state: "Maharashtra",
    territory: "",
    role: "",
    status: "active",
    remarks: "",
    updatedBy: "Admin",
    updatedAt: "2026-01-10T10:00:00.000Z",
  },
];

export function loadSfHolidays(): SfHoliday[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as SfHoliday[];
  } catch {
    return SEED;
  }
}

export function saveSfHolidays(list: SfHoliday[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export interface SfEmployeeContext {
  employeeId: number;
  state: string;
  territory: string;
  roleName: string;
  roleId: number | null;
}

export function holidayAppliesToEmployee(holiday: SfHoliday, emp: SfEmployeeContext): boolean {
  if (holiday.status !== "active") return false;
  switch (holiday.applicableTo) {
    case "All Sales Force":
      return true;
    case "Specific State":
      return !!holiday.state && emp.state === holiday.state;
    case "Specific Territory":
      return !!holiday.territory && emp.territory === holiday.territory;
    case "Specific Role":
      return !!holiday.role && (emp.roleName === holiday.role || getRoleDisplayName(emp.roleId ?? 0) === holiday.role);
    default:
      return false;
  }
}

export function getHolidaysForEmployeeOnDate(date: string, emp: SfEmployeeContext): SfHoliday[] {
  return loadSfHolidays().filter((h) => h.holidayDate === date && holidayAppliesToEmployee(h, emp));
}

export function isConfiguredHolidayDate(date: string, emp: SfEmployeeContext): boolean {
  return getHolidaysForEmployeeOnDate(date, emp).length > 0;
}

export function stampHoliday(id: number, patch: Partial<SfHoliday>, existing?: SfHoliday): SfHoliday {
  const ts = new Date().toISOString();
  return {
    id,
    holidayName: patch.holidayName ?? existing?.holidayName ?? "",
    holidayDate: patch.holidayDate ?? existing?.holidayDate ?? "",
    holidayType: patch.holidayType ?? existing?.holidayType ?? "National Holiday",
    applicableTo: patch.applicableTo ?? existing?.applicableTo ?? "All Sales Force",
    state: patch.state ?? existing?.state ?? "",
    territory: patch.territory ?? existing?.territory ?? "",
    role: patch.role ?? existing?.role ?? "",
    status: patch.status ?? existing?.status ?? "active",
    remarks: patch.remarks ?? existing?.remarks ?? "",
    updatedBy: CURRENT_USER,
    updatedAt: ts,
  };
}

export const HOLIDAY_AUDIT = [
  { at: "2026-06-01T10:00:00.000Z", user: "Admin", action: "Created", entity: "Independence Day" },
  { at: "2026-02-01T09:00:00.000Z", user: "Admin", action: "Updated", entity: "Uttarakhand Foundation Day" },
];
