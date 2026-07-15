import { loadEmployees, type Employee } from "@/app/(app)/user-management/employee/employee-data";
import { loadWarehouses } from "@/app/(app)/masters/warehouse/warehouse-data";
import { resolveSalesOrderDealerPrice } from "@/app/(app)/masters/scheme/product-discount-scheme";

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

export const APPROVAL_ORDER_STATUSES: OrderStatus[] = ["pending_approval", "approved", "rejected"];

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

export interface SalesOrderLineItem {
  id: string;
  productId: string | null;
  productCode: string;
  productName: string;
  availableStock: number;
  quantityType?: "Case" | "Piece";
  caseQuantity?: number;
  pieceQuantity?: number;
  packSize?: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountValue: number;
  gstAmount: number;
  lineTotal: number;
  unit?: string;
  packingUnit?: string;
  batchNumber?: string;
  expiryDate?: string;
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
  id: string | number;
  soNumber: string;
  customerId: string | number;
  customerName: string;
  customerCode: string;
  territory: string;
  salesManId: string | number | null;
  salesManName: string;
  salesManCode?: string;
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
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledDate?: string;
  packingListId?: string | number;
  packingListNumber?: string;
  packingStatus?: PackingStatus;
  warehouseId?: string | number;
  warehouseName?: string;
  warehouseCode?: string;
  issuedToEmployeeId?: string | number;
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

export interface ProductCatalogItem {
  id: string;
  code: string;
  name: string;
  sku: string;
  stock: number;
  sellingPrice: number;
  gstRate: string;
  category: string;
  segment: string;
  packSize?: number;
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

export function calculateLineSubtotal(quantity: number, unitPrice: number, discountPercent: number): number {
  const subtotalBeforeDiscount = quantity * unitPrice;
  const discountAmount = subtotalBeforeDiscount * (discountPercent / 100);
  return Math.max(0, subtotalBeforeDiscount - discountAmount);
}

export function calculateLineTotal(quantity: number, unitPrice: number, discountPercent: number, gstAmount: number): number {
  return calculateLineSubtotal(quantity, unitPrice, discountPercent) + Math.max(0, gstAmount);
}

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

export interface OrderTotalsSummary {
  subtotalBeforeDiscount: number;
  productSubtotal: number;
  totalItemDiscounts: number;
  productDiscountTotal: number;
  netTotal: number;
  additionalExpensesTotal: number;
  expenseDiscountTotal: number;
  netAdditionalExpenses: number;
  taxableAmount: number;
  totalGst: number;
  gstAmount: number;
  grandTotal: number;
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

export function formatOrderStatus(status: OrderStatus): string {
  const opt = ORDER_STATUS_OPTIONS.find((o) => o.value === status);
  return opt?.label ?? status;
}

export function resolveApprovalStatus(order: SalesOrder): ApprovalStatus {
  if (order.status === "pending_approval") return "pending_approval";
  if (["approved", "confirmed", "packed", "dispatched", "delivered"].includes(order.status)) return "approved";
  if (order.status === "rejected") return "rejected";
  return "not_required";
}

export function formatApprovalStatus(status: ApprovalStatus): string {
  switch (status) {
    case "pending_approval": return "Pending Approval";
    case "approved": return "Approved";
    case "rejected": return "Rejected";
    default: return "Not Required";
  }
}

export function getSampleOrderDisplayRecipient(order: SalesOrder): string {
  return order.salesManName || order.customerName || "—";
}

export interface SalesOrderFormValues {
  orderDate: string;
  customerId?: string | number | null;
  salesManId: string | number | null;
  status: OrderStatus;
  lineItems: SalesOrderLineItem[];
  warehouseId?: string | number | null;
  warehouseName?: string;
  remarks?: string;
  billToAddressId?: string;
  shipToAddressId?: string;
}

export function orderToFormValues(order: SalesOrder): SalesOrderFormValues {
  return {
    orderDate: order.orderDate,
    customerId: order.customerId ?? null,
    salesManId: order.salesManId,
    remarks: order.remarks || "",
    status: order.status,
    lineItems: order.lineItems.map((line) => ({
      ...line,
    })),
    warehouseId: order.warehouseId ?? null,
    warehouseName: order.warehouseName || "",
    billToAddressId: "", // will be set based on default if loading
    shipToAddressId: "",
  };
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

let dynamicProducts: ProductCatalogItem[] | null = null;
export function setDynamicProducts(prods: ProductCatalogItem[] | null) {
  dynamicProducts = prods;
}

export function loadProductCatalog(): ProductCatalogItem[] {
  return dynamicProducts || [];
}

export function getProductById(id: string): ProductCatalogItem | undefined {
  return (dynamicProducts || []).find((p) => p.id === id);
}

// Minimal helpers for permission checking:
export function canEditOrder(order: SalesOrder): boolean {
  return order.status === "draft" || order.status === "pending_approval";
}

export function canCancelOrder(order: SalesOrder): boolean {
  return !["cancelled", "delivered", "dispatched"].includes(order.status);
}

export function canGeneratePackingList(order: SalesOrder): boolean {
  return order.status === "approved" || order.status === "confirmed";
}

export function canDownloadPI(order: SalesOrder): boolean {
  return order.status !== "cancelled";
}

export function loadOrders(): SalesOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("ds_sales_sample_orders");
    return raw ? (JSON.parse(raw) as SalesOrder[]) : [];
  } catch {
    return [];
  }
}

export function saveOrders(orders: SalesOrder[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("ds_sales_sample_orders", JSON.stringify(orders));
}

export function hydrateOrderLineItems(order: SalesOrder): SalesOrder {
  return {
    ...order,
    lineItems: (order.lineItems ?? []).map(recalculateSampleOrderLineItem)
  };
}

export function isApprovalRelatedOrder(order: SalesOrder): boolean {
  return order.status === "pending_approval" || order.status === "approved" || order.status === "rejected";
}

export function canApproveOrder(order: SalesOrder): boolean {
  return order.status === "pending_approval";
}

export function approveSalesOrder(orderId: number | string, approvedBy = "Admin"): SalesOrder | { error: string } {
  const orders = loadOrders();
  const order = orders.find(o => String(o.id) === String(orderId));
  if (!order) return { error: "Order not found" };
  if (!canApproveOrder(order)) return { error: "This order is not pending approval" };

  const today = todayStr();
  const updated: SalesOrder = {
    ...order,
    approvalStatus: "approved",
    status: "approved",
    approvedBy,
    approvedDate: today,
    updatedBy: approvedBy,
    updatedDate: today,
  };

  saveOrders(orders.map(o => (String(o.id) === String(orderId) ? updated : o)));
  return hydrateOrderLineItems(updated);
}

export function createEmptyExpense(): SalesOrderAdditionalExpense {
  return {
    id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    expenseName: "",
    amount: 0,
    discountType: "percent",
    discountValue: 0,
    netAmount: 0,
  };
}

export function recalculateExpense(
  expense: SalesOrderAdditionalExpense,
): SalesOrderAdditionalExpense {
  return {
    ...expense,
    netAmount: calculateExpenseNet(expense),
  };
}

export function applyProductToLine(
  line: SalesOrderLineItem,
  product: ProductCatalogItem,
  context?: { stateName: string; customerMasterType: string } | null,
): SalesOrderLineItem {
  const quantity = line.quantity > 0 ? line.quantity : 1;
  const resolved =
    context?.stateName && context.customerMasterType
      ? resolveSalesOrderDealerPrice({
        productId: product.id as any,
        stateName: context.stateName,
        customerMasterType: context.customerMasterType,
      })
      : 0;
  const dealerPrice = resolved > 0 ? resolved : product.sellingPrice;
  const unitPrice = dealerPrice;
  const discount = SAMPLE_ORDER_LINE_DISCOUNT_PERCENT;
  const discountValue = calculateLineDiscountValue(quantity, unitPrice, discount);
  return {
    ...line,
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    availableStock: product.stock,
    quantity,
    unitPrice,
    discount,
    discountValue,
    gstAmount: 0,
    lineTotal: 0,
  };
}

export function repriceSampleOrderLineItems(
  lines: SalesOrderLineItem[],
  context: { stateName: string; customerMasterType: string } | null,
): SalesOrderLineItem[] {
  return lines.map((line) => {
    if (!line.productId) return line;
    const product = getProductById(line.productId);
    if (!product) return line;
    return applyProductToLine(line, product, context);
  });
}

export function getOrderById(id: string | number): SalesOrder | undefined {
  const orders = loadOrders();
  return orders.find(o => String(o.id) === String(id));
}

export function attachPackingListToOrder(
  orderId: string | number,
  packingListId: number,
  packingListNumber: string,
  warehouseId: number,
  warehouseName: string,
  packingStatus: PackingStatus = "generated",
): SalesOrder | { error: string } {
  const orders = loadOrders();
  const order = orders.find(o => String(o.id) === String(orderId));
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

  saveOrders(orders.map(o => (String(o.id) === String(orderId) ? updated : o)));
  return updated;
}

export function getSalesmenForOrders(): Employee[] {
  return loadEmployees().filter(
    e => e.status === "active" && (e.department === "Sales" || e.department === "Field Force"),
  );
}

export function generateOrderNumber(orders: SalesOrder[]): string {
  const year = new Date().getFullYear();
  const maxNum = orders.reduce((max, o) => {
    const m = o.soNumber.match(/SM-\d{4}-(\d+)/) || o.soNumber.match(/SO-\d{4}-(\d+)/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);
  return `SM-${year}-${String(maxNum + 1).padStart(3, "0")}`;
}


export function canSplitOrder(order: SalesOrder): boolean {
  return order.status === 'confirmed';
}

export function splitSalesOrderFromForm(
  originalOrderId: string | number,
  form: SalesOrderFormValues,
  newOrderNumber: string,
  asDraft: boolean
): { newOrder: SalesOrder } | { error: string } {
  return { error: 'Not implemented' };
}
