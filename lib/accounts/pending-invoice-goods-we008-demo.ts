/**
 * Ensures linked Customer + Sales Order exist for Pending Invoice demo DSP-2026-WE-008.
 * Accounts-layer only — populates masters/orders so Goods Generate can resolve GSTIN, batch, salesperson.
 */

import {
  loadCustomers,
  nextCustomerId,
  saveCustomers,
  type Customer,
} from "@/app/(app)/masters/customers/customer-data";
import {
  hydrateOrders,
  loadOrders,
  saveOrders,
  type SalesOrder,
} from "@/app/(app)/sales/orders/orders-data";

export const GOODS_WE008_DISPATCH_ID = "dp-pi-we-008";
export const GOODS_WE008_DISPATCH_NO = "DSP-2026-WE-008";
export const GOODS_WE008_SO = "SO-2026-WE-014";
export const GOODS_WE008_CUSTOMER = "Reliance Agri";
export const GOODS_WE008_BATCH = "B-UR-99A";

/** Ensures Reliance Agri exists for invoice prefill (GSTIN, addresses, payment terms). */
export function ensureGoodsWe008DemoCustomer(): Customer | undefined {
  if (typeof window === "undefined") return undefined;

  const existing = loadCustomers().find(
    (c) => c.customerName.trim().toLowerCase() === GOODS_WE008_CUSTOMER.toLowerCase(),
  );
  if (existing) return existing;

  const list = loadCustomers();
  const customer: Customer = {
    id: nextCustomerId(list),
    customerCode: "CUST-REL-AGRI",
    customerName: GOODS_WE008_CUSTOMER,
    customerType: "distributor",
    status: "active",
    blockReason: "",
    countryCode: "+91",
    mobile: "9822098200",
    email: "accounts@relianceagri.in",
    gstApplicable: true,
    gstin: "27AABCR4521D1Z8",
    gstCategory: "regular",
    gstMasterId: 4,
    tdsApplicable: false,
    tdsMasterId: null,
    pan: "AABCR4521D",
    cibRegn: "",
    fcoRegn: "",
    fssai: "",
    address: "12 Agri Hub, Andheri East, Mumbai, Maharashtra 400069",
    stateId: 3,
    stateName: "Maharashtra",
    districtId: 1,
    districtName: "Mumbai",
    territoryId: null,
    territoryName: "West Zone",
    pincode: "400069",
    salesManId: 4,
    salesManName: "Neha Patel",
    creditLimit: 750000,
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
        reason: "Demo customer for Goods pending invoice WE-008",
      },
    ],
    branches: [
      {
        branchName: "Mumbai HO",
        isMain: true,
        billingAddress: {
          address: "12 Agri Hub, Andheri East, Mumbai, Maharashtra 400069",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400069",
          gstin: "27AABCR4521D1Z8",
        },
        shippingAddress: {
          address: "Warehouse Gate 3, Bhiwandi, Thane, Maharashtra 421302",
          city: "Thane",
          state: "Maharashtra",
          pincode: "421302",
          gstin: "27AABCR4521D1Z8",
        },
        documents: [],
      },
    ],
    customerProducts: [],
  };

  saveCustomers([...list, customer]);
  return customer;
}

/** Ensures SO-2026-WE-014 exists so salesperson and commercial rates resolve. */
export function ensureGoodsWe008DemoSalesOrder(customer: Customer): SalesOrder | undefined {
  if (typeof window === "undefined") return undefined;

  const orders = hydrateOrders(loadOrders());
  const existing = orders.find((o) => o.soNumber === GOODS_WE008_SO);
  if (existing) return existing;

  const maxId = orders.reduce((m, o) => Math.max(m, o.id), 0);
  const order: SalesOrder = {
    id: maxId + 1,
    soNumber: GOODS_WE008_SO,
    customerId: customer.id,
    customerName: customer.customerName,
    customerCode: customer.customerCode,
    territory: customer.territoryName || "West Zone",
    salesManId: customer.salesManId ?? 4,
    salesManName: customer.salesManName || "Neha Patel",
    orderDate: "2026-07-10",
    deliveryDate: "2026-07-15",
    status: "dispatched",
    lineItems: [
      {
        id: "line-we014-urea",
        productId: 5,
        productCode: "FERT-000002",
        productName: "Urea 50kg",
        availableStock: 500,
        quantity: 300,
        dealerPrice: 310,
        unitPrice: 310,
        discount: 0,
        discountValue: 0,
        schemeDiscountPercent: 0,
        schemeDiscountAmount: 0,
        finalRate: 310,
        schemeApplied: "No",
        gstAmount: 4650,
        lineTotal: 97650,
      },
    ],
    totalAmount: 97650,
    requiresApproval: false,
    items: 1,
    createdBy: "Admin",
    createdDate: "2026-07-10",
    updatedBy: "Admin",
    updatedDate: "2026-07-10",
    warehouseName: "Central Warehouse",
  };

  saveOrders([...orders, order]);
  return order;
}

export function ensureGoodsWe008DemoLinkage(): {
  customer?: Customer;
  order?: SalesOrder;
} {
  const customer = ensureGoodsWe008DemoCustomer();
  if (!customer) return {};
  const order = ensureGoodsWe008DemoSalesOrder(customer);
  return { customer, order };
}
