/**
 * HR Letters operational helpers — frontend/demo persistence.
 * Reuses ds_hr_generated_documents_v1 (sourceModule = hr_letters).
 * Does not duplicate Template Management data.
 */

import { CURRENT_USER } from "@/lib/hr/config";
import { createHrNotification } from "@/lib/hr/hr-notifications";
import { policyToday } from "@/lib/hr/policy-common";
import {
  getBranchDisplayLabel,
  getEmployeeTypeLabel,
} from "@/app/(app)/hr/employees/employee-display";
import {
  getHrEmployeeByCode,
  getHrEmployeeById,
  type HrEmployee,
} from "@/app/(app)/hr/employees/employee-master-data";
import { parseMonthlyCtcValue } from "@/app/(app)/hr/settings/employee-salary-resolve";
import { loadCompanyProfile } from "@/app/(app)/hr/settings/organization-data";
import {
  buildBlockRenderDataForEmployee,
  bumpHrTemplateUsage,
  deleteGeneratedHrDocument,
  extractPlaceholders,
  getHrTemplateById,
  HR_LETTERS_SOURCE_MODULE,
  loadGeneratedHrDocuments,
  renderHrTemplate,
  renderTemplateText,
  stripHtmlToText,
  upsertGeneratedHrDocument,
  type GeneratedHrDocument,
  type GeneratedHrDocumentStatus,
  type HrTemplateRecord,
  type HrTemplateTypeKey,
  type RenderedTemplateDocument,
  type TemplateRenderContext,
} from "@/app/(app)/hr/settings/hr-template-data";

export const HR_LETTER_TYPE_OPTIONS: { value: HrTemplateTypeKey; label: string }[] = [
  { value: "offer_letter", label: "Offer Letter" },
  { value: "appointment_letter", label: "Appointment Letter" },
  { value: "confirmation_letter", label: "Confirmation Letter" },
  { value: "promotion_letter", label: "Promotion Letter" },
  { value: "increment_letter", label: "Increment Letter" },
  { value: "warning_letter", label: "Warning Letter" },
  { value: "experience_letter", label: "Experience Letter" },
  { value: "relieving_letter", label: "Relieving Letter" },
  { value: "termination_letter", label: "Termination Letter" },
  { value: "welcome_letter", label: "Welcome Letter" },
  { value: "custom", label: "Custom Letter" },
];

export type HrLetterStatusTab = "all" | GeneratedHrDocumentStatus;

export interface HrLetterFormInput {
  employeeId: number;
  letterType: HrTemplateTypeKey;
  templateId: number | null;
  issueDate: string;
  documentTitle: string;
  referenceNumber: string;
  internalNote: string;
}

export interface LetterDataGap {
  level: "info" | "warning";
  message: string;
}

function fmtInr(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function hrLetterTypeLabel(type: HrTemplateTypeKey, customName?: string): string {
  if (type === "custom" && customName?.trim()) return customName.trim();
  return HR_LETTER_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function isHrLetterDocument(d: GeneratedHrDocument): boolean {
  const src = (d.sourceModule || "").toLowerCase();
  return src === HR_LETTERS_SOURCE_MODULE || src === "hr_letters";
}

export function listHrLetters(): GeneratedHrDocument[] {
  return loadGeneratedHrDocuments()
    .filter(isHrLetterDocument)
    .sort((a, b) => {
      const ta = a.generatedOn || a.createdOn || "";
      const tb = b.generatedOn || b.createdOn || "";
      return tb.localeCompare(ta);
    });
}

export function listHrLettersForEmployee(
  employee: Pick<HrEmployee, "id" | "employeeCode">,
): GeneratedHrDocument[] {
  const code = employee.employeeCode.trim().toLowerCase();
  return listHrLetters().filter(
    (d) =>
      (d.employeeId != null && d.employeeId === employee.id) ||
      d.employeeCode.trim().toLowerCase() === code,
  );
}

export function buildEmployeeLetterContext(
  employee: HrEmployee,
  issueDate: string,
  extra?: Partial<TemplateRenderContext>,
): TemplateRenderContext {
  const company = typeof window !== "undefined" ? loadCompanyProfile() : null;
  const today = policyToday();
  const monthlyCtc = parseMonthlyCtcValue(employee.profileSummaries?.payroll);
  const companyAddress = company
    ? [company.addressLine1, company.city, company.state, company.pincode]
        .filter(Boolean)
        .join(", ")
    : "";
  const companyPhone = company
    ? `${company.phoneCountryCode || "+91"} ${company.phoneNumber || ""}`.trim()
    : "";

  return {
    employee_name: employee.employeeName || "",
    employee_code: employee.employeeCode || "",
    personal_email: employee.contact?.personalEmail || "",
    company_email: employee.emailId || "",
    mobile_number: employee.mobileNumber || "",
    designation: employee.designation || "",
    department: employee.department || "",
    branch: getBranchDisplayLabel(employee.branch) || employee.branch || "",
    joining_date: employee.dateOfJoining || "",
    employment_type: getEmployeeTypeLabel(employee.employeeType) || employee.employeeType || "",
    company_name: company?.companyName || "",
    company_address: companyAddress,
    company_phone: companyPhone,
    company_email_org: company?.email || "",
    monthly_ctc: monthlyCtc != null ? fmtInr(monthlyCtc) : "",
    annual_ctc: monthlyCtc != null ? fmtInr(monthlyCtc * 12) : "",
    basic: "",
    hra: "",
    special_allowance: "",
    gross_earnings: "",
    employee_deductions: "",
    employer_contributions: "",
    net_pay: "",
    payroll_month: "",
    payroll_period: "",
    payable_days: "",
    lop_days: "",
    current_date: today,
    issue_date: issueDate || today,
    last_working_date: "",
    ...extra,
  };
}

export function getLetterDataGaps(
  letterType: HrTemplateTypeKey,
  employee: HrEmployee,
  ctx: TemplateRenderContext,
  template?: HrTemplateRecord | null,
): LetterDataGap[] {
  const gaps: LetterDataGap[] = [];

  if (letterType === "offer_letter") {
    gaps.push({
      level: "info",
      message:
        "Offer letters currently use existing Employee records. Candidate / Recruitment master is not available in this prototype.",
    });
  }

  if (
    letterType === "experience_letter" ||
    letterType === "relieving_letter" ||
    letterType === "termination_letter"
  ) {
    if (!ctx.last_working_date?.trim()) {
      gaps.push({
        level: "warning",
        message:
          "Last Working Date is not on the employee master. Generate Experience / Relieving / Termination letters from Offboarding so LWD is supplied. Otherwise the letter will show — for that field.",
      });
    }
  }

  if (letterType === "confirmation_letter" && !employee.employmentExtra?.confirmationDate?.trim()) {
    gaps.push({
      level: "warning",
      message:
        "Confirmation Date is not on this employee record. Issue Date is used as the document date. Do not invent a confirmation date here.",
    });
  }

  if (template) {
    const keys = new Set(
      extractPlaceholders(
        `${template.subject}\n${template.header}\n${template.body}\n${template.footer}`,
      ),
    );
    const usesSalary =
      keys.has("monthly_ctc") ||
      keys.has("annual_ctc") ||
      keys.has("salary_breakup_table") ||
      keys.has("basic") ||
      keys.has("hra");
    if (usesSalary && !ctx.monthly_ctc?.trim()) {
      gaps.push({
        level: "warning",
        message:
          "Salary / CTC is not configured for this employee. Compensation placeholders will show as —.",
      });
    }
  }

  return gaps;
}

export function resolveLetterTitle(
  documentTitle: string,
  template: HrTemplateRecord,
  ctx: TemplateRenderContext,
): string {
  const raw = documentTitle.trim() || stripHtmlToText(template.subject) || template.name;
  return renderTemplateText(raw, ctx);
}

export function previewHrLetter(
  employee: HrEmployee,
  template: HrTemplateRecord,
  issueDate: string,
  documentTitle: string,
  extraContext?: Partial<TemplateRenderContext>,
): {
  rendered: RenderedTemplateDocument;
  ctx: TemplateRenderContext;
  title: string;
  gaps: LetterDataGap[];
} {
  const ctx = buildEmployeeLetterContext(employee, issueDate, extraContext);
  const rendered = renderHrTemplate(
    template,
    ctx,
    buildBlockRenderDataForEmployee(employee),
  );
  const title = resolveLetterTitle(documentTitle, template, ctx);
  return {
    rendered: { ...rendered, subject: title },
    ctx,
    title,
    gaps: getLetterDataGaps(template.templateType, employee, ctx, template),
  };
}

function newLetterId(): string {
  return `gd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function snapshotFields(rendered: RenderedTemplateDocument) {
  return {
    snapshotUseCompanyLogo: rendered.useCompanyLogo,
    snapshotShowCompanyAddress: rendered.showCompanyAddress,
    snapshotShowCompanyContact: rendered.showCompanyContact,
    snapshotLogoUrl: rendered.logoUrl,
    snapshotCompanyName: rendered.companyName,
    snapshotCompanyAddress: rendered.companyAddress,
    snapshotCompanyContact: rendered.companyContact,
  };
}

function resolveEmployee(employeeId: number): HrEmployee | undefined {
  return getHrEmployeeById(employeeId);
}

export function saveHrLetterDraft(
  input: HrLetterFormInput,
  existingId?: string | null,
): { ok: true; doc: GeneratedHrDocument } | { ok: false; error: string } {
  const employee = resolveEmployee(input.employeeId);
  if (!employee) return { ok: false, error: "Select an employee." };
  if (!input.letterType) return { ok: false, error: "Select a letter type." };
  if (!input.issueDate) return { ok: false, error: "Issue Date is required." };

  const existing = existingId ? loadGeneratedHrDocuments().find((d) => d.id === existingId) : undefined;
  if (existing && existing.status !== "draft") {
    return { ok: false, error: "Only drafts can be edited." };
  }

  const template = input.templateId ? getHrTemplateById(input.templateId) : undefined;
  const now = new Date().toISOString();
  let renderedSubject = input.documentTitle.trim();
  let renderedHeader = "";
  let renderedBody = "";
  let renderedFooter = "";
  let unknown: string[] = [];
  let snaps: ReturnType<typeof snapshotFields> | Record<string, never> = {};
  let templateName = existing?.templateName ?? "";
  let templateType = input.letterType;

  if (template) {
    const preview = previewHrLetter(
      employee,
      template,
      input.issueDate,
      input.documentTitle,
    );
    renderedSubject = preview.title;
    renderedHeader = preview.rendered.header;
    renderedBody = preview.rendered.body;
    renderedFooter = preview.rendered.footer;
    unknown = preview.rendered.unknownPlaceholders;
    snaps = snapshotFields(preview.rendered);
    templateName = template.name;
    templateType = template.templateType;
  }

  const doc: GeneratedHrDocument = {
    id: existing?.id ?? newLetterId(),
    templateId: input.templateId ?? 0,
    templateType,
    templateName,
    employeeCode: employee.employeeCode,
    employeeName: employee.employeeName,
    renderedSubject,
    renderedHeader,
    renderedBody,
    renderedFooter,
    generatedOn: "",
    generatedBy: CURRENT_USER,
    sourceModule: HR_LETTERS_SOURCE_MODULE,
    status: "draft",
    payrollRunId: null,
    employeeId: employee.id,
    issueDate: input.issueDate,
    issuedOn: null,
    issuedBy: null,
    referenceNumber: input.referenceNumber.trim(),
    internalNote: input.internalNote.trim(),
    documentTitle: input.documentTitle.trim() || renderedSubject,
    createdOn: existing?.createdOn || now,
    unknownPlaceholders: unknown,
    ...snaps,
  };

  upsertGeneratedHrDocument(doc);
  return { ok: true, doc };
}

export function generateHrLetter(
  input: HrLetterFormInput,
  existingId?: string | null,
  extraContext?: Partial<TemplateRenderContext>,
): { ok: true; doc: GeneratedHrDocument } | { ok: false; error: string } {
  const employee = resolveEmployee(input.employeeId);
  if (!employee) return { ok: false, error: "Select an employee." };
  if (!input.letterType) return { ok: false, error: "Select a letter type." };
  if (!input.issueDate) return { ok: false, error: "Issue Date is required." };
  if (!input.templateId) {
    return { ok: false, error: "No active template is available for this Letter Type." };
  }

  const template = getHrTemplateById(input.templateId);
  if (!template) {
    return { ok: false, error: "Selected template is no longer available." };
  }
  if (template.status !== "active") {
    return {
      ok: false,
      error: "The selected template is inactive. Choose an active template before Generate.",
    };
  }
  if (template.templateType !== input.letterType) {
    return { ok: false, error: "Selected template does not match this Letter Type." };
  }

  if (
    extraContext &&
    (input.letterType === "experience_letter" ||
      input.letterType === "relieving_letter" ||
      input.letterType === "termination_letter") &&
    !(extraContext.last_working_date || "").trim()
  ) {
    return {
      ok: false,
      error: "Last Working Date is required before generating this letter.",
    };
  }

  const existing = existingId ? loadGeneratedHrDocuments().find((d) => d.id === existingId) : undefined;
  if (existing && existing.status === "issued") {
    return { ok: false, error: "Issued letters cannot be regenerated." };
  }
  if (existing && existing.status === "generated") {
    return { ok: false, error: "Use Regenerate for an existing generated letter." };
  }

  const preview = previewHrLetter(
    employee,
    template,
    input.issueDate,
    input.documentTitle,
    extraContext,
  );
  const now = new Date().toISOString();
  const doc: GeneratedHrDocument = {
    id: existing?.id ?? newLetterId(),
    templateId: template.id,
    templateType: template.templateType,
    templateName: template.name,
    employeeCode: employee.employeeCode,
    employeeName: employee.employeeName,
    renderedSubject: preview.title,
    renderedHeader: preview.rendered.header,
    renderedBody: preview.rendered.body,
    renderedFooter: preview.rendered.footer,
    generatedOn: now,
    generatedBy: CURRENT_USER,
    sourceModule: HR_LETTERS_SOURCE_MODULE,
    status: "generated",
    payrollRunId: null,
    employeeId: employee.id,
    issueDate: input.issueDate,
    issuedOn: null,
    issuedBy: null,
    referenceNumber: input.referenceNumber.trim(),
    internalNote: input.internalNote.trim(),
    documentTitle: input.documentTitle.trim() || preview.title,
    createdOn: existing?.createdOn || now,
    unknownPlaceholders: preview.rendered.unknownPlaceholders,
    ...snapshotFields(preview.rendered),
  };

  upsertGeneratedHrDocument(doc);
  bumpHrTemplateUsage(template.id);
  createHrNotification({
    eventType: "hr_letter_generated",
    employeeId: employee.id,
    sourceModule: "hr_letters",
    sourceId: doc.id,
    context: {
      employee_name: employee.employeeName,
      letter_type: hrLetterTypeLabel(template.templateType, template.name),
    },
  });
  return { ok: true, doc };
}

export function regenerateHrLetter(
  id: string,
): { ok: true; doc: GeneratedHrDocument } | { ok: false; error: string } {
  const existing = loadGeneratedHrDocuments().find((d) => d.id === id);
  if (!existing || !isHrLetterDocument(existing)) {
    return { ok: false, error: "Letter not found." };
  }
  if (existing.status === "issued") {
    return { ok: false, error: "Issued letters cannot be regenerated." };
  }
  if (existing.status !== "generated") {
    return { ok: false, error: "Only generated (unissued) letters can be regenerated." };
  }

  const template = getHrTemplateById(existing.templateId);
  if (!template) {
    return {
      ok: false,
      error: "Selected template is no longer available. Create a corrected draft instead.",
    };
  }

  const employee =
    (existing.employeeId != null ? getHrEmployeeById(existing.employeeId) : undefined) ??
    getHrEmployeeByCode(existing.employeeCode);
  if (!employee) return { ok: false, error: "Employee record is no longer available." };

  const preview = previewHrLetter(
    employee,
    template,
    existing.issueDate || policyToday(),
    existing.documentTitle || existing.renderedSubject,
  );
  const now = new Date().toISOString();
  const doc: GeneratedHrDocument = {
    ...existing,
    templateName: template.name,
    templateType: template.templateType,
    employeeCode: employee.employeeCode,
    employeeName: employee.employeeName,
    renderedSubject: preview.title,
    renderedHeader: preview.rendered.header,
    renderedBody: preview.rendered.body,
    renderedFooter: preview.rendered.footer,
    generatedOn: now,
    generatedBy: CURRENT_USER,
    status: "generated",
    unknownPlaceholders: preview.rendered.unknownPlaceholders,
    ...snapshotFields(preview.rendered),
  };

  upsertGeneratedHrDocument(doc);
  bumpHrTemplateUsage(template.id);
  createHrNotification({
    eventType: "hr_letter_generated",
    employeeId: employee.id,
    sourceModule: "hr_letters",
    sourceId: doc.id,
    context: {
      employee_name: employee.employeeName,
      letter_type: hrLetterTypeLabel(template.templateType, template.name),
    },
  });
  return { ok: true, doc };
}

export function issueHrLetter(
  id: string,
): { ok: true; doc: GeneratedHrDocument } | { ok: false; error: string } {
  const existing = loadGeneratedHrDocuments().find((d) => d.id === id);
  if (!existing || !isHrLetterDocument(existing)) {
    return { ok: false, error: "Letter not found." };
  }
  if (existing.status !== "generated") {
    return { ok: false, error: "Only generated letters can be issued." };
  }
  if ((existing.unknownPlaceholders ?? []).length > 0) {
    return {
      ok: false,
      error: `Unknown placeholder(s) in the document: ${(existing.unknownPlaceholders ?? [])
        .map((k) => `{{${k}}}`)
        .join(", ")}. Correct the template and regenerate before Issue.`,
    };
  }

  const now = new Date().toISOString();
  const doc: GeneratedHrDocument = {
    ...existing,
    status: "issued",
    issuedOn: now,
    issuedBy: CURRENT_USER,
  };
  upsertGeneratedHrDocument(doc);
  createHrNotification({
    eventType: "hr_letter_issued",
    employeeId: existing.employeeId ?? undefined,
    sourceModule: "hr_letters",
    sourceId: doc.id,
    context: {
      employee_name: existing.employeeName,
      letter_type: hrLetterTypeLabel(existing.templateType, existing.templateName),
    },
  });
  return { ok: true, doc };
}

export function deleteHrLetterDraft(
  id: string,
): { ok: true } | { ok: false; error: string } {
  const existing = loadGeneratedHrDocuments().find((d) => d.id === id);
  if (!existing || !isHrLetterDocument(existing)) {
    return { ok: false, error: "Letter not found." };
  }
  if (existing.status === "issued") {
    return { ok: false, error: "Issued letters cannot be deleted." };
  }
  if (existing.status !== "draft") {
    return { ok: false, error: "Only drafts can be deleted." };
  }
  deleteGeneratedHrDocument(id);
  return { ok: true };
}

export function letterStatusLabel(status: GeneratedHrDocumentStatus): string {
  if (status === "draft") return "Draft";
  if (status === "generated") return "Generated";
  return "Issued";
}

export function formatLetterDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const day = iso.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const d = new Date(`${day}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function defaultTitleFromTemplate(template: HrTemplateRecord | null | undefined): string {
  if (!template) return "";
  return stripHtmlToText(template.subject) || template.name;
}

export function inspectTemplateAvailability(templateId: number | null | undefined): {
  template: HrTemplateRecord | undefined;
  missing: boolean;
  inactive: boolean;
} {
  if (!templateId) return { template: undefined, missing: false, inactive: false };
  const template = getHrTemplateById(templateId);
  if (!template) return { template: undefined, missing: true, inactive: false };
  return { template, missing: false, inactive: template.status !== "active" };
}
