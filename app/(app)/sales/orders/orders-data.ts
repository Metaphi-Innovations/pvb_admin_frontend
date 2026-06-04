// ── Sales Orders — types, catalog, persistence, approval rules ───────────────

import { loadCustomers, getCustomersForTransactionDropdown } from "@/app/(app)/masters/customers/customer-data";
import { loadEmployees, type Employee } from "@/app/(app)/user-management/employee/employee-data";

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
  discount: number;
  gstAmount: number;
  lineTotal: number;
}

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
  totalAmount: number;
  requiresApproval: boolean;
  items: number;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
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

const SEED_ORDERS: SalesOrder[] = [
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
];

const STORAGE_KEY = "ds_sales_orders";
const ID_KEY = "ds_sales_orders_next_id";

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseGstRate(gstRate: string): number {
  const n = parseFloat(gstRate.replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function calculateLineSubtotal(quantity: number, unitPrice: number, discount: number): number {
  return Math.max(0, quantity * unitPrice - discount);
}

export function calculateLineTotal(quantity: number, unitPrice: number, discount: number, gstAmount: number): number {
  return calculateLineSubtotal(quantity, unitPrice, discount) + Math.max(0, gstAmount);
}

export function recalculateLineItem(line: SalesOrderLineItem): SalesOrderLineItem {
  const lineTotal = calculateLineTotal(line.quantity, line.unitPrice, line.discount, line.gstAmount);
  return { ...line, lineTotal };
}

export function calculateOrderTotal(lines: SalesOrderLineItem[]): number {
  return lines.reduce((sum, line) => sum + line.lineTotal, 0);
}

export interface OrderTotalsSummary {
  subtotalBeforeDiscount: number;
  totalItemDiscounts: number;
  netTotal: number;
  totalGst: number;
  grandTotal: number;
}

export function calculateOrderTotalsSummary(lines: SalesOrderLineItem[]): OrderTotalsSummary {
  let subtotalBeforeDiscount = 0;
  let totalItemDiscounts = 0;
  let netTotal = 0;
  let totalGst = 0;

  for (const line of lines) {
    subtotalBeforeDiscount += line.quantity * line.unitPrice;
    totalItemDiscounts += line.discount;
    netTotal += calculateLineSubtotal(line.quantity, line.unitPrice, line.discount);
    totalGst += line.gstAmount;
  }

  return {
    subtotalBeforeDiscount,
    totalItemDiscounts,
    netTotal,
    totalGst,
    grandTotal: netTotal + totalGst,
  };
}

export function computeGstAmount(quantity: number, unitPrice: number, discount: number, gstRate: string): number {
  const subtotal = calculateLineSubtotal(quantity, unitPrice, discount);
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
  if (typeof window === "undefined") return SEED_ORDERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ORDERS));
      localStorage.setItem(ID_KEY, "10");
      return SEED_ORDERS;
    }
    return JSON.parse(raw) as SalesOrder[];
  } catch {
    return SEED_ORDERS;
  }
}

export function saveOrders(orders: SalesOrder[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
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
