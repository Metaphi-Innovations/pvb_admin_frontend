import { createHrNotification } from "@/lib/hr/hr-notifications";

export type WelcomeSendOn = "joining_date" | "one_day_before";
export type WelcomeChannel = "email" | "notification";
export type WelcomeDeliveryStatus = "demo_logged" | "pending_integration" | "failed";

export interface WelcomeAttachmentMeta {
  id: string;
  fileName: string;
  fileType: string;
  sizeLabel: string;
}

export interface WelcomeTemplateRecord {
  id: number;
  name: string;
  subject: string;
  message: string;
  attachments: WelcomeAttachmentMeta[];
  videoLink: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WelcomeSetupSettings {
  welcomeEmail: boolean;
  welcomeNotification: boolean;
  sendOn: WelcomeSendOn;
  defaultTemplateId: number | null;
}

/** Append-only history with template snapshot at send time. */
export interface WelcomeSentRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  joiningDate: string;
  templateId: number;
  templateName: string;
  subjectSnapshot: string;
  messageSnapshot: string;
  attachmentsSnapshot: WelcomeAttachmentMeta[];
  videoLinkSnapshot: string;
  channel: WelcomeChannel;
  sentToEmail: string;
  sentOn: string;
  status: WelcomeDeliveryStatus;
}

const KEYS = {
  templates: "ds_hr_welcome_templates_v1",
  setup: "ds_hr_welcome_setup_v1",
  history: "ds_hr_welcome_sent_history_v1",
  /** Legacy singleton message settings from prior Welcome Workflow UI */
  legacy: "ds_hr_onboarding_welcome_workflow_v1",
} as const;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowIso(): string {
  return new Date().toISOString();
}

function newAttachId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const WELCOME_SEND_ON_OPTIONS: { value: WelcomeSendOn; label: string }[] = [
  { value: "joining_date", label: "Joining Date" },
  { value: "one_day_before", label: "One Day Before Joining" },
];

export const WELCOME_PLACEHOLDERS = [
  "{{employee_name}}",
  "{{joining_date}}",
  "{{designation}}",
  "{{department}}",
  "{{branch}}",
] as const;

const TEMPLATE_SEED: WelcomeTemplateRecord[] = [
  {
    id: 1,
    name: "Standard Employee Welcome",
    subject: "Welcome to the Team",
    message:
      "Welcome to the team, {{employee_name}}. We wish you a great start on {{joining_date}} as {{designation}} in {{department}} ({{branch}}).",
    attachments: [
      {
        id: "seed-att-1",
        fileName: "Welcome Deck.pdf",
        fileType: "pdf",
        sizeLabel: "1.2 MB",
      },
    ],
    videoLink: "https://example.com/welcome-induction",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
  {
    id: 2,
    name: "Intern Welcome",
    subject: "Welcome to Your Internship",
    message:
      "Hi {{employee_name}}, welcome aboard as an intern in {{department}}. Your joining date is {{joining_date}}.",
    attachments: [],
    videoLink: "",
    status: "active",
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
];

const SETUP_SEED: WelcomeSetupSettings = {
  welcomeEmail: true,
  welcomeNotification: true,
  sendOn: "joining_date",
  defaultTemplateId: 1,
};

function migrateLegacySetup(): Partial<WelcomeSetupSettings> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEYS.legacy);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      welcomeEmail?: boolean;
      welcomeNotification?: boolean;
      sendOn?: WelcomeSendOn;
    };
    return {
      welcomeEmail: parsed.welcomeEmail,
      welcomeNotification: parsed.welcomeNotification,
      sendOn: parsed.sendOn,
    };
  } catch {
    return null;
  }
}

/* ─── Templates ─── */

export function loadWelcomeTemplates(): WelcomeTemplateRecord[] {
  if (typeof window === "undefined") return TEMPLATE_SEED.map((t) => ({ ...t, attachments: [...t.attachments] }));
  try {
    const raw = localStorage.getItem(KEYS.templates);
    if (!raw) {
      const seed = TEMPLATE_SEED.map((t) => ({ ...t, attachments: [...t.attachments] }));
      localStorage.setItem(KEYS.templates, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as WelcomeTemplateRecord[];
    return Array.isArray(parsed) ? parsed.map((t) => ({ ...t, attachments: t.attachments ?? [] })) : TEMPLATE_SEED.map((t) => ({ ...t }));
  } catch {
    return TEMPLATE_SEED.map((t) => ({ ...t, attachments: [...t.attachments] }));
  }
}

export function saveWelcomeTemplates(list: WelcomeTemplateRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.templates, JSON.stringify(list));
}

export function nextWelcomeTemplateId(list: WelcomeTemplateRecord[]): number {
  return list.length ? Math.max(...list.map((t) => t.id)) + 1 : 1;
}

export function withWelcomeTemplateAudit(
  partial: Omit<WelcomeTemplateRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt"> &
    Partial<Pick<WelcomeTemplateRecord, "createdBy" | "updatedBy" | "createdAt" | "updatedAt">>,
): WelcomeTemplateRecord {
  const today = todayStr();
  return {
    ...partial,
    attachments: partial.attachments ?? [],
    createdBy: partial.createdBy ?? "Admin",
    updatedBy: partial.updatedBy ?? "Admin",
    createdAt: partial.createdAt ?? today,
    updatedAt: partial.updatedAt ?? today,
  };
}

export function touchWelcomeTemplate(record: WelcomeTemplateRecord): WelcomeTemplateRecord {
  return { ...record, updatedBy: "Admin", updatedAt: todayStr() };
}

export function getActiveWelcomeTemplates(list?: WelcomeTemplateRecord[]): WelcomeTemplateRecord[] {
  return (list ?? loadWelcomeTemplates()).filter((t) => t.status === "active");
}

export function normalizeWelcomeTemplateName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function createWelcomeAttachmentFromFile(file: File): WelcomeAttachmentMeta | { error: string } {
  const name = file.name.toLowerCase();
  const ok =
    name.endsWith(".pdf") ||
    name.endsWith(".ppt") ||
    name.endsWith(".pptx") ||
    file.type === "application/pdf" ||
    file.type.includes("presentation") ||
    file.type.includes("powerpoint");
  if (!ok) return { error: "Only PDF, PPT, and PPTX files are allowed." };
  if (file.size > 10 * 1024 * 1024) return { error: "File size must be 10 MB or less." };
  const ext = name.endsWith(".pptx")
    ? "pptx"
    : name.endsWith(".ppt")
      ? "ppt"
      : "pdf";
  const sizeLabel =
    file.size < 1024
      ? `${file.size} B`
      : file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  return {
    id: newAttachId(),
    fileName: file.name,
    fileType: ext,
    sizeLabel,
  };
}

/* ─── Setup ─── */

export function loadWelcomeSetup(): WelcomeSetupSettings {
  if (typeof window === "undefined") return { ...SETUP_SEED };
  try {
    const raw = localStorage.getItem(KEYS.setup);
    if (!raw) {
      const legacy = migrateLegacySetup();
      const seed: WelcomeSetupSettings = {
        ...SETUP_SEED,
        ...(legacy?.welcomeEmail != null ? { welcomeEmail: legacy.welcomeEmail } : {}),
        ...(legacy?.welcomeNotification != null
          ? { welcomeNotification: legacy.welcomeNotification }
          : {}),
        ...(legacy?.sendOn ? { sendOn: legacy.sendOn } : {}),
      };
      localStorage.setItem(KEYS.setup, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as Partial<WelcomeSetupSettings>;
    return {
      welcomeEmail: typeof parsed.welcomeEmail === "boolean" ? parsed.welcomeEmail : true,
      welcomeNotification:
        typeof parsed.welcomeNotification === "boolean" ? parsed.welcomeNotification : true,
      sendOn:
        parsed.sendOn === "one_day_before" || parsed.sendOn === "joining_date"
          ? parsed.sendOn
          : "joining_date",
      defaultTemplateId:
        typeof parsed.defaultTemplateId === "number" ? parsed.defaultTemplateId : null,
    };
  } catch {
    return { ...SETUP_SEED };
  }
}

export function saveWelcomeSetup(settings: WelcomeSetupSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.setup, JSON.stringify(settings));
}

export function getWelcomeSendOnLabel(value: WelcomeSendOn): string {
  return WELCOME_SEND_ON_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/* ─── History ─── */

export function loadWelcomeSentHistory(): WelcomeSentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.history);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WelcomeSentRecord[];
    return Array.isArray(parsed)
      ? [...parsed].sort((a, b) => b.sentOn.localeCompare(a.sentOn))
      : [];
  } catch {
    return [];
  }
}

export function saveWelcomeSentHistory(list: WelcomeSentRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.history, JSON.stringify(list));
}

export function appendWelcomeSentRecord(
  record: Omit<WelcomeSentRecord, "id">,
): WelcomeSentRecord {
  const list = loadWelcomeSentHistory();
  const id = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
  const next: WelcomeSentRecord = { ...record, id };
  saveWelcomeSentHistory([next, ...list]);
  return next;
}

export function getWelcomeHistoryForEmployee(employeeId: number): WelcomeSentRecord[] {
  return loadWelcomeSentHistory().filter((r) => r.employeeId === employeeId);
}

export function employeeHasWelcomeHistory(employeeId: number): boolean {
  return getWelcomeHistoryForEmployee(employeeId).length > 0;
}

/* ─── Helpers ─── */

export function resolveEmployeeWelcomeEmail(employee: {
  emailId?: string;
  contact?: { personalEmail?: string };
}): { email: string; source: "company" | "personal" | "none" } {
  const company = (employee.emailId ?? "").trim();
  if (company) return { email: company, source: "company" };
  const personal = (employee.contact?.personalEmail ?? "").trim();
  if (personal) return { email: personal, source: "personal" };
  return { email: "", source: "none" };
}

export function formatWelcomeMaterialLabel(record: {
  attachments?: WelcomeAttachmentMeta[];
  attachmentsSnapshot?: WelcomeAttachmentMeta[];
  videoLink?: string;
  videoLinkSnapshot?: string;
}): string {
  const files = record.attachmentsSnapshot ?? record.attachments ?? [];
  const video = (record.videoLinkSnapshot ?? record.videoLink ?? "").trim();
  const n = files.length;
  const hasVideo = !!video;
  if (n === 0 && !hasVideo) return "—";
  if (n === 1 && hasVideo) return "1 File + Video";
  if (n === 1) return "1 File";
  if (n > 1 && hasVideo) return `${n} Files + Video`;
  if (n > 1) return `${n} Files`;
  return "Video";
}

export function formatWelcomeHistoryStatus(status: WelcomeDeliveryStatus): string {
  // Prototype: no real SMTP/push — never show "Sent" as confirmed delivery
  if (status === "failed") return "Failed";
  // demo_logged / pending_integration = logged in HRMS only
  return "Not Delivered";
}

/** Subtle help for business-facing status chips (null = no tooltip). */
export function welcomeHistoryStatusHelp(status: WelcomeDeliveryStatus): string | null {
  if (formatWelcomeHistoryStatus(status) === "Not Delivered") {
    return "Delivery integration is not connected yet.";
  }
  return null;
}

export function welcomeHistoryStatusClass(status: WelcomeDeliveryStatus): string {
  const label = formatWelcomeHistoryStatus(status);
  if (label === "Failed") return "bg-red-50 text-red-700 border-red-200";
  if (label === "Sent") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (label === "Scheduled") return "bg-navy-50 text-navy-700 border-navy-200";
  // Not Delivered
  return "bg-amber-50 text-amber-800 border-amber-200";
}

export function applyWelcomePlaceholders(
  text: string,
  vars: {
    employee_name?: string;
    joining_date?: string;
    designation?: string;
    department?: string;
    branch?: string;
  },
): string {
  return text
    .replaceAll("{{employee_name}}", vars.employee_name ?? "")
    .replaceAll("{{joining_date}}", vars.joining_date ?? "")
    .replaceAll("{{designation}}", vars.designation ?? "")
    .replaceAll("{{department}}", vars.department ?? "")
    .replaceAll("{{branch}}", vars.branch ?? "");
}

export function getSampleWelcomePreviewVars() {
  return {
    employee_name: "Aarav Deshmukh",
    joining_date: "01 Apr 2026",
    designation: "Area Sales Manager (ASM)",
    department: "Sales Force",
    branch: "Head Office — Pune",
  };
}

/**
 * Prototype send — logs history only. No SMTP / push notification backend.
 * Status is always demo_logged when channels are enabled.
 */
export function logWelcomeCommunication(input: {
  employee: {
    id: number;
    employeeName: string;
    employeeCode: string;
    dateOfJoining: string;
    emailId?: string;
    contact?: { personalEmail?: string };
  };
  template: WelcomeTemplateRecord;
  channel: WelcomeChannel;
}): { ok: true; record: WelcomeSentRecord } | { ok: false; error: string } {
  const setup = loadWelcomeSetup();
  if (input.channel === "email" && !setup.welcomeEmail) {
    return { ok: false, error: "Welcome Email is disabled in Welcome Setup." };
  }
  if (input.channel === "notification" && !setup.welcomeNotification) {
    return { ok: false, error: "Welcome Notification is disabled in Welcome Setup." };
  }

  const resolved = resolveEmployeeWelcomeEmail(input.employee);
  if (input.channel === "email" && resolved.source === "none") {
    return {
      ok: false,
      error:
        "No employee email address is available. Add an email address before sending the welcome email.",
    };
  }

  const record = appendWelcomeSentRecord({
    employeeId: input.employee.id,
    employeeName: input.employee.employeeName,
    employeeCode: input.employee.employeeCode,
    joiningDate: input.employee.dateOfJoining,
    templateId: input.template.id,
    templateName: input.template.name,
    subjectSnapshot: input.template.subject,
    messageSnapshot: input.template.message,
    attachmentsSnapshot: input.template.attachments.map((a) => ({ ...a })),
    videoLinkSnapshot: input.template.videoLink,
    channel: input.channel,
    sentToEmail: input.channel === "email" ? resolved.email : "",
    sentOn: nowIso(),
    status: "demo_logged",
  });

  createHrNotification({
    eventType: "welcome_communication",
    employeeId: input.employee.id,
    sourceModule: "onboarding",
    sourceId: String(input.employee.id),
    context: {
      employee_name: input.employee.employeeName,
      employee_code: input.employee.employeeCode,
    },
  });

  return { ok: true, record };
}

/** @deprecated Compat for older Welcome Workflow UI summary */
export function loadWelcomeWorkflow(): {
  welcomeEmail: boolean;
  welcomeNotification: boolean;
  sendOn: WelcomeSendOn;
  welcomeMessage: string;
} {
  const setup = loadWelcomeSetup();
  const templates = loadWelcomeTemplates();
  const def = templates.find((t) => t.id === setup.defaultTemplateId);
  return {
    welcomeEmail: setup.welcomeEmail,
    welcomeNotification: setup.welcomeNotification,
    sendOn: setup.sendOn,
    welcomeMessage: def?.message ?? "",
  };
}
