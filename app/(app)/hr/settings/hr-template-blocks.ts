/**
 * Central HR Template dynamic block registry.
 * Configurable table/summary blocks for letters & payslips.
 * Frontend-only — no backend / migration.
 */

import type { HrTemplateTypeKey } from "./hr-template-data";
import {
  formatInrAmount,
  type EmployeeSalaryResolution,
  type ResolvedSalaryLine,
} from "./employee-salary-resolve";

export type HrTemplateBlockType =
  | "salary_breakup_table"
  | "earnings_table"
  | "deductions_table"
  | "employer_contributions_table"
  | "attendance_summary"
  | "payroll_summary";

export type HrTableBlockStyle = "simple" | "bordered" | "compact" | "highlight_totals";

export interface SalaryBreakupTableSettings {
  title: string;
  showBreakup: boolean;
  showMonthly: boolean;
  showAnnual: boolean;
  showGross: boolean;
  showDeductions: boolean;
  showEmployerContributions: boolean;
  showNet: boolean;
  showCtcTotal: boolean;
  totalLabel: string;
  showEmployeeNameInHeader: boolean;
  style: HrTableBlockStyle;
}

export interface SimpleTableBlockSettings {
  title: string;
  style: HrTableBlockStyle;
  showTotals: boolean;
}

export type HrBlockSettings =
  | SalaryBreakupTableSettings
  | SimpleTableBlockSettings
  | Record<string, unknown>;

export interface HrTemplateBlockInstance {
  id: string;
  blockType: HrTemplateBlockType;
  settings: HrBlockSettings;
}

export interface PayrollBlockLine {
  name: string;
  amount: number;
  monthlyEligible?: number | null;
  lopDeduction?: number | null;
}

export interface PayrollBlockAttendance {
  periodDays?: number;
  workingDays?: number | null;
  present?: number;
  paidLeave?: number;
  unpaidLeave?: number;
  absent?: number;
  halfDay?: number;
  weekOff?: number;
  holiday?: number;
  lopDays?: number;
  payableDays?: number | null;
}

export interface PayrollBlockSummary {
  grossEarnings: number;
  employeeDeductionsTotal: number;
  netPay: number;
  employerContributionsTotal: number;
  employerCost?: number;
}

export interface TemplateBlockRenderData {
  employeeName?: string;
  salaryResolution?: EmployeeSalaryResolution | null;
  payroll?: {
    earnings: PayrollBlockLine[];
    deductions: PayrollBlockLine[];
    employerContributions: PayrollBlockLine[];
    attendance?: PayrollBlockAttendance | null;
    summary?: PayrollBlockSummary | null;
  } | null;
  /** Sample preview uses demo data when live sources missing */
  useSampleFallback?: boolean;
}

export interface HrTemplateBlockDefinition {
  id: HrTemplateBlockType;
  label: string;
  description: string;
  /** Token kept for legacy / simple insert display */
  token: string;
  allowedTemplateTypes: HrTemplateTypeKey[] | "all";
  defaultSettings: () => HrBlockSettings;
  normalizeSettings: (raw: unknown) => HrBlockSettings;
  render: (settings: HrBlockSettings, data: TemplateBlockRenderData) => string;
}

const CHIP_CLASS = "hr-tpl-block-chip";

export function newBlockInstanceId(): string {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultSalaryBreakupSettings(): SalaryBreakupTableSettings {
  return {
    title: "Salary Breakup",
    showBreakup: true,
    showMonthly: true,
    showAnnual: true,
    showGross: true,
    showDeductions: true,
    showEmployerContributions: false,
    showNet: true,
    showCtcTotal: false,
    totalLabel: "NET CTC",
    showEmployeeNameInHeader: false,
    style: "bordered",
  };
}

export function defaultSimpleTableSettings(title: string): SimpleTableBlockSettings {
  return {
    title,
    style: "bordered",
    showTotals: true,
  };
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function asStr(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function asStyle(v: unknown): HrTableBlockStyle {
  if (v === "simple" || v === "bordered" || v === "compact" || v === "highlight_totals") {
    return v;
  }
  return "bordered";
}

export function normalizeSalaryBreakupSettings(raw: unknown): SalaryBreakupTableSettings {
  const d = defaultSalaryBreakupSettings();
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    title: asStr(o.title, d.title),
    showBreakup: asBool(o.showBreakup, d.showBreakup),
    showMonthly: asBool(o.showMonthly, d.showMonthly),
    showAnnual: asBool(o.showAnnual, d.showAnnual),
    showGross: asBool(o.showGross, d.showGross),
    showDeductions: asBool(o.showDeductions, d.showDeductions),
    showEmployerContributions: asBool(
      o.showEmployerContributions,
      d.showEmployerContributions,
    ),
    showNet: asBool(o.showNet, d.showNet),
    showCtcTotal: asBool(o.showCtcTotal, d.showCtcTotal),
    totalLabel: asStr(o.totalLabel, d.totalLabel),
    showEmployeeNameInHeader: asBool(o.showEmployeeNameInHeader, d.showEmployeeNameInHeader),
    style: asStyle(o.style),
  };
}

export function normalizeSimpleTableSettings(
  raw: unknown,
  defaultTitle: string,
): SimpleTableBlockSettings {
  const d = defaultSimpleTableSettings(defaultTitle);
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    title: asStr(o.title, d.title),
    style: asStyle(o.style),
    showTotals: asBool(o.showTotals, d.showTotals),
  };
}

/** Demo salary for Template Management preview (Priya Verma). Not persisted into templates. */
export function buildSampleSalaryResolution(): EmployeeSalaryResolution {
  const mk = (
    name: string,
    type: ResolvedSalaryLine["componentType"],
    calc: string,
    amount: number | null,
    status: ResolvedSalaryLine["status"] = "resolved",
  ): ResolvedSalaryLine => ({
    lineId: 0,
    componentId: 0,
    componentName: name,
    componentType: type,
    calcMode: calc.includes("%") ? "percent" : calc.includes("System") ? "system" : "fixed",
    displayCalculation: calc,
    displayAmount: amount != null ? formatInrAmount(amount) : "Not Configured",
    amount,
    status: amount == null ? "system" : status,
  });

  return {
    monthlyCtc: 22000,
    annualCtc: 264000,
    structure: null,
    earnings: [
      mk("Basic Salary", "earning", "40% of CTC", 8800),
      mk("HRA", "earning", "20% of CTC", 4400),
      mk("Special Allowance", "earning", "30% of CTC", 6600),
      mk("Conveyance", "earning", "Fixed", 2200),
    ],
    deductions: [
      mk("Professional Tax", "deduction", "System Calculated", 200),
      mk("Employee PF", "deduction", "System Calculated", null),
    ],
    employerContributions: [mk("Employer PF", "employer_contribution", "System Calculated", null)],
    configuredEarningsTotal: 22000,
    unallocatedCtc: 0,
    hasCircularDependency: false,
    errorMessage: null,
  };
}

export function buildSamplePayrollBlockData(): NonNullable<TemplateBlockRenderData["payroll"]> {
  return {
    earnings: [
      { name: "Basic", amount: 40000, monthlyEligible: 40000, lopDeduction: 0 },
      { name: "HRA", amount: 20000, monthlyEligible: 20000, lopDeduction: 0 },
      { name: "Special Allowance", amount: 25000, monthlyEligible: 25000, lopDeduction: 0 },
    ],
    deductions: [
      { name: "Employee PF", amount: 4800 },
      { name: "Professional Tax", amount: 200 },
      { name: "TDS", amount: 3500 },
    ],
    employerContributions: [
      { name: "Employer PF", amount: 4800 },
      { name: "Employer ESI", amount: 0 },
    ],
    attendance: {
      periodDays: 31,
      workingDays: 26,
      present: 22,
      paidLeave: 2,
      unpaidLeave: 0,
      absent: 0,
      halfDay: 0,
      weekOff: 4,
      holiday: 1,
      lopDays: 2,
      payableDays: 29,
    },
    summary: {
      grossEarnings: 85000,
      employeeDeductionsTotal: 8500,
      netPay: 76500,
      employerContributionsTotal: 4800,
      employerCost: 89800,
    },
  };
}

function tableCss(style: HrTableBlockStyle): {
  table: string;
  th: string;
  td: string;
  section: string;
  total: string;
} {
  const compact = style === "compact";
  const bordered = style === "bordered" || style === "highlight_totals";
  const pad = compact ? "3px 6px" : "5px 8px";
  const border = bordered ? "1px solid #e2e8f0" : "none";
  const bottom = bordered ? "1px solid #e2e8f0" : "1px solid #f1f5f9";
  return {
    table: `width:100%;border-collapse:collapse;font-size:${compact ? "11px" : "12px"};margin:10px 0;${
      bordered ? "border:1px solid #cbd5e1;" : ""
    }`,
    th: `text-align:left;padding:${pad};border-bottom:2px solid #94a3b8;background:#f8fafc;font-weight:600;border:${border};`,
    td: `padding:${pad};border-bottom:${bottom};border:${border};vertical-align:top;`,
    section: `padding:${pad};background:#f1f5f9;font-weight:700;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;border:${border};`,
    total:
      style === "highlight_totals"
        ? `padding:${pad};font-weight:700;background:#fff7ed;border-top:2px solid #D96A10;border:${border};`
        : `padding:${pad};font-weight:700;background:#f8fafc;border-top:2px solid #cbd5e1;border:${border};`,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function breakupLabel(line: ResolvedSalaryLine): string {
  if (line.calcMode === "system" || line.status === "system") return "System Calculated";
  if (line.calcMode === "fixed") return "Fixed";
  const m = line.displayCalculation.match(/^(\d+(?:\.\d+)?%)/);
  if (m) return m[1]!;
  if (line.displayCalculation.includes("%")) return line.displayCalculation;
  return line.displayCalculation || "—";
}

function amountCell(line: ResolvedSalaryLine): string {
  if (line.amount != null && line.status === "resolved") return formatInrAmount(line.amount);
  if (line.status === "system") return "Not Configured";
  if (line.displayAmount && line.displayAmount !== "Unable to Calculate") {
    return escapeHtml(line.displayAmount);
  }
  return "—";
}

function annualFromMonthly(monthly: number | null): string {
  if (monthly == null) return "—";
  /* Limitation: recurring monthly assumption — no one-time metadata yet */
  return formatInrAmount(monthly * 12);
}

function renderSalaryBreakupTable(
  settingsRaw: HrBlockSettings,
  data: TemplateBlockRenderData,
): string {
  const s = normalizeSalaryBreakupSettings(settingsRaw);
  const resolution =
    data.salaryResolution ??
    (data.useSampleFallback !== false ? buildSampleSalaryResolution() : null);

  if (!resolution || (!resolution.earnings.length && !resolution.monthlyCtc)) {
    return `<div style="font-size:12px;color:#64748b;padding:8px;border:1px dashed #cbd5e1;border-radius:8px;margin:8px 0;">Salary breakup unavailable — assign Salary Structure and Monthly CTC.</div>`;
  }

  const css = tableCss(s.style);
  const cols: { key: string; align: "left" | "right"; header: string }[] = [
    {
      key: "component",
      align: "left",
      header: s.showEmployeeNameInHeader
        ? escapeHtml(data.employeeName || "Employee")
        : "Component",
    },
  ];
  if (s.showBreakup) cols.push({ key: "breakup", align: "left", header: "Break-up" });
  if (s.showMonthly) cols.push({ key: "monthly", align: "right", header: "Per Month" });
  if (s.showAnnual) cols.push({ key: "annual", align: "right", header: "Per Annum" });

  const colCount = cols.length;

  const rowHtml = (cells: string[], opts?: { total?: boolean; section?: boolean }) => {
    if (opts?.section) {
      return `<tr><td colspan="${colCount}" style="${css.section}">${cells[0]}</td></tr>`;
    }
    const style = opts?.total ? css.total : css.td;
    return `<tr>${cells
      .map((c, i) => {
        const align = cols[i]?.align === "right" ? "text-align:right;" : "text-align:left;";
        return `<td style="${style}${align}">${c}</td>`;
      })
      .join("")}</tr>`;
  };

  const lineCells = (line: ResolvedSalaryLine) => {
    const monthly = line.amount;
    const cells: string[] = [escapeHtml(line.componentName)];
    if (s.showBreakup) cells.push(escapeHtml(breakupLabel(line)));
    if (s.showMonthly) cells.push(amountCell(line));
    if (s.showAnnual) {
      cells.push(
        monthly != null && line.status === "resolved" ? annualFromMonthly(monthly) : "—",
      );
    }
    return cells;
  };

  const parts: string[] = [];
  if (s.title) {
    parts.push(
      `<div style="font-size:12px;font-weight:600;margin:4px 0 2px;color:#1A3A96;">${escapeHtml(
        s.title,
      )}${
        data.useSampleFallback && !data.salaryResolution
          ? ' <span style="font-weight:500;color:#94a3b8;font-size:10px;">(Sample preview)</span>'
          : ""
      }</div>`,
    );
  }

  parts.push(`<table style="${css.table}"><thead><tr>`);
  for (const c of cols) {
    const align = c.align === "right" ? "text-align:right;" : "text-align:left;";
    parts.push(`<th style="${css.th}${align}">${c.header}</th>`);
  }
  parts.push(`</tr></thead><tbody>`);

  for (const e of resolution.earnings) {
    parts.push(rowHtml(lineCells(e)));
  }

  if (s.showGross) {
    const g = resolution.configuredEarningsTotal;
    const cells: string[] = ["Gross Salary"];
    if (s.showBreakup) cells.push("");
    if (s.showMonthly) cells.push(g != null ? formatInrAmount(g) : "—");
    if (s.showAnnual) cells.push(g != null ? annualFromMonthly(g) : "—");
    parts.push(rowHtml(cells, { total: true }));
  }

  if (s.showDeductions && resolution.deductions.length > 0) {
    parts.push(rowHtml(["Deductions"], { section: true }));
    for (const d of resolution.deductions) {
      parts.push(rowHtml(lineCells(d)));
    }
  }

  if (s.showEmployerContributions && resolution.employerContributions.length > 0) {
    parts.push(rowHtml(["Employer Contributions"], { section: true }));
    for (const d of resolution.employerContributions) {
      parts.push(rowHtml(lineCells(d)));
    }
  }

  if (s.showNet) {
    const gross = resolution.configuredEarningsTotal;
    const dedSum = resolution.deductions
      .filter((d) => d.amount != null && d.status === "resolved")
      .reduce((a, d) => a + (d.amount as number), 0);
    const hasAnyDed = resolution.deductions.some(
      (d) => d.amount != null && d.status === "resolved",
    );
    const net = gross != null && hasAnyDed ? gross - dedSum : gross;
    const cells: string[] = [escapeHtml(s.totalLabel || "Indicative Net")];
    if (s.showBreakup) cells.push("");
    if (s.showMonthly) cells.push(net != null ? formatInrAmount(net) : "—");
    if (s.showAnnual) cells.push(net != null ? annualFromMonthly(net) : "—");
    parts.push(rowHtml(cells, { total: true }));
  }

  if (s.showCtcTotal && resolution.monthlyCtc != null) {
    const cells: string[] = ["Annual CTC"];
    if (s.showBreakup) cells.push("");
    if (s.showMonthly) cells.push(formatInrAmount(resolution.monthlyCtc));
    if (s.showAnnual) {
      cells.push(
        resolution.annualCtc != null
          ? formatInrAmount(resolution.annualCtc)
          : annualFromMonthly(resolution.monthlyCtc),
      );
    }
    parts.push(rowHtml(cells, { total: true }));
  }

  parts.push(`</tbody></table>`);
  return parts.join("");
}

function renderNamedAmountTable(
  title: string,
  rows: { name: string; amount: string }[],
  style: HrTableBlockStyle,
  totalLabel?: string,
  totalValue?: string,
): string {
  const css = tableCss(style);
  const body = rows
    .map(
      (r) =>
        `<tr><td style="${css.td}">${escapeHtml(r.name)}</td><td style="${css.td}text-align:right;">${escapeHtml(
          r.amount,
        )}</td></tr>`,
    )
    .join("");
  const totalRow =
    totalLabel && totalValue
      ? `<tr><td style="${css.total}">${escapeHtml(totalLabel)}</td><td style="${css.total}text-align:right;">${escapeHtml(
          totalValue,
        )}</td></tr>`
      : "";
  return `<table style="${css.table}"><caption style="text-align:left;font-weight:600;margin-bottom:4px;color:#1A3A96;">${escapeHtml(
    title,
  )}</caption><thead><tr><th style="${css.th}">Component</th><th style="${css.th}text-align:right;">Amount</th></tr></thead><tbody>${body}${totalRow}</tbody></table>`;
}

function resolvePayrollData(
  data: TemplateBlockRenderData,
): NonNullable<TemplateBlockRenderData["payroll"]> | null {
  if (data.payroll) return data.payroll;
  if (data.useSampleFallback !== false) return buildSamplePayrollBlockData();
  return null;
}

function renderEarningsTable(settingsRaw: HrBlockSettings, data: TemplateBlockRenderData): string {
  const s = normalizeSimpleTableSettings(settingsRaw, "Earnings");
  const payroll = resolvePayrollData(data);
  if (!payroll?.earnings.length) {
    return `<div style="font-size:12px;color:#64748b;padding:8px;border:1px dashed #cbd5e1;border-radius:8px;">Earnings unavailable — use finalized payroll result.</div>`;
  }
  const rows = payroll.earnings.map((e) => ({
    name: e.name,
    amount: formatInrAmount(e.amount),
  }));
  const total = s.showTotals
    ? formatInrAmount(payroll.earnings.reduce((a, e) => a + e.amount, 0))
    : undefined;
  return renderNamedAmountTable(s.title, rows, s.style, s.showTotals ? "Total Earnings" : undefined, total);
}

function renderDeductionsTable(
  settingsRaw: HrBlockSettings,
  data: TemplateBlockRenderData,
): string {
  const s = normalizeSimpleTableSettings(settingsRaw, "Deductions");
  const payroll = resolvePayrollData(data);
  if (!payroll?.deductions.length) {
    return `<div style="font-size:12px;color:#64748b;padding:8px;border:1px dashed #cbd5e1;border-radius:8px;">Deductions unavailable — use finalized payroll result.</div>`;
  }
  const rows = payroll.deductions.map((e) => ({
    name: e.name,
    amount: formatInrAmount(e.amount),
  }));
  const total = s.showTotals
    ? formatInrAmount(payroll.deductions.reduce((a, e) => a + e.amount, 0))
    : undefined;
  return renderNamedAmountTable(
    s.title,
    rows,
    s.style,
    s.showTotals ? "Total Deductions" : undefined,
    total,
  );
}

function renderEmployerTable(settingsRaw: HrBlockSettings, data: TemplateBlockRenderData): string {
  const s = normalizeSimpleTableSettings(settingsRaw, "Employer Contributions");
  const payroll = resolvePayrollData(data);
  if (!payroll?.employerContributions.length) {
    return `<div style="font-size:12px;color:#64748b;padding:8px;border:1px dashed #cbd5e1;border-radius:8px;">Employer contributions unavailable.</div>`;
  }
  const rows = payroll.employerContributions.map((e) => ({
    name: e.name,
    amount: formatInrAmount(e.amount),
  }));
  const total = s.showTotals
    ? formatInrAmount(payroll.employerContributions.reduce((a, e) => a + e.amount, 0))
    : undefined;
  const html = renderNamedAmountTable(
    s.title,
    rows,
    s.style,
    s.showTotals ? "Total Employer Contributions" : undefined,
    total,
  );
  return `${html}<p style="font-size:11px;color:#64748b;margin:2px 0 8px;">Employer contributions do not reduce Net Pay.</p>`;
}

function renderAttendanceSummary(
  settingsRaw: HrBlockSettings,
  data: TemplateBlockRenderData,
): string {
  const s = normalizeSimpleTableSettings(settingsRaw, "Attendance Summary");
  const att = resolvePayrollData(data)?.attendance;
  if (!att) {
    return `<div style="font-size:12px;color:#64748b;padding:8px;border:1px dashed #cbd5e1;border-radius:8px;">Attendance summary unavailable.</div>`;
  }
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, v: number | null | undefined) => {
    if (v === undefined) return;
    rows.push({ label, value: v == null ? "—" : String(v) });
  };
  push("Period Days", att.periodDays);
  push("Working Days", att.workingDays);
  push("Present Days", att.present);
  push("Paid Leave", att.paidLeave);
  push("Unpaid Leave", att.unpaidLeave);
  push("Absent", att.absent);
  push("Half Day", att.halfDay);
  push("Weekly Off", att.weekOff);
  push("Public Holiday", att.holiday);
  push("LOP", att.lopDays);
  push("Payable Days", att.payableDays);

  const css = tableCss(s.style);
  const body = rows
    .map(
      (r) =>
        `<tr><td style="${css.td}">${escapeHtml(r.label)}</td><td style="${css.td}text-align:right;">${escapeHtml(
          r.value,
        )}</td></tr>`,
    )
    .join("");
  return `<table style="${css.table}"><caption style="text-align:left;font-weight:600;margin-bottom:4px;color:#1A3A96;">${escapeHtml(
    s.title,
  )}</caption><tbody>${body}</tbody></table>`;
}

function renderPayrollSummary(
  settingsRaw: HrBlockSettings,
  data: TemplateBlockRenderData,
): string {
  const s = normalizeSimpleTableSettings(settingsRaw, "Payroll Summary");
  const summary = resolvePayrollData(data)?.summary;
  if (!summary) {
    return `<div style="font-size:12px;color:#64748b;padding:8px;border:1px dashed #cbd5e1;border-radius:8px;">Payroll summary unavailable.</div>`;
  }
  const css = tableCss(s.style);
  const rows = [
    ["Gross Earnings", formatInrAmount(summary.grossEarnings)],
    ["Total Employee Deductions", formatInrAmount(summary.employeeDeductionsTotal)],
    ["Net Pay", formatInrAmount(summary.netPay)],
    ["Employer Contributions", formatInrAmount(summary.employerContributionsTotal)],
  ];
  if (summary.employerCost != null) {
    rows.push(["Employer Cost", formatInrAmount(summary.employerCost)]);
  }
  const body = rows
    .map(([label, val], i) => {
      const isNet = label === "Net Pay";
      const st = isNet ? css.total : css.td;
      return `<tr><td style="${st}">${label}</td><td style="${st}text-align:right;">${val}</td></tr>`;
    })
    .join("");
  return `<table style="${css.table}"><caption style="text-align:left;font-weight:600;margin-bottom:4px;color:#1A3A96;">${escapeHtml(
    s.title,
  )}</caption><tbody>${body}</tbody></table>`;
}

const SALARY_TYPES: HrTemplateTypeKey[] = [
  "offer_letter",
  "appointment_letter",
  "increment_letter",
  "promotion_letter",
  "custom",
];

const PAYSLIP_TYPES: HrTemplateTypeKey[] = ["payslip", "custom"];

export const HR_TEMPLATE_BLOCK_REGISTRY: HrTemplateBlockDefinition[] = [
  {
    id: "salary_breakup_table",
    label: "Salary Breakup Table",
    description: "Employee salary assignment / structure rows (Offer, Appointment, Increment).",
    token: "salary_breakup_table",
    allowedTemplateTypes: SALARY_TYPES,
    defaultSettings: () => defaultSalaryBreakupSettings(),
    normalizeSettings: (raw) => normalizeSalaryBreakupSettings(raw),
    render: renderSalaryBreakupTable,
  },
  {
    id: "earnings_table",
    label: "Earnings Table",
    description: "Finalized payroll earnings.",
    token: "earnings_table",
    allowedTemplateTypes: PAYSLIP_TYPES,
    defaultSettings: () => defaultSimpleTableSettings("Earnings"),
    normalizeSettings: (raw) => normalizeSimpleTableSettings(raw, "Earnings"),
    render: renderEarningsTable,
  },
  {
    id: "deductions_table",
    label: "Deductions Table",
    description: "Finalized payroll employee deductions.",
    token: "deductions_table",
    allowedTemplateTypes: PAYSLIP_TYPES,
    defaultSettings: () => defaultSimpleTableSettings("Deductions"),
    normalizeSettings: (raw) => normalizeSimpleTableSettings(raw, "Deductions"),
    render: renderDeductionsTable,
  },
  {
    id: "employer_contributions_table",
    label: "Employer Contributions Table",
    description: "Employer PF/ESI/LWF — does not reduce Net Pay.",
    token: "employer_contributions_table",
    allowedTemplateTypes: PAYSLIP_TYPES,
    defaultSettings: () => defaultSimpleTableSettings("Employer Contributions"),
    normalizeSettings: (raw) => normalizeSimpleTableSettings(raw, "Employer Contributions"),
    render: renderEmployerTable,
  },
  {
    id: "attendance_summary",
    label: "Attendance Summary",
    description: "Attendance figures from payroll result.",
    token: "attendance_summary",
    allowedTemplateTypes: PAYSLIP_TYPES,
    defaultSettings: () => defaultSimpleTableSettings("Attendance Summary"),
    normalizeSettings: (raw) => normalizeSimpleTableSettings(raw, "Attendance Summary"),
    render: renderAttendanceSummary,
  },
  {
    id: "payroll_summary",
    label: "Payroll Summary",
    description: "Gross, deductions, Net Pay from payroll result.",
    token: "payroll_summary",
    allowedTemplateTypes: PAYSLIP_TYPES,
    defaultSettings: () => defaultSimpleTableSettings("Payroll Summary"),
    normalizeSettings: (raw) => normalizeSimpleTableSettings(raw, "Payroll Summary"),
    render: renderPayrollSummary,
  },
];

export function getBlockDefinition(
  type: string,
): HrTemplateBlockDefinition | undefined {
  return HR_TEMPLATE_BLOCK_REGISTRY.find((b) => b.id === type || b.token === type);
}

export function isBlockAllowedForTemplateType(
  blockType: HrTemplateBlockType,
  templateType: HrTemplateTypeKey,
): boolean {
  const def = getBlockDefinition(blockType);
  if (!def) return false;
  if (def.allowedTemplateTypes === "all") return true;
  return def.allowedTemplateTypes.includes(templateType);
}

export function blockCompatibilityWarning(
  blockType: HrTemplateBlockType,
  templateType: HrTemplateTypeKey,
): string | null {
  if (isBlockAllowedForTemplateType(blockType, templateType)) return null;
  const def = getBlockDefinition(blockType);
  const allowed =
    def && def.allowedTemplateTypes !== "all"
      ? def.allowedTemplateTypes.join(", ")
      : "specific templates";
  return `This block is normally available for: ${allowed}.`;
}

export function buildBlockChipHtml(
  block: HrTemplateBlockInstance,
  label?: string,
): string {
  const def = getBlockDefinition(block.blockType);
  const text = label || def?.label || block.blockType;
  return `<span class="${CHIP_CLASS}" data-hr-block-type="${block.blockType}" data-hr-block-id="${block.id}" contenteditable="false" style="display:inline-block;margin:2px 4px;padding:3px 8px;border-radius:6px;border:1px solid #FFCB90;background:#FFF3E8;color:#B85508;font-size:11px;font-weight:600;cursor:pointer;user-select:none;vertical-align:middle;">[${escapeHtml(
    text,
  )}]</span>`;
}

export function createBlockInstance(
  blockType: HrTemplateBlockType,
  settings?: HrBlockSettings,
): HrTemplateBlockInstance {
  const def = getBlockDefinition(blockType);
  return {
    id: newBlockInstanceId(),
    blockType,
    settings: def
      ? def.normalizeSettings(settings ?? def.defaultSettings())
      : settings ?? {},
  };
}

export function normalizeBlockInstance(raw: unknown): HrTemplateBlockInstance | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const blockType = String(o.blockType ?? "") as HrTemplateBlockType;
  const def = getBlockDefinition(blockType);
  if (!def) return null;
  return {
    id: typeof o.id === "string" && o.id ? o.id : newBlockInstanceId(),
    blockType: def.id,
    settings: def.normalizeSettings(o.settings),
  };
}

export function extractBlockIdsFromHtml(html: string): string[] {
  const ids: string[] = [];
  const re = /data-hr-block-id=["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html || ""))) {
    ids.push(m[1]!);
  }
  return ids;
}

export function syncBlocksWithHtml(
  blocks: HrTemplateBlockInstance[],
  ...htmlParts: string[]
): HrTemplateBlockInstance[] {
  const used = new Set(htmlParts.flatMap((h) => extractBlockIdsFromHtml(h)));
  // Keep blocks referenced in HTML; also keep any that appear as legacy tokens only once
  return blocks.filter((b) => used.has(b.id));
}

export function renderUnsupportedBlock(token: string): string {
  return `<div style="font-size:12px;color:#b45309;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px;margin:8px 0;">Unsupported dynamic block: {{${escapeHtml(
    token,
  )}}}</div>`;
}

export function renderBlockInstance(
  block: HrTemplateBlockInstance,
  data: TemplateBlockRenderData,
): string {
  const def = getBlockDefinition(block.blockType);
  if (!def) return renderUnsupportedBlock(block.blockType);
  try {
    return def.render(block.settings, data);
  } catch {
    return renderUnsupportedBlock(block.blockType);
  }
}

/**
 * Replace block chips + legacy {{token}} placeholders with rendered HTML.
 */
export function replaceDynamicBlocksInHtml(
  html: string,
  blocks: HrTemplateBlockInstance[],
  data: TemplateBlockRenderData,
  options?: { templateType?: HrTemplateTypeKey },
): string {
  let out = html || "";
  const byId = new Map(blocks.map((b) => [b.id, b]));

  // Chip replacements (once)
  const chipTypesPresent = new Set<string>();
  const replaceChip = (_full: string, id: string) => {
    const block = byId.get(id);
    if (!block) return renderUnsupportedBlock("unknown");
    chipTypesPresent.add(block.blockType);
    return renderBlockInstance(block, data);
  };
  out = out.replace(
    /<span[^>]*class=["'][^"']*hr-tpl-block-chip[^"']*["'][^>]*data-hr-block-id=["']([^"']+)["'][^>]*>[\s\S]*?<\/span>/gi,
    replaceChip,
  );
  out = out.replace(
    /<span[^>]*data-hr-block-id=["']([^"']+)["'][^>]*class=["'][^"']*hr-tpl-block-chip[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,
    replaceChip,
  );

  // Legacy {{token}} — skip if a chip of the same type already rendered (avoids double tables)
  for (const def of HR_TEMPLATE_BLOCK_REGISTRY) {
    const tokenRe = new RegExp(`\\{\\{\\s*${def.token}\\s*\\}\\}`, "gi");
    if (!tokenRe.test(out)) continue;
    tokenRe.lastIndex = 0;
    if (chipTypesPresent.has(def.id)) {
      out = out.replace(tokenRe, "");
      continue;
    }
    const existing = blocks.find((b) => b.blockType === def.id);
    const rendered = existing
      ? renderBlockInstance(existing, data)
      : def.render(def.defaultSettings(), data);
    out = out.replace(tokenRe, () => {
      if (
        options?.templateType &&
        !isBlockAllowedForTemplateType(def.id, options.templateType) &&
        options.templateType === "payslip" &&
        def.id === "salary_breakup_table"
      ) {
        return `${rendered}<div style="font-size:11px;color:#b45309;margin:4px 0;">Note: Prefer payroll-specific blocks for Payslip templates.</div>`;
      }
      return rendered;
    });
  }

  // Unknown {{something_table}} style tokens that look like blocks
  out = out.replace(/\{\{\s*([a-zA-Z0-9_]+_table|attendance_summary|payroll_summary)\s*\}\}/gi, (full, key: string) => {
    if (getBlockDefinition(key)) return full; // already handled
    return renderUnsupportedBlock(key);
  });

  return out;
}

export function collectBlockCompatibilityWarnings(
  blocks: HrTemplateBlockInstance[],
  htmlParts: string[],
  templateType: HrTemplateTypeKey,
): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const b of blocks) {
    const w = blockCompatibilityWarning(b.blockType, templateType);
    if (w && !seen.has(b.blockType)) {
      seen.add(b.blockType);
      warnings.push(`${getBlockDefinition(b.blockType)?.label ?? b.blockType}: ${w}`);
    }
  }

  const joined = htmlParts.join("\n");
  for (const def of HR_TEMPLATE_BLOCK_REGISTRY) {
    const re = new RegExp(`\\{\\{\\s*${def.token}\\s*\\}\\}`, "i");
    if (re.test(joined) && !isBlockAllowedForTemplateType(def.id, templateType)) {
      const w = blockCompatibilityWarning(def.id, templateType);
      if (w && !seen.has(def.id)) {
        seen.add(def.id);
        warnings.push(`${def.label}: ${w}`);
      }
    }
  }

  return warnings;
}
