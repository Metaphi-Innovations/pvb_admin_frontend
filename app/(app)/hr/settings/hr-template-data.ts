/**
 * Central HR Template Management — frontend/demo persistence.
 * Reusable templates for Payslip, letters, and communications.
 * No backend / migration.
 */

import { CURRENT_USER } from "@/lib/hr/config";
import { policyToday } from "@/lib/hr/policy-common";
import { loadCompanyProfile } from "./organization-data";
import {
  collectBlockCompatibilityWarnings,
  createBlockInstance,
  normalizeBlockInstance,
  replaceDynamicBlocksInHtml,
  type HrTemplateBlockInstance,
  type TemplateBlockRenderData,
  buildSampleSalaryResolution,
  buildSamplePayrollBlockData,
} from "./hr-template-blocks";
import {
  parseMonthlyCtcValue,
  resolveEmployeeMonthlySalary,
  resolveStructureForEmployee,
} from "./employee-salary-resolve";
import type { HrEmployee } from "../employees/employee-master-data";

const TEMPLATE_KEY = "ds_hr_templates_v1";
const GENERATED_KEY = "ds_hr_generated_documents_v1";

export type HrTemplateStatus = "active" | "inactive";

export type HrTemplateTypeKey =
  | "payslip"
  | "offer_letter"
  | "appointment_letter"
  | "welcome_letter"
  | "confirmation_letter"
  | "promotion_letter"
  | "increment_letter"
  | "warning_letter"
  | "experience_letter"
  | "relieving_letter"
  | "termination_letter"
  | "custom";

export type PlaceholderGroupKey =
  | "employee"
  | "company"
  | "salary"
  | "payroll"
  | "dates";

export interface HrTemplatePlaceholder {
  key: string;
  label: string;
  group: PlaceholderGroupKey;
  /** false = show as unavailable in picker */
  available: boolean;
}

export interface HrTemplateRecord {
  id: number;
  name: string;
  templateType: HrTemplateTypeKey;
  customTypeName: string;
  subject: string;
  header: string;
  body: string;
  footer: string;
  /** Configurable dynamic table/block instances referenced by chips in body/header/footer */
  blocks: import("./hr-template-blocks").HrTemplateBlockInstance[];
  useCompanyLogo: boolean;
  showCompanyAddress: boolean;
  showCompanyContact: boolean;
  isDefault: boolean;
  status: HrTemplateStatus;
  usageCount: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type GeneratedHrDocumentStatus = "draft" | "generated" | "issued";

export const HR_LETTERS_SOURCE_MODULE = "hr_letters";

export interface GeneratedHrDocument {
  id: string;
  templateId: number;
  templateType: HrTemplateTypeKey;
  templateName: string;
  employeeCode: string;
  employeeName: string;
  renderedSubject: string;
  renderedHeader: string;
  renderedBody: string;
  renderedFooter: string;
  generatedOn: string;
  generatedBy: string;
  sourceModule: string;
  status: GeneratedHrDocumentStatus;
  payrollRunId?: string | null;
  /** HR Letters — employee master id (payroll snapshots may omit). */
  employeeId?: number | null;
  /** HR Letters — intended issue date (ISO yyyy-mm-dd). */
  issueDate?: string;
  issuedOn?: string | null;
  issuedBy?: string | null;
  referenceNumber?: string;
  internalNote?: string;
  /** HR-entered document title; snapshot subject may copy this. */
  documentTitle?: string;
  createdOn?: string;
  unknownPlaceholders?: string[];
  /** Company chrome captured at Generate — historical letters ignore later company/template edits. */
  snapshotUseCompanyLogo?: boolean;
  snapshotShowCompanyAddress?: boolean;
  snapshotShowCompanyContact?: boolean;
  snapshotLogoUrl?: string;
  snapshotCompanyName?: string;
  snapshotCompanyAddress?: string;
  snapshotCompanyContact?: string;
}

export interface TemplateRenderContext {
  employee_name?: string;
  employee_code?: string;
  personal_email?: string;
  company_email?: string;
  mobile_number?: string;
  designation?: string;
  department?: string;
  branch?: string;
  joining_date?: string;
  employment_type?: string;
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email_org?: string;
  monthly_ctc?: string;
  annual_ctc?: string;
  basic?: string;
  hra?: string;
  special_allowance?: string;
  gross_earnings?: string;
  employee_deductions?: string;
  employer_contributions?: string;
  net_pay?: string;
  payroll_month?: string;
  payroll_period?: string;
  payable_days?: string;
  lop_days?: string;
  current_date?: string;
  issue_date?: string;
  last_working_date?: string;
  [key: string]: string | undefined;
}

export const HR_TEMPLATE_TYPE_OPTIONS: {
  value: HrTemplateTypeKey;
  label: string;
}[] = [
  { value: "payslip", label: "Payslip" },
  { value: "offer_letter", label: "Offer Letter" },
  { value: "appointment_letter", label: "Appointment Letter" },
  { value: "welcome_letter", label: "Welcome Letter" },
  { value: "confirmation_letter", label: "Confirmation Letter" },
  { value: "promotion_letter", label: "Promotion Letter" },
  { value: "increment_letter", label: "Increment Letter" },
  { value: "warning_letter", label: "Warning Letter" },
  { value: "experience_letter", label: "Experience Letter" },
  { value: "relieving_letter", label: "Relieving Letter" },
  { value: "termination_letter", label: "Termination Letter" },
  { value: "custom", label: "Custom" },
];

export const PLACEHOLDER_CATALOG: HrTemplatePlaceholder[] = [
  { key: "employee_name", label: "Employee Name", group: "employee", available: true },
  { key: "employee_code", label: "Employee Code", group: "employee", available: true },
  { key: "personal_email", label: "Personal Email", group: "employee", available: true },
  { key: "company_email", label: "Company Email", group: "employee", available: true },
  { key: "mobile_number", label: "Mobile Number", group: "employee", available: true },
  { key: "designation", label: "Designation", group: "employee", available: true },
  { key: "department", label: "Department", group: "employee", available: true },
  { key: "branch", label: "Branch", group: "employee", available: true },
  { key: "joining_date", label: "Joining Date", group: "employee", available: true },
  { key: "employment_type", label: "Employment Type", group: "employee", available: true },
  { key: "company_name", label: "Company Name", group: "company", available: true },
  { key: "company_address", label: "Company Address", group: "company", available: true },
  { key: "company_phone", label: "Company Phone", group: "company", available: true },
  { key: "company_email_org", label: "Company Email", group: "company", available: true },
  { key: "monthly_ctc", label: "Monthly CTC", group: "salary", available: true },
  { key: "annual_ctc", label: "Annual CTC", group: "salary", available: true },
  { key: "basic", label: "Basic", group: "salary", available: true },
  { key: "hra", label: "HRA", group: "salary", available: true },
  { key: "special_allowance", label: "Special Allowance", group: "salary", available: true },
  { key: "gross_earnings", label: "Gross Earnings", group: "salary", available: true },
  { key: "employee_deductions", label: "Employee Deductions", group: "salary", available: true },
  { key: "employer_contributions", label: "Employer Contributions", group: "salary", available: true },
  { key: "net_pay", label: "Net Pay", group: "salary", available: true },
  { key: "payroll_month", label: "Payroll Month", group: "payroll", available: true },
  { key: "payroll_period", label: "Payroll Period", group: "payroll", available: true },
  { key: "payable_days", label: "Payable Days", group: "payroll", available: true },
  { key: "lop_days", label: "LOP Days", group: "payroll", available: true },
  { key: "current_date", label: "Current Date", group: "dates", available: true },
  { key: "issue_date", label: "Issue Date", group: "dates", available: true },
  { key: "last_working_date", label: "Last Working Date", group: "dates", available: true },
];

const TYPE_GROUPS: Record<HrTemplateTypeKey, PlaceholderGroupKey[]> = {
  payslip: ["employee", "company", "salary", "payroll", "dates"],
  offer_letter: ["employee", "company", "salary", "dates"],
  appointment_letter: ["employee", "company", "salary", "dates"],
  welcome_letter: ["employee", "company", "dates"],
  confirmation_letter: ["employee", "company", "dates"],
  promotion_letter: ["employee", "company", "salary", "dates"],
  increment_letter: ["employee", "company", "salary", "dates"],
  warning_letter: ["employee", "company", "dates"],
  experience_letter: ["employee", "company", "dates"],
  relieving_letter: ["employee", "company", "dates"],
  termination_letter: ["employee", "company", "dates"],
  custom: ["employee", "company", "salary", "payroll", "dates"],
};

export function templateTypeLabel(t: HrTemplateTypeKey, customName?: string): string {
  if (t === "custom" && customName?.trim()) return customName.trim();
  return HR_TEMPLATE_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

export function placeholdersForType(type: HrTemplateTypeKey): HrTemplatePlaceholder[] {
  const groups = new Set(TYPE_GROUPS[type] ?? TYPE_GROUPS.custom);
  return PLACEHOLDER_CATALOG.filter((p) => groups.has(p.group));
}

export function placeholderToken(key: string): string {
  return `{{${key}}}`;
}

/** Sample preview context — Priya Verma for salary table demos. */
export function buildSampleTemplateContext(): TemplateRenderContext {
  const company = typeof window !== "undefined" ? loadCompanyProfile() : null;
  const today = policyToday();

  return {
    employee_name: "Priya Verma",
    employee_code: "EMP-DEMO-002",
    personal_email: "priya.personal@example.com",
    company_email: "priya.verma@company.com",
    mobile_number: "9876543210",
    designation: "Sales Executive",
    department: "Sales",
    branch: "Mumbai",
    joining_date: "2024-04-01",
    employment_type: "Permanent",
    company_name: company?.companyName || "Dharitri Sutra",
    company_address: company
      ? [company.addressLine1, company.city, company.state, company.pincode]
          .filter(Boolean)
          .join(", ")
      : "Pune, Maharashtra",
    company_phone: company
      ? `${company.phoneCountryCode || "+91"} ${company.phoneNumber || ""}`.trim()
      : "+91 9876543210",
    company_email_org: company?.email || "hr@company.com",
    monthly_ctc: "₹22,000",
    annual_ctc: "₹2,64,000",
    basic: "₹8,800",
    hra: "₹4,400",
    special_allowance: "₹6,600",
    gross_earnings: "₹22,000",
    employee_deductions: "₹200",
    employer_contributions: "—",
    net_pay: "₹21,800",
    payroll_month: "Aug 2026",
    payroll_period: "01 Aug 2026 – 31 Aug 2026",
    payable_days: "29",
    lop_days: "2",
    current_date: today,
    issue_date: today,
    last_working_date: "Not Available",
  };
}

export function buildSampleBlockRenderData(): TemplateBlockRenderData {
  return {
    employeeName: "Priya Verma",
    salaryResolution: buildSampleSalaryResolution(),
    payroll: buildSamplePayrollBlockData(),
    useSampleFallback: true,
  };
}

export function buildBlockRenderDataForEmployee(
  employee: HrEmployee,
): TemplateBlockRenderData {
  const structure = resolveStructureForEmployee(employee);
  const monthlyCtc = parseMonthlyCtcValue(employee.profileSummaries?.payroll);
  const salaryResolution = resolveEmployeeMonthlySalary({ monthlyCtc, structure });
  return {
    employeeName: employee.employeeName,
    salaryResolution,
    payroll: null,
    useSampleFallback: false,
  };
}

const BLOCK_TOKEN_KEYS = new Set([
  "salary_breakup_table",
  "earnings_table",
  "deductions_table",
  "employer_contributions_table",
  "attendance_summary",
  "payroll_summary",
]);

const KNOWN_KEYS = new Set([
  ...PLACEHOLDER_CATALOG.map((p) => p.key),
  ...BLOCK_TOKEN_KEYS,
]);

export function extractPlaceholders(text: string): string[] {
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    found.add(m[1]!);
  }
  return Array.from(found);
}

export function findUnknownPlaceholders(...parts: string[]): string[] {
  const all = new Set<string>();
  for (const p of parts) {
    for (const k of extractPlaceholders(p || "")) all.add(k);
  }
  return Array.from(all).filter((k) => !KNOWN_KEYS.has(k));
}

export function renderTemplateText(
  text: string,
  ctx: TemplateRenderContext,
  options?: { missingDisplay?: string; unknownDisplay?: string },
): string {
  const missing = options?.missingDisplay ?? "—";
  const unknownDisplay = options?.unknownDisplay ?? "—";
  return (text || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    if (BLOCK_TOKEN_KEYS.has(key)) return `{{${key}}}`; // left for block pass
    if (!KNOWN_KEYS.has(key)) return unknownDisplay;
    const v = ctx[key];
    if (v == null || String(v).trim() === "") return missing;
    return String(v);
  });
}

export function stripHtmlToText(html: string): string {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isBlankTemplateHtml(html: string): boolean {
  return !stripHtmlToText(html);
}

export interface RenderedTemplateDocument {
  subject: string;
  header: string;
  body: string;
  footer: string;
  unknownPlaceholders: string[];
  blockWarnings: string[];
  companyName: string;
  companyAddress: string;
  companyContact: string;
  logoUrl: string;
  useCompanyLogo: boolean;
  showCompanyAddress: boolean;
  showCompanyContact: boolean;
}

export function renderHrTemplate(
  template: HrTemplateRecord,
  ctx?: TemplateRenderContext,
  blockData?: TemplateBlockRenderData,
): RenderedTemplateDocument {
  const context = ctx ?? buildSampleTemplateContext();
  const blocksData = blockData ?? buildSampleBlockRenderData();
  const company = typeof window !== "undefined" ? loadCompanyProfile() : null;
  const blocks = template.blocks ?? [];

  const withBlocks = (html: string) =>
    replaceDynamicBlocksInHtml(html, blocks, blocksData, {
      templateType: template.templateType,
    });

  // Single render pass: blocks first (so table HTML is not re-tokenized), then field placeholders.
  const subject = renderTemplateText(template.subject, context);
  const header = renderTemplateText(withBlocks(template.header || ""), context);
  const body = renderTemplateText(withBlocks(template.body || ""), context);
  const footer = renderTemplateText(withBlocks(template.footer || ""), context);

  const unknown = findUnknownPlaceholders(
    template.subject,
    template.header,
    template.body,
    template.footer,
  ).filter((k) => !BLOCK_TOKEN_KEYS.has(k));

  const blockWarnings = collectBlockCompatibilityWarnings(
    blocks,
    [template.subject, template.header, template.body, template.footer],
    template.templateType,
  );

  return {
    subject,
    header,
    body,
    footer,
    unknownPlaceholders: unknown,
    blockWarnings,
    companyName: company?.companyName || context.company_name || "—",
    companyAddress: context.company_address || "—",
    companyContact: [context.company_phone, context.company_email_org]
      .filter(Boolean)
      .join(" · "),
    logoUrl: company?.logoUrl || "",
    useCompanyLogo: template.useCompanyLogo,
    showCompanyAddress: template.showCompanyAddress,
    showCompanyContact: template.showCompanyContact,
  };
}

function today(): string {
  return policyToday();
}

function normalizeType(raw: unknown): HrTemplateTypeKey {
  const s = String(raw ?? "").toLowerCase();
  if (HR_TEMPLATE_TYPE_OPTIONS.some((o) => o.value === s)) return s as HrTemplateTypeKey;
  return "custom";
}

function normalizeBlocks(raw: unknown): HrTemplateBlockInstance[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => normalizeBlockInstance(r))
    .filter(Boolean) as HrTemplateBlockInstance[];
}

function normalizeRecord(raw: Record<string, unknown>, index: number): HrTemplateRecord {
  return {
    id: Number(raw.id) || index + 1,
    name: String(raw.name ?? "").trim() || `Template ${index + 1}`,
    templateType: normalizeType(raw.templateType),
    customTypeName: String(raw.customTypeName ?? "").trim(),
    subject: String(raw.subject ?? ""),
    header: String(raw.header ?? ""),
    body: String(raw.body ?? ""),
    footer: String(raw.footer ?? ""),
    blocks: normalizeBlocks(raw.blocks),
    useCompanyLogo: raw.useCompanyLogo !== false,
    showCompanyAddress: raw.showCompanyAddress === true,
    showCompanyContact: raw.showCompanyContact === true,
    isDefault: raw.isDefault === true,
    status: raw.status === "inactive" ? "inactive" : "active",
    usageCount: Math.max(0, Number(raw.usageCount) || 0),
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : CURRENT_USER,
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : CURRENT_USER,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : today(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : today(),
  };
}

const SEED_OFFER_SALARY_BLOCK = createBlockInstance("salary_breakup_table");
const SEED_APPT_SALARY_BLOCK = createBlockInstance("salary_breakup_table");

const SEED: HrTemplateRecord[] = [
  {
    id: 1,
    name: "Standard Payslip",
    templateType: "payslip",
    customTypeName: "",
    subject: "Payslip — {{payroll_month}}",
    header: "Payslip for {{payroll_month}}",
    body: `<p><strong>{{employee_name}}</strong> ({{employee_code}})<br/>{{designation}} · {{department}} · {{branch}}</p><p>Period: {{payroll_period}}</p>{{earnings_table}}{{deductions_table}}{{attendance_summary}}{{payroll_summary}}<p>Net Pay: <strong>{{net_pay}}</strong></p>`,
    footer: "This is a computer-generated payslip for {{company_name}}.",
    blocks: [],
    useCompanyLogo: true,
    showCompanyAddress: true,
    showCompanyContact: false,
    isDefault: true,
    status: "active",
    usageCount: 0,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: 2,
    name: "Standard Offer Letter",
    templateType: "offer_letter",
    customTypeName: "",
    subject: "Offer of Employment — {{employee_name}}",
    header: "",
    body: `<p>Dear {{employee_name}},</p><p>We are pleased to offer you the position of <strong>{{designation}}</strong> in the {{department}} department at {{branch}}.</p><p>Your proposed monthly CTC is {{monthly_ctc}} (annual {{annual_ctc}}).</p><p>Compensation breakup:</p>{{salary_breakup_table}}<p>Proposed joining date: {{joining_date}}.</p><p>We look forward to welcoming you to {{company_name}}.</p>`,
    footer: "For {{company_name}} · HR Department",
    blocks: [SEED_OFFER_SALARY_BLOCK],
    useCompanyLogo: true,
    showCompanyAddress: true,
    showCompanyContact: true,
    isDefault: true,
    status: "active",
    usageCount: 0,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: 3,
    name: "Standard Appointment Letter",
    templateType: "appointment_letter",
    customTypeName: "",
    subject: "Appointment Letter",
    header: "",
    body: `<p>Dear {{employee_name}},</p><p>This letter confirms your appointment as {{designation}} in {{department}} effective {{joining_date}}.</p><p>Employee Code: {{employee_code}} · Branch: {{branch}}</p><p>Salary breakup:</p>{{salary_breakup_table}}`,
    footer: "{{company_name}} · HR",
    blocks: [SEED_APPT_SALARY_BLOCK],
    useCompanyLogo: true,
    showCompanyAddress: false,
    showCompanyContact: false,
    isDefault: true,
    status: "active",
    usageCount: 0,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: 4,
    name: "Standard Welcome Letter",
    templateType: "welcome_letter",
    customTypeName: "",
    subject: "Welcome to {{company_name}}",
    header: "",
    body: `<p>Dear {{employee_name}},</p><p>Welcome to {{company_name}}! We are excited to have you join as {{designation}} in {{department}} on {{joining_date}}.</p><p>Your branch is {{branch}}.</p>`,
    footer: "Warm regards, HR Team",
    blocks: [],
    useCompanyLogo: true,
    showCompanyAddress: false,
    showCompanyContact: false,
    isDefault: true,
    status: "active",
    usageCount: 0,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: 5,
    name: "Standard Experience Letter",
    templateType: "experience_letter",
    customTypeName: "",
    subject: "Experience Certificate — {{employee_name}}",
    header: "",
    body: `<p>This is to certify that {{employee_name}} ({{employee_code}}) worked with {{company_name}} as {{designation}} in {{department}}.</p><p>Period of employment: {{joining_date}} to {{last_working_date}}.</p>`,
    footer: "Authorized Signatory · {{company_name}}",
    blocks: [],
    useCompanyLogo: true,
    showCompanyAddress: true,
    showCompanyContact: false,
    isDefault: true,
    status: "active",
    usageCount: 0,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: 6,
    name: "Standard Relieving Letter",
    templateType: "relieving_letter",
    customTypeName: "",
    subject: "Relieving Letter — {{employee_name}}",
    header: "",
    body: `<p>Dear {{employee_name}},</p><p>This is to confirm that you have been relieved from your duties as {{designation}} effective {{last_working_date}}.</p>`,
    footer: "{{company_name}} · HR",
    blocks: [],
    useCompanyLogo: true,
    showCompanyAddress: false,
    showCompanyContact: false,
    isDefault: true,
    status: "active",
    usageCount: 0,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: 7,
    name: "Standard Termination Letter",
    templateType: "termination_letter",
    customTypeName: "",
    subject: "Termination of Employment — {{employee_name}}",
    header: "",
    body: `<p>Dear {{employee_name}},</p><p>This letter confirms the termination of your employment with {{company_name}}. Your last working date is {{last_working_date}}.</p>`,
    footer: "{{company_name}} · HR",
    blocks: [],
    useCompanyLogo: true,
    showCompanyAddress: false,
    showCompanyContact: false,
    isDefault: true,
    status: "active",
    usageCount: 0,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

function ensureOneDefaultPerType(list: HrTemplateRecord[]): HrTemplateRecord[] {
  const seen = new Set<string>();
  return list.map((t) => {
    if (!t.isDefault || t.status !== "active") return t.isDefault && t.status !== "active" ? { ...t, isDefault: false } : t;
    const key = t.templateType === "custom" ? `custom:${t.customTypeName.toLowerCase()}` : t.templateType;
    if (seen.has(key)) return { ...t, isDefault: false };
    seen.add(key);
    return t;
  });
}

export function loadHrTemplates(): HrTemplateRecord[] {
  if (typeof window === "undefined") return structuredClone(SEED);
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    if (!raw) {
      localStorage.setItem(TEMPLATE_KEY, JSON.stringify(SEED));
      return structuredClone(SEED);
    }
    const parsed = JSON.parse(raw) as unknown[];
    const list = (Array.isArray(parsed) ? parsed : []).map((r, i) =>
      normalizeRecord((r ?? {}) as Record<string, unknown>, i),
    );
    return ensureOneDefaultPerType(list.length ? list : structuredClone(SEED));
  } catch {
    return structuredClone(SEED);
  }
}

export function saveHrTemplates(list: HrTemplateRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(ensureOneDefaultPerType(list)));
  window.dispatchEvent(new CustomEvent("hr-templates-updated"));
}

export function nextHrTemplateId(list: HrTemplateRecord[]): number {
  return list.length ? Math.max(...list.map((t) => t.id)) + 1 : 1;
}

export function withHrTemplateNewAudit(
  partial: Omit<HrTemplateRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt">,
): HrTemplateRecord {
  const d = today();
  return {
    ...partial,
    createdBy: CURRENT_USER,
    updatedBy: CURRENT_USER,
    createdAt: d,
    updatedAt: d,
  };
}

export function withHrTemplateUpdateAudit(record: HrTemplateRecord): HrTemplateRecord {
  return { ...record, updatedBy: CURRENT_USER, updatedAt: today() };
}

export function isHrTemplateNameTaken(
  name: string,
  excludeId: number | null,
  list?: HrTemplateRecord[],
): boolean {
  const n = name.trim().toLowerCase();
  return (list ?? loadHrTemplates()).some(
    (t) => t.id !== excludeId && t.name.trim().toLowerCase() === n,
  );
}

export function getActiveTemplatesByType(
  type: HrTemplateTypeKey,
  list?: HrTemplateRecord[],
): HrTemplateRecord[] {
  return (list ?? loadHrTemplates()).filter(
    (t) => t.templateType === type && t.status === "active",
  );
}

export function getDefaultTemplateByType(
  type: HrTemplateTypeKey,
  list?: HrTemplateRecord[],
): HrTemplateRecord | null {
  const active = getActiveTemplatesByType(type, list);
  return active.find((t) => t.isDefault) ?? active[0] ?? null;
}

export function getHrTemplateById(
  id: number,
  list?: HrTemplateRecord[],
): HrTemplateRecord | undefined {
  return (list ?? loadHrTemplates()).find((t) => t.id === id);
}

export function countGeneratedDocsForTemplate(templateId: number): number {
  return loadGeneratedHrDocuments().filter((d) => d.templateId === templateId).length;
}

function normalizeGeneratedStatus(raw: unknown): GeneratedHrDocumentStatus {
  const s = String(raw ?? "").toLowerCase();
  if (s === "draft" || s === "generated" || s === "issued") return s;
  return "generated";
}

function normalizeGeneratedDoc(raw: Record<string, unknown>, index: number): GeneratedHrDocument {
  const generatedOn = typeof raw.generatedOn === "string" ? raw.generatedOn : "";
  return {
    id: String(raw.id ?? `gd-${index}`),
    templateId: Number(raw.templateId) || 0,
    templateType: normalizeType(raw.templateType),
    templateName: String(raw.templateName ?? ""),
    employeeCode: String(raw.employeeCode ?? ""),
    employeeName: String(raw.employeeName ?? ""),
    renderedSubject: String(raw.renderedSubject ?? ""),
    renderedHeader: String(raw.renderedHeader ?? ""),
    renderedBody: String(raw.renderedBody ?? ""),
    renderedFooter: String(raw.renderedFooter ?? ""),
    generatedOn,
    generatedBy: typeof raw.generatedBy === "string" ? raw.generatedBy : CURRENT_USER,
    sourceModule: String(raw.sourceModule ?? ""),
    status: normalizeGeneratedStatus(raw.status),
    payrollRunId: raw.payrollRunId == null ? null : String(raw.payrollRunId),
    employeeId:
      raw.employeeId == null || raw.employeeId === ""
        ? null
        : Number(raw.employeeId) || null,
    issueDate: typeof raw.issueDate === "string" ? raw.issueDate : "",
    issuedOn: typeof raw.issuedOn === "string" ? raw.issuedOn : null,
    issuedBy: typeof raw.issuedBy === "string" ? raw.issuedBy : null,
    referenceNumber: typeof raw.referenceNumber === "string" ? raw.referenceNumber : "",
    internalNote: typeof raw.internalNote === "string" ? raw.internalNote : "",
    documentTitle: typeof raw.documentTitle === "string" ? raw.documentTitle : "",
    createdOn: typeof raw.createdOn === "string" ? raw.createdOn : generatedOn || "",
    unknownPlaceholders: Array.isArray(raw.unknownPlaceholders)
      ? raw.unknownPlaceholders.map((k) => String(k))
      : [],
    snapshotUseCompanyLogo:
      typeof raw.snapshotUseCompanyLogo === "boolean" ? raw.snapshotUseCompanyLogo : undefined,
    snapshotShowCompanyAddress:
      typeof raw.snapshotShowCompanyAddress === "boolean"
        ? raw.snapshotShowCompanyAddress
        : undefined,
    snapshotShowCompanyContact:
      typeof raw.snapshotShowCompanyContact === "boolean"
        ? raw.snapshotShowCompanyContact
        : undefined,
    snapshotLogoUrl: typeof raw.snapshotLogoUrl === "string" ? raw.snapshotLogoUrl : undefined,
    snapshotCompanyName:
      typeof raw.snapshotCompanyName === "string" ? raw.snapshotCompanyName : undefined,
    snapshotCompanyAddress:
      typeof raw.snapshotCompanyAddress === "string" ? raw.snapshotCompanyAddress : undefined,
    snapshotCompanyContact:
      typeof raw.snapshotCompanyContact === "string" ? raw.snapshotCompanyContact : undefined,
  };
}

export function loadGeneratedHrDocuments(): GeneratedHrDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GENERATED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r, i) => normalizeGeneratedDoc((r ?? {}) as Record<string, unknown>, i));
  } catch {
    return [];
  }
}

export function saveGeneratedHrDocuments(list: GeneratedHrDocument[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GENERATED_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("hr-generated-documents-updated"));
}

export function getGeneratedHrDocumentById(id: string): GeneratedHrDocument | undefined {
  return loadGeneratedHrDocuments().find((d) => d.id === id);
}

export function upsertGeneratedHrDocument(doc: GeneratedHrDocument): GeneratedHrDocument {
  const list = loadGeneratedHrDocuments();
  const idx = list.findIndex((d) => d.id === doc.id);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = doc;
    saveGeneratedHrDocuments(next);
  } else {
    saveGeneratedHrDocuments([doc, ...list]);
  }
  return doc;
}

export function deleteGeneratedHrDocument(id: string): boolean {
  const list = loadGeneratedHrDocuments();
  const next = list.filter((d) => d.id !== id);
  if (next.length === list.length) return false;
  saveGeneratedHrDocuments(next);
  return true;
}

export function bumpHrTemplateUsage(templateId: number): void {
  const templates = loadHrTemplates().map((t) =>
    t.id === templateId
      ? withHrTemplateUpdateAudit({ ...t, usageCount: (t.usageCount || 0) + 1 })
      : t,
  );
  saveHrTemplates(templates);
}

export function createGeneratedHrDocument(input: {
  template: HrTemplateRecord;
  context?: TemplateRenderContext;
  blockData?: TemplateBlockRenderData;
  employeeCode?: string;
  employeeName?: string;
  sourceModule: string;
  status?: GeneratedHrDocumentStatus;
  payrollRunId?: string | null;
  employeeId?: number | null;
  issueDate?: string;
  documentTitle?: string;
  referenceNumber?: string;
  internalNote?: string;
  bumpUsage?: boolean;
}): GeneratedHrDocument {
  const rendered = renderHrTemplate(input.template, input.context, input.blockData);
  const now = new Date().toISOString();
  const status = input.status ?? "generated";
  const title = (input.documentTitle ?? "").trim() || rendered.subject;
  const doc: GeneratedHrDocument = {
    id: `gd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    templateId: input.template.id,
    templateType: input.template.templateType,
    templateName: input.template.name,
    employeeCode: input.employeeCode || "EMP-DEMO-002",
    employeeName: input.employeeName || "Priya Verma",
    renderedSubject: title,
    renderedHeader: rendered.header,
    renderedBody: rendered.body,
    renderedFooter: rendered.footer,
    generatedOn: status === "draft" ? "" : now,
    generatedBy: CURRENT_USER,
    sourceModule: input.sourceModule,
    status,
    payrollRunId: input.payrollRunId ?? null,
    employeeId: input.employeeId ?? null,
    issueDate: input.issueDate ?? "",
    issuedOn: null,
    issuedBy: null,
    referenceNumber: input.referenceNumber ?? "",
    internalNote: input.internalNote ?? "",
    documentTitle: title,
    createdOn: now,
    unknownPlaceholders: rendered.unknownPlaceholders,
    snapshotUseCompanyLogo: rendered.useCompanyLogo,
    snapshotShowCompanyAddress: rendered.showCompanyAddress,
    snapshotShowCompanyContact: rendered.showCompanyContact,
    snapshotLogoUrl: rendered.logoUrl,
    snapshotCompanyName: rendered.companyName,
    snapshotCompanyAddress: rendered.companyAddress,
    snapshotCompanyContact: rendered.companyContact,
  };
  saveGeneratedHrDocuments([doc, ...loadGeneratedHrDocuments()]);
  if (input.bumpUsage !== false && status !== "draft") {
    bumpHrTemplateUsage(input.template.id);
  }
  return doc;
}

export function applyDefaultExclusive(
  list: HrTemplateRecord[],
  templateId: number,
  type: HrTemplateTypeKey,
  customTypeName: string,
): HrTemplateRecord[] {
  const key =
    type === "custom" ? `custom:${customTypeName.trim().toLowerCase()}` : type;
  return list.map((t) => {
    if (t.id === templateId) return withHrTemplateUpdateAudit({ ...t, isDefault: true });
    const tKey =
      t.templateType === "custom"
        ? `custom:${t.customTypeName.trim().toLowerCase()}`
        : t.templateType;
    if (tKey === key && t.isDefault) {
      return withHrTemplateUpdateAudit({ ...t, isDefault: false });
    }
    return t;
  });
}

export function groupLabel(g: PlaceholderGroupKey): string {
  switch (g) {
    case "employee":
      return "Employee";
    case "company":
      return "Company";
    case "salary":
      return "Salary";
    case "payroll":
      return "Payroll";
    case "dates":
      return "Dates";
    default:
      return g;
  }
}

/** Letter types commonly used from HR Letters / Offboarding UIs. */
export const HR_LETTER_CONSUMER_TYPES: HrTemplateTypeKey[] = [
  "offer_letter",
  "appointment_letter",
  "confirmation_letter",
  "promotion_letter",
  "increment_letter",
  "warning_letter",
  "experience_letter",
  "relieving_letter",
  "termination_letter",
  "welcome_letter",
  "custom",
];

export function getGeneratedDocumentsForEmployee(employeeCode: string): GeneratedHrDocument[] {
  const code = employeeCode.trim().toLowerCase();
  return loadGeneratedHrDocuments().filter((d) => d.employeeCode.trim().toLowerCase() === code);
}

/**
 * Scalar context from payroll employee result (frontend demo / preview).
 * Dynamic tables come from buildPayrollBlockRenderData + block registry.
 */
export function buildPayrollResultTemplateContext(input: {
  employeeCode: string;
  employeeName: string;
  designation?: string;
  branch?: string;
  department?: string;
  joiningDate?: string;
  monthlyCtc?: number | null;
  periodLabel: string;
  attendanceFrom: string;
  attendanceTo: string;
  payableDays?: number;
  lopDays?: number;
  earnings: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  employerContributions: { name: string; amount: number }[];
  grossEarnings: number;
  employeeDeductionsTotal: number;
  employerContributionsTotal: number;
  netPay: number;
}): TemplateRenderContext {
  const base = buildSampleTemplateContext();
  const fmt = (n: number) =>
    `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  return {
    ...base,
    employee_name: input.employeeName,
    employee_code: input.employeeCode,
    designation: input.designation || base.designation,
    department: input.department || base.department,
    branch: input.branch || base.branch,
    joining_date: input.joiningDate || base.joining_date,
    monthly_ctc: input.monthlyCtc != null ? fmt(input.monthlyCtc) : base.monthly_ctc,
    annual_ctc:
      input.monthlyCtc != null ? fmt(input.monthlyCtc * 12) : base.annual_ctc,
    payroll_month: input.periodLabel,
    payroll_period: `${input.attendanceFrom} – ${input.attendanceTo}`,
    payable_days:
      input.payableDays != null ? String(input.payableDays) : base.payable_days,
    lop_days: input.lopDays != null ? String(input.lopDays) : base.lop_days,
    gross_earnings: fmt(input.grossEarnings),
    employee_deductions: fmt(input.employeeDeductionsTotal),
    employer_contributions: fmt(input.employerContributionsTotal),
    net_pay: fmt(input.netPay),
    basic: input.earnings.find((e) => /basic/i.test(e.name))
      ? fmt(input.earnings.find((e) => /basic/i.test(e.name))!.amount)
      : base.basic,
    hra: input.earnings.find((e) => /hra/i.test(e.name))
      ? fmt(input.earnings.find((e) => /hra/i.test(e.name))!.amount)
      : base.hra,
  };
}

export function buildPayrollBlockRenderData(input: {
  employeeName: string;
  payableDays?: number;
  lopDays?: number;
  earnings: {
    name: string;
    amount: number;
    monthlyEligible?: number | null;
    lopDeduction?: number | null;
  }[];
  deductions: { name: string; amount: number }[];
  employerContributions: { name: string; amount: number }[];
  grossEarnings: number;
  employeeDeductionsTotal: number;
  employerContributionsTotal: number;
  netPay: number;
  employerCost?: number;
  attendance?: import("./hr-template-blocks").PayrollBlockAttendance | null;
}): TemplateBlockRenderData {
  return {
    employeeName: input.employeeName,
    salaryResolution: null,
    useSampleFallback: false,
    payroll: {
      earnings: input.earnings,
      deductions: input.deductions,
      employerContributions: input.employerContributions,
      attendance: input.attendance ?? {
        lopDays: input.lopDays,
        payableDays: input.payableDays ?? null,
      },
      summary: {
        grossEarnings: input.grossEarnings,
        employeeDeductionsTotal: input.employeeDeductionsTotal,
        netPay: input.netPay,
        employerContributionsTotal: input.employerContributionsTotal,
        employerCost: input.employerCost,
      },
    },
  };
}
