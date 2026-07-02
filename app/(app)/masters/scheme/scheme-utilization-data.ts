import { loadMasterRecords, saveMasterRecords, MASTER_CURRENT_USER, masterToday } from "@/lib/masters/common";
import type { SalesOrder, SalesOrderLineItem } from "@/app/(app)/sales/orders/orders-data";
import { isProductDiscountSchemeApplied } from "@/app/(app)/sales/orders/orders-data";
import { mapCustomerMasterTypeToSchemeType } from "./product-discount-scheme";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";

export const SCHEME_UTILIZATION_STORAGE_KEY = "ds_scheme_utilization_v1";

export interface SchemeUtilizationRecord {
  id: string;
  schemeId: number;
  schemeCode: string;
  schemeName: string;
  salesOrderId: number;
  salesOrderNumber: string;
  lineItemId: string;
  customerId: number;
  customerName: string;
  customerCode: string;
  customerType: string;
  state: string;
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  dealerPrice: number;
  discountAmount: number;
  finalRate: number;
  orderDate: string;
  appliedBy: string;
  appliedDate: string;
}

export interface SchemeUtilizationSummary {
  totalOrdersUsed: number;
  totalQuantity: number;
  totalDiscountGiven: number;
  totalSalesValueAfterScheme: number;
}

function utilizationId(): string {
  return `util-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadSchemeUtilizationRecords(): SchemeUtilizationRecord[] {
  return loadMasterRecords<SchemeUtilizationRecord>(SCHEME_UTILIZATION_STORAGE_KEY, []);
}

export function saveSchemeUtilizationRecords(records: SchemeUtilizationRecord[]): void {
  saveMasterRecords(SCHEME_UTILIZATION_STORAGE_KEY, records);
}

export function removeSchemeUtilizationForOrder(salesOrderNumber: string): void {
  const records = loadSchemeUtilizationRecords().filter(
    (record) => record.salesOrderNumber !== salesOrderNumber,
  );
  saveSchemeUtilizationRecords(records);
}

function lineToUtilizationRecord(
  order: SalesOrder,
  line: SalesOrderLineItem,
  customer: Customer,
  appliedBy: string,
  appliedDate: string,
): SchemeUtilizationRecord | null {
  if (!isProductDiscountSchemeApplied(line) || !line.productId) return null;

  const schemeId = line.appliedSchemeId;
  const schemeCode = line.appliedSchemeCode ?? line.schemeCode;
  const schemeName = line.appliedSchemeName ?? line.schemeName;
  if (!schemeId || !schemeCode) return null;

  const dealerPrice = line.originalDealerPrice ?? line.dealerPrice;
  const finalRate = line.finalRateAfterScheme ?? line.finalRate;
  const discountAmount = line.schemeDiscountAmount ?? Math.max(0, dealerPrice - finalRate);

  return {
    id: utilizationId(),
    schemeId,
    schemeCode,
    schemeName: schemeName ?? "",
    salesOrderId: order.id,
    salesOrderNumber: order.soNumber,
    lineItemId: line.id,
    customerId: order.customerId,
    customerName: order.customerName,
    customerCode: order.customerCode,
    customerType: mapCustomerMasterTypeToSchemeType(customer.customerType),
    state: customer.stateName,
    productId: line.productId,
    productCode: line.productCode,
    productName: line.productName,
    quantity: line.quantity,
    dealerPrice,
    discountAmount,
    finalRate,
    orderDate: order.orderDate,
    appliedBy,
    appliedDate,
  };
}

/** Record utilization when a non-draft Sales Order is submitted. */
export function syncSchemeUtilizationFromOrder(
  order: SalesOrder,
  customer: Customer,
  options?: { isDraft?: boolean; appliedBy?: string },
): void {
  removeSchemeUtilizationForOrder(order.soNumber);
  if (options?.isDraft || order.status === "draft") return;

  const appliedBy = options?.appliedBy ?? MASTER_CURRENT_USER;
  const appliedDate = masterToday();
  const newRecords: SchemeUtilizationRecord[] = [];

  for (const line of order.lineItems) {
    const record = lineToUtilizationRecord(order, line, customer, appliedBy, appliedDate);
    if (record) newRecords.push(record);
  }

  if (newRecords.length === 0) return;
  saveSchemeUtilizationRecords([...loadSchemeUtilizationRecords(), ...newRecords]);
}

export function getUtilizationBySchemeId(schemeId: number): SchemeUtilizationRecord[] {
  return loadSchemeUtilizationRecords()
    .filter((record) => record.schemeId === schemeId)
    .sort((a, b) => b.appliedDate.localeCompare(a.appliedDate));
}

export function getUtilizationBySchemeCode(schemeCode: string): SchemeUtilizationRecord[] {
  const code = schemeCode.trim();
  return loadSchemeUtilizationRecords()
    .filter((record) => record.schemeCode.trim() === code)
    .sort((a, b) => b.appliedDate.localeCompare(a.appliedDate));
}

export function getUtilizationSummaryBySchemeId(schemeId: number): SchemeUtilizationSummary {
  const records = getUtilizationBySchemeId(schemeId);
  const orderNumbers = new Set(records.map((record) => record.salesOrderNumber));

  return {
    totalOrdersUsed: orderNumbers.size,
    totalQuantity: records.reduce((sum, record) => sum + record.quantity, 0),
    totalDiscountGiven: Math.round(
      records.reduce((sum, record) => sum + record.discountAmount * record.quantity, 0) * 100,
    ) / 100,
    totalSalesValueAfterScheme: Math.round(
      records.reduce((sum, record) => sum + record.finalRate * record.quantity, 0) * 100,
    ) / 100,
  };
}
