// ── Sales Orders — types, catalog, persistence, approval rules ───────────────

import { loadCustomers, getCustomersForTransactionDropdown } from "@/app/(app)/masters/customers/customer-data";
import { loadEmployees, type Employee } from "@/app/(app)/user-management/employee/employee-data";
import { loadWarehouses } from "@/app/(app)/masters/warehouse/warehouse-data";
import { resolveSezLutSupply } from "@/lib/settings/gst-tax-config";

/** Orders above this amount require approval on submit (not draft). */
export const ORDER_APPROVAL_THRESHOLD = 10_000;

export type OrderStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "confirmed"
  | "cancelled"
  | "dispatched"
  | "delivered";

export type PackingStatus =
  | "draft"
  | "generated"
  | "partially_packed"
  | "packed"
  | "cancelled";

export type ApprovalStatus = "not_required" | "pending_approval" | "approved" | "rejected";

/** Order statuses shown on the Sales Order Approval listing tab. */
export const APPROVAL_ORDER_STATUSES: OrderStatus[] = ["pending_approval", "approved", "rejected"];

/** Statuses that may be changed on edit. */
export const EDITABLE_ORDER_STATUSES: OrderStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "confirmed",
];

export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
];

export interface ProductCatalogItem {
  id: number;
  code: string;
  name: string;
  uom: string;
  gstRate: string;
  sellingPrice: number;
  stock: number;
  status: "active" | "inactive" | "archived";
}

export interface SalesOrderLineItem {
  id: string;
  productId: number | null;
  productCode: string;
  productName: string;
  availableStock: number;
  quantity: number;
  unitPrice: number;
  /** Discount percentage */
  discount: number;
  /** Discount amount in ₹ (synced with discount %) */
  discountValue: number;
  gstAmount: number;
  lineTotal: number;
  /** Split form only: parent line when qty is taken from original order */
  splitSourceLineId?: string;
  /** Split form only: max qty available from parent line */
  maxSplitQty?: number;
}

export type ExpenseDiscountType = "percent" | "fixed";

export interface SalesOrderAdditionalExpense {
  id: string;
  expenseName: string;
  amount: number;
  discountType: ExpenseDiscountType;
  discountValue: number;
  netAmount: number;
}

export const EXPENSE_DISCOUNT_TYPE_OPTIONS: { value: ExpenseDiscountType; label: string }[] = [
  { value: "percent", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed Amount (₹)" },
];

export interface SalesOrder {
  id: number;
  soNumber: string;
  customerId: number;
  customerName: string;
  customerCode: string;
  territory: string;
  salesManId: number | null;
  salesManName: string;
  orderDate: string;
  deliveryDate: string;
  status: OrderStatus;
  lineItems: SalesOrderLineItem[];
  additionalExpenses?: SalesOrderAdditionalExpense[];
  totalAmount: number;
  requiresApproval: boolean;
  approvalStatus?: ApprovalStatus;
  approvedBy?: string;
  approvedDate?: string;
  rejectedBy?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  items: number;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
  /** Split order lineage */
  parentOrderId?: number;
  parentOrderNumber?: string;
  splitFromOrderId?: number;
  splitFromOrderNumber?: string;
  referenceOrderNumber?: string;
  /** Cancellation audit */
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledDate?: string;
  /** Packing list reference */
  packingListId?: number;
  packingListNumber?: string;
  packingStatus?: PackingStatus;
  warehouseId?: number;
  warehouseName?: string;
}

export interface InventoryBatch {
  id: string;
  productId: number;
  productCode: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  availableQty: number;
  warehouseCode: string;
  warehouseName: string;
}

const PRODUCT_CATALOG: ProductCatalogItem[] = [
  { id: 1, code: "PRD-001", name: "NPK 19:19:19", uom: "KG", gstRate: "5%", sellingPrice: 1050, stock: 450, status: "active" },
  { id: 2, code: "PRD-002", name: "DAP Fertilizer", uom: "KG", gstRate: "5%", sellingPrice: 1250, stock: 320, status: "active" },
  { id: 3, code: "PRD-003", name: "Urea 46%", uom: "KG", gstRate: "5%", sellingPrice: 820, stock: 800, status: "active" },
  { id: 4, code: "PRD-004", name: "Chlorpyrifos 20 EC", uom: "LTR", gstRate: "18%", sellingPrice: 320, stock: 180, status: "active" },
  { id: 5, code: "PRD-005", name: "Glyphosate 41% SL", uom: "LTR", gstRate: "18%", sellingPrice: 390, stock: 95, status: "active" },
  { id: 6, code: "PRD-006", name: "Hybrid Tomato Seeds", uom: "PKT", gstRate: "0%", sellingPrice: 95, stock: 600, status: "active" },
  { id: 7, code: "PRD-007", name: "Hybrid Chilli Seeds", uom: "PKT", gstRate: "0%", sellingPrice: 70, stock: 420, status: "active" },
  { id: 8, code: "PRD-008", name: "Vermicompost", uom: "KG", gstRate: "0%", sellingPrice: 14, stock: 2400, status: "active" },
  { id: 9, code: "PRD-009", name: "Zinc Sulphate 21%", uom: "KG", gstRate: "5%", sellingPrice: 72, stock: 340, status: "active" },
  { id: 10, code: "PRD-010", name: "Manual Sprayer 16L", uom: "PCS", gstRate: "12%", sellingPrice: 480, stock: 45, status: "inactive" },
  { id: 11, code: "PRD-011", name: "MOP Potash", uom: "KG", gstRate: "5%", sellingPrice: 680, stock: 220, status: "active" },
  { id: 12, code: "PRD-012", name: "Mancozeb 75 WP", uom: "KG", gstRate: "18%", sellingPrice: 235, stock: 130, status: "active" },
];

const SEED_VERSION = 2;
const MAX_SEED_ID = 180;

const SEED_CUSTOMERS: {
  id: number;
  name: string;
  code: string;
  territory: string;
}[] = [
  { id: 1, name: "Green Valley Agro", code: "CUST-001", territory: "North Zone" },
  { id: 2, name: "Kisan Fertilizers Ltd", code: "CUST-002", territory: "South Zone" },
  { id: 3, name: "Farmtech Solutions", code: "CUST-003", territory: "East Zone" },
  { id: 4, name: "AgroPlus Distributors", code: "CUST-004", territory: "West Zone" },
  { id: 5, name: "Sunrise Crops", code: "CUST-005", territory: "North Zone" },
  { id: 6, name: "Rural Inputs Co.", code: "CUST-006", territory: "Central Zone" },
  { id: 7, name: "BioGrow Agro", code: "CUST-007", territory: "South Zone" },
  { id: 8, name: "Fertile Lands Ltd", code: "CUST-008", territory: "East Zone" },
  { id: 9, name: "CropCare India", code: "CUST-009", territory: "West Zone" },
  { id: 10, name: "Seeds & More", code: "CUST-010", territory: "North Zone" },
];

const SEED_SALESMEN: { id: number; name: string }[] = [
  { id: 1, name: "Rajesh Kumar" },
  { id: 2, name: "Priya Singh" },
  { id: 3, name: "Amit Sharma" },
  { id: 4, name: "Neha Patel" },
  { id: 5, name: "Vikram Das" },
];

const BASE_SEED_ORDERS: SalesOrder[] = [
  { id: 1, soNumber: "SO-2024-001", customerId: 1, customerName: "Green Valley Agro", customerCode: "CUST-001", territory: "North Zone", salesManId: 1, salesManName: "Rajesh Kumar", orderDate: "2024-01-10", deliveryDate: "2024-01-17", status: "delivered", lineItems: [], totalAmount: 125000, requiresApproval: true, items: 5, createdBy: "Admin", createdDate: "2024-01-10", updatedBy: "Admin", updatedDate: "2024-01-10" },
  { id: 2, soNumber: "SO-2024-002", customerId: 2, customerName: "Kisan Fertilizers Ltd", customerCode: "CUST-002", territory: "South Zone", salesManId: 2, salesManName: "Priya Singh", orderDate: "2024-01-12", deliveryDate: "2024-01-19", status: "dispatched", lineItems: [], totalAmount: 78500, requiresApproval: true, items: 3, createdBy: "Admin", createdDate: "2024-01-12", updatedBy: "Admin", updatedDate: "2024-01-12" },
  { id: 3, soNumber: "SO-2024-003", customerId: 3, customerName: "Farmtech Solutions", customerCode: "CUST-003", territory: "East Zone", salesManId: 3, salesManName: "Amit Sharma", orderDate: "2024-01-14", deliveryDate: "2024-01-21", status: "confirmed", lineItems: [], totalAmount: 234000, requiresApproval: true, items: 8, createdBy: "Admin", createdDate: "2024-01-14", updatedBy: "Admin", updatedDate: "2024-01-14" },
  { id: 4, soNumber: "SO-2024-004", customerId: 4, customerName: "AgroPlus Distributors", customerCode: "CUST-004", territory: "West Zone", salesManId: 4, salesManName: "Neha Patel", orderDate: "2024-01-15", deliveryDate: "2024-01-22", status: "draft", lineItems: [], totalAmount: 45000, requiresApproval: true, items: 2, createdBy: "Admin", createdDate: "2024-01-15", updatedBy: "Admin", updatedDate: "2024-01-15" },
  { id: 5, soNumber: "SO-2024-005", customerId: 5, customerName: "Sunrise Crops", customerCode: "CUST-005", territory: "North Zone", salesManId: 1, salesManName: "Rajesh Kumar", orderDate: "2024-01-08", deliveryDate: "2024-01-15", status: "delivered", lineItems: [], totalAmount: 189000, requiresApproval: true, items: 6, createdBy: "Admin", createdDate: "2024-01-08", updatedBy: "Admin", updatedDate: "2024-01-08" },
  { id: 6, soNumber: "SO-2024-006", customerId: 6, customerName: "Rural Inputs Co.", customerCode: "CUST-006", territory: "Central Zone", salesManId: 5, salesManName: "Vikram Das", orderDate: "2024-01-09", deliveryDate: "2024-01-16", status: "cancelled", lineItems: [], totalAmount: 92000, requiresApproval: true, items: 4, createdBy: "Admin", createdDate: "2024-01-09", updatedBy: "Admin", updatedDate: "2024-01-09" },
  { id: 7, soNumber: "SO-2024-007", customerId: 7, customerName: "BioGrow Agro", customerCode: "CUST-007", territory: "South Zone", salesManId: 2, salesManName: "Priya Singh", orderDate: "2024-01-16", deliveryDate: "2024-01-23", status: "confirmed", lineItems: [], totalAmount: 310000, requiresApproval: true, items: 7, createdBy: "Admin", createdDate: "2024-01-16", updatedBy: "Admin", updatedDate: "2024-01-16" },
  { id: 8, soNumber: "SO-2024-008", customerId: 8, customerName: "Fertile Lands Ltd", customerCode: "CUST-008", territory: "East Zone", salesManId: 3, salesManName: "Amit Sharma", orderDate: "2024-01-17", deliveryDate: "2024-01-24", status: "dispatched", lineItems: [], totalAmount: 67500, requiresApproval: true, items: 3, createdBy: "Admin", createdDate: "2024-01-17", updatedBy: "Admin", updatedDate: "2024-01-17" },
  { id: 9, soNumber: "SO-2024-009", customerId: 9, customerName: "CropCare India", customerCode: "CUST-009", territory: "West Zone", salesManId: 4, salesManName: "Neha Patel", orderDate: "2024-01-05", deliveryDate: "2024-01-12", status: "delivered", lineItems: [], totalAmount: 445000, requiresApproval: true, items: 9, createdBy: "Admin", createdDate: "2024-01-05", updatedBy: "Admin", updatedDate: "2024-01-05" },
  { id: 10, soNumber: "SO-2024-010", customerId: 10, customerName: "Seeds & More", customerCode: "CUST-010", territory: "North Zone", salesManId: 1, salesManName: "Rajesh Kumar", orderDate: "2024-01-18", deliveryDate: "2024-01-25", status: "draft", lineItems: [], totalAmount: 28000, requiresApproval: true, items: 2, createdBy: "Admin", createdDate: "2024-01-18", updatedBy: "Admin", updatedDate: "2024-01-18" },
  { id: 11, soNumber: "SO-2024-011", customerId: 3, customerName: "Farmtech Solutions", customerCode: "CUST-003", territory: "East Zone", salesManId: 3, salesManName: "Amit Sharma", orderDate: "2024-01-19", deliveryDate: "2024-01-26", status: "pending_approval", approvalStatus: "pending_approval", lineItems: [], totalAmount: 156000, requiresApproval: true, items: 4, createdBy: "Admin", createdDate: "2024-01-19", updatedBy: "Admin", updatedDate: "2024-01-19" },
  { id: 12, soNumber: "SO-2024-012", customerId: 5, customerName: "Sunrise Crops", customerCode: "CUST-005", territory: "North Zone", salesManId: 1, salesManName: "Rajesh Kumar", orderDate: "2024-01-20", deliveryDate: "2024-01-27", status: "pending_approval", approvalStatus: "pending_approval", lineItems: [], totalAmount: 98000, requiresApproval: true, items: 3, createdBy: "Admin", createdDate: "2024-01-20", updatedBy: "Admin", updatedDate: "2024-01-20" },
  { id: 13, soNumber: "SO-2024-013", customerId: 2, customerName: "Kisan Fertilizers Ltd", customerCode: "CUST-002", territory: "South Zone", salesManId: 2, salesManName: "Priya Singh", orderDate: "2024-01-06", deliveryDate: "2024-01-13", status: "approved", approvalStatus: "approved", approvedBy: "Admin", approvedDate: "2024-01-07", lineItems: [], totalAmount: 54000, requiresApproval: true, items: 2, createdBy: "Admin", createdDate: "2024-01-06", updatedBy: "Admin", updatedDate: "2024-01-07" },
  { id: 14, soNumber: "SO-2024-014", customerId: 8, customerName: "Fertile Lands Ltd", customerCode: "CUST-008", territory: "East Zone", salesManId: 3, salesManName: "Amit Sharma", orderDate: "2024-01-04", deliveryDate: "2024-01-11", status: "rejected", approvalStatus: "rejected", rejectedBy: "Admin", rejectedDate: "2024-01-05", rejectionReason: "Discount exceeds approved limit for this customer tier.", lineItems: [], totalAmount: 112000, requiresApproval: true, items: 3, createdBy: "Admin", createdDate: "2024-01-04", updatedBy: "Admin", updatedDate: "2024-01-05" },
];

/** Bulk statuses for pagination testing — maps to existing OrderStatus values. */
const BULK_SEED_STATUS_PLAN: { status: OrderStatus; count: number }[] = [
  { status: "draft", count: 35 },
  { status: "dispatched", count: 27 },
  { status: "pending_approval", count: 18 },
  { status: "approved", count: 12 },
  { status: "rejected", count: 12 },
  { status: "confirmed", count: 25 },
  { status: "delivered", count: 25 },
  { status: "cancelled", count: 12 },
];

function seedDateFromId(id: number, offsetDays = 0): string {
  const base = new Date("2024-01-01T00:00:00.000Z");
  base.setUTCDate(base.getUTCDate() + ((id + offsetDays) % 300));
  return base.toISOString().slice(0, 10);
}

function buildSeedLineItems(orderId: number, lineCount: number): SalesOrderLineItem[] {
  const products = PRODUCT_CATALOG.filter(p => p.status === "active");
  const lines: SalesOrderLineItem[] = [];

  for (let i = 0; i < lineCount; i++) {
    const product = products[(orderId + i) % products.length];
    const quantity = 4 + ((orderId + i * 3) % 18);
    const discount = i === 0 ? 0 : ((orderId + i) % 4) * 5;
    const gstAmount = computeGstAmount(quantity, product.sellingPrice, discount, product.gstRate);
    lines.push(recalculateLineItem({
      id: `line-seed-${orderId}-${i}`,
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      availableStock: product.stock,
      quantity,
      unitPrice: product.sellingPrice,
      discount,
      discountValue: 0,
      gstAmount,
      lineTotal: 0,
    }));
  }

  return lines;
}

function buildSeedOrder(id: number, status: OrderStatus): SalesOrder {
  const customer = SEED_CUSTOMERS[(id - 1) % SEED_CUSTOMERS.length];
  const salesman = SEED_SALESMEN[(id - 1) % SEED_SALESMEN.length];
  const orderDate = seedDateFromId(id);
  const deliveryDate = seedDateFromId(id, 7);
  const lineCount = 1 + (id % 3);
  const lineItems = buildSeedLineItems(id, lineCount);
  const totalAmount = calculateOrderTotalsSummary(lineItems).grandTotal;
  const requiresApproval = orderRequiresApproval(totalAmount) || ["pending_approval", "approved", "rejected"].includes(status);

  const order: SalesOrder = {
    id,
    soNumber: `SO-2024-${String(id).padStart(3, "0")}`,
    customerId: customer.id,
    customerName: customer.name,
    customerCode: customer.code,
    territory: customer.territory,
    salesManId: salesman.id,
    salesManName: salesman.name,
    orderDate,
    deliveryDate,
    status,
    lineItems,
    additionalExpenses: [],
    totalAmount,
    requiresApproval,
    items: lineItems.length,
    createdBy: "Admin",
    createdDate: orderDate,
    updatedBy: "Admin",
    updatedDate: orderDate,
  };

  if (status === "pending_approval") {
    order.approvalStatus = "pending_approval";
  } else if (status === "approved") {
    order.approvalStatus = "approved";
    order.approvedBy = "Admin";
    order.approvedDate = seedDateFromId(id, 1);
    order.updatedDate = order.approvedDate;
  } else if (status === "rejected") {
    order.approvalStatus = "rejected";
    order.rejectedBy = "Admin";
    order.rejectedDate = seedDateFromId(id, 1);
    order.rejectionReason = "Credit limit exceeded for seasonal booking.";
    order.updatedDate = order.rejectedDate;
  } else if (status === "cancelled") {
    order.cancellationReason = "Customer requested cancellation before dispatch.";
    order.cancelledBy = "Admin";
    order.cancelledDate = seedDateFromId(id, 2);
    order.updatedDate = order.cancelledDate;
  }

  return order;
}

function buildGeneratedSeedOrders(): SalesOrder[] {
  const orders: SalesOrder[] = [];
  let id = BASE_SEED_ORDERS.length + 1;

  for (const { status, count } of BULK_SEED_STATUS_PLAN) {
    for (let i = 0; i < count; i++) {
      orders.push(buildSeedOrder(id, status));
      id++;
    }
  }

  return orders;
}

function buildFullSeedOrders(): SalesOrder[] {
  const baseWithLines = BASE_SEED_ORDERS.map(order => {
    if (order.lineItems.length > 0) return order;
    const lineCount = Math.max(1, order.items);
    const lineItems = buildSeedLineItems(order.id, lineCount);
    const totalAmount = calculateOrderTotalsSummary(lineItems).grandTotal;
    return {
      ...order,
      lineItems,
      totalAmount,
      items: lineItems.length,
      requiresApproval: orderRequiresApproval(totalAmount) || order.requiresApproval,
    };
  });

  return [...baseWithLines, ...buildGeneratedSeedOrders()];
}

interface StoredSalesOrders {
  version: number;
  data: SalesOrder[];
}

const STORAGE_KEY = "ds_sales_orders";
const ID_KEY = "ds_sales_orders_next_id";

function parseStoredOrders(raw: string): StoredSalesOrders {
  const parsed = JSON.parse(raw) as StoredSalesOrders | SalesOrder[];
  if (Array.isArray(parsed)) return { version: 0, data: parsed };
  return parsed;
}

function persistOrders(orders: SalesOrder[]): SalesOrder[] {
  const hydrated = hydrateOrders(orders);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, data: hydrated }));
    localStorage.setItem(ID_KEY, String(Math.max(MAX_SEED_ID, 0, ...hydrated.map(o => o.id))));
  }
  return hydrated;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseGstRate(gstRate: string): number {
  const n = parseFloat(gstRate.replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function calculateLineDiscountValue(quantity: number, unitPrice: number, discountPercent: number): number {
  const gross = quantity * unitPrice;
  return Math.round(gross * (discountPercent / 100) * 100) / 100;
}

export function calculateDiscountPercentFromValue(quantity: number, unitPrice: number, discountValue: number): number {
  const gross = quantity * unitPrice;
  if (gross <= 0) return 0;
  const pct = (discountValue / gross) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)) * 100) / 100;
}

export function calculateLineSubtotal(quantity: number, unitPrice: number, discountPercent: number): number {
  const subtotalBeforeDiscount = quantity * unitPrice;
  const discountAmount = subtotalBeforeDiscount * (discountPercent / 100);
  return Math.max(0, subtotalBeforeDiscount - discountAmount);
}

export function calculateLineTotal(quantity: number, unitPrice: number, discountPercent: number, gstAmount: number): number {
  return calculateLineSubtotal(quantity, unitPrice, discountPercent) + Math.max(0, gstAmount);
}

export function recalculateLineItem(line: SalesOrderLineItem): SalesOrderLineItem {
  const discountValue = calculateLineDiscountValue(line.quantity, line.unitPrice, line.discount);
  const lineTotal = calculateLineTotal(line.quantity, line.unitPrice, line.discount, line.gstAmount);
  return { ...line, discountValue, lineTotal };
}

export function calculateOrderTotal(lines: SalesOrderLineItem[]): number {
  return lines.reduce((sum, line) => sum + line.lineTotal, 0);
}

export interface OrderTotalsSummary {
  /** Product subtotal before discounts */
  subtotalBeforeDiscount: number;
  /** @alias subtotalBeforeDiscount */
  productSubtotal: number;
  totalItemDiscounts: number;
  /** @alias totalItemDiscounts */
  productDiscountTotal: number;
  netTotal: number;
  additionalExpensesTotal: number;
  expenseDiscountTotal: number;
  netAdditionalExpenses: number;
  taxableAmount: number;
  totalGst: number;
  /** @alias totalGst */
  gstAmount: number;
  grandTotal: number;
}

export function calculateExpenseNet(
  expense: Pick<SalesOrderAdditionalExpense, "amount" | "discountType" | "discountValue">,
): number {
  const amount = Math.max(0, expense.amount || 0);
  if (expense.discountType === "percent") {
    const pct = Math.min(100, Math.max(0, expense.discountValue || 0));
    return Math.round(Math.max(0, amount - amount * (pct / 100)) * 100) / 100;
  }
  return Math.round(Math.max(0, amount - (expense.discountValue || 0)) * 100) / 100;
}

export function recalculateExpense(expense: SalesOrderAdditionalExpense): SalesOrderAdditionalExpense {
  const netAmount = calculateExpenseNet(expense);
  return { ...expense, netAmount };
}

export function createEmptyExpense(): SalesOrderAdditionalExpense {
  return {
    id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    expenseName: "",
    amount: 0,
    discountType: "percent",
    discountValue: 0,
    netAmount: 0,
  };
}

export function calculateOrderTotalsSummary(
  lines: SalesOrderLineItem[],
  expenses: SalesOrderAdditionalExpense[] = [],
  options?: { sezLutApplies?: boolean },
): OrderTotalsSummary {
  let subtotalBeforeDiscount = 0;
  let totalItemDiscounts = 0;
  let netTotal = 0;
  let totalGst = 0;

  for (const line of lines) {
    const lineSubtotalBeforeDiscount = line.quantity * line.unitPrice;
    const lineDiscount = calculateLineDiscountValue(line.quantity, line.unitPrice, line.discount);
    subtotalBeforeDiscount += lineSubtotalBeforeDiscount;
    totalItemDiscounts += lineDiscount;
    netTotal += calculateLineSubtotal(line.quantity, line.unitPrice, line.discount);
    totalGst += line.gstAmount;
  }

  let additionalExpensesTotal = 0;
  let expenseDiscountTotal = 0;
  let netAdditionalExpenses = 0;
  for (const exp of expenses) {
    const net = calculateExpenseNet(exp);
    additionalExpensesTotal += exp.amount || 0;
    expenseDiscountTotal += Math.max(0, (exp.amount || 0) - net);
    netAdditionalExpenses += net;
  }

  subtotalBeforeDiscount = Math.round(subtotalBeforeDiscount * 100) / 100;
  totalItemDiscounts = Math.round(totalItemDiscounts * 100) / 100;
  netTotal = Math.round(netTotal * 100) / 100;
  additionalExpensesTotal = Math.round(additionalExpensesTotal * 100) / 100;
  expenseDiscountTotal = Math.round(expenseDiscountTotal * 100) / 100;
  netAdditionalExpenses = Math.round(netAdditionalExpenses * 100) / 100;
  const taxableAmount = Math.round((netTotal + netAdditionalExpenses) * 100) / 100;
  if (options?.sezLutApplies) {
    totalGst = 0;
  } else {
    totalGst = Math.round(totalGst * 100) / 100;
  }
  const grandTotal = Math.round((taxableAmount + totalGst) * 100) / 100;

  return {
    subtotalBeforeDiscount,
    productSubtotal: subtotalBeforeDiscount,
    totalItemDiscounts,
    productDiscountTotal: totalItemDiscounts,
    netTotal,
    additionalExpensesTotal,
    expenseDiscountTotal,
    netAdditionalExpenses,
    taxableAmount,
    totalGst,
    gstAmount: totalGst,
    grandTotal,
  };
}

export function computeGstAmount(quantity: number, unitPrice: number, discountPercent: number, gstRate: string, zeroTax = false): number {
  if (zeroTax) return 0;
  const subtotal = calculateLineSubtotal(quantity, unitPrice, discountPercent);
  const rate = parseGstRate(gstRate);
  return Math.round(subtotal * (rate / 100) * 100) / 100;
}

export function orderRequiresApproval(totalAmount: number): boolean {
  return totalAmount > ORDER_APPROVAL_THRESHOLD;
}

export function resolveSubmitStatus(
  totalAmount: number,
  userStatus: OrderStatus,
  asDraft: boolean,
): OrderStatus {
  if (asDraft) return "draft";
  if (orderRequiresApproval(totalAmount)) return "pending_approval";
  return userStatus;
}

const SEED_ORDERS: SalesOrder[] = buildFullSeedOrders();

export function loadProductCatalog(): ProductCatalogItem[] {
  return PRODUCT_CATALOG.filter(p => p.status === "active");
}

export function getProductById(id: number): ProductCatalogItem | undefined {
  return PRODUCT_CATALOG.find(p => p.id === id);
}

export { getCustomersForTransactionDropdown, loadCustomers };

export function getSalesmenForOrders(): Employee[] {
  return loadEmployees().filter(
    e => e.status === "active" && (e.department === "Sales" || e.department === "Field Force"),
  );
}

export function loadOrders(): SalesOrder[] {
  if (typeof window === "undefined") return hydrateOrders(SEED_ORDERS);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return persistOrders(SEED_ORDERS);
    }

    const stored = parseStoredOrders(raw);
    if (!stored.version || stored.version < SEED_VERSION) {
      const seedNumbers = new Set(SEED_ORDERS.map(o => o.soNumber));
      const userOrders = stored.data.filter(o => !seedNumbers.has(o.soNumber));
      return persistOrders([...SEED_ORDERS, ...userOrders]);
    }

    return hydrateOrders(stored.data);
  } catch {
    return hydrateOrders(SEED_ORDERS);
  }
}

export function saveOrders(orders: SalesOrder[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, data: orders }));
  const maxId = Math.max(0, ...orders.map(o => o.id));
  localStorage.setItem(ID_KEY, String(maxId));
}

export function nextOrderId(orders: SalesOrder[]): number {
  if (typeof window === "undefined") return 1;
  const stored = parseInt(localStorage.getItem(ID_KEY) ?? "0", 10);
  const maxFromList = Math.max(0, ...orders.map(o => o.id));
  return Math.max(stored, maxFromList) + 1;
}

export function generateOrderNumber(orders: SalesOrder[]): string {
  const year = new Date().getFullYear();
  const maxNum = orders.reduce((max, o) => {
    const m = o.soNumber.match(/SO-\d{4}-(\d+)/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);
  return `SO-${year}-${String(maxNum + 1).padStart(3, "0")}`;
}

export function createEmptyLineItem(): SalesOrderLineItem {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId: null,
    productCode: "",
    productName: "",
    availableStock: 0,
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    discountValue: 0,
    gstAmount: 0,
    lineTotal: 0,
  };
}

export function applyProductToLine(line: SalesOrderLineItem, product: ProductCatalogItem): SalesOrderLineItem {
  const quantity = line.quantity > 0 ? line.quantity : 1;
  const unitPrice = product.sellingPrice;
  const discount = line.discount;
  const gstAmount = computeGstAmount(quantity, unitPrice, discount, product.gstRate);
  const updated: SalesOrderLineItem = {
    ...line,
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    availableStock: product.stock,
    quantity,
    unitPrice,
    discount,
    gstAmount,
    lineTotal: 0,
  };
  return recalculateLineItem(updated);
}

export function formatOrderStatus(status: OrderStatus): string {
  const opt = ORDER_STATUS_OPTIONS.find(o => o.value === status);
  if (opt) return opt.label;
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
}

const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  not_required: "Not Required",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

export function resolveApprovalStatus(order: SalesOrder): ApprovalStatus {
  if (order.approvalStatus) return order.approvalStatus;
  if (order.status === "pending_approval") return "pending_approval";
  if (order.status === "approved") return "approved";
  if (order.status === "rejected") return "rejected";
  return order.requiresApproval ? "not_required" : "not_required";
}

export function formatApprovalStatus(status: ApprovalStatus): string {
  return APPROVAL_STATUS_LABELS[status];
}

export function isApprovalRelatedOrder(order: SalesOrder): boolean {
  return APPROVAL_ORDER_STATUSES.includes(order.status);
}

export function isOrderPendingApproval(order: SalesOrder): boolean {
  return order.status === "pending_approval" && resolveApprovalStatus(order) === "pending_approval";
}

export function canApproveOrder(order: SalesOrder): boolean {
  return isOrderPendingApproval(order);
}

function resolvePostApprovalStatus(_order: SalesOrder): OrderStatus {
  return "confirmed";
}

function resolveApprovalStatusOnSubmit(finalStatus: OrderStatus, requiresApproval: boolean, asDraft: boolean): ApprovalStatus {
  if (asDraft) return "not_required";
  if (finalStatus === "pending_approval") return "pending_approval";
  if (requiresApproval) return "not_required";
  return "not_required";
}

// ── Inventory batches (FEFO packing suggestions) ─────────────────────────────

const INVENTORY_BATCHES: InventoryBatch[] = [
  { id: "b1", productId: 1, productCode: "PRD-001", productName: "NPK 19:19:19", batchNumber: "NPK-2401-A", expiryDate: "2025-06-30", availableQty: 120, warehouseCode: "WH-0001", warehouseName: "Central Distribution Hub" },
  { id: "b2", productId: 1, productCode: "PRD-001", productName: "NPK 19:19:19", batchNumber: "NPK-2402-B", expiryDate: "2025-09-15", availableQty: 200, warehouseCode: "WH-0001", warehouseName: "Central Distribution Hub" },
  { id: "b3", productId: 2, productCode: "PRD-002", productName: "DAP Fertilizer", batchNumber: "DAP-2310-C", expiryDate: "2025-04-20", availableQty: 80, warehouseCode: "WH-0002", warehouseName: "Western Regional Depot" },
  { id: "b4", productId: 2, productCode: "PRD-002", productName: "DAP Fertilizer", batchNumber: "DAP-2401-D", expiryDate: "2025-11-01", availableQty: 150, warehouseCode: "WH-0002", warehouseName: "Western Regional Depot" },
  { id: "b5", productId: 3, productCode: "PRD-003", productName: "Urea 46%", batchNumber: "URE-2403-E", expiryDate: "2025-08-10", availableQty: 400, warehouseCode: "WH-0001", warehouseName: "Central Distribution Hub" },
  { id: "b6", productId: 4, productCode: "PRD-004", productName: "Chlorpyrifos 20 EC", batchNumber: "CHL-2308-F", expiryDate: "2025-03-15", availableQty: 45, warehouseCode: "WH-0003", warehouseName: "South Zone Warehouse" },
  { id: "b7", productId: 4, productCode: "PRD-004", productName: "Chlorpyrifos 20 EC", batchNumber: "CHL-2401-G", expiryDate: "2026-01-20", availableQty: 90, warehouseCode: "WH-0003", warehouseName: "South Zone Warehouse" },
  { id: "b8", productId: 6, productCode: "PRD-006", productName: "Hybrid Tomato Seeds", batchNumber: "TOM-2401-H", expiryDate: "2025-12-31", availableQty: 250, warehouseCode: "WH-0001", warehouseName: "Central Distribution Hub" },
  { id: "b9", productId: 8, productCode: "PRD-008", productName: "Vermicompost", batchNumber: "VER-2402-I", expiryDate: "2025-07-01", availableQty: 800, warehouseCode: "WH-0002", warehouseName: "Western Regional Depot" },
  { id: "b10", productId: 11, productCode: "PRD-011", productName: "MOP Potash", batchNumber: "MOP-2401-J", expiryDate: "2025-05-25", availableQty: 60, warehouseCode: "WH-0001", warehouseName: "Central Distribution Hub" },
];

export function getBatchesForProduct(productId: number): InventoryBatch[] {
  return INVENTORY_BATCHES.filter(b => b.productId === productId);
}

export function getAllInventoryBatches(): InventoryBatch[] {
  return INVENTORY_BATCHES;
}

/** Suggest batch allocations using FEFO (nearest expiry first). */
export function suggestFefoAllocations(productId: number, orderedQty: number): {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  availableQty: number;
  suggestedQty: number;
  warehouseCode: string;
  warehouseName: string;
}[] {
  const batches = getBatchesForProduct(productId)
    .filter(b => b.availableQty > 0)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  let remaining = orderedQty;
  const result: ReturnType<typeof suggestFefoAllocations> = [];

  for (const batch of batches) {
    if (remaining <= 0) break;
    const suggestedQty = Math.min(remaining, batch.availableQty);
    result.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      availableQty: batch.availableQty,
      suggestedQty,
      warehouseCode: batch.warehouseCode,
      warehouseName: batch.warehouseName,
    });
    remaining -= suggestedQty;
  }

  return result;
}

// ── Order access & business rules ────────────────────────────────────────────

export function hydrateOrderLineItems(order: SalesOrder): SalesOrder {
  const additionalExpenses = (order.additionalExpenses ?? []).map(recalculateExpense);
  if (order.lineItems.length > 0) {
    return {
      ...order,
      additionalExpenses,
      lineItems: order.lineItems.map((l) => recalculateLineItem({ ...l, discountValue: l.discountValue ?? calculateLineDiscountValue(l.quantity, l.unitPrice, l.discount) })),
    };
  }
  if (order.items <= 0) return { ...order, additionalExpenses };

  const catalog = PRODUCT_CATALOG.filter(p => p.status === "active");
  const count = Math.min(order.items, catalog.length);
  const perLineAmount = order.totalAmount / count;
  const lineItems: SalesOrderLineItem[] = [];

  for (let i = 0; i < count; i++) {
    const product = catalog[i];
    const quantity = Math.max(1, Math.round(perLineAmount / product.sellingPrice));
    const discount = 0;
    const gstAmount = computeGstAmount(quantity, product.sellingPrice, discount, product.gstRate);
    lineItems.push(recalculateLineItem({
      id: `line-seed-${order.id}-${i}`,
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      availableStock: product.stock,
      quantity,
      unitPrice: product.sellingPrice,
      discount,
      discountValue: 0,
      gstAmount,
      lineTotal: 0,
    }));
  }

  return { ...order, lineItems, additionalExpenses: order.additionalExpenses ?? [] };
}

export function hydrateOrders(orders: SalesOrder[]): SalesOrder[] {
  return orders.map(order => {
    const hydrated = hydrateOrderLineItems(order);
    return {
      ...hydrated,
      additionalExpenses: hydrated.additionalExpenses ?? [],
      approvalStatus: resolveApprovalStatus(hydrated),
    };
  });
}

export function getOrderById(id: number): SalesOrder | undefined {
  const orders = hydrateOrders(loadOrders());
  return orders.find(o => o.id === id);
}

export function updateOrderInStore(updated: SalesOrder): void {
  const orders = loadOrders().map(o => (o.id === updated.id ? updated : o));
  saveOrders(orders);
}

export function isOrderCancelled(order: SalesOrder): boolean {
  return order.status === "cancelled";
}

export function canEditOrder(order: SalesOrder): boolean {
  if (isOrderCancelled(order)) return false;
  return EDITABLE_ORDER_STATUSES.includes(order.status);
}

export function canSplitOrder(order: SalesOrder): boolean {
  if (isOrderCancelled(order)) return false;
  return !["delivered", "dispatched"].includes(order.status);
}

export function canCancelOrder(order: SalesOrder): boolean {
  return !isOrderCancelled(order) && order.status !== "delivered";
}

export function canDownloadPI(order: SalesOrder): boolean {
  return !isOrderCancelled(order);
}

export function canGeneratePackingList(order: SalesOrder): boolean {
  if (isOrderCancelled(order)) return false;
  if (order.status === "draft") return false;
  const hydrated = hydrateOrderLineItems(order);
  return hydrated.lineItems.some(l => l.productId && l.quantity > 0);
}

export interface SalesOrderFormValues {
  orderDate: string;
  customerId: number | null;
  salesManId: number | null;
  deliveryDate: string;
  status: OrderStatus;
  lineItems: SalesOrderLineItem[];
  additionalExpenses: SalesOrderAdditionalExpense[];
  warehouseId?: number | null;
  warehouseName?: string;
}

export function orderToFormValues(order: SalesOrder): SalesOrderFormValues {
  const hydrated = hydrateOrderLineItems(order);
  return {
    orderDate: hydrated.orderDate,
    customerId: hydrated.customerId,
    salesManId: hydrated.salesManId,
    deliveryDate: hydrated.deliveryDate,
    status: hydrated.status,
    lineItems: hydrated.lineItems.length > 0 ? hydrated.lineItems : [createEmptyLineItem()],
    additionalExpenses: hydrated.additionalExpenses ?? [],
    warehouseId: hydrated.warehouseId ?? null,
    warehouseName: hydrated.warehouseName ?? "",
  };
}

export function buildOrderFromForm(
  form: SalesOrderFormValues,
  existing: Partial<SalesOrder> & { soNumber: string },
  asDraft: boolean,
): SalesOrder | null {
  const customers = getCustomersForTransactionDropdown();
  const salesmen = getSalesmenForOrders();
  const warehouses = loadWarehouses();
  const customer = customers.find(c => c.id === form.customerId);
  const salesman = salesmen.find(s => s.id === form.salesManId);
  const warehouse = warehouses.find(w => w.id === form.warehouseId);
  if (!customer || !salesman) return null;

  const sezLut = resolveSezLutSupply({
    customerGstCategory:
      customer.gstCategory ||
      (customer.gstApplicable ? "regular" : "unregistered"),
    transactionDate: form.orderDate,
  });
  const totalAmount = calculateOrderTotalsSummary(
    form.lineItems,
    form.additionalExpenses ?? [],
    { sezLutApplies: sezLut.appliesLut },
  ).grandTotal;
  const finalStatus = resolveSubmitStatus(totalAmount, form.status, asDraft);
  const requiresApproval = orderRequiresApproval(totalAmount) && !asDraft;
  const approvalStatus = resolveApprovalStatusOnSubmit(finalStatus, requiresApproval, asDraft);
  const today = todayStr();

  return {
    id: existing.id ?? nextOrderId(loadOrders()),
    soNumber: existing.soNumber,
    customerId: customer.id,
    customerName: customer.customerName,
    customerCode: customer.customerCode,
    territory: customer.territoryName || "—",
    salesManId: salesman.id,
    salesManName: salesman.fullName,
    orderDate: form.orderDate,
    deliveryDate: form.deliveryDate,
    status: finalStatus,
    lineItems: form.lineItems,
    additionalExpenses: (form.additionalExpenses ?? []).map(recalculateExpense),
    totalAmount,
    requiresApproval,
    approvalStatus,
    approvedBy: existing.approvedBy,
    approvedDate: existing.approvedDate,
    rejectedBy: existing.rejectedBy,
    rejectedDate: existing.rejectedDate,
    rejectionReason: existing.rejectionReason,
    items: form.lineItems.length,
    createdBy: existing.createdBy ?? "Admin",
    createdDate: existing.createdDate ?? today,
    updatedBy: "Admin",
    updatedDate: today,
    parentOrderId: existing.parentOrderId,
    parentOrderNumber: existing.parentOrderNumber,
    splitFromOrderId: existing.splitFromOrderId,
    splitFromOrderNumber: existing.splitFromOrderNumber,
    referenceOrderNumber: existing.referenceOrderNumber,
    cancellationReason: existing.cancellationReason,
    cancelledBy: existing.cancelledBy,
    cancelledDate: existing.cancelledDate,
    packingListId: existing.packingListId,
    packingListNumber: existing.packingListNumber,
    packingStatus: existing.packingStatus,
    warehouseId: warehouse?.id ?? undefined,
    warehouseName: warehouse?.warehouseName ?? "",
  };
}

function stripSplitLineMeta(line: SalesOrderLineItem): SalesOrderLineItem {
  const { splitSourceLineId: _s, maxSplitQty: _m, ...rest } = line;
  return recalculateLineItem(rest);
}

export function splitSalesOrderFromForm(
  parentOrderId: number,
  form: SalesOrderFormValues,
  newSoNumber: string,
  asDraft: boolean,
): { original: SalesOrder; newOrder: SalesOrder } | { error: string } {
  const orders = hydrateOrders(loadOrders());
  const order = orders.find(o => o.id === parentOrderId);
  if (!order) return { error: "Order not found" };
  if (!canSplitOrder(order)) return { error: "This order cannot be split" };

  const activeLines = form.lineItems.filter(l => l.productId && l.quantity > 0);
  if (activeLines.length === 0) {
    return { error: "Add at least one product line to the split order" };
  }

  const splitBySource: Record<string, number> = {};
  for (const line of activeLines) {
    if (!line.splitSourceLineId) continue;
    const parentLine = order.lineItems.find(l => l.id === line.splitSourceLineId);
    if (!parentLine) return { error: `Invalid source line for ${line.productName}` };
    const max = line.maxSplitQty ?? parentLine.quantity;
    const acc = (splitBySource[line.splitSourceLineId] ?? 0) + line.quantity;
    if (acc > max) {
      return { error: `Split quantity cannot exceed available quantity for ${line.productName}` };
    }
    splitBySource[line.splitSourceLineId] = acc;
  }

  const splits = Object.entries(splitBySource).map(([lineId, splitQty]) => ({ lineId, splitQty }));

  const cleanLineItems = activeLines.map(stripSplitLineMeta);
  const built = buildOrderFromForm(
    { ...form, lineItems: cleanLineItems },
    {
      soNumber: newSoNumber,
      parentOrderId: order.id,
      parentOrderNumber: order.soNumber,
      splitFromOrderId: order.id,
      splitFromOrderNumber: order.soNumber,
      referenceOrderNumber: order.soNumber,
    },
    asDraft,
  );
  if (!built) return { error: "Invalid customer or salesman selection" };

  const updatedOriginalLines: SalesOrderLineItem[] = [];

  for (const line of order.lineItems) {
    const splitQty = splitBySource[line.id];
    if (!splitQty) {
      updatedOriginalLines.push(line);
      continue;
    }
    if (splitQty <= 0 || splitQty > line.quantity) {
      return { error: `Split quantity cannot exceed available quantity for ${line.productName || "product"}` };
    }
    const ratio = splitQty / line.quantity;
    const splitDiscount = line.discount;
    const splitGst = Math.round(line.gstAmount * ratio * 100) / 100;

    const remainQty = line.quantity - splitQty;
    if (remainQty > 0) {
      const remainDiscount = line.discount;
      const remainGst = Math.round((line.gstAmount - splitGst) * 100) / 100;
      updatedOriginalLines.push(recalculateLineItem({
        ...line,
        quantity: remainQty,
        discount: remainDiscount,
        gstAmount: remainGst,
        lineTotal: 0,
      }));
    }
  }

  const today = todayStr();
  const newOrder: SalesOrder = {
    ...built,
    id: nextOrderId(orders),
    createdBy: "Admin",
    createdDate: today,
    updatedBy: "Admin",
    updatedDate: today,
  };

  const originalTotal = calculateOrderTotal(updatedOriginalLines);
  const updatedOriginal: SalesOrder = {
    ...order,
    lineItems: updatedOriginalLines,
    totalAmount: originalTotal,
    items: updatedOriginalLines.length,
    requiresApproval: orderRequiresApproval(originalTotal),
    updatedBy: "Admin",
    updatedDate: today,
  };

  saveOrders(orders.map(o => {
    if (o.id === order.id) return updatedOriginal;
    return o;
  }).concat(newOrder));

  return { original: updatedOriginal, newOrder };
}

export function approveSalesOrder(orderId: number, approvedBy = "Admin"): SalesOrder | { error: string } {
  const orders = loadOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return { error: "Order not found" };
  if (!canApproveOrder(order)) return { error: "This order is not pending approval" };

  const today = todayStr();
  const nextStatus = resolvePostApprovalStatus(order);
  const updated: SalesOrder = {
    ...order,
    approvalStatus: "approved",
    status: nextStatus,
    approvedBy,
    approvedDate: today,
    updatedBy: approvedBy,
    updatedDate: today,
  };

  saveOrders(orders.map(o => (o.id === orderId ? updated : o)));
  return hydrateOrderLineItems(updated);
}

export function rejectSalesOrder(
  orderId: number,
  reason: string,
  rejectedBy = "Admin",
): SalesOrder | { error: string } {
  const trimmed = reason.trim();
  if (!trimmed) return { error: "Rejection reason is required" };

  const orders = loadOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return { error: "Order not found" };
  if (!canApproveOrder(order)) return { error: "This order is not pending approval" };

  const today = todayStr();
  const updated: SalesOrder = {
    ...order,
    approvalStatus: "rejected",
    status: "rejected",
    rejectionReason: trimmed,
    rejectedBy,
    rejectedDate: today,
    updatedBy: rejectedBy,
    updatedDate: today,
  };

  saveOrders(orders.map(o => (o.id === orderId ? updated : o)));
  return hydrateOrderLineItems(updated);
}

export function cancelSalesOrder(orderId: number, reason: string): SalesOrder | { error: string } {
  const trimmed = reason.trim();
  if (!trimmed) return { error: "Cancellation reason is required" };

  const orders = loadOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return { error: "Order not found" };
  if (!canCancelOrder(order)) return { error: "This order cannot be cancelled" };

  const updated: SalesOrder = {
    ...order,
    status: "cancelled",
    cancellationReason: trimmed,
    cancelledBy: "Admin",
    cancelledDate: todayStr(),
    updatedBy: "Admin",
    updatedDate: todayStr(),
  };

  saveOrders(orders.map(o => (o.id === orderId ? updated : o)));
  return updated;
}

export function attachPackingListToOrder(
  orderId: number,
  packingListId: number,
  packingListNumber: string,
  warehouseId: number,
  warehouseName: string,
  packingStatus: PackingStatus = "generated",
): SalesOrder | { error: string } {
  const orders = loadOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return { error: "Order not found" };

  const updated: SalesOrder = {
    ...order,
    packingListId,
    packingListNumber,
    packingStatus,
    warehouseId,
    warehouseName,
    updatedBy: "Admin",
    updatedDate: todayStr(),
  };

  saveOrders(orders.map(o => (o.id === orderId ? updated : o)));
  return updated;
}
