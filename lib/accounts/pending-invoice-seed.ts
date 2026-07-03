import { demoAddDays, demoDateAt, demoFinancialYearStart, demoToday, demoTimestamp } from "@/lib/accounts/demo-date-utils";
/**
 * Seed pending invoice rows + warehouse dispatches for Accounts > Pending Invoices.
 * Versioned so deployed builds reset when seed data changes.
 */

import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";
import type { PendingTaxInvoiceRow } from "@/lib/accounts/sales-workflow-data";
import type { InvoiceDocumentType } from "@/lib/accounts/invoice-type";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import {
  NEAR_EXPIRY_PENDING_DEMO_DISPATCH,
  NEAR_EXPIRY_PENDING_DEMO_DISPATCH_ID,
  NEAR_EXPIRY_PENDING_DEMO_DISPATCH_NO,
  NEAR_EXPIRY_PENDING_DEMO_SO,
  NEAR_EXPIRY_PENDING_DEMO_CUSTOMER,
  ensureNearExpiryPendingDemoCustomer,
} from "@/lib/accounts/pending-invoice-near-expiry-demo";

export const PENDING_INVOICE_SEED_VERSION = 4;

export const PENDING_SEED_DISPATCH_IDS = {
  ne001: NEAR_EXPIRY_PENDING_DEMO_DISPATCH_ID,
  we008: "dp-pi-we-008",
  se011: "dp-pi-se-011",
  st004: "dp-pi-st-004",
  st007: "dp-pi-st-007",
} as const;

type SeedRowDef = {
  dispatchId: string;
  dispatchNo: string;
  sourceNo: string;
  invoiceType: InvoiceDocumentType;
  party: string;
  dispatchDate: string;
  taxableValue: number;
  gstAmount: number;
  invoiceValue: number;
  interstate: boolean;
  status: string;
  salesOrderId: number | null;
  warehouse: string;
  dispatch: DispatchRecord;
};

const STOCK_TRANSFER_DISPATCHES: DispatchRecord[] = [
  {
    id: PENDING_SEED_DISPATCH_IDS.st004,
    dispatchNumber: "DSP-ST-2026-004",
    salesOrderNumber: "ST-2026-004",
    customer: "Transfer to Ahmedabad Warehouse",
    vehicleNumber: "GJ-01-ST-4401",
    driverName: "Harsh Patel",
    transporterName: "Gati Express",
    dispatchDate: demoDateAt(0),
    deliveryStatus: "Delivered",
    warehouse: "Central Warehouse",
    sourceWarehouse: "Central Warehouse",
    targetWarehouse: "Ahmedabad Warehouse",
    packingNumbers: ["PKG-ST-2026-004"],
    products: [
      { product: "DAP 50kg", sku: "SKU-DAP-50", packedQty: 200, dispatchQty: 200, unitRate: 260 },
    ],
    dispatch_id: PENDING_SEED_DISPATCH_IDS.st004,
    dispatch_no: "DSP-ST-2026-004",
    source_type: "stock_transfer",
    sourceDocumentType: "Stock Transfer",
    source_document_no: "ST-2026-004",
    source_warehouse_name: "Central Warehouse",
    target_warehouse_name: "Ahmedabad Warehouse",
    dispatch_status: "Delivered",
  },
  {
    id: PENDING_SEED_DISPATCH_IDS.st007,
    dispatchNumber: "DSP-ST-2026-007",
    salesOrderNumber: "ST-2026-007",
    customer: "Transfer to Pune Warehouse",
    vehicleNumber: "MH-14-ST-7707",
    driverName: "Prakash Nair",
    transporterName: "VRL Logistics",
    dispatchDate: demoDateAt(1),
    deliveryStatus: "Delivered",
    warehouse: "West Zone Hub",
    sourceWarehouse: "West Zone Hub",
    targetWarehouse: "Pune Warehouse",
    packingNumbers: ["PKG-ST-2026-007"],
    products: [
      { product: "Urea 50kg", sku: "SKU-UR-50", packedQty: 250, dispatchQty: 250, unitRate: 314 },
    ],
    dispatch_id: PENDING_SEED_DISPATCH_IDS.st007,
    dispatch_no: "DSP-ST-2026-007",
    source_type: "stock_transfer",
    sourceDocumentType: "Stock Transfer",
    source_document_no: "ST-2026-007",
    source_warehouse_name: "West Zone Hub",
    target_warehouse_name: "Pune Warehouse",
    dispatch_status: "Delivered",
  },
];

const SALES_DISPATCHES: DispatchRecord[] = [
  {
    id: PENDING_SEED_DISPATCH_IDS.we008,
    dispatchNumber: "DSP-2026-WE-008",
    salesOrderNumber: "SO-2026-WE-014",
    customer: "Reliance Agri",
    vehicleNumber: "MH-12-AB-1234",
    driverName: "Ramesh Kumar",
    transporterName: "Blue Dart Logistics",
    dispatchDate: demoDateAt(2),
    deliveryStatus: "Delivered",
    warehouse: "Central Warehouse",
    packingNumbers: ["PKG-2026-WE-008"],
    products: [
      { product: "Urea 50kg", sku: "SKU-UR-50", packedQty: 300, dispatchQty: 300, unitRate: 310 },
    ],
    dispatch_id: PENDING_SEED_DISPATCH_IDS.we008,
    dispatch_no: "DSP-2026-WE-008",
    source_type: "sales_order",
    sourceDocumentType: "Sales Order",
    source_document_no: "SO-2026-WE-014",
    customer_name: "Reliance Agri",
    dispatch_status: "Delivered",
  },
  {
    id: PENDING_SEED_DISPATCH_IDS.se011,
    dispatchNumber: "DSP-2026-SE-011",
    salesOrderNumber: "SO-2026-SE-021",
    customer: "Mahindra Farms",
    vehicleNumber: "GJ-01-CD-5678",
    driverName: "Sunil Patil",
    transporterName: "DTDC Cargo",
    dispatchDate: demoDateAt(3),
    deliveryStatus: "Delivered",
    warehouse: "Central Warehouse",
    packingNumbers: ["PKG-2026-SE-011"],
    products: [
      { product: "NPK 10:26:26", sku: "SKU-NPK-26", packedQty: 400, dispatchQty: 400, unitRate: 362.5 },
    ],
    dispatch_id: PENDING_SEED_DISPATCH_IDS.se011,
    dispatch_no: "DSP-2026-SE-011",
    source_type: "sales_order",
    sourceDocumentType: "Sales Order",
    source_document_no: "SO-2026-SE-021",
    customer_name: "Mahindra Farms",
    dispatch_status: "Delivered",
  },
];

const SEED_ROW_DEFS: SeedRowDef[] = [
  {
    dispatchId: PENDING_SEED_DISPATCH_IDS.ne001,
    dispatchNo: NEAR_EXPIRY_PENDING_DEMO_DISPATCH_NO,
    sourceNo: NEAR_EXPIRY_PENDING_DEMO_SO,
    invoiceType: "sales",
    party: NEAR_EXPIRY_PENDING_DEMO_CUSTOMER,
    dispatchDate: demoDateAt(4),
    taxableValue: 12600,
    gstAmount: 1512,
    invoiceValue: 14112,
    interstate: false,
    status: "Delivered",
    salesOrderId: null,
    warehouse: "Central Warehouse",
    dispatch: NEAR_EXPIRY_PENDING_DEMO_DISPATCH,
  },
  {
    dispatchId: PENDING_SEED_DISPATCH_IDS.we008,
    dispatchNo: "DSP-2026-WE-008",
    sourceNo: "SO-2026-WE-014",
    invoiceType: "sales",
    party: "Reliance Agri",
    dispatchDate: demoDateAt(5),
    taxableValue: 93000,
    gstAmount: 4650,
    invoiceValue: 97650,
    interstate: true,
    status: "Delivered",
    salesOrderId: null,
    warehouse: "Central Warehouse",
    dispatch: SALES_DISPATCHES[0],
  },
  {
    dispatchId: PENDING_SEED_DISPATCH_IDS.se011,
    dispatchNo: "DSP-2026-SE-011",
    sourceNo: "SO-2026-SE-021",
    invoiceType: "sales",
    party: "Mahindra Farms",
    dispatchDate: demoDateAt(6),
    taxableValue: 145000,
    gstAmount: 17400,
    invoiceValue: 162400,
    interstate: false,
    status: "Delivered",
    salesOrderId: null,
    warehouse: "Central Warehouse",
    dispatch: SALES_DISPATCHES[1],
  },
  {
    dispatchId: PENDING_SEED_DISPATCH_IDS.st004,
    dispatchNo: "DSP-ST-2026-004",
    sourceNo: "ST-2026-004",
    invoiceType: "stock_transfer",
    party: "Ahmedabad Warehouse",
    dispatchDate: demoDateAt(7),
    taxableValue: 52000,
    gstAmount: 2600,
    invoiceValue: 54600,
    interstate: true,
    status: "Delivered",
    salesOrderId: null,
    warehouse: "Central Warehouse",
    dispatch: STOCK_TRANSFER_DISPATCHES[0],
  },
  {
    dispatchId: PENDING_SEED_DISPATCH_IDS.st007,
    dispatchNo: "DSP-ST-2026-007",
    sourceNo: "ST-2026-007",
    invoiceType: "stock_transfer",
    party: "Pune Warehouse",
    dispatchDate: demoDateAt(8),
    taxableValue: 78500,
    gstAmount: 9420,
    invoiceValue: 87920,
    interstate: false,
    status: "Delivered",
    salesOrderId: null,
    warehouse: "West Zone Hub",
    dispatch: STOCK_TRANSFER_DISPATCHES[1],
  },
];

function isDispatchInvoiced(dispatchNo: string): boolean {
  return loadInvoices().some(
    (inv) => inv.dispatchNo?.trim() === dispatchNo.trim() && inv.invoiceStatus !== "cancelled",
  );
}

export function getPendingInvoiceSeedDispatches(): DispatchRecord[] {
  return [
    NEAR_EXPIRY_PENDING_DEMO_DISPATCH,
    ...SALES_DISPATCHES,
    ...STOCK_TRANSFER_DISPATCHES,
  ];
}

export function getPendingInvoiceSeedDispatch(
  dispatchId?: string | null,
  dispatchNo?: string | null,
): DispatchRecord | undefined {
  if (typeof window === "undefined") return undefined;
  if (dispatchId === PENDING_SEED_DISPATCH_IDS.ne001 || dispatchNo === NEAR_EXPIRY_PENDING_DEMO_DISPATCH_NO) {
    if (isDispatchInvoiced(NEAR_EXPIRY_PENDING_DEMO_DISPATCH_NO)) return undefined;
    ensureNearExpiryPendingDemoCustomer();
    return NEAR_EXPIRY_PENDING_DEMO_DISPATCH;
  }
  const all = [...SALES_DISPATCHES, ...STOCK_TRANSFER_DISPATCHES];
  return (
    (dispatchId ? all.find((d) => d.id === dispatchId) : undefined) ??
    (dispatchNo ? all.find((d) => d.dispatchNumber === dispatchNo) : undefined)
  );
}

export function isPendingInvoiceSeedDispatch(dispatchId?: string | null, dispatchNo?: string | null): boolean {
  return Boolean(getPendingInvoiceSeedDispatch(dispatchId, dispatchNo));
}

export function listPendingInvoiceSeedRows(): PendingTaxInvoiceRow[] {
  if (typeof window === "undefined") {
    return SEED_ROW_DEFS.map((row, index) => mapSeedDefToRow(row, index + 1));
  }

  return SEED_ROW_DEFS.filter((row) => !isDispatchInvoiced(row.dispatchNo)).map((row, index) =>
    mapSeedDefToRow(row, index + 1),
  );
}

function mapSeedDefToRow(def: SeedRowDef, index: number): PendingTaxInvoiceRow {
  return {
    id: index,
    dispatchId: def.dispatchId,
    dispatchNo: def.dispatchNo,
    soNumber: def.sourceNo,
    salesOrderId: def.salesOrderId,
    invoiceType: def.invoiceType,
    customerName: def.party,
    dispatchDate: def.dispatchDate,
    taxableValue: def.taxableValue,
    gstAmount: def.gstAmount,
    invoiceValue: def.invoiceValue,
    interstate: def.interstate,
    status: def.status,
    schemeLabel: def.dispatchId === PENDING_SEED_DISPATCH_IDS.ne001 ? "Near Expiry" : null,
    settlementLabel: def.dispatchId === PENDING_SEED_DISPATCH_IDS.ne001 ? "Settlement Required" : null,
  };
}
