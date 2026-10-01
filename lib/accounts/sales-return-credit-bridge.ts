/**
 * Link sales return approval to credit note creation (manual generation in Accounts).
 */

import {
  approveSalesReturn,
  getSalesReturnRecords,
  saveSalesReturnRecords,
  type SalesReturnRecord,
} from "@/app/(app)/sales/orders/sales-return-data";

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

/** Approve sales return only — credit note is generated manually from Accounts pending panel. */
export function processSalesReturnApproval(returnId: string): {
  returnRecord: SalesReturnRecord;
  creditNoteCreated: boolean;
} | null {
  const records = getSalesReturnRecords();
  const current = records.find((r) => r.id === returnId);
  if (!current) return null;

  const approved = approveSalesReturn(returnId);
  if (!approved) return null;

  const updated = getSalesReturnRecords().find((r) => r.id === returnId) ?? approved;
  return { returnRecord: updated, creditNoteCreated: false };
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
  if (result?.returnRecord) {
    return {
      message:
        "Sales return approved. Generate a Credit Note from Accounts → Credit Notes → Pending.",
    };
  }
  return { message: "Sales return saved." };
}
