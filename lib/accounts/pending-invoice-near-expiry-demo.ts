/**
 * Demo pending-invoice row with Near Expiry Scheme settlement — Accounts layer only.
 * Keeps warehouse dispatch create/packing logic unchanged while making the feature testable in UI.
 */

import type { DispatchNearExpirySchemeEntry, DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";
import {
  loadCustomers,
  nextCustomerId,
  saveCustomers,
  type Customer,
} from "@/app/(app)/masters/customers/customer-data";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import {
  NEAR_EXPIRY_SCHEME_STATUS_ACTIVE,
  NEAR_EXPIRY_SETTLEMENT_METHOD,
  NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING,
} from "@/app/(app)/warehouse/dispatch/near-expiry-constants";

export const NEAR_EXPIRY_PENDING_DEMO_DISPATCH_ID = "dp-ne-pending-demo";
export const NEAR_EXPIRY_PENDING_DEMO_DISPATCH_NO = "DSP-2026-NE-001";
export const NEAR_EXPIRY_PENDING_DEMO_SO = "SO-2026-NE-001";
export const NEAR_EXPIRY_PENDING_DEMO_CUSTOMER = "ABC Distributor";

const NEAR_EXPIRY_SCHEME_ENTRY: DispatchNearExpirySchemeEntry = {
  schemeId: 9,
  schemeCode: "NE-001",
  schemeName: "Near Expiry 30 Days Offer",
  schemeType: "Near Expiry",
  product: "Bio Fertilizer A",
  productId: "10",
  sku: "BIO-000001",
  batchNumber: "B001",
  batchExpiryDate: "2026-07-21",
  remainingExpiryDays: 24,
  dispatchQuantity: 30,
  benefitType: "Percentage",
  benefitValue: 10,
  estimatedBenefitAmount: 1260,
  schemeStatus: NEAR_EXPIRY_SCHEME_STATUS_ACTIVE,
  settlementMethod: NEAR_EXPIRY_SETTLEMENT_METHOD,
  settlementStatus: NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING,
  settlement: NEAR_EXPIRY_SETTLEMENT_METHOD,
  status: NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING,
  pendingSettlement: true,
  dealerPrice: 420,
};

export const NEAR_EXPIRY_PENDING_DEMO_DISPATCH: DispatchRecord = {
  id: NEAR_EXPIRY_PENDING_DEMO_DISPATCH_ID,
  dispatchNumber: NEAR_EXPIRY_PENDING_DEMO_DISPATCH_NO,
  salesOrderNumber: NEAR_EXPIRY_PENDING_DEMO_SO,
  customer: NEAR_EXPIRY_PENDING_DEMO_CUSTOMER,
  vehicleNumber: "MH-12-NE-4521",
  driverName: "Vikram Desai",
  transporterName: "Blue Dart Logistics",
  dispatchDate: "2026-06-25",
  deliveryStatus: "Delivered",
  warehouse: "Central Warehouse",
  packingNumbers: ["PKG-2026-NE-ACC"],
  products: [
    {
      product: "Bio Fertilizer A",
      sku: "BIO-000001",
      packedQty: 30,
      dispatchQty: 30,
      unitRate: 420,
      batchNo: "B001",
      batchExpiryDate: "2026-07-21",
      batchAllocations: [
        {
          batchNumber: "B001",
          expiryDate: "2026-07-21",
          allocatedQty: 30,
        },
      ],
      nearExpirySchemeEligible: true,
    },
  ],
  nearExpirySchemes: [NEAR_EXPIRY_SCHEME_ENTRY],
  deliveryDetails: {
    deliveryDate: "2026-06-26",
    receiverName: "Amit Patil",
    remarks: "Near-expiry batch B001 dispatched under scheme NE-001.",
  },
  dispatch_id: NEAR_EXPIRY_PENDING_DEMO_DISPATCH_ID,
  dispatch_no: NEAR_EXPIRY_PENDING_DEMO_DISPATCH_NO,
  source_type: "sales_order",
  sourceDocumentType: "Sales Order",
  source_document_no: NEAR_EXPIRY_PENDING_DEMO_SO,
  dispatch_date: "2026-06-25",
  customer_name: NEAR_EXPIRY_PENDING_DEMO_CUSTOMER,
  total_items: 1,
  total_quantity: 30,
  dispatch_status: "Delivered",
};

function isDemoDispatchInvoiced(): boolean {
  return loadInvoices().some(
    (inv) =>
      inv.dispatchNo?.trim() === NEAR_EXPIRY_PENDING_DEMO_DISPATCH_NO &&
      inv.invoiceStatus !== "cancelled",
  );
}

/** Ensures ABC Distributor (Maharashtra) exists for invoice prefill. */
export function ensureNearExpiryPendingDemoCustomer(): Customer | undefined {
  if (typeof window === "undefined") return undefined;

  const existing = loadCustomers().find(
    (c) => c.customerName.trim().toLowerCase() === NEAR_EXPIRY_PENDING_DEMO_CUSTOMER.toLowerCase(),
  );
  if (existing) return existing;

  const list = loadCustomers();
  const customer: Customer = {
    id: nextCustomerId(list),
    customerCode: "CUST-NE-ABC",
    customerName: NEAR_EXPIRY_PENDING_DEMO_CUSTOMER,
    customerType: "distributor",
    status: "active",
    blockReason: "",
    countryCode: "+91",
    mobile: "9898989898",
    email: "accounts@abcdistributor.in",
    gstApplicable: true,
    gstin: "27AABCA1234B1Z5",
    gstCategory: "regular",
    gstMasterId: 4,
    tdsApplicable: false,
    tdsMasterId: null,
    pan: "AABCA1234B",
    cibRegn: "",
    fcoRegn: "",
    fssai: "",
    address: "Plot 45, MIDC, Pune, Maharashtra 411019",
    stateId: 3,
    stateName: "Maharashtra",
    districtId: 8,
    districtName: "Pune Region",
    territoryId: null,
    territoryName: "Pune West",
    pincode: "411019",
    salesManId: 1,
    salesManName: "Rajesh Kumar",
    creditLimit: 400000,
    interestRate: 12,
    paymentTerms: "net-30",
    bankName: "",
    bankBranchAddress: "",
    bankAccountNo: "",
    ifscCode: "",
    createdBy: "Admin",
    createdDate: "2026-06-01",
    updatedBy: "Admin",
    updatedDate: "2026-06-01",
    lastStatusChange: "2026-06-01",
    statusHistory: [
      {
        date: "2026-06-01",
        from: "-",
        to: "active",
        by: "Admin",
        reason: "Demo customer for Near Expiry pending invoice",
      },
    ],
    branches: [],
    customerProducts: [],
  };

  saveCustomers([...list, customer]);
  return customer;
}

/** Returns the demo dispatch when it is still pending invoice generation. */
export function getNearExpiryPendingDemoDispatch(): DispatchRecord | undefined {
  if (typeof window === "undefined") return undefined;
  if (isDemoDispatchInvoiced()) return undefined;
  ensureNearExpiryPendingDemoCustomer();
  return NEAR_EXPIRY_PENDING_DEMO_DISPATCH;
}

export function isNearExpiryPendingDemoDispatch(dispatchId?: string | null, dispatchNo?: string | null): boolean {
  if (dispatchId === NEAR_EXPIRY_PENDING_DEMO_DISPATCH_ID) return true;
  if (dispatchNo?.trim() === NEAR_EXPIRY_PENDING_DEMO_DISPATCH_NO) return true;
  return false;
}
