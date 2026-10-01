import { CURRENT_USER } from "@/lib/hr/config";
import { getRoleDisplayName } from "../sales-force-policy/tada-policy-data";
import type { SfEmployeeContext } from "./sf-holiday-data";

export type WeekOffApplicableTo =
  | "All Sales Force"
  | "Specific State"
  | "Specific Territory"
  | "Specific Role";

export type WeekDayName =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export type WeekOffDayOption = WeekDayName | "Second Saturday";

export interface SfWeekOffRule {
  id: number;
  ruleName: string;
  applicableTo: WeekOffApplicableTo;
  state: string;
  territory: string;
  role: string;
  weekOffDays: WeekOffDayOption[];
  effectiveFrom: string;
  effectiveTo: string;
  status: "active" | "inactive";
  remarks: string;
  updatedBy: string;
  updatedAt: string;
}

const STORAGE_KEY = "ds_hr_sf_weekoff_v1";

export const WEEK_DAY_OPTIONS: WeekDayName[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const WEEK_OFF_DAY_OPTIONS: WeekOffDayOption[] = [
  ...WEEK_DAY_OPTIONS,
  "Second Saturday",
];

export const WEEK_OFF_APPLICABLE: WeekOffApplicableTo[] = [
  "All Sales Force",
  "Specific State",
  "Specific Territory",
  "Specific Role",
];

export const WEEKOFF_TERRITORY_OPTIONS = [
  "Pune HQ",
  "Mumbai",
  "Nagpur",
  "Aurangabad",
  "Dehradun",
  "Gujarat West",
];

const DAY_INDEX: Record<WeekDayName, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const SEED: SfWeekOffRule[] = [
  {
    id: 1,
    ruleName: "Standard Sunday Off",
    applicableTo: "All Sales Force",
    state: "",
    territory: "",
    role: "",
    weekOffDays: ["Sunday"],
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    status: "active",
    remarks: "All Sales Force employees — Sunday week off",
    updatedBy: "Admin",
    updatedAt: "2026-01-10T10:00:00.000Z",
  },
  {
    id: 2,
    ruleName: "Gujarat West — Sunday + 2nd Saturday",
    applicableTo: "Specific Territory",
    state: "",
    territory: "Gujarat West",
    role: "",
    weekOffDays: ["Sunday", "Second Saturday"],
    effectiveFrom: "2026-01-01",
    effectiveTo: "",
    status: "active",
    remarks: "Territory-specific week off pattern",
    updatedBy: "Admin",
    updatedAt: "2026-02-01T09:00:00.000Z",
  },
];

export function loadSfWeekOffRules(): SfWeekOffRule[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as SfWeekOffRule[];
  } catch {
    return SEED;
  }
}

export function saveSfWeekOffRules(list: SfWeekOffRule[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function isRuleEffective(rule: SfWeekOffRule, date: string): boolean {
  if (rule.status !== "active") return false;
  if (rule.effectiveFrom && date < rule.effectiveFrom) return false;
  if (rule.effectiveTo && date > rule.effectiveTo) return false;
  return true;
}

export function weekOffRuleAppliesToEmployee(rule: SfWeekOffRule, emp: SfEmployeeContext): boolean {
  switch (rule.applicableTo) {
    case "All Sales Force":
      return true;
    case "Specific State":
      return !!rule.state && emp.state === rule.state;
    case "Specific Territory":
      return !!rule.territory && emp.territory === rule.territory;
    case "Specific Role":
      return !!rule.role && (emp.roleName === rule.role || getRoleDisplayName(emp.roleId ?? 0) === rule.role);
    default:
      return false;
  }
}

function isSecondSaturday(date: string): boolean {
  const d = new Date(date + "T12:00:00");
  if (d.getDay() !== 6) return false;
  return d.getDate() >= 8 && d.getDate() <= 14;
}

function matchesWeekOffDay(date: string, option: WeekOffDayOption): boolean {
  if (option === "Second Saturday") return isSecondSaturday(date);
  const d = new Date(date + "T12:00:00");
  return d.getDay() === DAY_INDEX[option];
}

export function getWeekOffRuleForEmployeeOnDate(
  date: string,
  emp: SfEmployeeContext,
): SfWeekOffRule | undefined {
  return loadSfWeekOffRules().find(
    (rule) =>
      isRuleEffective(rule, date) &&
      weekOffRuleAppliesToEmployee(rule, emp) &&
      rule.weekOffDays.some((day) => matchesWeekOffDay(date, day)),
  );
}

export function stampWeekOffRule(
  id: number,
  patch: Partial<SfWeekOffRule>,
  existing?: SfWeekOffRule,
): SfWeekOffRule {
  const ts = new Date().toISOString();
  return {
    id,
    ruleName: patch.ruleName ?? existing?.ruleName ?? "",
    applicableTo: patch.applicableTo ?? existing?.applicableTo ?? "All Sales Force",
    state: patch.state ?? existing?.state ?? "",
    territory: patch.territory ?? existing?.territory ?? "",
    role: patch.role ?? existing?.role ?? "",
    weekOffDays: patch.weekOffDays ?? existing?.weekOffDays ?? ["Sunday"],
    effectiveFrom: patch.effectiveFrom ?? existing?.effectiveFrom ?? "",
    effectiveTo: patch.effectiveTo ?? existing?.effectiveTo ?? "",
    status: patch.status ?? existing?.status ?? "active",
    remarks: patch.remarks ?? existing?.remarks ?? "",
    updatedBy: CURRENT_USER,
    updatedAt: ts,
  };
}

export const WEEKOFF_AUDIT = [
  { at: "2026-01-10T10:00:00.000Z", user: "Admin", action: "Created", entity: "Standard Sunday Off" },
  { at: "2026-02-01T09:00:00.000Z", user: "Admin", action: "Created", entity: "Gujarat West — Sunday + 2nd Saturday" },
];
