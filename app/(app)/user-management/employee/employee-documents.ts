import type { Employee } from "./employee-data";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export type EmployeeDocumentStatus = "pending" | "uploaded" | "verified" | "rejected";

export interface EmployeeDocument {
  id: string;
  documentName: string;
  /** @deprecated use documentName */
  documentType?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  /** @deprecated simplified upload flow no longer uses status workflow */
  status?: EmployeeDocumentStatus;
  uploadedBy?: string;
  uploadedOn?: string;
  verifiedBy?: string;
  verifiedDate?: string;
  remarks?: string;
}

export interface EmployeeActivityEntry {
  id: string;
  date: string;
  by: string;
  text: string;
}

export const EMPLOYEE_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

export const EMPLOYEE_DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png";

export const EMPLOYEE_DOCUMENT_TYPE_GROUPS: { group: string; types: string[] }[] = [
  {
    group: "Identity Documents",
    types: ["Aadhaar Card", "PAN Card", "Voter ID", "Passport", "Driving License"],
  },
  {
    group: "Employment Documents",
    types: [
      "Offer Letter",
      "Appointment Letter",
      "Confirmation Letter",
      "Experience Certificate",
      "Relieving Letter",
    ],
  },
  {
    group: "Education Documents",
    types: [
      "10th Marksheet",
      "12th Marksheet",
      "Graduation Certificate",
      "Post Graduation Certificate",
    ],
  },
  {
    group: "Banking Documents",
    types: ["Cancelled Cheque", "Passbook Copy"],
  },
  {
    group: "Other Documents",
    types: ["Resume/CV", "Photograph", "Signature", "Any Other Document"],
  },
];

export const ALL_EMPLOYEE_DOCUMENT_TYPES = EMPLOYEE_DOCUMENT_TYPE_GROUPS.flatMap(
  (g) => g.types,
);

/** Suggested types used for profile completion tracking */
export const PROFILE_DOCUMENT_TYPES = [
  "Aadhaar Card",
  "PAN Card",
  "Photograph",
  "Resume/CV",
  "Cancelled Cheque",
  "Offer Letter",
  "Appointment Letter",
  "10th Marksheet",
  "Graduation Certificate",
  "Driving License",
];

export function newDocumentId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatEmployeeStatus(status: string): string {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function applyEmployeeStatusChange(
  employee: Employee,
  nextStatus: "active" | "inactive",
  by = "Admin",
): Employee {
  const date = todayStr();
  const prettyDate = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(" ", "-");
  const prev = formatEmployeeStatus(employee.status);
  const next = formatEmployeeStatus(nextStatus);
  const entry: EmployeeActivityEntry = {
    id: `act-${Date.now()}`,
    date,
    by,
    text: `${by} changed ${employee.fullName} status from ${prev} to ${next} on ${prettyDate}`,
  };
  return {
    ...employee,
    status: nextStatus,
    updatedBy: by,
    updatedDate: date,
    lastStatusChange: date,
    activityLog: [...(employee.activityLog || []), entry],
  };
}

export function canActivateEmployee(employee: Partial<Employee>): {
  ok: boolean;
  gaps: string[];
} {
  const profile = computeProfileCompletion(employee);
  const gaps: string[] = [];
  if (!profile.personalComplete) gaps.push("Complete personal information (name, email, mobile)");
  if (!profile.employmentComplete) gaps.push("Complete employment information (department, role, joining date)");
  return { ok: gaps.length === 0, gaps };
}

export function computeProfileCompletion(employee: Partial<Employee>): {
  personalComplete: boolean;
  employmentComplete: boolean;
  documentsUploaded: number;
  documentsTotal: number;
  percent: number;
} {
  const personalComplete = Boolean(
    employee.firstName?.trim() &&
      employee.lastName?.trim() &&
      employee.email?.trim() &&
      employee.mobile?.trim(),
  );
  const employmentComplete = Boolean(
    employee.departmentId && employee.roleId && employee.joiningDate,
  );
  const docs = employee.documents || [];
  const documentsUploaded = docs.filter((d) => d.fileName).length;
  const documentsTotal = Math.max(docs.length, documentsUploaded);

  const sections = [personalComplete, employmentComplete, documentsUploaded > 0];
  const sectionScore = sections.filter(Boolean).length;
  const docScore = documentsTotal ? documentsUploaded / documentsTotal : 0;
  const percent = Math.round(((sectionScore + docScore) / 4) * 100);

  return {
    personalComplete,
    employmentComplete,
    documentsUploaded,
    documentsTotal,
    percent: Math.min(100, percent),
  };
}

export const DOCUMENT_STATUS_STYLES: Record<
  EmployeeDocumentStatus,
  { bg: string; text: string; border: string }
> = {
  pending: { bg: "#FFFBEB", text: "#B45309", border: "#F59E0B" },
  uploaded: { bg: "#ECFDF5", text: "#16A34A", border: "#86EFAC" },
  verified: { bg: "#ECFDF5", text: "#15803D", border: "#16A34A" },
  rejected: { bg: "#FEF2F2", text: "#DC2626", border: "#FCA5A5" },
};
