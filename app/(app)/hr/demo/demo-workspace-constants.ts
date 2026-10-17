/** PVB HRMS Demo Workspace — synthetic data namespace (frontend only). */

export const DEMO_WORKSPACE_MARKER = "PVB Demo Workspace";
export const DEMO_WORKSPACE_MANIFEST_KEY = "ds_hr_demo_workspace_manifest_v1";
export const DEMO_EMPLOYEE_CODE_PREFIX = "PVBWS-E";
export const DEMO_EMPLOYEE_ID_BASE = 90001;
export const DEMO_CONFIRM_PHRASE = "SEED DEMO";
export const DEMO_WORKSPACE_HREF = "/hr/settings/demo-workspace";
export const DEMO_WORKSPACE_SEEDED_EVENT = "hr-demo-workspace-seeded";
export const DEMO_WORKSPACE_RESET_EVENT = "hr-demo-workspace-reset";

/**
 * Demo Workspace is for local/dev client demos only.
 * Enable in production builds only via NEXT_PUBLIC_ENABLE_HR_DEMO_WORKSPACE=true.
 */
export function isHrDemoWorkspaceEnabled(): boolean {
  if (typeof process === "undefined") return false;
  if (process.env.NEXT_PUBLIC_ENABLE_HR_DEMO_WORKSPACE === "true") return true;
  if (process.env.NEXT_PUBLIC_ENABLE_HR_DEMO_WORKSPACE === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export const DEMO_TARGETS = {
  employees: 50,
  travelRequests: 12,
  claims: 20,
  letters: 10,
  offboarding: 5,
  attendanceMonths: 3,
  payrollMonths: 3,
} as const;

/** Stable fictional first/last names for demo employees. */
export const DEMO_FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
  "Anaya", "Aadhya", "Diya", "Pari", "Myra", "Anika", "Sara", "Ira", "Aarohi", "Kiara",
  "Rohan", "Kabir", "Yash", "Dev", "Nikhil", "Rahul", "Amit", "Suresh", "Priya", "Neha",
  "Sneha", "Pooja", "Meera", "Kavya", "Isha", "Tanvi", "Ritu", "Nisha", "Deepak", "Vikram",
  "Sanjay", "Manoj", "Rajesh", "Anil", "Kiran", "Sonal", "Jyoti", "Ashwini", "Pranav", "Omkar",
] as const;

export const DEMO_LAST_NAMES = [
  "Patil", "Sharma", "Deshmukh", "Kulkarni", "Joshi", "Mehta", "Singh", "Nair", "Iyer", "Reddy",
  "Gupta", "Verma", "Khan", "Chopra", "Bansal", "Jain", "Shah", "More", "Gaikwad", "Pawar",
] as const;

export function isDemoEmployeeCode(code: string): boolean {
  return /^PVBWS-E\d{3}$/i.test((code || "").trim());
}

export function demoEmployeeCode(index1Based: number): string {
  return `${DEMO_EMPLOYEE_CODE_PREFIX}${String(index1Based).padStart(3, "0")}`;
}

export function demoEmployeeId(index1Based: number): number {
  return DEMO_EMPLOYEE_ID_BASE + index1Based - 1;
}

export function isoDaysAgo(days: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function isoDaysAhead(days: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isoMonthsAgo(months: number, from = new Date()): { year: number; month: number } {
  const d = new Date(from.getFullYear(), from.getMonth() - months, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}
