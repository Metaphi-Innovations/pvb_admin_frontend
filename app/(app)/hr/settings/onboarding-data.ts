/**
 * HR Employee Onboarding Setup — frontend/demo persistence.
 * Mandatory Profile Sections controls which profile blocks count toward completion.
 */

export type MandatoryProfileSectionId =
  | "personal"
  | "employment"
  | "bank"
  | "government-ids"
  | "education"
  | "experience"
  | "documents";

export interface MandatoryProfileSectionConfig {
  id: MandatoryProfileSectionId;
  label: string;
  mandatory: boolean;
}

const STORAGE_KEY = "ds_hr_onboarding_mandatory_profile_v1";

/** Fixed configurable sections — not a free-form master. */
export const MANDATORY_PROFILE_SECTION_SEED: MandatoryProfileSectionConfig[] = [
  { id: "personal", label: "Personal Details", mandatory: true },
  { id: "employment", label: "Employment Details", mandatory: true },
  { id: "bank", label: "Bank Details", mandatory: true },
  { id: "government-ids", label: "Government / Statutory IDs", mandatory: true },
  { id: "education", label: "Education", mandatory: false },
  { id: "experience", label: "Experience", mandatory: false },
  { id: "documents", label: "Documents", mandatory: true },
];

function cloneSeed(): MandatoryProfileSectionConfig[] {
  return MANDATORY_PROFILE_SECTION_SEED.map((s) => ({ ...s }));
}

/** Merge saved toggles onto the fixed section list (order + labels from seed). */
function mergeWithSeed(
  saved: Array<{ id?: string; mandatory?: boolean }>,
): MandatoryProfileSectionConfig[] {
  return MANDATORY_PROFILE_SECTION_SEED.map((seed) => {
    const hit = saved.find((s) => s.id === seed.id);
    return {
      ...seed,
      mandatory: typeof hit?.mandatory === "boolean" ? hit.mandatory : seed.mandatory,
    };
  });
}

export function loadMandatoryProfileSections(): MandatoryProfileSectionConfig[] {
  if (typeof window === "undefined") return cloneSeed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = cloneSeed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as Array<{ id?: string; mandatory?: boolean }>;
    if (!Array.isArray(parsed)) return cloneSeed();
    return mergeWithSeed(parsed);
  } catch {
    return cloneSeed();
  }
}

export function saveMandatoryProfileSections(list: MandatoryProfileSectionConfig[]): void {
  if (typeof window === "undefined") return;
  const next = mergeWithSeed(list);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function setProfileSectionMandatory(
  id: MandatoryProfileSectionId,
  mandatory: boolean,
): MandatoryProfileSectionConfig[] {
  const next = loadMandatoryProfileSections().map((s) =>
    s.id === id ? { ...s, mandatory } : s,
  );
  saveMandatoryProfileSections(next);
  return next;
}

export function isProfileSectionMandatory(id: MandatoryProfileSectionId): boolean {
  return loadMandatoryProfileSections().find((s) => s.id === id)?.mandatory ?? false;
}

/* ─── Document Requirement Master ─── */

export type DocumentRequirementStatus = "active" | "inactive";

export interface DocumentRequirementRecord {
  id: number;
  name: string;
  mandatory: boolean;
  status: DocumentRequirementStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

const DOC_REQ_KEY = "ds_hr_onboarding_document_requirements_v1";

/** Demo seed — Super Admin can add more; not a closed enum. */
export const DOCUMENT_REQUIREMENT_SEED: DocumentRequirementRecord[] = [
  { id: 1, name: "Aadhaar Card", mandatory: true, status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 2, name: "PAN Card", mandatory: true, status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 3, name: "Bank Proof", mandatory: true, status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 4, name: "Passport", mandatory: false, status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 5, name: "Driving Licence", mandatory: false, status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 6, name: "Education Certificate", mandatory: false, status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 7, name: "Experience Letter", mandatory: false, status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 8, name: "Relieving Letter", mandatory: false, status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 9, name: "Address Proof", mandatory: false, status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 10, name: "Employee Photo", mandatory: false, status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 11, name: "Other", mandatory: false, status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
];

function docReqToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function cloneDocSeed(): DocumentRequirementRecord[] {
  return DOCUMENT_REQUIREMENT_SEED.map((r) => ({ ...r }));
}

export function normalizeDocumentTypeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function loadDocumentRequirements(): DocumentRequirementRecord[] {
  if (typeof window === "undefined") return cloneDocSeed();
  try {
    const raw = localStorage.getItem(DOC_REQ_KEY);
    if (!raw) {
      const seed = cloneDocSeed();
      localStorage.setItem(DOC_REQ_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as DocumentRequirementRecord[];
    if (!Array.isArray(parsed)) return cloneDocSeed();
    return parsed.map((r) => ({ ...r }));
  } catch {
    return cloneDocSeed();
  }
}

export function saveDocumentRequirements(list: DocumentRequirementRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DOC_REQ_KEY, JSON.stringify(list));
}

export function nextDocumentRequirementId(list: DocumentRequirementRecord[]): number {
  return list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
}

export function withDocReqNewAudit(
  partial: Omit<DocumentRequirementRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt"> &
    Partial<Pick<DocumentRequirementRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt">>,
): DocumentRequirementRecord {
  const today = docReqToday();
  return {
    ...partial,
    createdBy: partial.createdBy ?? "Admin",
    updatedBy: partial.updatedBy ?? "Admin",
    createdAt: partial.createdAt ?? today,
    updatedAt: partial.updatedAt ?? today,
  };
}

export function withDocReqUpdateAudit(record: DocumentRequirementRecord): DocumentRequirementRecord {
  return { ...record, updatedBy: "Admin", updatedAt: docReqToday() };
}

/** Active document type names for new employee document entry. */
export function getActiveDocumentTypeNames(): string[] {
  return loadDocumentRequirements()
    .filter((r) => r.status === "active")
    .map((r) => r.name);
}

/**
 * Select options for Add/Edit employee document.
 * Active types always included; `includeName` kept when inactive (historical edit).
 */
export function getDocumentTypeSelectOptions(includeName?: string): string[] {
  const active = getActiveDocumentTypeNames();
  const extra = includeName?.trim();
  if (!extra) return active;
  const norm = normalizeDocumentTypeName(extra);
  if (active.some((n) => normalizeDocumentTypeName(n) === norm)) return active;
  return [...active, extra];
}

export function findDocumentRequirementByName(
  name: string,
  list?: DocumentRequirementRecord[],
): DocumentRequirementRecord | undefined {
  const norm = normalizeDocumentTypeName(name);
  return (list ?? loadDocumentRequirements()).find(
    (r) => normalizeDocumentTypeName(r.name) === norm,
  );
}

/** Case-insensitive match against employee.documents[].documentType */
export function employeeHasDocumentType(
  documents: Array<{ documentType?: string }> | undefined,
  typeName: string,
): boolean {
  const norm = normalizeDocumentTypeName(typeName);
  return (documents ?? []).some((d) => normalizeDocumentTypeName(d.documentType ?? "") === norm);
}

export type OnboardingDocumentRow = {
  id: number;
  name: string;
  mandatory: boolean;
  requirementLabel: "Required" | "Optional";
  status: "Received" | "Pending";
  received: boolean;
};

/** Active requirements only — used by Employee Onboarding → Documents. */
export function getOnboardingDocumentChecklist(
  documents: Array<{ documentType?: string }> | undefined,
  requirements?: DocumentRequirementRecord[],
): OnboardingDocumentRow[] {
  const list = (requirements ?? loadDocumentRequirements()).filter((r) => r.status === "active");
  return list.map((r) => {
    const received = employeeHasDocumentType(documents, r.name);
    return {
      id: r.id,
      name: r.name,
      mandatory: r.mandatory,
      requirementLabel: r.mandatory ? "Required" : "Optional",
      status: received ? "Received" : "Pending",
      received,
    };
  });
}

/** True when every active mandatory document type is present on the employee. */
export function areMandatoryDocumentsComplete(
  documents: Array<{ documentType?: string }> | undefined,
  requirements?: DocumentRequirementRecord[],
): boolean {
  const list = (requirements ?? loadDocumentRequirements()).filter(
    (r) => r.status === "active" && r.mandatory,
  );
  if (list.length === 0) return true;
  return list.every((r) => employeeHasDocumentType(documents, r.name));
}

/** Field checks for profile completion when Documents section is mandatory. */
export function getMandatoryDocumentFieldChecks(
  documents: Array<{ documentType?: string }> | undefined,
  requirements?: DocumentRequirementRecord[],
): Array<{ label: string; ok: boolean }> {
  return (requirements ?? loadDocumentRequirements())
    .filter((r) => r.status === "active" && r.mandatory)
    .map((r) => ({
      label: r.name,
      ok: employeeHasDocumentType(documents, r.name),
    }));
}

export function countEmployeesUsingDocumentType(
  typeName: string,
  employees: Array<{ documents?: Array<{ documentType?: string }> }>,
): number {
  const norm = normalizeDocumentTypeName(typeName);
  return employees.filter((e) =>
    (e.documents ?? []).some((d) => normalizeDocumentTypeName(d.documentType ?? "") === norm),
  ).length;
}

/* ─── Joining Checklist Master ─── */

export type JoiningChecklistStatus = "active" | "inactive";

/**
 * Internal auto-detect key for employee onboarding completion.
 * Not shown in Super Admin UI. New items default to "manual".
 */
export type JoiningChecklistDetectKey =
  | "profile"
  | "mandatory_docs"
  | "bank"
  | "gov_ids"
  | "employment"
  | "shift"
  | "salary"
  | "appointment_letter"
  | "manual";

export interface JoiningChecklistRecord {
  id: number;
  name: string;
  sequence: number;
  mandatory: boolean;
  status: JoiningChecklistStatus;
  /** Internal — drives auto-complete where employee data exists */
  detectKey: JoiningChecklistDetectKey;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

const JOINING_CHECKLIST_KEY = "ds_hr_onboarding_joining_checklist_v1";

export const JOINING_CHECKLIST_SEED: JoiningChecklistRecord[] = [
  { id: 1, name: "Employee Profile Completed", sequence: 1, mandatory: true, status: "active", detectKey: "profile", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 2, name: "Mandatory Documents Collected", sequence: 2, mandatory: true, status: "active", detectKey: "mandatory_docs", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 3, name: "Bank Details Added", sequence: 3, mandatory: true, status: "active", detectKey: "bank", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 4, name: "Government / Statutory IDs Added", sequence: 4, mandatory: true, status: "active", detectKey: "gov_ids", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 5, name: "Department / Designation / Branch Assigned", sequence: 5, mandatory: true, status: "active", detectKey: "employment", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 6, name: "Shift Assigned", sequence: 6, mandatory: true, status: "active", detectKey: "shift", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 7, name: "Salary Structure Assigned", sequence: 7, mandatory: true, status: "active", detectKey: "salary", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 8, name: "Appointment Letter Issued", sequence: 8, mandatory: true, status: "active", detectKey: "appointment_letter", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 9, name: "Orientation / Induction Completed", sequence: 9, mandatory: false, status: "active", detectKey: "manual", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
];

function cloneJoiningSeed(): JoiningChecklistRecord[] {
  return JOINING_CHECKLIST_SEED.map((r) => ({ ...r }));
}

export function normalizeChecklistItemName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function loadJoiningChecklist(): JoiningChecklistRecord[] {
  if (typeof window === "undefined") return cloneJoiningSeed();
  try {
    const raw = localStorage.getItem(JOINING_CHECKLIST_KEY);
    if (!raw) {
      const seed = cloneJoiningSeed();
      localStorage.setItem(JOINING_CHECKLIST_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as JoiningChecklistRecord[];
    if (!Array.isArray(parsed)) return cloneJoiningSeed();
    return parsed
      .map((r) => ({
        ...r,
        detectKey: r.detectKey ?? "manual",
        sequence: Number(r.sequence) || 0,
      }))
      .sort((a, b) => a.sequence - b.sequence || a.id - b.id);
  } catch {
    return cloneJoiningSeed();
  }
}

export function saveJoiningChecklist(list: JoiningChecklistRecord[]): void {
  if (typeof window === "undefined") return;
  const sorted = [...list].sort((a, b) => a.sequence - b.sequence || a.id - b.id);
  localStorage.setItem(JOINING_CHECKLIST_KEY, JSON.stringify(sorted));
}

export function nextJoiningChecklistId(list: JoiningChecklistRecord[]): number {
  return list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
}

export function withJoiningChecklistNewAudit(
  partial: Omit<JoiningChecklistRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt"> &
    Partial<Pick<JoiningChecklistRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt">>,
): JoiningChecklistRecord {
  const today = docReqToday();
  return {
    ...partial,
    detectKey: partial.detectKey ?? "manual",
    createdBy: partial.createdBy ?? "Admin",
    updatedBy: partial.updatedBy ?? "Admin",
    createdAt: partial.createdAt ?? today,
    updatedAt: partial.updatedAt ?? today,
  };
}

export function withJoiningChecklistUpdateAudit(
  record: JoiningChecklistRecord,
): JoiningChecklistRecord {
  return { ...record, updatedBy: "Admin", updatedAt: docReqToday() };
}

/** Active master items in sequence order — used for new onboarding flows. */
export function getActiveJoiningChecklistItems(
  list?: JoiningChecklistRecord[],
): JoiningChecklistRecord[] {
  return (list ?? loadJoiningChecklist())
    .filter((r) => r.status === "active")
    .sort((a, b) => a.sequence - b.sequence || a.id - b.id);
}

/** Welcome Workflow data moved to welcome-workflow-data.ts — re-export for older imports. */
export {
  loadWelcomeWorkflow,
  getWelcomeSendOnLabel,
  WELCOME_SEND_ON_OPTIONS,
  type WelcomeSendOn,
} from "./welcome-workflow-data";
