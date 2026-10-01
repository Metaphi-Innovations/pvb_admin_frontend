import type { Distributor } from "@/app/(app)/database/distributor/distributor-data";

export type CompanyGrade = "A" | "B" | "Others";
export type DistributorCategory = "A" | "B" | "C";
export type CreditStatus = "Credit Allowed" | "Cash & Carry";

export const GRADE_A_COMPANIES = [
  "Syngenta",
  "Bayer",
  "Corteva",
  "BASF",
  "Crystal Crop Care",
  "Dhanuka",
  "BioStadt",
  "PI Industries",
  "FMC",
  "Coromandel",
  "UPL",
  "Sumitomo Chemicals",
  "Yara International",
  "Insecticide India Ltd",
  "Gharda Chemicals",
] as const;

export const GRADE_B_COMPANIES = [
  "JU Agri",
  "Godrej Agrovet",
  "Chambal Fertilizers",
  "Deepak Fertilizers",
  "Willowood Chemicals",
  "Indofil Industries",
  "IPL Biologicals",
  "Kan Biosys",
] as const;

const MIN_GRADE_COMPANIES = 3;

export interface CompanyGradeMapping {
  gradeA: string[];
  gradeB: string[];
  others: string[];
}

export interface ScoreBreakdownRow {
  criteria: string;
  rawData: string;
  marks: number;
  weightage: number;
  weightedPoints: number;
  reason: string;
}

export interface DistributorAssessment {
  companyMarks: number;
  turnoverMarks: number;
  tenureMarks: number;
  businessPlanMarks: number;
  weightedScore: number;
  totalWeightedPoints: number;
  category: DistributorCategory;
  creditLimit: number;
  creditPeriodDays: number;
  creditStatus: CreditStatus;
  paymentMode: "credit" | "cash_and_carry";
  companyGradeMapping: CompanyGradeMapping;
  companyScoreReason: string;
  breakdownRows: ScoreBreakdownRow[];
  annualBusinessPlanLakhs: number;
  /** Annual business plan in crores (SFA raw field unit) */
  annualBusinessPlanCrores: number;
  /** @deprecated use companyGradeMapping */
  companyGradeDetails: { company: string; grade: CompanyGrade; marks: number }[];
}

function normalizeCompanyName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseMonetaryValueInCrores(value: string): number {
  const numericValue = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  if (Number.isNaN(numericValue)) return 0;
  const lower = value.toLowerCase();
  if (lower.includes("lakh") || lower.includes("lac")) {
    return numericValue / 100;
  }
  return numericValue;
}

/** Legacy helper — prefer parseMonetaryValueInCrores */
export function parseMonetaryValueInLakhs(value: string): number {
  return parseMonetaryValueInCrores(value) * 100;
}

export function formatAmountInCrores(value: string): string {
  const cr = parseMonetaryValueInCrores(value);
  if (cr <= 0) return "—";
  return `₹${cr.toFixed(2)} Cr`;
}

export function parseCompaniesDealingIn(companiesDealingIn: string): string[] {
  return companiesDealingIn
    .split(/[,;|/]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function matchesGradeCompany(companyName: string, gradeCompany: string): boolean {
  const c = normalizeCompanyName(companyName);
  const g = normalizeCompanyName(gradeCompany);
  if (!c || !g) return false;
  return c === g || c.includes(g) || g.includes(c);
}

export function classifyCompany(companyName: string): CompanyGrade {
  if (GRADE_A_COMPANIES.some((g) => matchesGradeCompany(companyName, g))) return "A";
  if (GRADE_B_COMPANIES.some((g) => matchesGradeCompany(companyName, g))) return "B";
  return "Others";
}

export function buildCompanyGradeMapping(companies: string[]): CompanyGradeMapping {
  const mapping: CompanyGradeMapping = { gradeA: [], gradeB: [], others: [] };
  for (const company of companies) {
    const grade = classifyCompany(company);
    if (grade === "A") mapping.gradeA.push(company);
    else if (grade === "B") mapping.gradeB.push(company);
    else mapping.others.push(company);
  }
  return mapping;
}

function scoreCompanies(companiesDealingIn: string): {
  marks: number;
  reason: string;
  mapping: CompanyGradeMapping;
} {
  const companies = parseCompaniesDealingIn(companiesDealingIn);
  const mapping = buildCompanyGradeMapping(companies);

  if (mapping.gradeA.length >= MIN_GRADE_COMPANIES) {
    return {
      marks: 100,
      reason: `${mapping.gradeA.length} Grade A companies (minimum ${MIN_GRADE_COMPANIES} required)`,
      mapping,
    };
  }

  if (mapping.gradeB.length >= MIN_GRADE_COMPANIES) {
    return {
      marks: 60,
      reason: `${mapping.gradeB.length} Grade B companies (minimum ${MIN_GRADE_COMPANIES} required)`,
      mapping,
    };
  }

  const parts: string[] = [];
  if (mapping.gradeA.length > 0) {
    parts.push(`${mapping.gradeA.length} Grade A (need ${MIN_GRADE_COMPANIES})`);
  }
  if (mapping.gradeB.length > 0) {
    parts.push(`${mapping.gradeB.length} Grade B (need ${MIN_GRADE_COMPANIES})`);
  }
  if (parts.length === 0) parts.push("No Grade A/B threshold met");

  return {
    marks: 30,
    reason: parts.join(" · "),
    mapping,
  };
}

function scoreTurnover(annualTurnover: string): { marks: number; reason: string } {
  const cr = parseMonetaryValueInCrores(annualTurnover);
  if (cr >= 5) return { marks: 100, reason: "Turnover ≥ ₹5 Cr" };
  if (cr >= 2.5) return { marks: 60, reason: "Turnover ≥ ₹2.5 Cr and < ₹5 Cr" };
  return { marks: 30, reason: "Turnover < ₹2.5 Cr" };
}

function scoreTenure(yearsInBusiness: number): { marks: number; reason: string } {
  if (yearsInBusiness > 10) {
    return { marks: 100, reason: "More than 10 years in business" };
  }
  if (yearsInBusiness > 5) {
    return { marks: 60, reason: "More than 5 years and up to 10 years" };
  }
  return { marks: 30, reason: "5 years or less in business" };
}

function scoreBusinessPlan(annualBusinessPlan: string): { marks: number; reason: string } {
  const cr = parseMonetaryValueInCrores(annualBusinessPlan);
  if (cr > 0.05) return { marks: 100, reason: "Business plan > ₹0.05 Cr" };
  if (cr >= 0.03) return { marks: 60, reason: "Business plan ₹0.03–0.05 Cr" };
  return { marks: 30, reason: "Business plan < ₹0.03 Cr" };
}

function deriveCategory(weightedScore: number): DistributorCategory {
  if (weightedScore >= 80) return "A";
  if (weightedScore >= 70) return "B";
  return "C";
}

function deriveCreditPolicy(
  category: DistributorCategory,
  annualBusinessPlanCrores: number,
): Pick<
  DistributorAssessment,
  "creditLimit" | "creditPeriodDays" | "paymentMode" | "creditStatus"
> {
  const planRupees = annualBusinessPlanCrores * 10_000_000;

  if (category === "A") {
    return {
      creditLimit: Math.round(planRupees * 0.5),
      creditPeriodDays: 90,
      paymentMode: "credit",
      creditStatus: "Credit Allowed",
    };
  }

  if (category === "B") {
    return {
      creditLimit: Math.round(planRupees * 0.3),
      creditPeriodDays: 90,
      paymentMode: "credit",
      creditStatus: "Credit Allowed",
    };
  }

  return {
    creditLimit: 0,
    creditPeriodDays: 0,
    paymentMode: "cash_and_carry",
    creditStatus: "Cash & Carry",
  };
}

/** ERP-only assessment — never exposed in SFA mobile app. */
export function computeDistributorAssessment(
  distributor: Pick<
    Distributor,
    | "companiesDealingIn"
    | "annualTurnover"
    | "yearsInBusiness"
    | "annualBusinessPotential"
  >,
): DistributorAssessment {
  const companyResult = scoreCompanies(distributor.companiesDealingIn);
  const turnoverResult = scoreTurnover(distributor.annualTurnover);
  const tenureResult = scoreTenure(distributor.yearsInBusiness);
  const businessPlanResult = scoreBusinessPlan(distributor.annualBusinessPotential);
  const annualBusinessPlanCrores = parseMonetaryValueInCrores(
    distributor.annualBusinessPotential,
  );

  const companyMarks = companyResult.marks;
  const turnoverMarks = turnoverResult.marks;
  const tenureMarks = tenureResult.marks;
  const businessPlanMarks = businessPlanResult.marks;

  const breakdownRows: ScoreBreakdownRow[] = [
    {
      criteria: "Companies Dealing In",
      rawData: distributor.companiesDealingIn || "—",
      marks: companyMarks,
      weightage: 35,
      weightedPoints: companyMarks * 35,
      reason: companyResult.reason,
    },
    {
      criteria: "Annual Turnover",
      rawData: distributor.annualTurnover || "—",
      marks: turnoverMarks,
      weightage: 20,
      weightedPoints: turnoverMarks * 20,
      reason: turnoverResult.reason,
    },
    {
      criteria: "Years in Business",
      rawData: String(distributor.yearsInBusiness),
      marks: tenureMarks,
      weightage: 25,
      weightedPoints: tenureMarks * 25,
      reason: tenureResult.reason,
    },
    {
      criteria: "Annual Business Plan FY27",
      rawData: distributor.annualBusinessPotential || "—",
      marks: businessPlanMarks,
      weightage: 20,
      weightedPoints: businessPlanMarks * 20,
      reason: businessPlanResult.reason,
    },
  ];

  const totalWeightedPoints = breakdownRows.reduce((sum, row) => sum + row.weightedPoints, 0);
  const weightedScore = Math.round((totalWeightedPoints / 100) * 100) / 100;

  const category = deriveCategory(weightedScore);
  const creditPolicy = deriveCreditPolicy(category, annualBusinessPlanCrores);

  const companyGradeDetails = parseCompaniesDealingIn(distributor.companiesDealingIn).map(
    (company) => {
      const grade = classifyCompany(company);
      return {
        company,
        grade,
        marks: grade === "A" ? 100 : grade === "B" ? 60 : 30,
      };
    },
  );

  return {
    companyMarks,
    turnoverMarks,
    tenureMarks,
    businessPlanMarks,
    weightedScore,
    totalWeightedPoints,
    category,
    companyGradeMapping: companyResult.mapping,
    companyScoreReason: companyResult.reason,
    breakdownRows,
    annualBusinessPlanLakhs: annualBusinessPlanCrores * 100,
    annualBusinessPlanCrores,
    companyGradeDetails,
    ...creditPolicy,
  };
}

export function formatCategoryLabel(category: DistributorCategory): string {
  return `Category ${category}`;
}

export function formatCreditPolicySummary(assessment: DistributorAssessment): string {
  if (assessment.creditStatus === "Cash & Carry") {
    return "Cash & Carry — no credit";
  }
  const pct = assessment.category === "A" ? "50%" : "30%";
  return `${pct} of annual business plan · ${assessment.creditPeriodDays} days credit`;
}

/** @deprecated use classifyCompany */
export function resolveCompanyGrade(companyName: string): CompanyGrade {
  return classifyCompany(companyName);
}
