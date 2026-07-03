/**
 * Link sales return approval to credit note creation.
 */

import {
  approveSalesReturn,
  getSalesReturnRecords,
  saveSalesReturnRecords,
  type SalesReturnRecord,
} from "@/app/(app)/sales/orders/sales-return-data";
import { createCreditNoteFromSalesReturn } from "./credit-note-integration";

export function linkCreditNoteToSalesReturn(
  returnId: string,
  creditNoteId: number,
  creditNoteNo: string,
  sourceInvoiceId: number | null,
  sourceInvoiceNo: string,
): void {
  const records = getSalesReturnRecords();
  const idx = records.findIndex((r) => r.id === returnId);
  if (idx < 0) return;
  records[idx] = {
    ...records[idx],
    status: "approved",
    creditNoteId,
    creditNoteNo,
    sourceInvoiceId,
    sourceInvoiceNo,
  };
  saveSalesReturnRecords(records);
}

export function processSalesReturnApproval(returnId: string): {
  returnRecord: SalesReturnRecord;
  creditNoteCreated: boolean;
} | null {
  const records = getSalesReturnRecords();
  const current = records.find((r) => r.id === returnId);
  if (!current) return null;

  const approved = approveSalesReturn(returnId);
  if (!approved) return null;

  const cn = createCreditNoteFromSalesReturn(approved);
  if (cn) {
    linkCreditNoteToSalesReturn(
      returnId,
      cn.id,
      cn.creditNoteNo,
      cn.sourceInvoiceId,
      cn.sourceInvoiceNo,
    );
  }

  const updated = getSalesReturnRecords().find((r) => r.id === returnId) ?? approved;
  return { returnRecord: updated, creditNoteCreated: Boolean(cn) };
}

export function processSalesReturnOnSave(record: SalesReturnRecord): {
  creditNoteNo?: string;
  message: string;
} {
  const records = getSalesReturnRecords();
  const withStatus: SalesReturnRecord = {
    ...record,
    status: "pending_approval",
  };
  const existing = records.findIndex((r) => r.id === record.id);
  if (existing >= 0) {
    records[existing] = withStatus;
  } else {
    records.push(withStatus);
  }
  saveSalesReturnRecords(records);

  const result = processSalesReturnApproval(record.id);
  if (result?.creditNoteCreated && result.returnRecord.creditNoteNo) {
    return {
      creditNoteNo: result.returnRecord.creditNoteNo,
      message: `Sales return approved. Credit Note ${result.returnRecord.creditNoteNo} generated.`,
    };
  }
  return { message: "Sales return saved." };
}
