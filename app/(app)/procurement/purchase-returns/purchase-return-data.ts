import { CURRENT_USER } from "@/lib/procurement/config";
import { nextId, todayStr } from "@/lib/procurement/utils";
import { getRejectedStockRecords, saveRejectedStockRecords } from "@/app/(app)/warehouse/stockoverview/mock-data";
import type { TaxSupplyType } from "@/lib/procurement/utils";
import type { ProcurementAdditionalCharge } from "@/lib/procurement/procurement-line-utils";
import type { POSummary, PurchaseOrder } from "../purchase-orders/po-data";
import {
  buildReturnableLinesForPO,
  clampReturnQty,
  supplierCodeFromPO,
} from "./purchase-return-utils";
import {
  emptyReturnSummary,
  recalcPurchaseReturn,
} from "./purchase-return-calc";
import { getPOById } from "../purchase-orders/po-data";
import { addPurchaseReturnToPackingQueue } from "./purchase-return-packing-sync";
import { attachDebitNoteToPurchaseReturn } from "@/lib/accounts/purchase-return-debit-bridge";

export type PurchaseReturnStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "issued_for_packing"
  | "returned";

export interface PurchaseReturnItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  batchNumber: string;
  grnNo: string;
  grnId: string;
  qcId: string;
  qcNo: string;
  mfgDate: string;
  expDate: string;
  grnReceivedQty: number;
  qcRejectedQty: number;
  alreadyReturnedQty: number;
  balanceRejectedQty: number;
  returnQty: number;
  lineRemark: string;
  selected: boolean;
  lineStatus: "available" | "fully_returned";
  unitPrice: number;
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
  id: number;
  returnNumber: string;
  returnDate: string;
  poId: number;
  poNumber: string;
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  initiatedBy: string;
  status: PurchaseReturnStatus;
  overallRemarks: string;
  additionalCharges: ProcurementAdditionalCharge[];
  summary: POSummary;
  taxSupplyType?: TaxSupplyType;
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

const STORAGE_KEY = "ds_procurement_purchase_returns_v1";

export const PURCHASE_RETURN_STATUS_CFG: Record<
  PurchaseReturnStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  draft: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", label: "Draft" },
  submitted: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400", label: "Submitted" },
  approved: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Approved" },
  issued_for_packing: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    dot: "bg-sky-500",
    label: "Issued for Packing",
  },
  returned: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Returned" },
};

const RAW_SEED: PurchaseReturn[] = [
  {
    id: 1,
    returnNumber: "PRET-2024-0001",
    returnDate: "2024-02-05",
    poId: 1,
    poNumber: "PO-2024-0001",
    supplierId: 1,
    supplierCode: "SUP-001",
    supplierName: "Agro Chem Distributors",
    initiatedBy: "Admin",
    status: "returned",
    overallRemarks: "Leakage on 1 unit — balance returned to supplier.",
    additionalCharges: [],
    summary: emptyReturnSummary(),
    items: [
      {
        id: "pri-qc-3-B-CP-24A",
        productId: "4",
        productCode: "PRD-004",
        productName: "Chlorpyrifos 20 EC",
        batchNumber: "B-CP-24A",
        grnNo: "GRN-2024-004",
        grnId: "grn-4",
        qcId: "qc-3",
        qcNo: "QC-2024-003",
        mfgDate: "2023-10-01",
        expDate: "2025-10-01",
        grnReceivedQty: 60,
        qcRejectedQty: 2,
        alreadyReturnedQty: 0,
        balanceRejectedQty: 2,
        returnQty: 1,
        lineRemark: "Leakage — partial return",
        selected: true,
        lineStatus: "available",
        unitPrice: 0,
        cgstPct: 0,
        sgstPct: 0,
        igstPct: 0,
        grossAmount: 0,
        taxableValue: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        taxAmount: 0,
        netAmount: 0,
      },
    ],
    totalItems: 1,
    totalReturnQty: 1,
    createdBy: "Admin",
    createdDate: "2024-02-04",
    updatedBy: "Admin",
    updatedDate: "2024-02-05",
    activity: [
      { date: "2024-02-04", action: "Created", by: "Admin" },
      { date: "2024-02-04", action: "Saved as Draft", by: "Admin" },
      { date: "2024-02-05", action: "Submitted", by: "Admin" },
      { date: "2024-02-05", action: "Returned to Supplier", by: "Admin" },
    ],
  },
];

function normalizeReturn(record: PurchaseReturn & {
  vendorId?: number;
  vendorCode?: string;
  vendorName?: string;
}): PurchaseReturn {
  const po = getPOById(record.poId);
  const migrated: PurchaseReturn = {
    ...record,
    supplierId: record.supplierId ?? record.vendorId ?? 0,
    supplierCode: record.supplierCode ?? record.vendorCode ?? "",
    supplierName: record.supplierName ?? record.vendorName ?? "",
    additionalCharges: record.additionalCharges ?? [],
    summary: record.summary ?? emptyReturnSummary(),
    items: record.items ?? [],
  };

  if (po) {
    const needsRebuild = migrated.items.some((it) => it.unitPrice == null || it.unitPrice === undefined);
    if (needsRebuild || migrated.items.length === 0) {
      migrated.items = buildReturnableLinesForPO(po, migrated.id, migrated.items);
    } else {
      migrated.items = migrated.items.map((it) => ({
        ...it,
        selected: it.selected ?? it.returnQty > 0,
        lineStatus: it.balanceRejectedQty <= 0 ? "fully_returned" : "available",
        unitPrice: it.unitPrice ?? 0,
        cgstPct: it.cgstPct ?? 0,
        sgstPct: it.sgstPct ?? 0,
        igstPct: it.igstPct ?? 0,
        grossAmount: it.grossAmount ?? 0,
        taxableValue: it.taxableValue ?? 0,
        cgstAmount: it.cgstAmount ?? 0,
        sgstAmount: it.sgstAmount ?? 0,
        igstAmount: it.igstAmount ?? 0,
        taxAmount: it.taxAmount ?? 0,
        netAmount: it.netAmount ?? 0,
      }));
    }
    return recalcPurchaseReturn(migrated, po);
  }

  return recalcPurchaseReturn(migrated);
}

function getSeed() {
  return RAW_SEED.map(normalizeReturn);
}

export function loadPurchaseReturns(): PurchaseReturn[] {
  if (typeof window === "undefined") return getSeed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = getSeed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const stored = JSON.parse(raw) as PurchaseReturn[];
    const byId = new Map(stored.map((r) => [r.id, r]));
    for (const seed of getSeed()) {
      if (!byId.has(seed.id)) byId.set(seed.id, seed);
    }
    return Array.from(byId.values()).map(normalizeReturn);
  } catch {
    return getSeed();
  }
}

export function savePurchaseReturns(list: PurchaseReturn[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.map(normalizeReturn)));
}

export function getPurchaseReturnById(id: number): PurchaseReturn | undefined {
  return loadPurchaseReturns().find((r) => r.id === id);
}

export function generatePurchaseReturnNumber(list: PurchaseReturn[]): string {
  const year = new Date().getFullYear();
  const count = list.filter((r) => r.returnNumber.startsWith(`PRET-${year}`)).length;
  return `PRET-${year}-${String(count + 1).padStart(4, "0")}`;
}

export function defaultPurchaseReturnFromPO(po: PurchaseOrder): PurchaseReturn {
  const list = loadPurchaseReturns();
  const today = todayStr();
  const lines = buildReturnableLinesForPO(po);

  return recalcPurchaseReturn(
    {
      id: nextId(list),
      returnNumber: generatePurchaseReturnNumber(list),
      returnDate: today,
      poId: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      supplierCode: supplierCodeFromPO(po),
      supplierName: po.supplierName,
      initiatedBy: CURRENT_USER,
      status: "draft",
      overallRemarks: "",
      additionalCharges: [],
      summary: emptyReturnSummary(),
      items: lines,
      totalItems: 0,
      totalReturnQty: 0,
      createdBy: CURRENT_USER,
      createdDate: today,
      updatedBy: CURRENT_USER,
      updatedDate: today,
      activity: [{ date: today, action: "Created", by: CURRENT_USER }],
    },
    po,
  );
}

function reduceRejectedStock(record: PurchaseReturn): void {
  if (typeof window === "undefined") return;
  const rejected = getRejectedStockRecords();
  const updated = rejected.map((row) => {
    const match = record.items.find(
      (it) =>
        it.selected &&
        it.returnQty > 0 &&
        it.qcRejectedQty > 0 &&
        row.batchNumber === it.batchNumber &&
        (row.qcNumber === it.qcNo || row.product === it.productName),
    );
    if (!match) return row;
    const deductQty = Math.min(match.returnQty, match.qcRejectedQty);
    const nextQty = Math.max(0, row.rejectedQuantity - deductQty);
    return {
      ...row,
      rejectedQuantity: nextQty,
      status: nextQty <= 0 ? "Returned To Supplier" : row.status,
      remarks: row.remarks
        ? `${row.remarks} | Return ${record.returnNumber}: ${deductQty} qty`
        : `Return ${record.returnNumber}: ${deductQty} qty`,
    };
  });

  const hasMatch = record.items.some((it) => it.selected && it.returnQty > 0 && it.qcRejectedQty > 0);
  if (hasMatch) {
    saveRejectedStockRecords(updated);
  }
}

function appendActivity(
  record: PurchaseReturn,
  action: string,
  note?: string,
): PurchaseReturn {
  const today = todayStr();
  return {
    ...record,
    updatedBy: CURRENT_USER,
    updatedDate: today,
    activity: [...record.activity, { date: today, action, by: CURRENT_USER, note }],
  };
}

function withRecalc(record: PurchaseReturn): PurchaseReturn {
  const po = getPOById(record.poId);
  const sanitized = {
    ...record,
    items: record.items.map((it) => ({
      ...it,
      returnQty: it.selected
        ? clampReturnQty(it.returnQty, it.balanceRejectedQty)
        : it.returnQty,
    })),
  };
  return recalcPurchaseReturn(sanitized, po);
}

export function savePurchaseReturnDraft(record: PurchaseReturn): PurchaseReturn {
  const list = loadPurchaseReturns();
  const today = todayStr();
  let updated = withRecalc({
    ...record,
    status: "draft",
    updatedBy: CURRENT_USER,
    updatedDate: today,
  });
  updated = appendActivity(updated, "Saved as Draft");

  const idx = list.findIndex((r) => r.id === updated.id);
  if (idx >= 0) {
    list[idx] = updated;
  } else {
    list.unshift(updated);
  }
  savePurchaseReturns(list);
  return updated;
}

export function submitPurchaseReturn(record: PurchaseReturn): PurchaseReturn {
  const list = loadPurchaseReturns();
  const today = todayStr();
  let updated = withRecalc({
    ...record,
    status: "submitted",
    updatedBy: CURRENT_USER,
    updatedDate: today,
  });
  updated = appendActivity(updated, "Submitted");

  reduceRejectedStock(updated);

  const idx = list.findIndex((r) => r.id === updated.id);
  if (idx >= 0) {
    list[idx] = updated;
  } else {
    list.unshift(updated);
  }
  savePurchaseReturns(list);
  return updated;
}

export function approvePurchaseReturn(record: PurchaseReturn): PurchaseReturn {
  const list = loadPurchaseReturns();
  let updated = appendActivity(
    withRecalc({ ...record, status: "approved" }),
    "Approved",
  );

  updated = attachDebitNoteToPurchaseReturn(updated);
  if (updated.debitNoteNo) {
    updated = appendActivity(updated, `Debit Note ${updated.debitNoteNo} auto-generated`);
  }

  const idx = list.findIndex((r) => r.id === updated.id);
  if (idx >= 0) list[idx] = updated;
  savePurchaseReturns(list);
  return updated;
}

export function issuePurchaseReturnForPacking(record: PurchaseReturn): PurchaseReturn {
  const list = loadPurchaseReturns();
  let updated = appendActivity(
    withRecalc({ ...record, status: "issued_for_packing" }),
    "Issued for Packing",
  );
  addPurchaseReturnToPackingQueue(updated);

  const idx = list.findIndex((r) => r.id === updated.id);
  if (idx >= 0) list[idx] = updated;
  savePurchaseReturns(list);
  return updated;
}

export function markPurchaseReturnReturned(record: PurchaseReturn): PurchaseReturn {
  const list = loadPurchaseReturns();
  let updated = appendActivity(
    withRecalc({ ...record, status: "returned" }),
    "Returned to Supplier",
  );
  const idx = list.findIndex((r) => r.id === updated.id);
  if (idx >= 0) list[idx] = updated;
  savePurchaseReturns(list);
  return updated;
}

export const PURCHASE_RETURN_LIST_TABS: Array<PurchaseReturnStatus | "all"> = [
  "all",
  "draft",
  "submitted",
  "approved",
  "returned",
];
