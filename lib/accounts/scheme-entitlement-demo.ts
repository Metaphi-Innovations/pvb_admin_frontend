/**
 * Accounts-only Scheme Entitlement adapter.
 *
 * Temporary ERP→Accounts integration scaffolding: stores confirmed deferred-scheme
 * eligibility as received from ERP. Accounts must NOT recalculate scheme rules.
 * Replace with API-backed fetch when ERP integration is available.
 *
 * Do not surface "demo" / "temporary" wording in production UI.
 */

import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import {
  migrateSchemeClaimFields,
  type SchemeCalculationType,
  type SchemeClaimExcludedRecord,
  type SchemeClaimIncludedRecord,
  type SchemeClaimRuleApplied,
} from "@/lib/accounts/scheme-claim-types";
import { buildPhase1SeedEntitlements } from "@/lib/accounts/scheme-claim-seed-data";

export type {
  SchemeCalculationType,
  SchemeClaimExcludedRecord,
  SchemeClaimIncludedRecord,
  SchemeClaimRuleApplied,
} from "@/lib/accounts/scheme-claim-types";

export type SchemeEntitlementStatus =
  | "Pending Review"
  | "Sent Back"
  | "Approved"
  | "Credit Note Generated"
  | "Rejected"
  | "Cancelled"
  | "Expired";

export type SchemeEntitlementSchemeType =
  | "Near Expiry Discount"
  | "Cash Discount"
  | "Turnover Discount"
  | "Festive Discount"
  | "Loyalty Discount"
  | "Payment Discount"
  | "Other";

export interface SchemeEntitlementInvoiceBreakdown {
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  taxableValue: number;
  appliedSchemeId: string | null;
  appliedSchemeName: string | null;
  includedInCalculation: boolean;
  exclusionReason: string;
}

export interface SchemeEntitlementSupportingRef {
  label: string;
  value: string;
}

export interface SchemeEntitlementActionLog {
  action: "approve" | "send_back" | "reject";
  reason: string;
  actor: string;
  at: string;
}

export interface SchemeEntitlement {
  id: string;
  /** ERP claim reference — display only */
  claimNumber?: string;
  schemeId: string;
  schemeCode: string;
  schemeName: string;
  schemeType: SchemeEntitlementSchemeType;
  calculationType?: SchemeCalculationType;
  customerId: number | null;
  customerCode?: string;
  customerName: string;
  customerType: string;
  state: string;
  periodStart: string;
  periodEnd: string;
  periodReference: string;
  settlementPeriodStart?: string;
  settlementPeriodEnd?: string;
  calculationBasis: string;
  discountType: "Percentage" | "Amount";
  discountRate: number;
  appliedSlab?: string;
  grossEligibleAmount: number;
  salesReturnAdjustment: number;
  cancelledInvoiceAdjustment: number;
  excludedSchemeAmount: number;
  otherExclusionAmount: number;
  eligibleBaseAmount: number;
  calculatedBenefit: number;
  creditNoteAmount?: number;
  gstTreatment: string;
  mappedLedgerId: number | null;
  mappedLedgerCode: string;
  mappedLedgerName: string;
  status: SchemeEntitlementStatus;
  eligibleDate: string;
  ruleApplied?: SchemeClaimRuleApplied;
  includedRecords?: SchemeClaimIncludedRecord[];
  excludedRecords?: SchemeClaimExcludedRecord[];
  invoiceBreakdown: SchemeEntitlementInvoiceBreakdown[];
  supportingReferences: SchemeEntitlementSupportingRef[];
  actionLog: SchemeEntitlementActionLog[];
  sendBackReason?: string;
  rejectReason?: string;
  /** Set when a Credit Note is created from this entitlement (Phase 3). */
  generatedCreditNoteId?: number;
  generatedCreditNoteNo?: string;
  generatedCreditNoteStatus?: string;
  generatedAt?: string;
  generatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "ds_accounts_scheme_entitlements_v1";

function buildSeedEntitlements(): SchemeEntitlement[] {
  return buildPhase1SeedEntitlements();
}

function normalizeEntitlement(ent: SchemeEntitlement): SchemeEntitlement {
  return hydrateMappedLedgerId(migrateSchemeClaimFields(ent)).ent;
}

const LEGACY_LEDGER_NAMES = new Set([
  "turnover discount allowed",
  "near expiry discount allowed",
  "cash discount allowed",
]);

/** Subgroup / P&L-only names that do not exist as COA posting ledgers. */
const STALE_DEMO_LEDGER_NAMES = new Set([
  ...LEGACY_LEDGER_NAMES,
  "sales promotion expense",
  "advertisement expense",
  "freight outward",
]);

function hydrateMappedLedgerId(
  ent: SchemeEntitlement,
): { ent: SchemeEntitlement; changed: boolean } {
  const name = ent.mappedLedgerName?.trim();
  if (!name) return { ent, changed: false };
  try {
    const hit = loadChartOfAccounts().find(
      (r) =>
        r.nodeLevel === "ledger" &&
        r.accountName.trim().toLowerCase() === name.toLowerCase(),
    );
    if (hit && ent.mappedLedgerId !== hit.id) {
      return {
        ent: {
          ...ent,
          mappedLedgerId: hit.id,
          mappedLedgerCode: ent.mappedLedgerCode || hit.accountCode || "",
        },
        changed: true,
      };
    }
  } catch {
    /* COA unavailable during SSR */
  }
  return { ent, changed: false };
}

function ensureSeed(list: SchemeEntitlement[]): { list: SchemeEntitlement[]; changed: boolean } {
  const seed = buildSeedEntitlements();
  const byId = new Map(list.map((e) => [e.id, e]));
  let changed = false;
  for (const s of seed) {
    if (!byId.has(s.id)) {
      byId.set(s.id, s);
      changed = true;
    }
  }
  for (const [id, ent] of byId) {
    const seedRow = seed.find((s) => s.id === id);
    let next = normalizeEntitlement(ent);
    if (seedRow) {
      const name = (ent.mappedLedgerName || "").trim().toLowerCase();
      const seedName = seedRow.mappedLedgerName.trim().toLowerCase();
      const needsLedgerPatch =
        !ent.mappedLedgerName?.trim() ||
        STALE_DEMO_LEDGER_NAMES.has(name) ||
        seedName !== name;
      const needsPhase1Patch =
        !ent.includedRecords?.length && Boolean(seedRow.includedRecords?.length);
      if (needsLedgerPatch || needsPhase1Patch) {
        next = normalizeEntitlement({
          ...next,
          ...(needsLedgerPatch
            ? {
                mappedLedgerName: seedRow.mappedLedgerName,
                mappedLedgerCode: ent.mappedLedgerCode || seedRow.mappedLedgerCode,
                gstTreatment: seedRow.gstTreatment,
              }
            : {}),
          ...(needsPhase1Patch
            ? {
                claimNumber: seedRow.claimNumber,
                customerCode: seedRow.customerCode,
                calculationType: seedRow.calculationType,
                settlementPeriodStart: seedRow.settlementPeriodStart,
                settlementPeriodEnd: seedRow.settlementPeriodEnd,
                ruleApplied: seedRow.ruleApplied,
                includedRecords: seedRow.includedRecords,
                excludedRecords: seedRow.excludedRecords,
                appliedSlab: seedRow.appliedSlab,
                creditNoteAmount: seedRow.creditNoteAmount,
                eligibleBaseAmount: seedRow.eligibleBaseAmount,
                calculatedBenefit: seedRow.calculatedBenefit,
                grossEligibleAmount: seedRow.grossEligibleAmount,
                excludedSchemeAmount: seedRow.excludedSchemeAmount,
                otherExclusionAmount: seedRow.otherExclusionAmount,
                salesReturnAdjustment: seedRow.salesReturnAdjustment,
                invoiceBreakdown: seedRow.invoiceBreakdown,
                supportingReferences: seedRow.supportingReferences,
              }
            : {}),
        });
        changed = true;
      }
    } else {
      const normalized = normalizeEntitlement(next);
      if (normalized !== next) changed = true;
      next = normalized;
    }
    byId.set(id, next);
  }
  if (!changed && list.length > 0) return { list, changed: false };
  return { list: Array.from(byId.values()), changed: true };
}

export function loadSchemeEntitlements(): SchemeEntitlement[] {
  if (typeof window === "undefined") return buildSeedEntitlements();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = buildSeedEntitlements();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as SchemeEntitlement[];
    const { list: merged, changed } = ensureSeed(Array.isArray(parsed) ? parsed : []);
    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {
    return buildSeedEntitlements();
  }
}

export function saveSchemeEntitlements(list: SchemeEntitlement[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getSchemeEntitlementById(id: string): SchemeEntitlement | null {
  const hit = loadSchemeEntitlements().find((e) => e.id === id);
  return hit ? normalizeEntitlement(hit) : null;
}

/** Pending / actionable claims for Credit Notes → Pending → Scheme. */
export function listPendingSchemeEntitlements(): SchemeEntitlement[] {
  return loadSchemeEntitlements().filter(
    (e) =>
      e.status === "Pending Review" ||
      e.status === "Sent Back" ||
      e.status === "Approved",
  );
}

export function hasCreditNoteForEntitlement(entitlementId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("ds_accounts_credit_notes_v2");
    if (!raw) return false;
    const notes = JSON.parse(raw) as Array<{
      status?: string;
      schemeEntitlementId?: string;
      schemeSettlementKey?: string;
    }>;
    return notes.some(
      (cn) =>
        cn.status !== "cancelled" &&
        (cn.schemeEntitlementId === entitlementId ||
          cn.schemeSettlementKey === entitlementId),
    );
  } catch {
    return false;
  }
}

/** Phase 3: link Credit Note and set status Credit Note Generated. */
export function markSchemeEntitlementCreditNoteGenerated(
  entitlementId: string,
  meta: {
    creditNoteId: number;
    creditNoteNo: string;
    creditNoteStatus: string;
  },
): SchemeEntitlement {
  const all = loadSchemeEntitlements();
  const idx = all.findIndex((e) => e.id === entitlementId);
  if (idx < 0) throw new Error("Scheme claim not found.");
  const cur = all[idx];
  if (
    cur.status !== "Approved" &&
    cur.status !== "Credit Note Generated"
  ) {
    throw new Error(
      `Cannot link Credit Note while claim status is "${cur.status}".`,
    );
  }
  const at = new Date().toISOString();
  const next: SchemeEntitlement = {
    ...cur,
    status: "Credit Note Generated",
    generatedCreditNoteId: meta.creditNoteId,
    generatedCreditNoteNo: meta.creditNoteNo,
    generatedCreditNoteStatus: meta.creditNoteStatus,
    generatedAt: at,
    generatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: at,
  };
  all[idx] = next;
  saveSchemeEntitlements(all);
  return next;
}

/** Sync CN status on the entitlement after post/cancel (status stays Generated if CN exists). */
export function syncSchemeEntitlementCreditNoteStatus(
  entitlementId: string,
  meta: {
    creditNoteId: number;
    creditNoteNo: string;
    creditNoteStatus: string;
  },
): void {
  const all = loadSchemeEntitlements();
  const idx = all.findIndex((e) => e.id === entitlementId);
  if (idx < 0) return;
  const cur = all[idx];
  all[idx] = {
    ...cur,
    generatedCreditNoteId: meta.creditNoteId,
    generatedCreditNoteNo: meta.creditNoteNo,
    generatedCreditNoteStatus: meta.creditNoteStatus,
    updatedAt: new Date().toISOString(),
  };
  saveSchemeEntitlements(all);
}

function appendAction(
  ent: SchemeEntitlement,
  action: SchemeEntitlementActionLog["action"],
  reason: string,
): SchemeEntitlement {
  const at = new Date().toISOString();
  return {
    ...ent,
    actionLog: [
      ...ent.actionLog,
      { action, reason, actor: ACCOUNTS_CURRENT_USER, at },
    ],
    updatedAt: at,
  };
}

/** Phase 2: status-only — does not create or post Credit Notes. */
export function approveSchemeEntitlement(id: string): SchemeEntitlement {
  const all = loadSchemeEntitlements();
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error("Scheme claim not found.");
  const cur = all[idx];
  if (cur.status !== "Pending Review" && cur.status !== "Sent Back") {
    throw new Error(`Cannot approve claim in status "${cur.status}".`);
  }
  const next = appendAction(
    { ...cur, status: "Approved", sendBackReason: undefined },
    "approve",
    "Approved for Credit Note generation",
  );
  all[idx] = next;
  saveSchemeEntitlements(all);
  return next;
}

export function sendBackSchemeEntitlement(id: string, reason: string): SchemeEntitlement {
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("Send Back requires a reason.");
  const all = loadSchemeEntitlements();
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error("Scheme claim not found.");
  const cur = all[idx];
  if (cur.status !== "Pending Review" && cur.status !== "Approved") {
    throw new Error(`Cannot send back claim in status "${cur.status}".`);
  }
  const next = appendAction(
    { ...cur, status: "Sent Back", sendBackReason: trimmed },
    "send_back",
    trimmed,
  );
  all[idx] = next;
  saveSchemeEntitlements(all);
  return next;
}

export function rejectSchemeEntitlement(id: string, reason: string): SchemeEntitlement {
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("Reject requires a reason.");
  const all = loadSchemeEntitlements();
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error("Scheme claim not found.");
  const cur = all[idx];
  if (
    cur.status !== "Pending Review" &&
    cur.status !== "Sent Back" &&
    cur.status !== "Approved"
  ) {
    throw new Error(`Cannot reject claim in status "${cur.status}".`);
  }
  const next = appendAction(
    { ...cur, status: "Rejected", rejectReason: trimmed },
    "reject",
    trimmed,
  );
  all[idx] = next;
  saveSchemeEntitlements(all);
  return next;
}

export const SCHEME_CLAIM_REVIEW_BASE =
  "/accounts/transactions/credit-notes/scheme-claims";

export function schemeClaimReviewHref(id: string): string {
  return `${SCHEME_CLAIM_REVIEW_BASE}/${encodeURIComponent(id)}`;
}
