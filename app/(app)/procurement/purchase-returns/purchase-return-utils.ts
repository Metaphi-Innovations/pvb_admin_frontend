import { getGrnRecords } from "@/app/(app)/warehouse/grn/mock-data";
import { getQcRecords } from "@/app/(app)/warehouse/qc/mock-data";
import type { SalesOrderCustomerAddress } from "@/app/(app)/sales/orders/sales-order-address-utils";
import type { PurchaseOrder } from "../purchase-orders/po-data";
import { getPOById } from "../purchase-orders/po-data";
import {
  findPOAddressById,
  getDefaultPOBillShipIds,
  getPOBillToAddresses,
  getPOShipToAddresses,
} from "../purchase-orders/po-address-utils";
import { getSupplierById } from "../masters/suppliers/supplier-data";
import type { PurchaseReturn, PurchaseReturnItem } from "./purchase-return-data";
import { loadPurchaseReturns } from "./purchase-return-data";
import {
  recalcReturnItem,
  resolveBatchPricing,
  resolveTaxSupplyForPO,
} from "./purchase-return-calc";
export const PURCHASE_RETURN_LIST_HREF = "/procurement/purchase-orders?tab=po_return";

export function purchaseReturnListHref(): string {
  return PURCHASE_RETURN_LIST_HREF;
}

export function canEditPurchaseReturn(record: PurchaseReturn): boolean {
  return ["draft", "submitted", "approved"].includes(record.status);
}

export function canIssuePurchaseReturnForPacking(record: PurchaseReturn): boolean {
  return record.status === "submitted" || record.status === "approved";
}

export const purchaseReturnRoutes = {
  list: PURCHASE_RETURN_LIST_HREF,
  new: (poId: number) => `/procurement/purchase-orders/returns/new?poId=${poId}`,
  detail: (id: number) => `/procurement/purchase-orders/returns/${id}`,
  edit: (id: number) => `/procurement/purchase-orders/returns/${id}/edit`,
};

export const PURCHASE_RETURN_DISABLED_MSG =
  "Purchase return can be created only when GRN inward batches are available.";

export type ReturnableLine = PurchaseReturnItem & {
  lineStatus: "available" | "fully_returned";
};

function grnHasBeenCreated(poNumber: string): boolean {
  return getGrnRecords().some((g) => g.poNumber === poNumber);
}

export function getAlreadyReturnedQty(
  poNumber: string,
  grnNo: string,
  batchNumber: string,
  excludeReturnId?: number,
): number {
  return loadPurchaseReturns()
    .filter(
      (r) =>
        r.poNumber === poNumber &&
        r.id !== excludeReturnId &&
        ["submitted", "approved", "issued_for_packing", "returned"].includes(r.status),
    )
    .flatMap((r) => r.items)
    .filter((it) => it.grnNo === grnNo && it.batchNumber === batchNumber)
    .reduce((sum, it) => sum + (it.returnQty ?? 0), 0);
}

export function buildReturnableLinesForPO(
  po: PurchaseOrder,
  excludeReturnId?: number,
  existingItems?: PurchaseReturnItem[],
): ReturnableLine[] {
  const poNumber = po.poNumber;
  const taxSupplyType = resolveTaxSupplyForPO(po);
  const grns = getGrnRecords().filter((g) => g.poNumber === poNumber);
  const qcs = getQcRecords().filter((q) => q.poNumber === poNumber);
  const qcByGrnNo = new Map(qcs.map((q) => [q.grnNo, q]));

  const existingByKey = new Map(
    (existingItems ?? []).map((it) => [`${it.grnNo}|${it.batchNumber}`, it]),
  );

  const lines: ReturnableLine[] = [];

  for (const grn of grns) {
    const qc = qcByGrnNo.get(grn.grnNo);

    for (const batch of grn.batches) {
      const qcItem = qc?.items.find(
        (i) => i.batchNumber === batch.batchNumber && i.productId === batch.productId,
      );
      const alreadyReturnedQty = getAlreadyReturnedQty(
        poNumber,
        grn.grnNo,
        batch.batchNumber,
        excludeReturnId,
      );
      const grnReceivedQty = batch.quantity;
      const qcRejectedQty = qcItem?.rejectedQty ?? 0;
      const balanceRejectedQty = Math.max(0, qcRejectedQty - alreadyReturnedQty);
      const key = `${grn.grnNo}|${batch.batchNumber}`;
      const existing = existingByKey.get(key);

      const lineStatus: ReturnableLine["lineStatus"] =
        balanceRejectedQty <= 0 ? "fully_returned" : "available";

      const selected = existing?.selected ?? (existing?.returnQty ? existing.returnQty > 0 : false);
      const pricing =
        existing?.unitPrice != null && existing.unitPrice > 0
          ? {
              unitPrice: existing.unitPrice,
              cgstPct: existing.cgstPct,
              sgstPct: existing.sgstPct,
              igstPct: existing.igstPct,
            }
          : resolveBatchPricing(batch, po, taxSupplyType);

      const baseLine: PurchaseReturnItem = {
        id: existing?.id ?? `pri-${grn.id}-${batch.batchNumber}`,
        productId: batch.productId,
        productCode: batch.productCode ?? qcItem?.productCode ?? "",
        productName: batch.productName,
        batchNumber: batch.batchNumber,
        grnNo: grn.grnNo,
        grnId: grn.id,
        qcId: qc?.id ?? "",
        qcNo: qc?.qcNo ?? "",
        mfgDate: batch.mfgDate ?? "",
        expDate: batch.expDate ?? "",
        grnReceivedQty,
        qcRejectedQty,
        alreadyReturnedQty,
        balanceRejectedQty,
        selected: lineStatus === "fully_returned" ? false : selected,
        returnQty: existing?.returnQty ?? 0,
        lineRemark: existing?.lineRemark ?? qcItem?.rejectionReason ?? "",
        lineStatus,
        ...pricing,
        grossAmount: 0,
        taxableValue: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        taxAmount: 0,
        netAmount: 0,
      };

      lines.push(recalcReturnItem(baseLine));    }
  }

  return lines;
}

export function getPurchaseReturnEligibility(po: PurchaseOrder): {
  eligible: boolean;
  reason: string;
} {
  if (!grnHasBeenCreated(po.poNumber)) {
    return { eligible: false, reason: PURCHASE_RETURN_DISABLED_MSG };
  }
  const lines = buildReturnableLinesForPO(po);
  if (!lines.some((l) => l.balanceRejectedQty > 0)) {
    return { eligible: false, reason: PURCHASE_RETURN_DISABLED_MSG };
  }
  return { eligible: true, reason: "" };
}

export function supplierCodeFromPO(po: PurchaseOrder): string {
  const supplier = getSupplierById(Number(po.supplierId));
  return supplier?.supplierCode ?? `SUP-${String(po.supplierId).padStart(3, "0")}`;
}

export function computeReturnTotals(items: PurchaseReturnItem[]): {
  totalItems: number;
  totalReturnQty: number;
} {
  const active = items.filter((it) => it.selected && it.returnQty > 0);
  return {
    totalItems: active.length,
    totalReturnQty: active.reduce((s, it) => s + it.returnQty, 0),
  };
}

export function validateReturnBalance(items: PurchaseReturnItem[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const it of items) {
    if (it.selected && it.returnQty > it.balanceRejectedQty) {
      errors[it.id] = "Return quantity cannot exceed balance rejected quantity.";
    }
  }
  return errors;
}

export function getReturnQtyError(item: PurchaseReturnItem): string | undefined {
  if (!item.selected || item.lineStatus === "fully_returned") return undefined;
  if (item.returnQty <= 0) return "Enter return quantity for selected batch.";
  if (item.returnQty > item.balanceRejectedQty) {
    return "Return quantity cannot exceed balance rejected quantity.";
  }
  return undefined;
}

export function clampReturnQty(qty: number, balanceRejectedQty: number): number {
  if (!Number.isFinite(qty) || qty < 0) return 0;
  return Math.min(qty, Math.max(0, balanceRejectedQty));
}

export function validateReturnItems(items: PurchaseReturnItem[]): Record<string, string> {
  const errors: Record<string, string> = {};
  let hasPositive = false;

  for (const it of items) {
    const rowError = getReturnQtyError(it);
    if (rowError) {
      errors[it.id] = rowError;
    }
    if (it.selected && it.lineStatus !== "fully_returned" && it.returnQty > 0) {
      hasPositive = true;
    }
  }

  if (!hasPositive) {
    errors._form = "Select at least one batch and enter a return quantity greater than zero.";
  }

  return errors;
}

export function summarizeReturn(po: PurchaseReturn): PurchaseReturn {
  const { totalItems, totalReturnQty } = computeReturnTotals(po.items);
  return { ...po, totalItems, totalReturnQty };
}

export function getPurchaseReturnBillShipAddresses(record: PurchaseReturn): {
  billAddress: SalesOrderCustomerAddress | null;
  shipAddress: SalesOrderCustomerAddress | null;
  billToAddressId: string;
  shipToAddressId: string;
} {
  const po = getPOById(record.poId);
  const supplier = getSupplierById(record.supplierId);
  const billAddresses = getPOBillToAddresses();
  const shipAddresses = getPOShipToAddresses();
  const defaults = getDefaultPOBillShipIds(billAddresses, shipAddresses, po?.warehouseId);
  const billToAddressId = po?.billToAddressId || defaults.billToAddressId;
  const shipToAddressId = po?.shipToAddressId || defaults.shipToAddressId;
  const billAddress = findPOAddressById(billAddresses, billToAddressId);

  const shipAddress: SalesOrderCustomerAddress | null = supplier
    ? {
        id: `supplier-${supplier.id}`,
        label: `${supplier.supplierName} — Ship To`,
        companyName: supplier.supplierName,
        addressLine1: supplier.address,
        city: supplier.city,
        state: supplier.state,
        pincode: supplier.pincode,
        gstin: supplier.gstNumber || "—",
        phone: supplier.mobile || supplier.phone || "—",
        email: supplier.email || "—",
      }
    : findPOAddressById(shipAddresses, shipToAddressId);

  return { billAddress, shipAddress, billToAddressId, shipToAddressId };
}
