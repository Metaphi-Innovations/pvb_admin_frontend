// ── Sample Orders — types, catalog, persistence, approval rules ───────────────

import { loadEmployees, type Employee } from "@/app/(app)/user-management/employee/employee-data";
import { loadWarehouses } from "@/app/(app)/masters/warehouse/warehouse-data";

/** Sample orders always have zero value; approval is policy-based, not amount-based. */
export const SAMPLE_ORDER_APPROVAL_ENABLED = true;
export const SAMPLE_BILLING_PARTY = "Paramverse Bio Head Office";

export const SAMPLE_BILLING_DETAILS = {
  companyName: "Paramverse Bio Head Office",
  address: "Plot 12, Agri Park, Hinjawadi Phase 2, Pune, Maharashtra 411057",
  gstin: "27AABCD1234E1Z5",
  mobile: "+91 98765 43210",
  contactNo: "+91 20 4567 8900",
};

export type SamplePurpose =
  | "farmer_demo"
  | "distributor_demo"
  | "retailer_demo"
  | "event"
  | "training"
  | "promotional_sample"
  | "other";

export type RecipientType =
  | "farmer"
  | "distributor"
  | "retailer"
  | "institution"
  | "other";

export type FieldUserRole = "TM" | "DO" | "Intern" | "FMO" | "ASM";

export const SAMPLE_FIELD_USER_ROLES: FieldUserRole[] = ["TM", "DO", "Intern", "FMO", "ASM"];

export const SAMPLE_PURPOSE_OPTIONS: { value: SamplePurpose; label: string }[] = [
  { value: "farmer_demo", label: "Farmer Demo" },
  { value: "distributor_demo", label: "Distributor Demo" },
  { value: "retailer_demo", label: "Retailer Demo" },
  { value: "event", label: "Event" },
  { value: "training", label: "Training" },
  { value: "promotional_sample", label: "Promotional Sample" },
  { value: "other", label: "Other" },
];

export const RECIPIENT_TYPE_OPTIONS: { value: RecipientType; label: string }[] = [
  { value: "farmer", label: "Farmer" },
  { value: "distributor", label: "Distributor" },
  { value: "retailer", label: "Retailer" },
  { value: "institution", label: "Institution" },
  { value: "other", label: "Other" },
];

export type OrderStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "confirmed"
  | "packed"
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

/** Order statuses shown on the Sample Order Approval listing tab. */
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
  { value: "packed", label: "Packed" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
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
  packSize?: number;
}

export interface SalesOrderLineItem {
  id: string;
  productId: number | null;
  productCode: string;
  productName: string;
  availableStock: number;
  quantityType?: "Case" | "Piece";
  caseQuantity?: number;
  pieceQuantity?: number;
  quantity: number;
  unitPrice: number;
  /** Discount percentage */
  discount: number;
  /** Discount amount in ₹ (synced with discount %) */
  discountValue: number;
  gstAmount: number;
  lineTotal: number;
  unit?: string;
  batchNumber?: string;
  expiryDate?: string;
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
  /** Sample issue — field user recipient */
  issuedToEmployeeId?: number;
  issuedToEmployeeName?: string;
  issuedToEmployeeRole?: FieldUserRole | string;
  purpose?: SamplePurpose;
  referenceEvent?: string;
  remarks?: string;
  recipientType?: RecipientType;
  recipientName?: string;
  recipientContact?: string;
  recipientAddress?: string;
  billingParty?: string;
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

const SEED_VERSION = 3;
const MAX_SEED_ID = 180;

const SEED_FIELD_USERS: {
  id: number;
  name: string;
  role: FieldUserRole;
  territory: string;
}[] = [
  { id: 801, name: "Rajesh Kumar", role: "TM", territory: "North Zone" },
  { id: 802, name: "Priya Singh", role: "ASM", territory: "South Zone" },
  { id: 803, name: "Amit Sharma", role: "FMO", territory: "East Zone" },
  { id: 804, name: "Neha Patel", role: "DO", territory: "West Zone" },
  { id: 805, name: "Vikram Das", role: "Intern", territory: "Central Zone" },
  { id: 806, name: "Suresh Reddy", role: "TM", territory: "South Zone" },
  { id: 807, name: "Kavita Nair", role: "FMO", territory: "West Zone" },
  { id: 808, name: "Rahul Mehta", role: "ASM", territory: "North Zone" },
];

function sampleOrderRecipientLabel(user: (typeof SEED_FIELD_USERS)[number], recipientName?: string): string {
  const base = `${user.name} (${user.role})`;
  return recipientName ? `${base} → ${recipientName}` : base;
}

const BASE_SEED_ORDERS: SalesOrder[] = [
  { id: 1, soNumber: "SM-2024-001", customerId: 801, customerName: "Rajesh Kumar (TM)", customerCode: "EMP-801", territory: "North Zone", salesManId: 801, salesManName: "Rajesh Kumar", issuedToEmployeeId: 801, issuedToEmployeeName: "Rajesh Kumar", issuedToEmployeeRole: "TM", purpose: "farmer_demo", remarks: "Village demo kits for wheat season.", billingParty: SAMPLE_BILLING_PARTY, orderDate: "2024-02-02", deliveryDate: "2024-02-06", status: "draft", lineItems: [], totalAmount: 0, requiresApproval: false, items: 1, createdBy: "Sales Team", createdDate: "2024-02-02", updatedBy: "Sales Team", updatedDate: "2024-02-02" },
  { id: 2, soNumber: "SM-2024-002", customerId: 803, customerName: "Amit Sharma (FMO)", customerCode: "EMP-803", territory: "East Zone", salesManId: 803, salesManName: "Amit Sharma", issuedToEmployeeId: 803, issuedToEmployeeName: "Amit Sharma", issuedToEmployeeRole: "FMO", purpose: "distributor_demo", remarks: "Distributor counter demo samples.", billingParty: SAMPLE_BILLING_PARTY, orderDate: "2024-02-04", deliveryDate: "2024-02-09", status: "pending_approval", approvalStatus: "pending_approval", lineItems: [], totalAmount: 0, requiresApproval: true, items: 2, createdBy: "Field Rep", createdDate: "2024-02-04", updatedBy: "Field Rep", updatedDate: "2024-02-04" },
  { id: 3, soNumber: "SMP-2024-003", customerId: 805, customerName: "Vikram Das (Intern)", customerCode: "EMP-805", territory: "Central Zone", salesManId: 805, salesManName: "Vikram Das", issuedToEmployeeId: 805, issuedToEmployeeName: "Vikram Das", issuedToEmployeeRole: "Intern", purpose: "training", remarks: "Training session handouts.", billingParty: SAMPLE_BILLING_PARTY, orderDate: "2024-02-06", deliveryDate: "2024-02-11", status: "confirmed", lineItems: [], totalAmount: 0, requiresApproval: true, items: 3, createdBy: "Sales Team", createdDate: "2024-02-06", updatedBy: "Sales Team", updatedDate: "2024-02-06" },
  { id: 4, soNumber: "SM-2024-004", customerId: 802, customerName: "Priya Singh (ASM)", customerCode: "EMP-802", territory: "South Zone", salesManId: 802, salesManName: "Priya Singh", issuedToEmployeeId: 802, issuedToEmployeeName: "Priya Singh", issuedToEmployeeRole: "ASM", purpose: "event", referenceEvent: "Agri Expo 2024", remarks: "Event booth display samples.", billingParty: SAMPLE_BILLING_PARTY, orderDate: "2024-02-07", deliveryDate: "2024-02-13", status: "approved", approvalStatus: "approved", approvedBy: "Admin", approvedDate: "2024-02-08", lineItems: [], totalAmount: 0, requiresApproval: true, items: 4, createdBy: "Sales Team", createdDate: "2024-02-07", updatedBy: "Admin", updatedDate: "2024-02-08" },
  { id: 5, soNumber: "SM-2024-005", customerId: 804, customerName: "Neha Patel (DO)", customerCode: "EMP-804", territory: "West Zone", salesManId: 804, salesManName: "Neha Patel", issuedToEmployeeId: 804, issuedToEmployeeName: "Neha Patel", issuedToEmployeeRole: "DO", purpose: "promotional_sample", remarks: "Promotional sachets for retailer visits.", billingParty: SAMPLE_BILLING_PARTY, orderDate: "2024-02-08", deliveryDate: "2024-02-14", status: "rejected", approvalStatus: "rejected", rejectedBy: "Admin", rejectedDate: "2024-02-09", rejectionReason: "Sample allocation already exhausted for the period.", lineItems: [], totalAmount: 0, requiresApproval: true, items: 1, createdBy: "Field Rep", createdDate: "2024-02-08", updatedBy: "Admin", updatedDate: "2024-02-09" },
  { id: 6, soNumber: "SMP-2024-006", customerId: 806, customerName: sampleOrderRecipientLabel(SEED_FIELD_USERS[5], "Green Valley Agro"), customerCode: "EMP-806", territory: "South Zone", salesManId: 806, salesManName: "Suresh Reddy", issuedToEmployeeId: 806, issuedToEmployeeName: "Suresh Reddy", issuedToEmployeeRole: "TM", purpose: "farmer_demo", recipientType: "farmer", recipientName: "Green Valley Agro", remarks: "Farmer field day demo.", billingParty: SAMPLE_BILLING_PARTY, orderDate: "2024-02-10", deliveryDate: "2024-02-16", status: "dispatched", lineItems: [], totalAmount: 0, requiresApproval: true, items: 2, createdBy: "Sales Team", createdDate: "2024-02-10", updatedBy: "Sales Team", updatedDate: "2024-02-10" },
];

/** Bulk statuses for pagination testing â€” maps to existing OrderStatus values. */
const BULK_SEED_STATUS_PLAN: { status: OrderStatus; count: number }[] = [
  { status: "draft", count: 2 },
  { status: "dispatched", count: 2 },
  { status: "pending_approval", count: 2 },
  { status: "approved", count: 2 },
  { status: "rejected", count: 2 },
  { status: "confirmed", count: 2 },
  { status: "packed", count: 2 },
  { status: "delivered", count: 2 },
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
    const batch = INVENTORY_BATCHES.find(b => b.productId === product.id);
    lines.push(
      recalculateSampleOrderLineItem({
        id: `line-seed-${orderId}-${i}`,
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        availableStock: product.stock,
        quantity,
        unitPrice: product.sellingPrice,
        discount: 0,
        discountValue: 0,
        gstAmount: 0,
        lineTotal: 0,
        unit: product.uom,
        batchNumber: batch?.batchNumber,
        expiryDate: batch?.expiryDate,
      }),
    );
  }

  return lines;
}

function buildSeedOrder(id: number, status: OrderStatus): SalesOrder {
  const user = SEED_FIELD_USERS[(id - 1) % SEED_FIELD_USERS.length];
  const orderDate = seedDateFromId(id);
  const deliveryDate = seedDateFromId(id, 7);
  const lineCount = 1 + (id % 3);
  const lineItems = buildSeedLineItems(id, lineCount);
  const totalAmount = 0;
  const requiresApproval = sampleOrderRequiresApproval() || ["pending_approval", "approved", "rejected"].includes(status);
  const prefix = id % 3 === 0 ? "SMP" : "SM";

  const order: SalesOrder = {
    id,
    soNumber: `${prefix}-2024-${String(id).padStart(3, "0")}`,
    customerId: user.id,
    customerName: `${user.name} (${user.role})`,
    customerCode: `EMP-${user.id}`,
    territory: user.territory,
    salesManId: user.id,
    salesManName: user.name,
    issuedToEmployeeId: user.id,
    issuedToEmployeeName: user.name,
    issuedToEmployeeRole: user.role,
    purpose: SAMPLE_PURPOSE_OPTIONS[id % SAMPLE_PURPOSE_OPTIONS.length].value,
    remarks: "Demo sample issue for field activity.",
    billingParty: SAMPLE_BILLING_PARTY,
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
    return {
      ...order,
      lineItems,
      totalAmount: 0,
      items: lineItems.length,
      requiresApproval: sampleOrderRequiresApproval() || order.requiresApproval,
    };
  });

  return [...baseWithLines, ...buildGeneratedSeedOrders()];
}

interface StoredSalesOrders {
  version: number;
  data: SalesOrder[];
}

const STORAGE_KEY = "ds_sample_orders";
const ID_KEY = "ds_sample_orders_next_id";

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

/** Sample orders always apply 100% line discount — net line value is ₹0. */
export const SAMPLE_ORDER_LINE_DISCOUNT_PERCENT = 100;

export function recalculateSampleOrderLineItem(line: SalesOrderLineItem): SalesOrderLineItem {
  const discount = SAMPLE_ORDER_LINE_DISCOUNT_PERCENT;
  const discountValue = calculateLineDiscountValue(line.quantity, line.unitPrice, discount);
  return {
    ...line,
    discount,
    discountValue,
    gstAmount: 0,
    lineTotal: 0,
  };
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

export function sampleOrderRequiresApproval(): boolean {
  return SAMPLE_ORDER_APPROVAL_ENABLED;
}

export function applySampleOrderZeroPricing(line: SalesOrderLineItem): SalesOrderLineItem {
  return recalculateSampleOrderLineItem(line);
}

export function zeroSampleOrderLines(lines: SalesOrderLineItem[]): SalesOrderLineItem[] {
  return lines.map(recalculateSampleOrderLineItem);
}

export function orderRequiresApproval(_totalAmount = 0): boolean {
  return sampleOrderRequiresApproval();
}

export function resolveSubmitStatus(
  _totalAmount: number,
  userStatus: OrderStatus,
  asDraft: boolean,
): OrderStatus {
  if (asDraft) return "draft";
  if (sampleOrderRequiresApproval()) return "pending_approval";
  return userStatus === "draft" ? "confirmed" : userStatus;
}

const SEED_ORDERS: SalesOrder[] = buildFullSeedOrders();

export function loadProductCatalog(): ProductCatalogItem[] {
  return PRODUCT_CATALOG.filter(p => p.status === "active");
}

export function getProductById(id: number): ProductCatalogItem | undefined {
  return PRODUCT_CATALOG.find(p => p.id === id);
}

export { loadEmployees };

export function getSalesmenForOrders(): Employee[] {
  return loadEmployees().filter(
    (e) =>
      e.status === "active" &&
      (e.department === "Sales" || e.department === "Field Force"),
  );
}

/** @deprecated Use getSalesmenForOrders */
export function getFieldUsersForSampleOrders(): Employee[] {
  return getSalesmenForOrders();
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
    const m = o.soNumber.match(/SM(?:P)?-\d{4}-(\d+)/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);
  return `SM-${year}-${String(maxNum + 1).padStart(3, "0")}`;
}

export function createEmptyLineItem(): SalesOrderLineItem {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId: null,
    productCode: "",
    productName: "",
    availableStock: 0,
    quantityType: "Piece",
    caseQuantity: 0,
    pieceQuantity: 0,
    quantity: 0,
    unitPrice: 0,
    discount: 0,
    discountValue: 0,
    gstAmount: 0,
    lineTotal: 0,
  };
}

export function applyProductToLine(line: SalesOrderLineItem, product: ProductCatalogItem): SalesOrderLineItem {
  const quantity = line.quantity > 0 ? line.quantity : 1;
  const batch = getBatchesForProduct(product.id)[0];
  const updated: SalesOrderLineItem = {
    ...line,
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    availableStock: product.stock,
    quantity,
    unit: product.uom,
    batchNumber: batch?.batchNumber,
    expiryDate: batch?.expiryDate,
    unitPrice: product.sellingPrice,
    gstAmount: 0,
  };
  return recalculateSampleOrderLineItem(updated);
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
  if (order.status === "pending_approval") return "pending_approval";
  if (order.status === "rejected") return "rejected";
  if (order.approvalStatus) return order.approvalStatus;
  if (order.status === "approved") return "approved";
  return order.requiresApproval ? "not_required" : "not_required";
}

export function formatApprovalStatus(status: ApprovalStatus): string {
  return APPROVAL_STATUS_LABELS[status];
}

export function isApprovalRelatedOrder(order: SalesOrder): boolean {
  return APPROVAL_ORDER_STATUSES.includes(order.status);
}

export function isOrderPendingApproval(order: SalesOrder): boolean {
  return order.status === "pending_approval";
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
      totalAmount: 0,
      additionalExpenses,
      lineItems: order.lineItems.map((l) => {
        let line = { ...l };
        if (line.productId && line.unitPrice === 0) {
          const product = getProductById(line.productId);
          if (product) {
            line = {
              ...line,
              unitPrice: product.sellingPrice,
              unit: line.unit ?? product.uom,
            };
          }
        }
        return recalculateSampleOrderLineItem(line);
      }),
    };
  }
  if (order.items <= 0) return { ...order, totalAmount: 0, additionalExpenses };

  const catalog = PRODUCT_CATALOG.filter(p => p.status === "active");
  const count = Math.min(order.items, catalog.length);
  const lineItems: SalesOrderLineItem[] = [];

  for (let i = 0; i < count; i++) {
    const product = catalog[i];
    const quantity = Math.max(1, 2 + (i % 5));
    const batch = getBatchesForProduct(product.id)[0];
    lineItems.push(
      recalculateSampleOrderLineItem({
        id: `line-seed-${order.id}-${i}`,
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        availableStock: product.stock,
        quantity,
        unitPrice: product.sellingPrice,
        discount: 0,
        discountValue: 0,
        gstAmount: 0,
        lineTotal: 0,
        unit: product.uom,
        batchNumber: batch?.batchNumber,
        expiryDate: batch?.expiryDate,
      }),
    );
  }

  return { ...order, lineItems, totalAmount: 0, additionalExpenses: order.additionalExpenses ?? [] };
}

export function hydrateOrders(orders: SalesOrder[]): SalesOrder[] {
  const warehouses = loadWarehouses();
  const defaultWarehouse = warehouses.find((w) => w.warehouseCode === "WH-0001") ?? warehouses[0];

  return orders.map((order) => {
    const hydrated = hydrateOrderLineItems(order);
    const packingReady = ["approved", "confirmed"].includes(hydrated.status);
    return {
      ...hydrated,
      additionalExpenses: hydrated.additionalExpenses ?? [],
      approvalStatus: resolveApprovalStatus(hydrated),
      warehouseId: hydrated.warehouseId ?? (packingReady ? defaultWarehouse?.id : undefined),
      warehouseName:
        hydrated.warehouseName ??
        (packingReady ? defaultWarehouse?.warehouseName : undefined),
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
  if (order.status === "draft" || order.status === "pending_approval" || order.status === "rejected") return false;
  if (!["approved", "confirmed", "packed"].includes(order.status) && order.status !== "dispatched" && order.status !== "delivered") {
    return false;
  }
  const hydrated = hydrateOrderLineItems(order);
  return hydrated.lineItems.some(l => l.productId && l.quantity > 0);
}

export interface SalesOrderFormValues {
  orderDate: string;
  salesManId: number | null;
  remarks: string;
  status: OrderStatus;
  lineItems: SalesOrderLineItem[];
  warehouseId?: number | null;
  warehouseName?: string;
}

export function formatSamplePurpose(purpose: SamplePurpose | "" | undefined): string {
  if (!purpose) return "—";
  return SAMPLE_PURPOSE_OPTIONS.find(o => o.value === purpose)?.label ?? purpose;
}

export function formatRecipientType(type: RecipientType | "" | undefined): string {
  if (!type) return "—";
  return RECIPIENT_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
}

export function getSampleOrderDisplayRecipient(order: SalesOrder): string {
  return order.salesManName || order.issuedToEmployeeName || order.customerName;
}

export function orderToFormValues(order: SalesOrder): SalesOrderFormValues {
  const hydrated = hydrateOrderLineItems(order);
  return {
    orderDate: hydrated.orderDate,
    salesManId: hydrated.salesManId,
    remarks: hydrated.remarks ?? "",
    status: hydrated.status,
    lineItems: hydrated.lineItems.length > 0 ? hydrated.lineItems : [],
    warehouseId: hydrated.warehouseId ?? null,
    warehouseName: hydrated.warehouseName ?? "",
  };
}

export function buildOrderFromForm(
  form: SalesOrderFormValues,
  existing: Partial<SalesOrder> & { soNumber: string },
  asDraft: boolean,
): SalesOrder | null {
  const salesmen = getSalesmenForOrders();
  const warehouses = loadWarehouses();
  const salesman = salesmen.find((e) => e.id === form.salesManId);
  const warehouse = warehouses.find(w => w.id === form.warehouseId);
  if (!salesman || !warehouse) return null;

  const lineItems = form.lineItems
    .filter((l) => l.productId && l.quantity > 0)
    .map((l) => recalculateSampleOrderLineItem(l));
  const totalAmount = 0;
  const finalStatus = resolveSubmitStatus(totalAmount, form.status, asDraft);
  const requiresApproval = sampleOrderRequiresApproval() && !asDraft;
  const approvalStatus = resolveApprovalStatusOnSubmit(finalStatus, requiresApproval, asDraft);
  const today = todayStr();

  return {
    id: existing.id ?? nextOrderId(loadOrders()),
    soNumber: existing.soNumber,
    customerId: salesman.id,
    customerName: salesman.fullName,
    customerCode: salesman.employeeId,
    territory: salesman.department || salesman.role || "—",
    salesManId: salesman.id,
    salesManName: salesman.fullName,
    issuedToEmployeeId: salesman.id,
    issuedToEmployeeName: salesman.fullName,
    issuedToEmployeeRole: salesman.role,
    remarks: form.remarks.trim() || undefined,
    billingParty: SAMPLE_BILLING_DETAILS.companyName,
    orderDate: form.orderDate,
    deliveryDate: form.orderDate,
    status: finalStatus,
    lineItems,
    additionalExpenses: [],
    totalAmount,
    requiresApproval,
    approvalStatus,
    approvedBy: existing.approvedBy,
    approvedDate: existing.approvedDate,
    rejectedBy: existing.rejectedBy,
    rejectedDate: existing.rejectedDate,
    rejectionReason: existing.rejectionReason,
    items: lineItems.length,
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
    warehouseId: warehouse.id,
    warehouseName: warehouse.warehouseName,
  };
}

function stripSplitLineMeta(line: SalesOrderLineItem): SalesOrderLineItem {
  const { splitSourceLineId: _s, maxSplitQty: _m, ...rest } = line;
  return recalculateSampleOrderLineItem(rest);
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
  if (!built) return { error: "Invalid employee or warehouse selection" };

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
      updatedOriginalLines.push(recalculateSampleOrderLineItem({
        ...line,
        quantity: remainQty,
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

  const originalTotal = 0;
  const updatedOriginal: SalesOrder = {
    ...order,
    lineItems: updatedOriginalLines.map(recalculateSampleOrderLineItem),
    totalAmount: originalTotal,
    items: updatedOriginalLines.length,
    requiresApproval: sampleOrderRequiresApproval(),
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
    status: order.status === "approved" || order.status === "confirmed" ? "packed" : order.status,
    warehouseId,
    warehouseName,
    updatedBy: "Admin",
    updatedDate: todayStr(),
  };

  saveOrders(orders.map(o => (o.id === orderId ? updated : o)));
  return updated;
}


