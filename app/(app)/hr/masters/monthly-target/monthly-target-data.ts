import { CURRENT_USER } from "@/lib/hr/config";
import { getHrEmployeeById, loadHrEmployees } from "../../employees/employee-master-data";

export type TargetType = "amount" | "quantity";
export type TargetStatus = "active" | "inactive";

export interface MonthlyTarget {
  id: number;
  month: number;
  year: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  targetType: TargetType;
  targetValue: number;
  remarks: string;
  status: TargetStatus;
  createdBy: string;
  updatedBy: string;
}

export interface MonthlyTargetFormValues {
  month: number;
  year: number;
  employeeId: number | null;
  targetType: TargetType;
  targetValue: number;
  remarks: string;
  status: TargetStatus;
}

const STORAGE_KEY = "ds_hr_monthly_target_v1";

export const DEFAULT_TARGET_FORM: MonthlyTargetFormValues = {
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  employeeId: null,
  targetType: "amount",
  targetValue: 0,
  remarks: "",
  status: "active",
};

const SEED: MonthlyTarget[] = [
  {
    id: 1,
    month: 6,
    year: 2025,
    employeeId: 1,
    employeeCode: "EMP-0001",
    employeeName: "Rahul Sharma",
    targetType: "amount",
    targetValue: 500000,
    remarks: "Q2 sales target",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
  },
  {
    id: 2,
    month: 6,
    year: 2025,
    employeeId: 3,
    employeeCode: "EMP-0003",
    employeeName: "Amit Deshmukh",
    targetType: "quantity",
    targetValue: 1200,
    remarks: "Field visits",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
  },
];

export function loadMonthlyTargets(): MonthlyTarget[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as MonthlyTarget[];
  } catch {
    return SEED;
  }
}

export function saveMonthlyTargets(list: MonthlyTarget[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getMonthlyTargetById(id: number): MonthlyTarget | undefined {
  return loadMonthlyTargets().find((t) => t.id === id);
}

export function monthLabel(month: number): string {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[month - 1] ?? String(month);
}

export function validateTargetForm(f: MonthlyTargetFormValues): string | null {
  if (!f.employeeId) return "Employee is required.";
  if (!f.month || f.month < 1 || f.month > 12) return "Valid month is required.";
  if (!f.year || f.year < 2000) return "Valid year is required.";
  if (f.targetValue <= 0) return "Target value must be greater than zero.";
  return null;
}

export function formToTarget(f: MonthlyTargetFormValues, id: number, existing?: MonthlyTarget): MonthlyTarget {
  const emp = f.employeeId ? getHrEmployeeById(f.employeeId) : undefined;
  return {
    id,
    month: f.month,
    year: f.year,
    employeeId: f.employeeId!,
    employeeCode: emp?.employeeCode ?? "",
    employeeName: emp?.employeeName ?? "",
    targetType: f.targetType,
    targetValue: f.targetValue,
    remarks: f.remarks.trim(),
    status: f.status,
    createdBy: existing?.createdBy ?? CURRENT_USER,
    updatedBy: CURRENT_USER,
  };
}

export function targetToForm(t: MonthlyTarget): MonthlyTargetFormValues {
  return {
    month: t.month,
    year: t.year,
    employeeId: t.employeeId,
    targetType: t.targetType,
    targetValue: t.targetValue,
    remarks: t.remarks,
    status: t.status,
  };
}

export function getEmployeeOptions() {
  return loadHrEmployees().filter((e) => e.status === "active");
}
