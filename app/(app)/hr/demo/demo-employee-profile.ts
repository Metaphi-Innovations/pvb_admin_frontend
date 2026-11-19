/**
 * Shared demo profile enrichment for Employee Directory profile sections.
 * Used by Demo Workspace seed and the EMP-DEMO-001 visual sample.
 * Frontend/demo only — fake files and IDs; no backend upload.
 */

import type {
  EmployeeDocumentRecord,
  EmployeeEducationRecord,
  EmployeeExperienceRecord,
  EmployeeGovernmentIds,
  HrEmployee,
} from "@/app/(app)/hr/employees/employee-master-data";
import type { EmployeeProfileSummaries } from "@/app/(app)/hr/employees/demo-employee";
import {
  areMandatoryDocumentsComplete,
  getActiveJoiningChecklistItems,
  loadDocumentRequirements,
  normalizeDocumentTypeName,
} from "@/app/(app)/hr/settings/onboarding-data";
import {
  saveEmployeeChecklistCompletions,
  type EmployeeChecklistCompletion,
} from "@/app/(app)/hr/employees/joining-checklist";
import { DEMO_WORKSPACE_MARKER } from "./demo-workspace-constants";

/** Document types that should appear as Received on the Documents checklist. */
export const DEMO_DOCUMENT_TYPES = [
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
] as const;

function panForIndex(idx: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const a = letters[idx % 26];
  const b = letters[(idx * 3) % 26];
  const c = letters[(idx * 7) % 26];
  const d = letters[(idx * 11) % 26];
  const e = letters[(idx * 13) % 26];
  return `${a}${b}${c}${d}${e}${String(1000 + (idx % 9000)).padStart(4, "0")}F`;
}

function aadhaarForIndex(idx: number): string {
  return String(100000000000 + (idx % 899999999999)).slice(0, 12);
}

function slugify(code: string, name: string): string {
  const base = `${code}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return base || "employee";
}

export function buildDemoGovernmentIds(idx: number): EmployeeGovernmentIds {
  return {
    pan: panForIndex(idx),
    aadhaar: aadhaarForIndex(idx),
    uan: `1000${String(10000000 + idx).slice(0, 8)}`,
    pfNumber: `MH/PUN/${1000000 + idx}`,
    esicNumber: `31${String(10000000 + idx).slice(0, 8)}`,
    passportNumber: `N${String(1000000 + idx).slice(0, 7)}`,
    passportExpiry: "2032-12-31",
    drivingLicenceNumber: `MH14${2020 + (idx % 5)}${String(100000 + idx).slice(0, 6)}`,
    drivingLicenceExpiry: "2034-06-30",
  };
}

export function buildDemoEducation(idx: number): EmployeeEducationRecord[] {
  const yearEnd = 2014 + (idx % 8);
  return [
    {
      id: `demo-edu-${idx}-1`,
      qualification: idx % 2 === 0 ? "Bachelor of Commerce" : "Bachelor of Business Administration",
      specialization: idx % 3 === 0 ? "Finance" : "Marketing",
      institution: idx % 2 === 0 ? "University of Pune" : "Mumbai University",
      university: idx % 2 === 0 ? "SPPU" : "MU",
      startYear: String(yearEnd - 3),
      endYear: String(yearEnd),
      grade: `${65 + (idx % 20)}%`,
      certificateName: `degree-certificate-${idx}.pdf`,
    },
    {
      id: `demo-edu-${idx}-2`,
      qualification: "MBA",
      specialization: "Sales & Marketing",
      institution: "Symbiosis Institute of Business Management",
      university: "Symbiosis International University",
      startYear: String(yearEnd + 1),
      endYear: String(yearEnd + 3),
      grade: `${7 + (idx % 3)}.${idx % 10} CGPA`,
      certificateName: `mba-certificate-${idx}.pdf`,
    },
  ];
}

export function buildDemoExperience(idx: number, doj: string): EmployeeExperienceRecord[] {
  const joinYear = Number((doj || "2024-01-01").slice(0, 4)) || 2024;
  const end1 = `${Math.max(2016, joinYear - 4)}-05-31`;
  const start1 = `${Math.max(2014, joinYear - 6)}-07-01`;
  const end2 = `${Math.max(2018, joinYear - 1)}-03-15`;
  const start2 = `${Math.max(2016, joinYear - 4)}-07-01`;
  return [
    {
      id: `demo-exp-${idx}-1`,
      employerName: "Nova Consumer Products Pvt Ltd",
      designation: "Sales Executive",
      employmentType: "Full Time",
      startDate: start1,
      endDate: end1,
      reasonForLeaving: "Career growth",
      experienceLetterName: `experience-letter-nova-${idx}.pdf`,
      relievingLetterName: `relieving-nova-${idx}.pdf`,
    },
    {
      id: `demo-exp-${idx}-2`,
      employerName: "GreenCrop Industries Ltd",
      designation: "Territory Sales Manager",
      employmentType: "Full Time",
      startDate: start2,
      endDate: end2,
      reasonForLeaving: "Joined current organization",
      experienceLetterName: `experience-letter-greencrop-${idx}.pdf`,
      relievingLetterName: `relieving-greencrop-${idx}.pdf`,
    },
  ];
}

export function buildDemoDocuments(
  employeeCode: string,
  employeeName: string,
  idx: number,
  uploadedDate: string,
  gov?: EmployeeGovernmentIds,
): EmployeeDocumentRecord[] {
  const slug = slugify(employeeCode, employeeName);
  const g = gov ?? buildDemoGovernmentIds(idx);
  const types =
    typeof window !== "undefined"
      ? loadDocumentRequirements()
          .filter((r) => r.status === "active")
          .map((r) => r.name)
      : [...DEMO_DOCUMENT_TYPES];

  const preferred = types.length ? types : [...DEMO_DOCUMENT_TYPES];
  // Prefer known demo set; ensure mandatory types always included
  const ordered = [
    ...DEMO_DOCUMENT_TYPES,
    ...preferred.filter(
      (t) => !DEMO_DOCUMENT_TYPES.some((d) => normalizeDocumentTypeName(d) === normalizeDocumentTypeName(t)),
    ),
  ].filter((t) => normalizeDocumentTypeName(t) !== "other");

  return ordered.map((documentType, i) => {
    const key = normalizeDocumentTypeName(documentType);
    let documentNumber = "";
    let expiryDate = "";
    if (key.includes("pan")) documentNumber = g.pan;
    else if (key.includes("aadhaar")) documentNumber = g.aadhaar;
    else if (key.includes("passport")) {
      documentNumber = g.passportNumber;
      expiryDate = g.passportExpiry;
    } else if (key.includes("driving") || key.includes("licence") || key.includes("license")) {
      documentNumber = g.drivingLicenceNumber;
      expiryDate = g.drivingLicenceExpiry;
    } else if (key.includes("bank")) documentNumber = "Passbook / Cancelled Cheque";

    const fileBase = documentType.toLowerCase().replace(/\s+/g, "-");
    return {
      id: `demo-doc-${employeeCode}-${i + 1}`,
      documentType,
      documentName: `${documentType}`,
      documentNumber,
      fileName: `${slug}-${fileBase}.pdf`,
      uploadedDate: uploadedDate || "",
      expiryDate,
      verificationStatus: "verified" as const,
      verifiedBy: DEMO_WORKSPACE_MARKER,
      verifiedDate: uploadedDate || "",
      comment: "Demo workspace — sample file",
    };
  });
}

export function buildDemoOnboardingSummary(
  doj: string,
  assignedHr = "Priya Nair",
): NonNullable<EmployeeProfileSummaries["onboarding"]> {
  const start = doj || "2024-01-01";
  const startD = new Date(`${start}T12:00:00`);
  const completeD = new Date(startD);
  completeD.setDate(completeD.getDate() + 10);
  const completionDate = completeD.toISOString().slice(0, 10);
  const d1 = start;
  const d2 = isoOffset(start, 2);
  const d3 = isoOffset(start, 4);
  const d4 = isoOffset(start, 6);
  const d5 = isoOffset(start, 8);
  return {
    status: "Completed",
    startDate: start,
    completionDate,
    assignedHr,
    checklistAssigned: 6,
    checklistCompleted: 6,
    checklistPending: 0,
    checklistItems: [
      { item: "Employee Details Completed", status: "Completed", completedOn: d1 },
      { item: "Bank Details Added", status: "Completed", completedOn: d2 },
      { item: "Government IDs Added", status: "Completed", completedOn: d2 },
      { item: "Joining Documents Collected", status: "Completed", completedOn: d3 },
      { item: "Manager Assigned", status: "Completed", completedOn: d4 },
      { item: "Welcome Orientation Completed", status: "Completed", completedOn: d5 },
    ],
  };
}

function isoOffset(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function mergeDocuments(
  existing: EmployeeDocumentRecord[] | undefined,
  incoming: EmployeeDocumentRecord[],
): EmployeeDocumentRecord[] {
  const byType = new Map<string, EmployeeDocumentRecord>();
  for (const d of existing ?? []) {
    byType.set(normalizeDocumentTypeName(d.documentType), d);
  }
  for (const d of incoming) {
    const key = normalizeDocumentTypeName(d.documentType);
    if (!byType.has(key)) byType.set(key, d);
  }
  return [...byType.values()];
}

/** True when profile still lacks demo-ready documents / education / gov IDs. */
export function employeeNeedsDemoProfileEnrichment(e: HrEmployee): boolean {
  if (!areMandatoryDocumentsComplete(e.documents)) return true;
  if ((e.education?.length ?? 0) < 1) return true;
  if ((e.experience?.length ?? 0) < 1) return true;
  if (!(e.governmentIds?.pan || "").trim()) return true;
  if (!(e.governmentIds?.aadhaar || "").trim()) return true;
  if (!e.profileSummaries?.onboarding) return true;
  return false;
}

/**
 * Fill Documents, Education, Experience, Government IDs, bank proof, onboarding summary.
 * Idempotent: merges missing document types; does not wipe richer existing rows.
 */
export function enrichEmployeeWithDemoProfile(
  employee: HrEmployee,
  index: number,
  options?: { forceDocuments?: boolean },
): HrEmployee {
  const idx = Math.max(1, index);
  const doj = employee.dateOfJoining || "2024-04-01";
  const uploaded = doj;
  const gov =
    (employee.governmentIds?.pan || "").trim() && (employee.governmentIds?.aadhaar || "").trim()
      ? employee.governmentIds!
      : buildDemoGovernmentIds(idx);

  const demoDocs = buildDemoDocuments(
    employee.employeeCode,
    employee.employeeName,
    idx,
    uploaded,
    gov,
  );
  const documents = options?.forceDocuments
    ? demoDocs
    : mergeDocuments(employee.documents, demoDocs);

  const education =
    (employee.education?.length ?? 0) >= 1 ? employee.education : buildDemoEducation(idx);
  const experience =
    (employee.experience?.length ?? 0) >= 1
      ? employee.experience
      : buildDemoExperience(idx, doj);

  const bank = {
    accountHolderName: employee.bank?.accountHolderName || employee.employeeName,
    bankName: employee.bank?.bankName || "HDFC Bank",
    accountNumber: employee.bank?.accountNumber || `50100${String(100000 + idx).slice(0, 6)}`,
    ifscCode: employee.bank?.ifscCode || "HDFC0001234",
    bankBranch: employee.bank?.bankBranch || "Pune",
    accountType: employee.bank?.accountType || "Savings",
    bankProofName:
      employee.bank?.bankProofName ||
      `${slugify(employee.employeeCode, employee.employeeName)}-bank-proof.pdf`,
    verificationStatus: (employee.bank?.verificationStatus || "verified") as
      | ""
      | "missing"
      | "uploaded"
      | "pending_verification"
      | "verified"
      | "rejected"
      | "expired",
  };

  const personal = employee.personal?.gender
    ? employee.personal
    : {
        dateOfBirth: employee.personal?.dateOfBirth || "1995-06-15",
        gender: idx % 2 === 0 ? "Female" : "Male",
        maritalStatus: idx % 3 === 0 ? "Married" : "Single",
        bloodGroup: employee.personal?.bloodGroup || "B+",
        nationality: "India",
        fatherName: employee.personal?.fatherName || "",
        motherName: employee.personal?.motherName || "",
      };

  const contact = employee.contact?.currentAddress?.line1
    ? employee.contact
    : {
        personalEmail:
          employee.contact?.personalEmail ||
          `${employee.employeeCode.toLowerCase()}.personal@example.com`,
        alternateMobile: employee.contact?.alternateMobile || "",
        permanentSameAsCurrent: true,
        currentAddress: {
          line1: `${100 + idx}, Demo Residency`,
          line2: "Near City Center",
          city: "Pune",
          state: "Maharashtra",
          country: "India",
          pincode: "411001",
        },
        permanentAddress: {
          line1: `${100 + idx}, Demo Residency`,
          line2: "Near City Center",
          city: "Pune",
          state: "Maharashtra",
          country: "India",
          pincode: "411001",
        },
      };

  const onboarding =
    employee.profileSummaries?.onboarding ?? buildDemoOnboardingSummary(doj);

  const hrLetters = employee.profileSummaries?.hrLetters?.length
    ? employee.profileSummaries.hrLetters
    : [
        { type: "Appointment Letter", issuedOn: doj },
        { type: "Welcome Letter", issuedOn: isoOffset(doj, 1) },
      ];

  return {
    ...employee,
    personal,
    contact,
    emergency: employee.emergency?.contactName
      ? employee.emergency
      : {
          contactName: "Emergency Contact",
          relationship: "Spouse",
          mobileNumber: `98${String(70000000 + idx).slice(0, 8)}`,
          alternateNumber: "",
        },
    employmentExtra: employee.employmentExtra ?? {
      probationEndDate: isoOffset(doj, 180),
      confirmationDate: isoOffset(doj, 181),
      workLocation: contact.currentAddress.city || "Pune",
    },
    bank,
    governmentIds: gov,
    education,
    experience,
    documents,
    updatedBy: employee.updatedBy || DEMO_WORKSPACE_MARKER,
    profileSummaries: {
      ...employee.profileSummaries,
      onboarding,
      hrLetters,
      attendance: employee.profileSummaries?.attendance ?? {
        present: 0,
        absent: 0,
        leave: 0,
      },
      payroll: employee.profileSummaries?.payroll,
    },
  };
}

/** Mark joining checklist completions for demo (manual + snapshot for UI history). */
export function seedDemoJoiningChecklistCompletions(employee: HrEmployee): void {
  if (typeof window === "undefined") return;
  const items = getActiveJoiningChecklistItems();
  const today = new Date().toISOString().slice(0, 10);
  const rows: EmployeeChecklistCompletion[] = items.map((item) => ({
    checklistItemId: item.id,
    itemName: item.name,
    completed: true,
    completedOn: today,
  }));
  saveEmployeeChecklistCompletions(employee.id, rows);
}
