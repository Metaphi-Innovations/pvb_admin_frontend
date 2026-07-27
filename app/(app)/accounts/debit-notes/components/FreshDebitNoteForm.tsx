"use client";

import {
  computeNoteParticularTotals,
} from "@/components/accounts/voucher-form/NoteParticularsTable";

/**
 * @deprecated Prefer NoteParticularsTable + computeNoteParticularTotals.
 * Compatibility wrapper: amount-based totals as Qty=1 × Rate=amount.
 */
export function computeFreshDebitTotals(
  taxableAmount: string,
  gstApplicable: boolean,
  gstPct: string,
) {
  return computeNoteParticularTotals("1", taxableAmount, gstApplicable, gstPct, false);
}

export { NoteParticularsTable as FreshDebitNoteForm } from "@/components/accounts/voucher-form/NoteParticularsTable";
export type { NoteParticularsTableProps as FreshDebitNoteFormProps } from "@/components/accounts/voucher-form/NoteParticularsTable";
