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
  | "Ready For Packing"
  | "Partially Packed"
  | "Fully Packed"
  | "Dispatched"
  | "Received_By_Supplier"
  | "Cancelled";

export type PurchaseReturnUnit = "CASE" | "PIECE";

export type PurchaseReturnRejectionSource =
  | "QC_REJECTED"
  | "SALES_RETURN"
  | "SAMPLE_RETURN"
  | "STOCK_TRANSFER";

export interface PurchaseReturnItem {
  id: string;
  purchaseOrderProductId?: string;
  productId: string;
  productCode: string;
  productName: string;
  batchNumber: string;
  /** Origin purchase GRN (backward-compatible primary GRN display). */
  grnNo: string;
  grnId: string;
  originGrnNo?: string;
  originGrnId?: string;
  originGrnItemId?: string;
  originGrnBatchId?: string;
  latestGrnNo?: string;
  latestGrnId?: string;
  latestGrnItemId?: string;
  latestGrnBatchId?: string;
  rejectionSource?: PurchaseReturnRejectionSource | string;
  qcId?: string;
  qcNo?: string;
  grnItemId?: string;
  grnBatchId?: string;
  batchGroupKey?: string;
  inventoryDetailId: string;
  inventoryRejectedItemId?: string;
  /** Physical warehouse where rejected stock sits (may differ from PO warehouse). */
  stockWarehouseId?: string;
  stockWarehouseName?: string;
  mfgDate: string;
  expDate: string;
  caseSize: number;
  grnReceivedQty: number;
  qcRejectedQty: number;
  alreadyReturnedQty: number;
  balanceRejectedQty: number;
  /** CASE or PIECE — one row per batch + quantity type. */
  quantityType: PurchaseReturnUnit;
  returnUnit: PurchaseReturnUnit;
  /** User-entered qty in returnUnit (cases or pieces). */
  returnValue: number;
  /** Balance in display unit (cases or pieces). */
  balanceDisplayQty?: number;
  /** Edit mode: max return base qty allowed on this line (eligible pool + current line qty). */
  editableMaxReturnBaseQty?: number;
  returnQty: number;
  /** @deprecated use returnValue when quantityType is CASE */
  returnCases?: number;
  /** @deprecated use returnValue when quantityType is PIECE */
  returnLooseQty?: number;
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
  supplierType: string;
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
  packingListId?: string;
  packingListNo?: string;
  /** Packing list status (e.g. Ready For Packing / Partially Packed / Fully Packed). */
  packingListStatus?: string;
  /** True when at least one Packing Done exists for the linked packing list. */
  packingDone?: boolean;
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
  "Ready For Packing": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    label: "Ready for Packing",
  },
  "Partially Packed": {
    bg: "bg-orange-50",
    text: "text-orange-700",
    dot: "bg-orange-500",
    label: "Partially Packed",
  },
  "Fully Packed": {
    bg: "bg-violet-50",
    text: "text-violet-700",
    dot: "bg-violet-500",
    label: "Fully Packed",
  },
  Dispatched: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    dot: "bg-teal-500",
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

