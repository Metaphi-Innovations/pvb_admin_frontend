/**
 * GST ledger resolution and tax component helpers.
 * Ledgers are auto-synced from GST Master under Duties & Taxes Payable (GST Input & GST Output).
 */

import {
  loadChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { calcGstLineSplit } from "@/app/(app)/accounts/invoices/invoices-data";
import type { LedgerMappingKey } from "@/lib/accounts/ledger-mappings";
import {
  GST_DUTIES_SUBGROUP,
  GST_INPUT_GROUP,
  GST_INPUT_CREDIT_GROUP,
  resolveGstRateLedger,
  syncGstCoaFromMaster,
} from "@/lib/accounts/gst-coa-sync";

export { GST_DUTIES_SUBGROUP, GST_INPUT_GROUP, GST_INPUT_CREDIT_GROUP };

/** @deprecated Legacy generic names — rate-specific ledgers are synced from GST Master */
export const GST_LEDGER_NAMES = {
  cgstPayable: "CGST Payable",
  sgstPayable: "SGST Payable",
  igstPayable: "IGST Payable",
  cgstReceivable: "CGST Receivable",
  sgstReceivable: "SGST Receivable",
  igstReceivable: "IGST Receivable",
} as const;

export const GST_MAPPING_LEDGER_NAMES: Partial<Record<LedgerMappingKey, string>> = {
  sales_cgst: GST_LEDGER_NAMES.cgstPayable,
  sales_sgst: GST_LEDGER_NAMES.sgstPayable,
  sales_igst: GST_LEDGER_NAMES.igstPayable,
  purchase_cgst: GST_LEDGER_NAMES.cgstReceivable,
  purchase_sgst: GST_LEDGER_NAMES.sgstReceivable,
  purchase_igst: GST_LEDGER_NAMES.igstReceivable,
};

export interface GstComponentAmounts {
  cgst: number;
  sgst: number;
  igst: number;
}

export interface GstRateBreakdown {
  ratePct: number;
  cgst: number;
  sgst: number;
  igst: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isGstMappingKey(key: LedgerMappingKey): boolean {
  return key in GST_MAPPING_LEDGER_NAMES;
}

/** Sync GST Master → COA ledgers (replaces legacy generic ledger seeding). */
export function ensureGstAccountingLedgers(): void {
  syncGstCoaFromMaster();
}

function resolveLegacyGstLedger(mappingKey: LedgerMappingKey): ChartOfAccount | null {
  const ledgerName = GST_MAPPING_LEDGER_NAMES[mappingKey];
  if (!ledgerName) return null;
  return (
    loadChartOfAccounts().find(
      (r) => r.nodeLevel === "ledger" && r.accountName === ledgerName && r.status === "active",
    ) ?? null
  );
}

export function resolveGstLedger(
  mappingKey: LedgerMappingKey,
  gstRatePct?: number,
): ChartOfAccount | null {
  ensureGstAccountingLedgers();
  if (gstRatePct != null && gstRatePct > 0) {
    return resolveGstRateLedger(mappingKey, gstRatePct);
  }
  return resolveLegacyGstLedger(mappingKey);
}

export function gstLedgerLabelForRate(mappingKey: LedgerMappingKey, gstRatePct: number): string {
  if (gstRatePct <= 0) return GST_MAPPING_LEDGER_NAMES[mappingKey] ?? mappingKey;
  const ledger = resolveGstRateLedger(mappingKey, gstRatePct);
  return ledger?.accountName ?? GST_MAPPING_LEDGER_NAMES[mappingKey] ?? mappingKey;
}

export function normalizeGstAmounts(taxAmount: number, interstate = false): GstComponentAmounts {
  if (taxAmount <= 0) return { cgst: 0, sgst: 0, igst: 0 };
  if (interstate) return { cgst: 0, sgst: 0, igst: round2(taxAmount) };
  const cgst = round2(taxAmount / 2);
  return { cgst, sgst: round2(taxAmount - cgst), igst: 0 };
}

export function aggregateLineGst(
  lines: Array<{
    qty: number;
    unitPrice: number;
    discountPct?: number;
    taxPct: number;
  }>,
  interstate = false,
): GstComponentAmounts {
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  for (const line of lines) {
    const split = calcGstLineSplit(
      {
        qty: line.qty,
        unitPrice: line.unitPrice,
        discountPct: line.discountPct ?? 0,
        taxPct: line.taxPct,
      },
      interstate,
    );
    cgst += split.cgst;
    sgst += split.sgst;
    igst += split.igst;
  }
  return { cgst: round2(cgst), sgst: round2(sgst), igst: round2(igst) };
}

/** Group GST components by line tax rate for rate-specific ledger posting. */
export function aggregateLineGstByRate(
  lines: Array<{
    qty: number;
    unitPrice: number;
    discountPct?: number;
    taxPct: number;
  }>,
  interstate = false,
): GstRateBreakdown[] {
  const buckets = new Map<number, GstComponentAmounts>();

  for (const line of lines) {
    const rate = line.taxPct;
    if (rate <= 0) continue;
    const split = calcGstLineSplit(
      {
        qty: line.qty,
        unitPrice: line.unitPrice,
        discountPct: line.discountPct ?? 0,
        taxPct: line.taxPct,
      },
      interstate,
    );
    const existing = buckets.get(rate) ?? { cgst: 0, sgst: 0, igst: 0 };
    buckets.set(rate, {
      cgst: round2(existing.cgst + split.cgst),
      sgst: round2(existing.sgst + split.sgst),
      igst: round2(existing.igst + split.igst),
    });
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([ratePct, amounts]) => ({
      ratePct,
      ...amounts,
    }));
}

export function inferInterstateFromPlaceOfSupply(
  placeOfSupply: string | undefined,
  companyState = "Maharashtra",
): boolean {
  if (!placeOfSupply?.trim()) return false;
  return placeOfSupply.trim().toLowerCase() !== companyState.trim().toLowerCase();
}

export interface GstPostingLineSpec {
  mappingKey: LedgerMappingKey;
  debit: number;
  credit: number;
  gstRatePct: number;
  remarks: string;
}

/** Expand rate buckets into voucher posting lines targeting rate-specific GST ledgers. */
export function expandGstPostingLines(
  breakdowns: GstRateBreakdown[],
  mode: "sales" | "purchase" | "credit_note" | "debit_note",
): GstPostingLineSpec[] {
  const lines: GstPostingLineSpec[] = [];

  for (const bucket of breakdowns) {
    const rate = bucket.ratePct;

    if (mode === "sales") {
      if (bucket.cgst > 0) {
        lines.push({
          mappingKey: "sales_cgst",
          debit: 0,
          credit: bucket.cgst,
          gstRatePct: rate,
          remarks: `Output CGST (GST ${rate}%)`,
        });
      }
      if (bucket.sgst > 0) {
        lines.push({
          mappingKey: "sales_sgst",
          debit: 0,
          credit: bucket.sgst,
          gstRatePct: rate,
          remarks: `Output SGST (GST ${rate}%)`,
        });
      }
      if (bucket.igst > 0) {
        lines.push({
          mappingKey: "sales_igst",
          debit: 0,
          credit: bucket.igst,
          gstRatePct: rate,
          remarks: `Output IGST (GST ${rate}%)`,
        });
      }
    } else if (mode === "purchase") {
      if (bucket.cgst > 0) {
        lines.push({
          mappingKey: "purchase_cgst",
          debit: bucket.cgst,
          credit: 0,
          gstRatePct: rate,
          remarks: `Input CGST (GST ${rate}%)`,
        });
      }
      if (bucket.sgst > 0) {
        lines.push({
          mappingKey: "purchase_sgst",
          debit: bucket.sgst,
          credit: 0,
          gstRatePct: rate,
          remarks: `Input SGST (GST ${rate}%)`,
        });
      }
      if (bucket.igst > 0) {
        lines.push({
          mappingKey: "purchase_igst",
          debit: bucket.igst,
          credit: 0,
          gstRatePct: rate,
          remarks: `Input IGST (GST ${rate}%)`,
        });
      }
    } else if (mode === "credit_note") {
      if (bucket.cgst > 0) {
        lines.push({
          mappingKey: "sales_cgst",
          debit: bucket.cgst,
          credit: 0,
          gstRatePct: rate,
          remarks: `Output CGST reversal (GST ${rate}%)`,
        });
      }
      if (bucket.sgst > 0) {
        lines.push({
          mappingKey: "sales_sgst",
          debit: bucket.sgst,
          credit: 0,
          gstRatePct: rate,
          remarks: `Output SGST reversal (GST ${rate}%)`,
        });
      }
      if (bucket.igst > 0) {
        lines.push({
          mappingKey: "sales_igst",
          debit: bucket.igst,
          credit: 0,
          gstRatePct: rate,
          remarks: `Output IGST reversal (GST ${rate}%)`,
        });
      }
    } else if (mode === "debit_note") {
      if (bucket.cgst > 0) {
        lines.push({
          mappingKey: "purchase_cgst",
          debit: 0,
          credit: bucket.cgst,
          gstRatePct: rate,
          remarks: `Input CGST reversal (GST ${rate}%)`,
        });
      }
      if (bucket.sgst > 0) {
        lines.push({
          mappingKey: "purchase_sgst",
          debit: 0,
          credit: bucket.sgst,
          gstRatePct: rate,
          remarks: `Input SGST reversal (GST ${rate}%)`,
        });
      }
      if (bucket.igst > 0) {
        lines.push({
          mappingKey: "purchase_igst",
          debit: 0,
          credit: bucket.igst,
          gstRatePct: rate,
          remarks: `Input IGST reversal (GST ${rate}%)`,
        });
      }
    }
  }

  return lines;
}
