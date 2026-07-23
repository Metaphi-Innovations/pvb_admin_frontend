"use client";

import {
  computeNoteParticularTotals,
} from "@/components/accounts/voucher-form/NoteParticularsTable";

/**
 * @deprecated Prefer NoteParticularsTable + computeNoteParticularTotals.
 * Compatibility wrapper: amount-based totals as Qty=1 × Rate=amount.
 */
export function computeFreshCreditTotals(
  taxableAmount: string,
  gstApplicable: boolean,
  gstPct: string,
  interstate = false,
) {
  return computeNoteParticularTotals("1", taxableAmount, gstApplicable, gstPct, interstate);
}

export { NoteParticularsTable as FreshCreditNoteForm } from "@/components/accounts/voucher-form/NoteParticularsTable";
export type { NoteParticularsTableProps as FreshCreditNoteFormProps } from "@/components/accounts/voucher-form/NoteParticularsTable";
