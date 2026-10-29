export interface PackedBatchAllocation {
  batchNumber: string;
  expiryDate: string;
  allocatedQty: number;
}

export interface SalesOrderProduct {
  product: string;
  productId?: string;
  sku: string;
  ordered_cases: number;
  packedQty: number;
  pending_cases: number;
  orderBaseQty: number;
  packedBaseQty: number;
  pendingBaseQty: number;
  packSize: number;
  batchNumber?: string;
  grnNo?: string;
  mfgDate?: string;
  expDate?: string;
  lineId?: string;
  quantity_type?: string;
  netWeightPerPack?: number;
  weightUom?: string;
  productSnapshot?: Record<string, unknown>;
}

export interface SalesOrderRecord {
  id: string;
  salesOrderNo: string;
  customer: string;
  totalItems: number;
  totalQuantity: number;
  orderAmount: number;
  orderDate: string;
  deliveryDate: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Ready For Packing" | "Partially Packed" | "Packing In Progress";
  warehouse: string;
  warehouseId?: string;
  products: SalesOrderProduct[];
  sourceDocumentType?: "Sales Order" | "Stock Transfer" | "Sample Order" | "Purchase Return";
  sourceDocumentNo?: string;
  sourceWarehouse?: string;
  targetWarehouse?: string;
  createdDate?: string;
  packingListNo?: string;
  poNumber?: string;
  supplierCode?: string;
  initiatedBy?: string;
  returnRemarks?: string;
}

export interface PackedProduct {
  product: string;
  sku: string;
  productCode?: string;
  productId?: string;
  ordered_cases: number;
  packedQty: number;
  orderBaseQty: number;
  packedBaseQty: number;
  /** Pending qty still on the linked packing-list product (units). */
  pendingBaseQty?: number;
  packSize: number;
  batchNumber?: string;
  grnNo?: string;
  mfgDate?: string;
  expDate?: string;
  quantity_type?: string;
  netWeightPerPack?: number;
  weightUom?: string;
  productSnapshot?: Record<string, unknown>;
  batchAllocations?: PackedBatchAllocation[];
  nearExpirySchemeEligible?: boolean;
  lineId?: string;
  packingDoneProductId?: string;
  sourceItemId?: string;
  availableInventoryId?: string;
  /** Local-only key for staged (unsaved) add rows. */
  draftKey?: string;
  isDraft?: boolean;
}

export interface PackingNearExpirySchemeEntry {
  schemeId: number;
  schemeCode: string;
  schemeName: string;
  schemeType: "Near Expiry";
  product: string;
  productId: string;
  sku: string;
  batchNumber: string;
  batchExpiryDate: string;
  remainingExpiryDays: number;
  dispatchQuantity: number;
  benefitType: string;
  benefitValue: number;
  estimatedBenefitAmount: number;
  schemeStatus: "Active";
  settlementMethod: string;
  settlementStatus: "Pending";
  /** @deprecated Use settlementMethod */
  settlement?: string;
  /** @deprecated Use settlementStatus */
  status?: string;
  pendingSettlement: true;
  dealerPrice?: number;
}

export interface PackingRecord {
  id: string;
  packingListId?: string;
  packingNo: string;
  salesOrderNo: string;
  customer: string;
  totalItems: number;
  packedQuantity: number;
  packingDate: string;
  packedBy: string;
  status: "Packed" | "Dispatched" | "Cancelled" | "Ready For Dispatch" | "Available for Dispatch";
  warehouse: string;
  warehouseId?: string;
  products: PackedProduct[];
  nearExpirySchemes?: PackingNearExpirySchemeEntry[];
  sourceId?: string;
  sourceTypeRaw?: string;
  sourceDocumentType?: "Sales Order" | "Stock Transfer" | "Sample Order" | "Purchase Return";
  sourceDocumentNo?: string;
  sourceWarehouse?: string;
  targetWarehouse?: string;
  createdDate?: string;
  packingListNo?: string;
  poNumber?: string;
  supplierCode?: string;
  initiatedBy?: string;
  returnRemarks?: string;
  orderAmount?: number;
  canEditBatches?: boolean;
}

/** Source-document item meta for Packing Done Add / Update qty validation. */
export interface PackingDoneRemainingItem {
  sourceItemId: string;
  productId: string;
  productName: string;
  sku: string;
  productCode?: string;
  /** Full ordered qty on the SO/Sample/ST line (units). */
  orderBaseQty: number;
  /** Qty not yet on any packing list (units). */
  remainingBaseQty: number;
  packSize: number;
  quantityType?: string;
  productSnapshot?: Record<string, unknown>;
}

/** Staged batch selection returned by the edit dialog (not persisted until Save). */
export interface PackingDoneBatchDraftSelection {
  availableInventoryId: string;
  batchNumber: string;
  expiryDate?: string;
  mfgDate?: string;
}

export type PackingDoneDraftChange =
  | {
      mode: "swap";
      /** Existing persisted packing-done product id, if any. */
      packingDoneProductId?: string;
      /** Local draft row key for unsaved add lines. */
      draftKey?: string;
      quantityType?: string;
      /** New packed qty in base units. */
      baseQty: number;
      batch: PackingDoneBatchDraftSelection;
    }
  | {
      mode: "add";
      sourceItemId: string;
      baseQty: number;
      quantityType?: string;
      remainingItem: PackingDoneRemainingItem;
      batch: PackingDoneBatchDraftSelection;
    };

export type PackingRecordUnion =
  | { type: "order"; data: SalesOrderRecord }
  | { type: "packing"; data: PackingRecord };
