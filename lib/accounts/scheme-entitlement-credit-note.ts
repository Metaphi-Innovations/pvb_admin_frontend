/**
 * Scheme Entitlement → Credit Note helpers (Accounts Phase 3).
 * Prefill + ledger validation only — does not recalculate ERP eligibility.
 */

import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import {
  getSchemeEntitlementById,
  type SchemeEntitlement,
} from "@/lib/accounts/scheme-entitlement-demo";
import {
  buildReferenceFromInvoice,
  createEmptyCreditLine,
  loadCreditNotes,
  normalizeCreditLine,
  type CreditNoteLine,
  type CreditNoteLinkedInvoice,
  type CreditNoteRecord,
  type CreditReferencePreview,
} from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { CREDIT_NOTES_LIST_PATH } from "@/app/(app)/accounts/credit-notes/note-utils";
import { getEntitlementClaimNumber } from "@/lib/accounts/scheme-claim-types";

export const SCHEME_ENTITLEMENT_LEDGER_ERROR =
  "Scheme discount ledger is not mapped for this entitlement. Configure mappedLedgerId / mappedLedgerCode / mappedLedgerName before generating a Credit Note.";

export type ResolvedSchemeLedger = {
  id: number;
  code: string;
  name: string;
};

/** Resolve mapped scheme ledger from entitlement — never invent a random ledger. */
export function resolveSchemeEntitlementLedger(
  ent: Pick<SchemeEntitlement, "mappedLedgerId" | "mappedLedgerCode" | "mappedLedgerName">,
): ResolvedSchemeLedger | null {
  const name = ent.mappedLedgerName?.trim() || "";
  const code = ent.mappedLedgerCode?.trim() || "";
  if (!name && ent.mappedLedgerId == null && !code) return null;

  const coa = loadChartOfAccounts().filter((r) => r.nodeLevel === "ledger");
  let id = ent.mappedLedgerId ?? null;

  if (id != null) {
    const byId = coa.find((r) => r.id === id);
    if (!byId) return null;
    return {
      id: byId.id,
      code: code || byId.accountCode || "",
      name: name || byId.accountName,
    };
  }

  if (name) {
    const byName = coa.find(
      (r) => r.accountName.trim().toLowerCase() === name.toLowerCase(),
    );
    if (byName) {
      return {
        id: byName.id,
        code: code || byName.accountCode || "",
        name: byName.accountName,
      };
    }
  }

  if (code) {
    const byCode = coa.find(
      (r) => (r.accountCode || "").trim().toLowerCase() === code.toLowerCase(),
    );
    if (byCode) {
      return {
        id: byCode.id,
        code: byCode.accountCode || code,
        name: name || byCode.accountName,
      };
    }
  }

  return null;
}

export function assertSchemeEntitlementLedger(
  ent: SchemeEntitlement,
): ResolvedSchemeLedger {
  const resolved = resolveSchemeEntitlementLedger(ent);
  if (!resolved) {
    throw new Error(SCHEME_ENTITLEMENT_LEDGER_ERROR);
  }
  return resolved;
}

export function isGstApplicableTreatment(gstTreatment: string): boolean {
  if (!gstTreatment.trim()) return false;
  return !/not\s*applicable|without\s*gst|nil.?rated|exempt|non.?gst/i.test(
    gstTreatment,
  );
}

export function isInterstateGstTreatment(gstTreatment: string): boolean {
  return /igst|interstate/i.test(gstTreatment);
}

/** Find Credit Notes linked to an entitlement (active + cancelled). */
export function findCreditNotesForEntitlement(
  entitlementId: string,
): CreditNoteRecord[] {
  return loadCreditNotes().filter(
    (cn) =>
      cn.schemeEntitlementId === entitlementId ||
      cn.schemeSettlementKey === entitlementId,
  );
}

export type EntitlementCnNav =
  | { kind: "create"; href: string }
  | { kind: "open_draft"; id: number; href: string; creditNoteNo: string }
  | { kind: "open_existing"; id: number; href: string; creditNoteNo: string; status: string };

/**
 * Duplicate prevention for Generate Credit Note.
 * Draft → reopen draft; Posted/Approved → open existing; only Cancelled → allow create.
 */
export function resolveEntitlementCreditNoteNavigation(
  entitlementId: string,
): EntitlementCnNav {
  const createHref = `${CREDIT_NOTES_LIST_PATH}/new?mode=scheme&entitlementId=${encodeURIComponent(entitlementId)}`;
  const notes = findCreditNotesForEntitlement(entitlementId);
  const active = notes.filter((n) => n.status !== "cancelled");
  if (active.length === 0) {
    return { kind: "create", href: createHref };
  }
  const draft = active.find(
    (n) => n.status === "draft" || n.status === "pending_approval" || n.status === "sent_back",
  );
  if (draft) {
    return {
      kind: "open_draft",
      id: draft.id,
      href: `${CREDIT_NOTES_LIST_PATH}/${draft.id}/edit`,
      creditNoteNo: draft.creditNoteNo,
    };
  }
  const existing = active[0];
  return {
    kind: "open_existing",
    id: existing.id,
    href: `${CREDIT_NOTES_LIST_PATH}/${existing.id}`,
    creditNoteNo: existing.creditNoteNo,
    status: existing.status,
  };
}

export function schemeEntitlementCreditNoteHref(entitlementId: string): string {
  return resolveEntitlementCreditNoteNavigation(entitlementId).href;
}

export type EntitlementCreditNotePrefill = {
  entitlement: SchemeEntitlement;
  ledger: ResolvedSchemeLedger;
  customerId: number | null;
  customerName: string;
  schemeCode: string;
  schemeName: string;
  schemeType: string;
  schemeId: string;
  schemePeriod: string;
  eligibleBase: number;
  creditNoteAmount: number;
  gstTreatment: string;
  gstApplicable: boolean;
  interstate: boolean;
  calculationReference: string;
  schemeClaimNumber: string;
  narration: string;
  linkedInvoices: CreditNoteLinkedInvoice[];
  sourceInvoiceIds: number[];
  sourceInvoiceId: number | null;
  sourceInvoiceNo: string;
  referencePreview: CreditReferencePreview;
  lines: CreditNoteLine[];
  reason: string;
};

function buildSyntheticPreview(
  ent: SchemeEntitlement,
  lines: CreditNoteLine[],
  linked: CreditNoteLinkedInvoice[],
): CreditReferencePreview {
  const primary = linked[0];
  return {
    referenceType: "invoice",
    documentDate: ent.eligibleDate,
    sourceInvoiceId: primary?.id ?? null,
    sourceInvoiceNo: primary?.invoiceNo ?? "",
    sourceOrderId: null,
    sourceOrderNo: "",
    customerId: ent.customerId,
    customerName: ent.customerName,
    customerMobile: "",
    customerGst: "",
    originalAmount: ent.eligibleBaseAmount,
    taxAmount: 0,
    alreadyAdjustedAmount: 0,
    lineItems: lines,
  };
}

function buildEntitlementBenefitLine(
  ent: SchemeEntitlement,
  amount: number,
  taxPct: number,
): CreditNoteLine {
  return normalizeCreditLine({
    ...createEmptyCreditLine(),
    id: `ent-${ent.id}-benefit`,
    productName: `${ent.schemeName} (${ent.schemeCode})`,
    description: ent.calculationBasis,
    returnQty: 0,
    unitPrice: 0,
    discountPct: 0,
    taxPct,
    creditAmount: amount,
    gstAmount: 0,
    lineAmount: amount,
    sourceLineId: "scheme-entitlement",
  });
}

/** Build form prefill from Approved (or editable) entitlement. Throws on missing ledger. */
export function buildCreditNotePrefillFromEntitlement(
  entitlementId: string,
): EntitlementCreditNotePrefill {
  const entitlement = getSchemeEntitlementById(entitlementId);
  if (!entitlement) {
    throw new Error("Scheme entitlement not found.");
  }
  if (
    entitlement.status !== "Approved" &&
    entitlement.status !== "Credit Note Generated"
  ) {
    throw new Error(
      `Credit Note can only be generated for Approved claims (current status: ${entitlement.status}).`,
    );
  }

  const ledger = assertSchemeEntitlementLedger(entitlement);
  const gstApplicable = isGstApplicableTreatment(entitlement.gstTreatment);
  const interstate = isInterstateGstTreatment(entitlement.gstTreatment);
  /** Keep Credit Note total equal to ERP calculated benefit — do not re-derive eligibility. */
  const creditNoteAmount = entitlement.creditNoteAmount ?? entitlement.calculatedBenefit;
  /**
   * Non-GST treatments keep taxPct 0 so existing CN GST logic posts no output GST reversal.
   * GST-applicable entitlements that supply tax on lines continue to use existing CN GST paths.
   */
  const taxPct = 0;

  const linkedInvoices: CreditNoteLinkedInvoice[] = [];
  const sourceInvoiceIds: number[] = [];
  const included = entitlement.invoiceBreakdown.filter((b) => b.includedInCalculation);
  const lineRecords = entitlement.includedRecords?.filter(
    (r) => r.eligibilityStatus === "Eligible",
  );
  if (lineRecords?.length) {
    for (const row of lineRecords) {
      if (!row.invoiceId || !row.invoiceNumber) continue;
      if (!sourceInvoiceIds.includes(row.invoiceId)) {
        sourceInvoiceIds.push(row.invoiceId);
        linkedInvoices.push({ id: row.invoiceId, invoiceNo: row.invoiceNumber });
      }
    }
  } else {
    for (const row of included) {
      if (!row.invoiceId || !row.invoiceNo) continue;
      sourceInvoiceIds.push(row.invoiceId);
      linkedInvoices.push({ id: row.invoiceId, invoiceNo: row.invoiceNo });
    }
  }

  let lines: CreditNoteLine[] = [
    buildEntitlementBenefitLine(entitlement, creditNoteAmount, taxPct),
  ];
  let referencePreview: CreditReferencePreview | null = null;

  const primaryId = linkedInvoices[0]?.id;
  if (primaryId != null) {
    const fromInv = buildReferenceFromInvoice(primaryId);
    if (fromInv) {
      referencePreview = {
        ...fromInv,
        lineItems: lines,
        originalAmount: Math.max(fromInv.originalAmount, entitlement.eligibleBaseAmount),
      };
    }
  }
  if (!referencePreview) {
    referencePreview = buildSyntheticPreview(entitlement, lines, linkedInvoices);
  }

  const schemePeriod = `${entitlement.periodStart} – ${entitlement.periodEnd} (${entitlement.periodReference})`;
  const calculationReference = [
    entitlement.claimNumber || entitlement.schemeCode,
    entitlement.periodReference,
    `Base ${entitlement.eligibleBaseAmount}`,
    entitlement.discountType === "Percentage"
      ? `Rate ${entitlement.discountRate}%`
      : `Rate ${entitlement.discountRate}`,
    entitlement.ruleApplied?.displaySummary,
  ]
    .filter(Boolean)
    .join(" · ");
  const narration = [
    `Scheme Credit Note — ${entitlement.schemeName} (${entitlement.schemeCode})`,
    entitlement.claimNumber ? `Claim: ${entitlement.claimNumber}` : "",
    `Customer: ${entitlement.customerName}`,
    `Period: ${schemePeriod}`,
    `Eligible base: ${entitlement.eligibleBaseAmount}`,
    `Benefit: ${creditNoteAmount}`,
    `ERP Entitlement ID: ${entitlement.id}`,
    entitlement.calculationBasis,
    entitlement.ruleApplied?.displaySummary,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    entitlement,
    ledger,
    customerId: entitlement.customerId,
    customerName: entitlement.customerName,
    schemeCode: entitlement.schemeCode,
    schemeName: entitlement.schemeName,
    schemeType: entitlement.schemeType,
    schemeId: entitlement.schemeId,
    schemePeriod,
    eligibleBase: entitlement.eligibleBaseAmount,
    creditNoteAmount,
    gstTreatment: entitlement.gstTreatment,
    gstApplicable,
    interstate,
    calculationReference,
    schemeClaimNumber: getEntitlementClaimNumber(entitlement),
    narration,
    linkedInvoices,
    sourceInvoiceIds,
    sourceInvoiceId: linkedInvoices[0]?.id ?? null,
    sourceInvoiceNo: linkedInvoices[0]?.invoiceNo ?? "",
    referencePreview,
    lines,
    reason: "Scheme Settlement",
  };
}
