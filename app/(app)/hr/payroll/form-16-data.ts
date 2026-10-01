/**
 * Form 16 — Admin DEMO store (localStorage only).
 *
 * PRODUCT MODEL (no third-party integration):
 * - Part A: manual HR upload
 * - Part B: PVB annual computation from internal sources (see pipeline below)
 * - Signing / filing: manual process; PVB only records status metadata
 * - Publish: makes Form 16 available for Employee App download (demo)
 *
 * PART B PIPELINE (canonical product flow):
 *   Employee Master
 *     + Company / Statutory Settings
 *     + Finalized Payroll Apr–Mar
 *     + Employee Tax Regime
 *     + Tax / Deduction Data
 *         ↓
 *   Annual Tax Computation (demo-grade; not legally certified)
 *         ↓
 *   FORM 16 PART B
 *
 * NOT a legally valid Form 16. No TRACES / IT portal / DSC / filing APIs.
 * Does NOT mutate payroll runs or TDS calculation engines.
 */

import {
  getHrEmployeeById,
  loadHrEmployees,
  type HrEmployee,
} from "@/app/(app)/hr/employees/employee-master-data";
import { loadCompanyProfile } from "@/app/(app)/hr/settings/organization-data";
import {
  getEmployeeTaxRegimeChoice,
  resolveTdsEstimate,
  type EmployeeTaxRegimeChoice,
} from "@/app/(app)/hr/settings/tax-settings-data";
import {
  listFinalizedPayrollRuns,
  type PayrollEmployeeResult,
  type PayrollRun,
} from "./payroll-run-data";

export const FORM16_STORAGE_KEY = "ds_hr_form16_demo_v1";
export const FORM16_DEFAULT_FY = "2025-26";

export type Form16PartAStatus = "pending" | "uploaded";
export type Form16PartBStatus = "not_generated" | "generated";
export type Form16Status = "pending" | "ready_to_publish" | "published";
export type Form16FilingStatus = "not_filed" | "filed";
export type Form16TaxRegime = "old" | "new";

export interface Form16EmployerSnapshot {
  companyName: string;
  employerPan: string;
  /** Demo TAN — not from an external portal */
  tan: string;
  address: string;
}

export interface Form16SalarySnapshot {
  grossSalary: number;
  exemptions: number;
  deductions: number;
  taxableIncome: number;
  incomeTax: number;
  cess: number;
  totalTaxLiability: number;
  tdsDeducted: number;
  balanceTax: number;
}

/** Trace of inputs used for Part B — demo transparency, not a filing audit. */
export interface Form16PartBComputation {
  computedAt: string;
  financialYear: string;
  assessmentYear: string;
  sources: {
    employeeMaster: boolean;
    companySettings: boolean;
    finalizedPayrollMonths: number;
    employeeTaxRegime: EmployeeTaxRegimeChoice | Form16TaxRegime | "demo_seed";
    taxDeductionData: boolean;
  };
  payrollMonthsCovered: string[];
  notes: string[];
}

export interface Form16Record {
  id: string;
  financialYear: string;
  assessmentYear: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  designation: string;
  /** Synthetic demo PAN — not real tax IDs */
  pan: string;
  taxRegime: Form16TaxRegime;
  employer: Form16EmployerSnapshot;
  salary: Form16SalarySnapshot;
  partAStatus: Form16PartAStatus;
  partAUploadedAt: string | null;
  partAFileName: string | null;
  /** Always "Manual upload" — no TRACES integration */
  partASource: "Manual upload";
  partBStatus: Form16PartBStatus;
  partBGeneratedAt: string | null;
  partBComputation: Form16PartBComputation | null;
  verified: boolean;
  verifiedOn: string | null;
  verifiedBy: string | null;
  signed: boolean;
  signedOn: string | null;
  signedBy: string | null;
  signedRemarks: string;
  filingStatus: Form16FilingStatus;
  filingDate: string | null;
  acknowledgementNumber: string;
  filingRemarks: string;
  form16Status: Form16Status;
  publishedAt: string | null;
  publishedBy: string | null;
  updatedAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function assessmentYearForFy(fy: string): string {
  const [a, b] = fy.split("-");
  if (!a || !b) return "2026-27";
  const start = Number(a);
  const end = b.length === 2 ? 2000 + Number(b) : Number(b);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "2026-27";
  return `${end}-${String(end + 1).slice(-2)}`;
}

/** FY 2025-26 → Apr 2025 … Mar 2026 */
export function fyMonthPairs(fy: string): { year: number; month: number }[] {
  const [a, b] = fy.split("-");
  const startYear = Number(a);
  const endYear = b?.length === 2 ? 2000 + Number(b) : Number(b);
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return [];
  const out: { year: number; month: number }[] = [];
  for (let m = 4; m <= 12; m++) out.push({ year: startYear, month: m });
  for (let m = 1; m <= 3; m++) out.push({ year: endYear, month: m });
  return out;
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function demoEmployer(): Form16EmployerSnapshot {
  const c = loadCompanyProfile();
  const addr = [c.addressLine1, c.addressLine2, c.city, c.state, c.pincode]
    .filter(Boolean)
    .join(", ");
  return {
    companyName: c.companyName || "Dharitri Sutra",
    employerPan: c.pan?.trim() ? c.pan.trim() : "DEMOEP1234A",
    tan: "DEMOD12345E",
    address: addr || "Pune, Maharashtra, India",
  };
}

function salary(
  gross: number,
  exemptions: number,
  deductions: number,
  tax: number,
  cess: number,
  tds: number,
): Form16SalarySnapshot {
  const taxableIncome = Math.max(0, gross - exemptions - deductions);
  const totalTaxLiability = tax + cess;
  return {
    grossSalary: gross,
    exemptions,
    deductions,
    taxableIncome,
    incomeTax: tax,
    cess,
    totalTaxLiability,
    tdsDeducted: tds,
    balanceTax: Math.max(0, totalTaxLiability - tds),
  };
}

function deriveForm16Status(
  r: Pick<Form16Record, "partAStatus" | "partBStatus" | "form16Status">,
): Form16Status {
  if (r.form16Status === "published") return "published";
  if (r.partAStatus === "uploaded" && r.partBStatus === "generated") return "ready_to_publish";
  return "pending";
}

function resolveRegimeForForm16(
  employee: HrEmployee | null,
  fallback: Form16TaxRegime,
): Form16TaxRegime {
  if (!employee) return fallback;
  const choice = getEmployeeTaxRegimeChoice(employee);
  if (choice === "old" || choice === "new") return choice;
  return fallback;
}

function isTdsLine(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("tds") || n.includes("tax deducted");
}

function findEmployeeInRun(
  run: PayrollRun,
  employeeId: number,
): PayrollEmployeeResult | null {
  return (
    run.employees.find((e) => e.employeeId === employeeId && e.status === "calculated") ?? null
  );
}

/**
 * Annual tax computation for Form 16 Part B (DEMO).
 * Reads finalized payroll + employee/company/tax regime — does not write payroll.
 */
export function computeAnnualForm16PartB(input: {
  employeeId: number;
  financialYear: string;
  fallbackSalary?: Form16SalarySnapshot;
  fallbackRegime?: Form16TaxRegime;
}): {
  salary: Form16SalarySnapshot;
  taxRegime: Form16TaxRegime;
  employer: Form16EmployerSnapshot;
  employeeCode: string;
  employeeName: string;
  designation: string;
  computation: Form16PartBComputation;
} {
  const fy = input.financialYear;
  const ay = assessmentYearForFy(fy);
  const employer = demoEmployer();
  const employee = getHrEmployeeById(input.employeeId) ?? null;
  const months = fyMonthPairs(fy);
  const monthSet = new Set(months.map((m) => monthKey(m.year, m.month)));

  const finalized = listFinalizedPayrollRuns().filter((r) =>
    monthSet.has(monthKey(r.periodYear, r.periodMonth)),
  );

  const byMonth = new Map<string, PayrollRun>();
  for (const run of finalized) {
    const key = monthKey(run.periodYear, run.periodMonth);
    const prev = byMonth.get(key);
    if (!prev || (run.finalizedAt ?? "") > (prev.finalizedAt ?? "")) {
      byMonth.set(key, run);
    }
  }

  let gross = 0;
  let nonTaxDeductions = 0;
  let tdsDeducted = 0;
  const covered: string[] = [];
  let monthsWithEmployee = 0;

  for (const [key, run] of byMonth) {
    const row = findEmployeeInRun(run, input.employeeId);
    if (!row) continue;
    monthsWithEmployee += 1;
    covered.push(run.periodLabel || key);
    gross += row.grossEarnings || 0;
    for (const d of row.deductions) {
      if (isTdsLine(d.componentName)) tdsDeducted += d.amount || 0;
      else nonTaxDeductions += d.amount || 0;
    }
  }

  const regimeChoice = employee ? getEmployeeTaxRegimeChoice(employee) : "company_default";
  const taxRegime = resolveRegimeForForm16(employee, input.fallbackRegime ?? "new");
  const monthlyCtc =
    employee?.profileSummaries?.payroll?.monthlyCtc ??
    (monthsWithEmployee > 0 ? Math.round(gross / monthsWithEmployee) : null);

  const notes: string[] = [];
  let exemptions = 0;
  let incomeTax = 0;
  let cess = 0;

  if (monthsWithEmployee > 0) {
    notes.push(
      `Aggregated ${monthsWithEmployee} finalized payroll month(s) for FY ${fy} (Apr–Mar).`,
    );
  } else {
    notes.push(
      "No finalized payroll months found for this employee in FY — using demo seed / prior snapshot figures.",
    );
  }

  const tdsRes = resolveTdsEstimate({
    hasTdsInStructure: true,
    employeeChoice: regimeChoice,
    monthlyCtc: monthlyCtc && monthlyCtc > 0 ? monthlyCtc : null,
    payrollDate: `${fyMonthPairs(fy)[0]?.year ?? 2025}-04-01`,
  });

  if (tdsRes.status === "calculated" || tdsRes.annualTaxEstimate != null) {
    const annualTax = Math.round(tdsRes.annualTaxEstimate ?? 0);
    incomeTax = Math.round(annualTax / 1.04);
    cess = Math.max(0, annualTax - incomeTax);
    exemptions = Math.round(tdsRes.standardDeduction ?? 0);
    if (monthsWithEmployee === 0 && tdsRes.projectedAnnualIncome != null) {
      gross = Math.round(tdsRes.projectedAnnualIncome + exemptions);
    }
    notes.push(
      `Tax regime source: ${tdsRes.regimeSource ?? "settings"} · ${tdsRes.regimeRuleName ?? taxRegime}.`,
    );
    notes.push(
      "Annual tax figures are demo projections from Tax Settings — not statutory Form 16.",
    );
  } else if (input.fallbackSalary) {
    exemptions = input.fallbackSalary.exemptions;
    incomeTax = input.fallbackSalary.incomeTax;
    cess = input.fallbackSalary.cess;
    if (monthsWithEmployee === 0) {
      gross = input.fallbackSalary.grossSalary;
      nonTaxDeductions = input.fallbackSalary.deductions;
      tdsDeducted = input.fallbackSalary.tdsDeducted;
    }
    notes.push(
      `Tax estimate unavailable (${tdsRes.status}) — retained demo snapshot tax figures.`,
    );
  } else {
    notes.push(`Tax estimate status: ${tdsRes.status}. Tax fields left at zero where unknown.`);
  }

  const deductions = Math.round(nonTaxDeductions);
  if (monthsWithEmployee > 0 && tdsDeducted === 0 && tdsRes.monthlyTdsEstimate != null) {
    tdsDeducted = Math.round((tdsRes.monthlyTdsEstimate || 0) * monthsWithEmployee);
    notes.push(
      "TDS line missing on payroll rows — estimated from monthly TDS × months covered (demo).",
    );
  }

  const salarySnap = salary(
    gross,
    exemptions,
    deductions,
    incomeTax,
    cess,
    Math.round(tdsDeducted),
  );

  return {
    salary: salarySnap,
    taxRegime,
    employer,
    employeeCode: employee?.employeeCode ?? `EMP-${input.employeeId}`,
    employeeName: employee?.employeeName ?? "Employee",
    designation: employee?.designation ?? "—",
    computation: {
      computedAt: nowIso(),
      financialYear: fy,
      assessmentYear: ay,
      sources: {
        employeeMaster: Boolean(employee),
        companySettings: true,
        finalizedPayrollMonths: monthsWithEmployee,
        employeeTaxRegime: regimeChoice,
        taxDeductionData: monthsWithEmployee > 0 || tdsRes.annualTaxEstimate != null,
      },
      payrollMonthsCovered: covered,
      notes,
    },
  };
}

function seedRecords(fy: string): Form16Record[] {
  const employer = demoEmployer();
  const ay = assessmentYearForFy(fy);
  const employees = loadHrEmployees().slice(0, 5);
  const fallback = [
    { id: 1, employeeCode: "EMP-0001", employeeName: "Rahul Sharma", designation: "Area Sales Manager (ASM)" },
    { id: 2, employeeCode: "EMP-0002", employeeName: "Vikram Mehta", designation: "Zonal Sales Manager (ZSM)" },
    { id: 3, employeeCode: "EMP-0003", employeeName: "Amit Deshmukh", designation: "Territory Manager (TM)" },
    { id: 4, employeeCode: "EMP-0004", employeeName: "Sneha Patil", designation: "Key Account Manager (KAM)" },
    { id: 5, employeeCode: "EMP-0005", employeeName: "Karan Joshi", designation: "Intern" },
  ];
  const list = employees.length >= 5 ? employees : fallback;

  const configs: Array<{
    pan: string;
    regime: Form16TaxRegime;
    salary: Form16SalarySnapshot;
    partA: Form16PartAStatus;
    partB: Form16PartBStatus;
    published: boolean;
    verified: boolean;
    signed: boolean;
  }> = [
    {
      pan: "DEMOP1111A",
      regime: "new",
      salary: salary(840000, 0, 50000, 42000, 1680, 43680),
      partA: "uploaded",
      partB: "generated",
      published: true,
      verified: true,
      signed: true,
    },
    {
      pan: "DEMOP2222B",
      regime: "old",
      salary: salary(1200000, 150000, 80000, 78000, 3120, 81120),
      partA: "uploaded",
      partB: "generated",
      published: false,
      verified: true,
      signed: false,
    },
    {
      pan: "DEMOP3333C",
      regime: "new",
      salary: salary(660000, 0, 40000, 18000, 720, 18720),
      partA: "uploaded",
      partB: "generated",
      published: true,
      verified: true,
      signed: true,
    },
    {
      pan: "DEMOP4444D",
      regime: "old",
      salary: salary(540000, 100000, 30000, 12000, 480, 12480),
      partA: "pending",
      partB: "generated",
      published: false,
      verified: false,
      signed: false,
    },
    {
      pan: "DEMOP5555E",
      regime: "new",
      salary: salary(360000, 0, 20000, 0, 0, 0),
      partA: "uploaded",
      partB: "not_generated",
      published: false,
      verified: false,
      signed: false,
    },
  ];

  const ts = nowIso();
  return configs.map((cfg, i) => {
    const emp = list[i] ?? fallback[i];
    const live = getHrEmployeeById(emp.id);
    const base: Form16Record = {
      id: `f16-${fy}-${emp.id}`,
      financialYear: fy,
      assessmentYear: ay,
      employeeId: emp.id,
      employeeCode: live?.employeeCode ?? emp.employeeCode,
      employeeName: live?.employeeName ?? emp.employeeName,
      designation: live?.designation ?? emp.designation,
      pan: cfg.pan,
      taxRegime: cfg.regime,
      employer,
      salary: cfg.salary,
      partAStatus: cfg.partA,
      partAUploadedAt: cfg.partA === "uploaded" ? "2026-04-18T10:00:00.000Z" : null,
      partAFileName: cfg.partA === "uploaded" ? `PartA_${emp.employeeCode}_DEMO.pdf` : null,
      partASource: "Manual upload",
      partBStatus: cfg.partB,
      partBGeneratedAt: cfg.partB === "generated" ? "2026-04-20T11:30:00.000Z" : null,
      partBComputation:
        cfg.partB === "generated"
          ? {
              computedAt: "2026-04-20T11:30:00.000Z",
              financialYear: fy,
              assessmentYear: ay,
              sources: {
                employeeMaster: true,
                companySettings: true,
                finalizedPayrollMonths: 0,
                employeeTaxRegime: cfg.regime,
                taxDeductionData: true,
              },
              payrollMonthsCovered: [],
              notes: [
                "Seeded demo Part B snapshot.",
                "Re-run Generate Part B to recompute from finalized payroll Apr–Mar when available.",
              ],
            }
          : null,
      verified: cfg.verified,
      verifiedOn: cfg.verified ? "2026-04-21" : null,
      verifiedBy: cfg.verified ? "Admin" : null,
      signed: cfg.signed,
      signedOn: cfg.signed ? "2026-04-22" : null,
      signedBy: cfg.signed ? "Admin" : null,
      signedRemarks: cfg.signed ? "Manually signed outside PVB (demo)" : "",
      filingStatus: cfg.published ? "filed" : "not_filed",
      filingDate: cfg.published ? "2026-05-02" : null,
      acknowledgementNumber: cfg.published ? `DEMO-ACK-${1000 + i}` : "",
      filingRemarks: cfg.published ? "Filed manually outside PVB (demo)" : "",
      form16Status: "pending",
      publishedAt: cfg.published ? "2026-04-25T09:00:00.000Z" : null,
      publishedBy: cfg.published ? "Admin" : null,
      updatedAt: ts,
    };
    base.form16Status = cfg.published ? "published" : deriveForm16Status(base);
    return base;
  });
}

interface Form16Store {
  version: 1;
  records: Form16Record[];
}

function readStore(): Form16Store {
  if (typeof window === "undefined") return { version: 1, records: [] };
  try {
    const raw = window.localStorage.getItem(FORM16_STORAGE_KEY);
    if (!raw) return { version: 1, records: [] };
    const parsed = JSON.parse(raw) as Form16Store;
    if (!parsed || !Array.isArray(parsed.records)) return { version: 1, records: [] };
    return {
      version: 1,
      records: parsed.records.map((r) => ({
        ...r,
        partBComputation: r.partBComputation ?? null,
      })),
    };
  } catch {
    return { version: 1, records: [] };
  }
}

function writeStore(store: Form16Store): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FORM16_STORAGE_KEY, JSON.stringify(store));
}

export function loadForm16Records(): Form16Record[] {
  const store = readStore();
  if (store.records.length === 0) {
    const seeded = seedRecords(FORM16_DEFAULT_FY);
    writeStore({ version: 1, records: seeded });
    return seeded;
  }
  return store.records;
}

export function saveForm16Records(records: Form16Record[]): void {
  writeStore({ version: 1, records });
}

export function listForm16FinancialYears(): string[] {
  const years = new Set(loadForm16Records().map((r) => r.financialYear));
  years.add(FORM16_DEFAULT_FY);
  years.add("2024-25");
  return Array.from(years).sort((a, b) => b.localeCompare(a));
}

export function getForm16ById(id: string): Form16Record | null {
  return loadForm16Records().find((r) => r.id === id) ?? null;
}

export function formatForm16Money(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatForm16FyLabel(fy: string): string {
  const [a, b] = fy.split("-");
  if (!a || !b) return fy;
  return `${a}–${b}`;
}

export function partALabel(s: Form16PartAStatus): string {
  return s === "uploaded" ? "Uploaded" : "Pending";
}

export function partBLabel(s: Form16PartBStatus): string {
  return s === "generated" ? "Generated" : "Not Generated";
}

export function form16StatusLabel(s: Form16Status): string {
  if (s === "published") return "Published";
  if (s === "ready_to_publish") return "Ready to Publish";
  return "Pending";
}

export function taxRegimeLabel(r: Form16TaxRegime): string {
  return r === "new" ? "New" : "Old";
}

function upsert(record: Form16Record): Form16Record {
  const list = loadForm16Records();
  const next = { ...record, updatedAt: nowIso() };
  next.form16Status =
    next.form16Status === "published" ? "published" : deriveForm16Status(next);
  const idx = list.findIndex((r) => r.id === next.id);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  saveForm16Records(list);
  return next;
}

export function uploadForm16PartA(id: string, fileName?: string): Form16Record | null {
  const cur = getForm16ById(id);
  if (!cur) return null;
  return upsert({
    ...cur,
    partAStatus: "uploaded",
    partAUploadedAt: nowIso(),
    partAFileName: fileName?.trim() || `PartA_${cur.employeeCode}_DEMO.pdf`,
    partASource: "Manual upload",
  });
}

/**
 * Generate Form 16 Part B via annual computation pipeline:
 * Employee Master + Company Settings + Finalized Payroll Apr–Mar
 * + Employee Tax Regime + Tax/Deduction Data → Annual Tax Computation → Part B
 */
export function generateForm16PartB(id: string): Form16Record | null {
  const cur = getForm16ById(id);
  if (!cur) return null;
  if (cur.form16Status === "published") return cur;

  const computed = computeAnnualForm16PartB({
    employeeId: cur.employeeId,
    financialYear: cur.financialYear,
    fallbackSalary: cur.salary,
    fallbackRegime: cur.taxRegime,
  });

  return upsert({
    ...cur,
    employeeCode: computed.employeeCode,
    employeeName: computed.employeeName,
    designation: computed.designation,
    taxRegime: computed.taxRegime,
    employer: computed.employer,
    salary: computed.salary,
    partBStatus: "generated",
    partBGeneratedAt: nowIso(),
    partBComputation: computed.computation,
  });
}

export function markForm16Verified(id: string, by = "Admin"): Form16Record | null {
  const cur = getForm16ById(id);
  if (!cur) return null;
  return upsert({
    ...cur,
    verified: true,
    verifiedOn: todayDate(),
    verifiedBy: by,
  });
}

export function markForm16Signed(
  id: string,
  opts?: { by?: string; remarks?: string },
): Form16Record | null {
  const cur = getForm16ById(id);
  if (!cur) return null;
  return upsert({
    ...cur,
    signed: true,
    signedOn: todayDate(),
    signedBy: opts?.by ?? "Admin",
    signedRemarks: opts?.remarks ?? cur.signedRemarks ?? "Manually signed outside PVB",
  });
}

export function updateForm16Filing(
  id: string,
  patch: {
    filingStatus: Form16FilingStatus;
    filingDate?: string;
    acknowledgementNumber?: string;
    filingRemarks?: string;
  },
): Form16Record | null {
  const cur = getForm16ById(id);
  if (!cur) return null;
  return upsert({
    ...cur,
    filingStatus: patch.filingStatus,
    filingDate: patch.filingDate ?? (patch.filingStatus === "filed" ? todayDate() : cur.filingDate),
    acknowledgementNumber: patch.acknowledgementNumber ?? cur.acknowledgementNumber,
    filingRemarks: patch.filingRemarks ?? cur.filingRemarks,
  });
}

export function publishForm16(
  id: string,
  by = "Admin",
): { record: Form16Record | null; error?: string } {
  const cur = getForm16ById(id);
  if (!cur) return { record: null, error: "Record not found." };
  if (cur.partAStatus !== "uploaded") {
    return { record: null, error: "Upload Part A before publishing." };
  }
  if (cur.partBStatus !== "generated") {
    return { record: null, error: "Generate Part B before publishing." };
  }
  const next = upsert({
    ...cur,
    form16Status: "published",
    publishedAt: nowIso(),
    publishedBy: by,
  });
  return { record: next };
}

export function form16SummaryCounts(records: Form16Record[]) {
  return {
    total: records.length,
    published: records.filter((r) => r.form16Status === "published").length,
    ready: records.filter((r) => r.form16Status === "ready_to_publish").length,
    pendingPartA: records.filter((r) => r.partAStatus === "pending").length,
  };
}
