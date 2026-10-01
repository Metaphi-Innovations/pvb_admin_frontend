import { CURRENT_USER } from "@/lib/hr/config";
import { buildDemoEmployee, DEMO_EMPLOYEE_CODE } from "./demo-employee";

export type EmployeeRecordStatus = "active" | "inactive";
export type EmployeeType = string;
export type EmploymentStatus = "active" | "probation" | "notice" | "resigned" | "terminated";

export type DocVerificationStatus =
  | "missing"
  | "uploaded"
  | "pending_verification"
  | "verified"
  | "rejected"
  | "expired";

export interface EmployeePersonalDetails {
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  bloodGroup: string;
  nationality: string;
  fatherName: string;
  motherName: string;
}

export interface EmployeeAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface EmployeeContactDetails {
  personalEmail: string;
  alternateMobile: string;
  currentAddress: EmployeeAddress;
  permanentSameAsCurrent: boolean;
  permanentAddress: EmployeeAddress;
}

export interface EmployeeEmergencyContact {
  contactName: string;
  relationship: string;
  mobileNumber: string;
  alternateNumber: string;
}

export interface EmployeeEmploymentExtra {
  probationEndDate: string;
  confirmationDate: string;
  workLocation: string;
}

export interface EmployeeBankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  bankBranch: string;
  accountType: string;
  bankProofName: string;
  verificationStatus: DocVerificationStatus | "";
}

export interface EmployeeGovernmentIds {
  pan: string;
  aadhaar: string;
  uan: string;
  /** Provident Fund number — employee-specific identifier for later statutory/payroll modules */
  pfNumber: string;
  esicNumber: string;
  passportNumber: string;
  passportExpiry: string;
  drivingLicenceNumber: string;
  drivingLicenceExpiry: string;
}

export interface EmployeeEducationRecord {
  id: string;
  qualification: string;
  specialization: string;
  institution: string;
  university: string;
  startYear: string;
  endYear: string;
  grade: string;
  certificateName: string;
}

export interface EmployeeExperienceRecord {
  id: string;
  employerName: string;
  designation: string;
  startDate: string;
  endDate: string;
  employmentType: string;
  reasonForLeaving: string;
  experienceLetterName: string;
  relievingLetterName: string;
}

export interface EmployeeDocumentRecord {
  id: string;
  documentType: string;
  /** Display name for UI / Documents table */
  documentName: string;
  documentNumber: string;
  fileName: string;
  uploadedDate: string;
  expiryDate: string;
  verificationStatus: DocVerificationStatus;
  verifiedBy: string;
  verifiedDate: string;
  comment: string;
}

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
  /** Optional profile extensions — empty by default; never seeded with fake data */
  personal?: EmployeePersonalDetails;
  contact?: EmployeeContactDetails;
  emergency?: EmployeeEmergencyContact;
  employmentExtra?: EmployeeEmploymentExtra;
  bank?: EmployeeBankDetails;
  governmentIds?: EmployeeGovernmentIds;
  education?: EmployeeEducationRecord[];
  experience?: EmployeeExperienceRecord[];
  documents?: EmployeeDocumentRecord[];
  /** Optional local preview only — not seeded; no upload backend */
  photoDataUrl?: string;
  /** UI-only profile summaries (demo / display). Not a workflow engine. */
  profileSummaries?: import("./demo-employee").EmployeeProfileSummaries;
}

export interface HrEmployeeFormValues {
  employeeCode: string;
  employeeName: string;
  mobileCountryCode: string;
  mobileNumber: string;
  emailId: string;
  personalEmail: string;
  photoDataUrl: string;
  department: string;
  designation: string;
  reportingManagerId: number | null;
  branch: string;
  employeeType: EmployeeType;
  employmentStatus: EmploymentStatus;
  dateOfJoining: string;
  /** Internal soft-active flag — not shown in employee UI; defaults to active on create */
  status: EmployeeRecordStatus;
}

export type HrEmployeeFormErrors = Partial<Record<keyof HrEmployeeFormValues, string>>;

const STORAGE_KEY = "ds_hr_employee_master_v1";

export const EMPTY_ADDRESS = (): EmployeeAddress => ({
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
});

export const EMPTY_PERSONAL = (): EmployeePersonalDetails => ({
  dateOfBirth: "",
  gender: "",
  maritalStatus: "",
  bloodGroup: "",
  nationality: "",
  fatherName: "",
  motherName: "",
});

export const EMPTY_CONTACT = (): EmployeeContactDetails => ({
  personalEmail: "",
  alternateMobile: "",
  currentAddress: EMPTY_ADDRESS(),
  permanentSameAsCurrent: true,
  permanentAddress: EMPTY_ADDRESS(),
});

export const EMPTY_EMERGENCY = (): EmployeeEmergencyContact => ({
  contactName: "",
  relationship: "",
  mobileNumber: "",
  alternateNumber: "",
});

export const EMPTY_EMPLOYMENT_EXTRA = (): EmployeeEmploymentExtra => ({
  probationEndDate: "",
  confirmationDate: "",
  workLocation: "",
});

export const EMPTY_BANK = (): EmployeeBankDetails => ({
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  bankBranch: "",
  accountType: "",
  bankProofName: "",
  verificationStatus: "",
});

export const EMPTY_GOVERNMENT_IDS = (): EmployeeGovernmentIds => ({
  pan: "",
  aadhaar: "",
  uan: "",
  pfNumber: "",
  esicNumber: "",
  passportNumber: "",
  passportExpiry: "",
  drivingLicenceNumber: "",
  drivingLicenceExpiry: "",
});

export const DEFAULT_EMPLOYEE_FORM: HrEmployeeFormValues = {
  employeeCode: "",
  employeeName: "",
  mobileCountryCode: "+91",
  mobileNumber: "",
  emailId: "",
  personalEmail: "",
  photoDataUrl: "",
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
  buildDemoEmployee(6),
];

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function newProfileRecordId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Ensure the UI-review demo employee exists and is fully populated once.
 * Does not overwrite a already-complete EMP-DEMO-001 (preserves local edits).
 * Does not modify other employees.
 */
function isCompleteDemoEmployee(e: HrEmployee): boolean {
  return !!(
    e.personal?.gender &&
    e.contact?.currentAddress?.line1 &&
    e.bank?.accountNumber &&
    e.governmentIds?.pan &&
    (e.education?.length ?? 0) >= 2 &&
    (e.experience?.length ?? 0) >= 2 &&
    (e.documents?.length ?? 0) >= 1 &&
    e.profileSummaries?.onboarding
  );
}

function ensureDemoEmployeePresent(list: HrEmployee[]): HrEmployee[] {
  const idx = list.findIndex((e) => e.employeeCode === DEMO_EMPLOYEE_CODE);
  if (idx >= 0) {
    if (isCompleteDemoEmployee(list[idx])) return list;
    const next = [...list];
    next[idx] = buildDemoEmployee(list[idx].id);
    return next;
  }
  const maxId = list.reduce((m, e) => Math.max(m, e.id), 0);
  return [...list, buildDemoEmployee(maxId + 1)];
}

export function loadHrEmployees(): HrEmployee[] {
  if (typeof window === "undefined") return ensureDemoEmployeePresent(SEED.map((e) => ({ ...e })));
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let list: HrEmployee[];
    if (!raw) {
      list = SEED.map((e) => ({ ...e }));
    } else {
      list = JSON.parse(raw) as HrEmployee[];
    }
    const ensured = ensureDemoEmployeePresent(list);
    // Persist when demo was missing or refreshed for UI review
    if (JSON.stringify(ensured) !== JSON.stringify(list)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ensured));
    }
    return ensured.map((e) => ({ ...e }));
  } catch {
    return ensureDemoEmployeePresent(SEED.map((e) => ({ ...e })));
  }
}

export function saveHrEmployees(list: HrEmployee[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function updateHrEmployee(id: number, patch: Partial<HrEmployee>): HrEmployee | undefined {
  const list = loadHrEmployees();
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return undefined;
  const next: HrEmployee = {
    ...list[idx],
    ...patch,
    id,
    updatedBy: CURRENT_USER,
    updatedAt: todayStr(),
  };
  list[idx] = next;
  saveHrEmployees(list);
  return next;
}

export function getHrEmployeeById(id: number): HrEmployee | undefined {
  return loadHrEmployees().find((e) => e.id === id);
}

export function getHrEmployeeByCode(code: string): HrEmployee | undefined {
  const key = code.trim().toLowerCase();
  if (!key) return undefined;
  return loadHrEmployees().find((e) => e.employeeCode.trim().toLowerCase() === key);
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

/** Case-insensitive uniqueness for business-facing employee codes. */
export function isEmployeeCodeUnique(code: string, excludeId?: number): boolean {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return false;
  return !loadHrEmployees().some(
    (e) => e.id !== excludeId && e.employeeCode.trim().toLowerCase() === normalized,
  );
}

/** Case-insensitive uniqueness for company email. */
export function isCompanyEmailUnique(email: string, excludeId?: number): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return !loadHrEmployees().some(
    (e) => e.id !== excludeId && e.emailId.trim().toLowerCase() === normalized,
  );
}

/** Essential fields shared by Add Employee create + full edit validation. */
function getEssentialEmployeeFormErrors(
  f: HrEmployeeFormValues,
  opts?: { excludeId?: number },
): HrEmployeeFormErrors {
  const e: HrEmployeeFormErrors = {};
  const code = f.employeeCode.trim();
  if (!code) e.employeeCode = "Employee code is required.";
  else if (!isEmployeeCodeUnique(code, opts?.excludeId)) {
    e.employeeCode = "Employee Code already exists.";
  }
  if (!f.employeeName.trim()) e.employeeName = "Employee name is required.";
  const digits = f.mobileNumber.replace(/\D/g, "");
  if (!digits) e.mobileNumber = "Mobile number is required.";
  else if ((f.mobileCountryCode || "+91") === "+91" && !/^[6-9]\d{9}$/.test(digits)) {
    e.mobileNumber = "Enter a valid 10-digit mobile number.";
  } else if ((f.mobileCountryCode || "+91") !== "+91" && digits.length < 6) {
    e.mobileNumber = "Enter a valid mobile number.";
  }
  if (!f.emailId.trim()) e.emailId = "Company email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.emailId.trim())) {
    e.emailId = "Enter a valid company email.";
  } else if (!isCompanyEmailUnique(f.emailId, opts?.excludeId)) {
    e.emailId = "Company Email already exists.";
  }
  if (f.personalEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.personalEmail.trim())) {
    e.personalEmail = "Enter a valid personal email.";
  }
  return e;
}

/**
 * Add Employee (create) validation — essential record only.
 * Branch/Department/Designation/DOJ may be completed later on the Employee Profile.
 */
export function getEmployeeCreateFormErrors(
  f: HrEmployeeFormValues,
): HrEmployeeFormErrors {
  return getEssentialEmployeeFormErrors(f);
}

/** Full master-field validation (Edit Employee / EmployeeMasterForm). */
export function getEmployeeFormErrors(
  f: HrEmployeeFormValues,
  opts?: { excludeId?: number },
): HrEmployeeFormErrors {
  const e = getEssentialEmployeeFormErrors(f, opts);
  if (!f.branch) e.branch = "Branch is required.";
  if (!f.department) e.department = "Department is required.";
  if (!f.designation.trim()) e.designation = "Designation is required.";
  if (!f.employeeType) e.employeeType = "Employee type is required.";
  if (!f.employmentStatus) e.employmentStatus = "Employment status is required.";
  if (!f.dateOfJoining) e.dateOfJoining = "Date of joining is required.";
  if (opts?.excludeId != null && f.reportingManagerId === opts.excludeId) {
    e.reportingManagerId = "An employee cannot report to themselves.";
  }
  return e;
}

export function validateEmployeeForm(
  f: HrEmployeeFormValues,
  opts?: { excludeId?: number },
): string | null {
  const errors = getEmployeeFormErrors(f, opts);
  const first = Object.values(errors)[0];
  return first ?? null;
}

export function formToEmployee(
  f: HrEmployeeFormValues,
  id: number,
  existing?: HrEmployee,
): HrEmployee {
  const now = todayStr();
  const mgr = f.reportingManagerId
    ? loadHrEmployees().find((e) => e.id === f.reportingManagerId)
    : undefined;
  const baseContact = existing?.contact ?? EMPTY_CONTACT();
  return {
    id,
    employeeCode: f.employeeCode.trim(),
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
    status: existing?.status ?? f.status ?? "active",
    createdBy: existing?.createdBy ?? CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    photoDataUrl: f.photoDataUrl || existing?.photoDataUrl || undefined,
    personal: existing?.personal,
    contact: {
      ...baseContact,
      personalEmail: f.personalEmail.trim() || baseContact.personalEmail,
    },
    emergency: existing?.emergency,
    employmentExtra: existing?.employmentExtra,
    bank: existing?.bank,
    governmentIds: existing?.governmentIds,
    education: existing?.education,
    experience: existing?.experience,
    documents: existing?.documents,
  };
}

export function employeeToForm(e: HrEmployee): HrEmployeeFormValues {
  return {
    employeeCode: e.employeeCode,
    employeeName: e.employeeName,
    mobileCountryCode: "+91",
    mobileNumber: e.mobileNumber,
    emailId: e.emailId,
    personalEmail: e.contact?.personalEmail ?? "",
    photoDataUrl: e.photoDataUrl ?? "",
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

export function createHrEmployeeFromForm(f: HrEmployeeFormValues): HrEmployee {
  const list = loadHrEmployees();
  const id = list.length ? Math.max(...list.map((e) => e.id)) + 1 : 1;
  // Persist national digits only (country code is UI context; matches seed format).
  const nationalMobile = f.mobileNumber.replace(/\D/g, "");
  const rec = formToEmployee(
    {
      ...f,
      mobileNumber: nationalMobile,
      status: "active",
      // Sensible create defaults when employment block left for profile completion
      dateOfJoining: f.dateOfJoining || todayStr(),
      branch: f.branch || "hq-pune",
      employeeType: f.employeeType || "permanent",
      employmentStatus: f.employmentStatus || "active",
    },
    id,
  );
  saveHrEmployees([...list, rec]);
  return rec;
}

/** Fixed option lists for profile dropdowns — not Organization masters */
export const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;
export const MARITAL_OPTIONS = ["Single", "Married", "Divorced", "Widowed"] as const;
export const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export const ACCOUNT_TYPE_OPTIONS = ["Savings", "Current", "Salary"] as const;
export const RELATIONSHIP_OPTIONS = [
  "Father",
  "Mother",
  "Spouse",
  "Brother",
  "Sister",
  "Guardian",
  "Parent",
  "Sibling",
  "Child",
  "Relative",
  "Friend",
  "Other",
] as const;

/** @deprecated Use getDocumentTypeSelectOptions() from settings/onboarding-data */
export const EMPLOYEE_DOCUMENT_TYPE_OPTIONS = [
  "Aadhaar Card",
  "PAN Card",
  "Bank Proof",
  "Passport",
  "Driving Licence",
  "Education Certificate",
  "Experience Letter",
  "Relieving Letter",
  "Address Proof",
  "Employee Photo",
  "Other",
] as const;

/** Bank verification UI statuses (mapped to DocVerificationStatus where applicable) */
export const BANK_VERIFICATION_UI_OPTIONS = [
  { value: "", label: "Not Submitted" },
  { value: "pending_verification", label: "Pending Verification" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
] as const;

export function maskAccountNumber(acct: string): string {
  const digits = acct.replace(/\s/g, "");
  if (!digits) return "";
  if (digits.length <= 4) return "XXXXXXXX" + digits;
  return "XXXXXXXX" + digits.slice(-4);
}

export function maskAadhaar(aadhaar: string): string {
  const digits = aadhaar.replace(/\D/g, "");
  if (!digits) return "";
  const last4 = digits.slice(-4);
  return `XXXX XXXX ${last4}`;
}

export function bankVerificationLabel(status: DocVerificationStatus | "" | undefined): string {
  if (!status || status === "missing") return "Not Submitted";
  if (status === "uploaded" || status === "pending_verification") return "Pending Verification";
  if (status === "verified") return "Verified";
  if (status === "rejected") return "Rejected";
  if (status === "expired") return "Expired";
  return status;
}
