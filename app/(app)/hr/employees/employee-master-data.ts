import { CURRENT_USER } from "@/lib/hr/config";

export type EmployeeRecordStatus = "active" | "inactive";
export type EmployeeType = "permanent" | "contract" | "intern";
export type EmploymentStatus = "active" | "probation" | "notice" | "resigned";

export interface HrEmployee {
  id: number;
  employeeCode: string;
  employeeName: string;
  mobileNumber: string;
  emailId: string;
  department: string;
  designation: string;
  reportingManagerId: number | null;
  reportingManagerName: string;
  branch: string;
  employeeType: EmployeeType;
  employmentStatus: EmploymentStatus;
  dateOfJoining: string;
  status: EmployeeRecordStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrEmployeeFormValues {
  employeeName: string;
  mobileCountryCode: string;
  mobileNumber: string;
  emailId: string;
  department: string;
  designation: string;
  reportingManagerId: number | null;
  branch: string;
  employeeType: EmployeeType;
  employmentStatus: EmploymentStatus;
  dateOfJoining: string;
  status: EmployeeRecordStatus;
}

const STORAGE_KEY = "ds_hr_employee_master_v1";

export const DEFAULT_EMPLOYEE_FORM: HrEmployeeFormValues = {
  employeeName: "",
  mobileCountryCode: "+91",
  mobileNumber: "",
  emailId: "",
  department: "",
  designation: "",
  reportingManagerId: null,
  branch: "hq-pune",
  employeeType: "permanent",
  employmentStatus: "active",
  dateOfJoining: "",
  status: "active",
};

const SEED: HrEmployee[] = [
  {
    id: 1,
    employeeCode: "EMP-0001",
    employeeName: "Rahul Sharma",
    mobileNumber: "9876543210",
    emailId: "rahul.sharma@company.com",
    department: "Sales Force",
    designation: "Area Sales Manager (ASM)",
    reportingManagerId: null,
    reportingManagerName: "Vikram Mehta (ZSM)",
    branch: "hq-pune",
    employeeType: "permanent",
    employmentStatus: "active",
    dateOfJoining: "2022-04-01",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2022-04-01",
    updatedAt: "2022-04-01",
  },
  {
    id: 2,
    employeeCode: "EMP-0002",
    employeeName: "Vikram Mehta",
    mobileNumber: "9123456780",
    emailId: "vikram.mehta@company.com",
    department: "Sales Force",
    designation: "Zonal Sales Manager (ZSM)",
    reportingManagerId: null,
    reportingManagerName: "—",
    branch: "branch-mumbai",
    employeeType: "permanent",
    employmentStatus: "active",
    dateOfJoining: "2020-01-15",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2020-01-15",
    updatedAt: "2020-01-15",
  },
  {
    id: 3,
    employeeCode: "EMP-0003",
    employeeName: "Amit Deshmukh",
    mobileNumber: "9988776655",
    emailId: "amit.d@company.com",
    department: "Sales Force",
    designation: "Territory Manager (TM)",
    reportingManagerId: 1,
    reportingManagerName: "Rahul Sharma",
    branch: "branch-nagpur",
    employeeType: "contract",
    employmentStatus: "probation",
    dateOfJoining: "2024-06-01",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2024-06-01",
    updatedAt: "2024-06-01",
  },
  {
    id: 4,
    employeeCode: "EMP-0004",
    employeeName: "Sneha Patil",
    mobileNumber: "9876512345",
    emailId: "sneha.p@company.com",
    department: "Sales Force",
    designation: "Key Account Manager (KAM)",
    reportingManagerId: 2,
    reportingManagerName: "Vikram Mehta",
    branch: "branch-mumbai",
    employeeType: "permanent",
    employmentStatus: "active",
    dateOfJoining: "2023-03-10",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2023-03-10",
    updatedAt: "2023-03-10",
  },
  {
    id: 5,
    employeeCode: "EMP-0005",
    employeeName: "Karan Joshi",
    mobileNumber: "9123456700",
    emailId: "karan.j@company.com",
    department: "Sales Force",
    designation: "Intern",
    reportingManagerId: 3,
    reportingManagerName: "Amit Deshmukh",
    branch: "branch-nagpur",
    employeeType: "intern",
    employmentStatus: "active",
    dateOfJoining: "2026-01-05",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-01-05",
    updatedAt: "2026-01-05",
  },
];

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadHrEmployees(): HrEmployee[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as HrEmployee[];
  } catch {
    return SEED;
  }
}

export function saveHrEmployees(list: HrEmployee[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getHrEmployeeById(id: number): HrEmployee | undefined {
  return loadHrEmployees().find((e) => e.id === id);
}

export function getActiveHrEmployees(): HrEmployee[] {
  return loadHrEmployees().filter((e) => e.status === "active");
}

export function generateEmployeeCode(): string {
  const list = loadHrEmployees();
  const max = list.reduce((m, e) => {
    const n = parseInt(e.employeeCode.replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `EMP-${String(max + 1).padStart(4, "0")}`;
}

export function validateEmployeeForm(f: HrEmployeeFormValues): string | null {
  if (!f.employeeName.trim()) return "Employee name is required.";
  const phoneErr = (() => {
    const digits = f.mobileNumber.replace(/\D/g, "");
    if (!digits) return "Mobile number is required.";
    if ((f.mobileCountryCode || "+91") === "+91" && !/^[6-9]\d{9}$/.test(digits)) {
      return "Enter a valid 10-digit mobile number.";
    }
    return null;
  })();
  if (phoneErr) return phoneErr;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.emailId.trim())) return "Enter a valid email.";
  if (!f.department) return "Department is required.";
  if (!f.designation.trim()) return "Designation is required.";
  if (!f.dateOfJoining) return "Date of joining is required.";
  return null;
}

export function formToEmployee(
  f: HrEmployeeFormValues,
  id: number,
  employeeCode: string,
  existing?: HrEmployee,
): HrEmployee {
  const now = todayStr();
  const mgr = f.reportingManagerId
    ? loadHrEmployees().find((e) => e.id === f.reportingManagerId)
    : undefined;
  return {
    id,
    employeeCode,
    employeeName: f.employeeName.trim(),
    mobileNumber: f.mobileNumber.trim(),
    emailId: f.emailId.trim(),
    department: f.department,
    designation: f.designation.trim(),
    reportingManagerId: f.reportingManagerId,
    reportingManagerName: mgr?.employeeName ?? "—",
    branch: f.branch,
    employeeType: f.employeeType,
    employmentStatus: f.employmentStatus,
    dateOfJoining: f.dateOfJoining,
    status: f.status,
    createdBy: existing?.createdBy ?? CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function employeeToForm(e: HrEmployee): HrEmployeeFormValues {
  return {
    employeeName: e.employeeName,
    mobileCountryCode: "+91",
    mobileNumber: e.mobileNumber,
    emailId: e.emailId,
    department: e.department,
    designation: e.designation,
    reportingManagerId: e.reportingManagerId,
    branch: e.branch,
    employeeType: e.employeeType,
    employmentStatus: e.employmentStatus,
    dateOfJoining: e.dateOfJoining,
    status: e.status,
  };
}
