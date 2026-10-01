import { createDebitNoteFromPurchaseReturn } from "./debit-note-integration";
import type { PurchaseReturn } from "@/app/(app)/procurement/purchase-returns/purchase-return-data";

export function attachDebitNoteToPurchaseReturn(record: PurchaseReturn): PurchaseReturn {
  if (record.debitNoteId) return record;
  const dn = createDebitNoteFromPurchaseReturn(record);
  if (!dn) return record;
  return {
    ...record,
    debitNoteId: dn.id,
    debitNoteNo: dn.debitNoteNo,
  };
}
