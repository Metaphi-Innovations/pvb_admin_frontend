import type { TaxSupplyType } from "@/lib/procurement/utils";
import type { ProcurementAdditionalCharge } from "@/lib/procurement/procurement-line-utils";
import type { POSummary, PurchaseOrder } from "../purchase-orders/po-data";

export type PurchaseReturnStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "issued_for_packing"
  | "returned"
  | "Draft"
  | "PO_return"
  | "Dispatched"
  | "Received_By_Supplier"
  | "Cancelled";

export interface PurchaseReturnItem {
  id: string;
  purchaseOrderProductId?: string;
  productId: string;
  productCode: string;
  productName: string;
  batchNumber: string;
  grnNo: string;
  grnId: string;
  qcId?: string;
  qcNo?: string;
  grnItemId?: string;
  grnBatchId?: string;
  inventoryDetailId: string;
  inventoryRejectedItemId: string;
  mfgDate: string;
  expDate: string;
  caseSize: number;
  grnReceivedQty: number;
  qcRejectedQty: number;
  alreadyReturnedQty: number;
  balanceRejectedQty: number;
  returnQty: number;
  lineRemark: string;
  selected: boolean;
  /** Present on edit-merge: true if this line was already saved on the return. */
  isExistingOnReturn?: boolean;
  lineStatus: "available" | "fully_returned";
  unitPrice: number;
  gstPct: number;
  cgstPct: number;
  sgstPct: number;
  igstPct: number;
  grossAmount: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
  netAmount: number;
}

export interface PurchaseReturnActivity {
  date: string;
  action: string;
  by: string;
  note?: string;
}

export interface PurchaseReturn {
  id: number | string;
  returnNumber: string;
  returnDate: string;
  poId: number | string;
  poNumber: string;
  supplierId: number | string;
  supplierCode: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  initiatedBy: string;
  status: PurchaseReturnStatus;
  overallRemarks: string;
  additionalCharges: ProcurementAdditionalCharge[];
  summary: POSummary;
  taxSupplyType?: TaxSupplyType;
  attachments?: string[];
  items: PurchaseReturnItem[];
  totalItems: number;
  totalReturnQty: number;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
  activity: PurchaseReturnActivity[];
  debitNoteId?: number | null;
  debitNoteNo?: string;
}

export const PURCHASE_RETURN_STATUS_CFG: Record<
  string,
  { bg: string; text: string; dot: string; label: string }
> = {
  draft: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", label: "Draft" },
  submitted: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Submitted" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Approved" },
  issued_for_packing: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    dot: "bg-sky-500",
    label: "Issued for Packing",
  },
  returned: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Returned" },
  Draft: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", label: "Draft" },
  PO_return: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
    label: "PO Return",
  },
  Dispatched: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    dot: "bg-sky-500",
    label: "Dispatched",
  },
  Received_By_Supplier: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Received By Supplier",
  },
  Cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "Cancelled" },
};

// Kept for compatibility with any legacy consumers.
export function loadPurchaseReturns(): PurchaseReturn[] {
  return [];
}

export function getPurchaseReturnById(_id: number | string): PurchaseReturn | undefined {
  return undefined;
}

export function defaultPurchaseReturnFromPO(_po: PurchaseOrder): PurchaseReturn {
  throw new Error("Use backend APIs to build purchase return form data.");
}

export function savePurchaseReturnDraft(record: PurchaseReturn): PurchaseReturn {
  return record;
}

export function submitPurchaseReturn(record: PurchaseReturn): PurchaseReturn {
  return record;
}

export function approvePurchaseReturn(record: PurchaseReturn): PurchaseReturn {
  return record;
}

export function issuePurchaseReturnForPacking(record: PurchaseReturn): PurchaseReturn {
  return record;
}

export function markPurchaseReturnReturned(record: PurchaseReturn): PurchaseReturn {
  return record;
}

