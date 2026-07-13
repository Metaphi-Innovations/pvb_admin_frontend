import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { calculateOrderTotalsSummary } from "@/app/(app)/sales/orders/orders-data";
import type { SalesOrder, SalesOrderLineItem, SalesOrderAdditionalExpense } from "@/app/(app)/sales/orders/orders-data";
import type { SalesOrderFormValues } from "@/app/(app)/sales/orders/components/SalesOrderForm";
import { getCustomerAddressesForSalesOrder } from "@/app/(app)/sales/orders/sales-order-address-utils";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asDateOnly(value: unknown): string {
  const raw = asString(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function toUuidOrNull(value: unknown): string | null {
  const raw = asString(value).trim();
  if (!raw || !UUID_RE.test(raw)) return null;
  return raw;
}

function toDisplayName(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const record = user as Record<string, unknown>;
  const username = asString(record.username).trim();
  if (username) return username;
  const first = asString(record.first_name).trim();
  const last = asString(record.last_name).trim();
  return `${first} ${last}`.trim();
}

function mapBackendStatusToFrontend(status: string): any {
  const s = asString(status).toLowerCase();
  if (s === "pending_approval") return "pending_approval";
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  if (s === "confirmed") return "confirmed";
  if (s === "cancelled") return "cancelled";
  if (s === "dispatched") return "dispatched";
  if (s === "delivered") return "delivered";
  if (s === "ready_for_packing") return "ready_for_packing";
  if (s === "packed") return "packed";
  return "draft";
}

function mapFrontendStatusToBackend(status: string): string {
  const s = asString(status).toLowerCase();
  if (s === "pending_approval") return "PENDING_APPROVAL";
  if (s === "approved") return "APPROVED";
  if (s === "rejected") return "REJECTED";
  if (s === "confirmed") return "CONFIRMED";
  if (s === "cancelled") return "CANCELLED";
  if (s === "dispatched") return "DISPATCHED";
  if (s === "delivered") return "DELIVERED";
  if (s === "ready_for_packing") return "READY_FOR_PACKING";
  if (s === "packed") return "PACKED";
  return "DRAFT";
}

function mapBackendLineItem(raw: Record<string, unknown>, idx: number): SalesOrderLineItem {
  const quantity = asNumber(raw.base_qty ?? raw.quantity);
  const snapshot = (raw.product_snapshot || {}) as Record<string, any>;
  const product = (raw.product || {}) as Record<string, any>;
  
  const packSize = asNumber(product.unit_per_packing ?? snapshot.conversion_qty ?? 1);
  const isCaseType = (raw.per_case_qty && asNumber(raw.per_case_qty) > 0) || false;
  
  const caseQuantity = Math.floor(quantity / packSize);
  const pieceQuantity = quantity % packSize;

  return {
    id: asString(raw.id || raw.sales_order_product_id || `line-${idx}`),
    productId: asNumber(raw.product_id) || (raw.product_id as any),
    productCode: asString(raw.product_code || product.product_code || product.code || (raw.product as any)?.product_code),
    productName: asString(raw.product_name || product.product_name || product.name || (raw.product as any)?.product_name),
    availableStock: asNumber(raw.available_stock ?? 0),
    quantityType: isCaseType ? "Case" : "Piece",
    caseQuantity: caseQuantity,
    pieceQuantity: pieceQuantity,
    packSize: packSize,
    quantity: quantity,
    dealerPrice: asNumber(raw.unit_price),
    unitPrice: asNumber(raw.unit_price),
    discount: asNumber(raw.discount_percentage ?? raw.discount),
    discountValue: asNumber(raw.discount_amount),
    schemeDiscountPercent: asNumber(raw.discount_percentage ?? 0),
    schemeDiscountAmount: asNumber(raw.discount_amount ?? 0),
    finalRate: asNumber(raw.unit_price) - asNumber(raw.discount_amount ?? 0),
    schemeApplied: (raw.discount_amount ? "Yes" : "No") as "Yes" | "No",
    gstAmount: asNumber(raw.gst_amount),
    cgstAmount: asNumber(raw.cgst_amount),
    sgstAmount: asNumber(raw.sgst_amount),
    igstAmount: asNumber(raw.igst_amount),
    lineTotal: asNumber(raw.item_total ?? raw.lineTotal),
  };
}

function mapBackendExpense(raw: Record<string, unknown>, idx: number): SalesOrderAdditionalExpense {
  return {
    id: asString(raw.id || `exp-${idx}`),
    expenseName: asString(raw.charge_name),
    amount: asNumber(raw.amount),
    discountType: "percent",
    discountValue: 0,
    netAmount: asNumber(raw.amount),
    gstRate: asString(raw.gst_percent || "0"),
    cgstAmount: asNumber(raw.cgst_amount),
    sgstAmount: asNumber(raw.sgst_amount),
    igstAmount: asNumber(raw.igst_amount),
    gstAmount: asNumber(raw.cgst_amount ?? 0) + asNumber(raw.sgst_amount ?? 0) + asNumber(raw.igst_amount ?? 0),
    totalAmount: asNumber(raw.total_amount),
    remarks: asString(raw.remarks),
  };
}

export function mapBackendSalesOrder(raw: Record<string, unknown>): SalesOrder {
  const customer = (raw.customer || {}) as Record<string, unknown>;
  const salesman = (raw.salesman || {}) as Record<string, unknown>;
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const rawExpenses = Array.isArray(raw.expenses) ? raw.expenses : [];

  const lineItems = rawItems.map((item, idx) => mapBackendLineItem(item as Record<string, unknown>, idx));
  const additionalExpenses = rawExpenses.map((exp, idx) => mapBackendExpense(exp as Record<string, unknown>, idx));

  return {
    id: raw.id as any,
    soNumber: asString(raw.so_number || raw.soNumber),
    customerId: (toUuidOrNull(raw.customer_id) || customer.id) as any,
    customerName: asString(customer.customer_name || raw.customer_name),
    customerCode: asString(customer.customer_code || raw.customer_code),
    territory: asString(customer.territory || raw.territory || "—"),
    salesManId: (toUuidOrNull(raw.salesman_id) || salesman.id) as any,
    salesManName: toDisplayName(salesman) || asString(raw.salesman_name),
    orderDate: asDateOnly(raw.order_date),
    deliveryDate: asDateOnly(raw.delivery_date),
    status: mapBackendStatusToFrontend(asString(raw.status)),
    lineItems,
    additionalExpenses,
    totalAmount: asNumber(raw.grand_total ?? raw.totalAmount),
    requiresApproval: asString(raw.status).toUpperCase() === "PENDING_APPROVAL",
    items: raw._count && typeof (raw._count as any).items === "number" ? (raw._count as any).items : lineItems.length,
    createdBy: toDisplayName(raw.created_by_user) || "Admin",
    createdDate: asDateOnly(raw.created_at || raw.createdDate),
    updatedBy: toDisplayName(raw.updated_by_user) || "Admin",
    updatedDate: asDateOnly(raw.updated_at || raw.updatedDate),
    approvedBy: toDisplayName(raw.approved_by_user) || undefined,
    approvedDate: raw.approved_at ? asDateOnly(raw.approved_at) : undefined,
    parentOrderNumber: asString(raw.parent_sales_order_number),
    referenceOrderNumber: asString(raw.reference_sales_order_number),
    remarks: asString(raw.remarks),
    warehouseId: toUuidOrNull(raw.source_warehouse_id) as any,
    warehouseName: raw.source_warehouse ? asString((raw.source_warehouse as any).warehouse_name) : "",
  };
}

function resolveBillShipObjects(form: SalesOrderFormValues, customerDetails?: any) {
  let billToObj: any = null;
  let shipToObj: any = null;

  if (customerDetails) {
    const base = {
      id: customerDetails.customer_id,
      customerCode: customerDetails.customer_code,
      customerName: customerDetails.customer_name,
      customerType: customerDetails.customer_type?.customer_type_name || "",
      status: customerDetails.is_active ? "active" : "inactive",
      mobile: customerDetails.mobile_no || "",
      email: customerDetails.email || "",
      gstApplicable: customerDetails.gst_applicable,
      gstin: customerDetails.gstin_no || "",
      registeredLegalName: customerDetails.registered_legal_name || "",
      registeredAddress: customerDetails.registered_gst_address || "",
      pan: customerDetails.pan_no || "",
      branches: (customerDetails.branches || []).map((b: any) => ({
        branchName: b.branch_name,
        isMain: b.is_main_branch,
        billingAddress: {
          address: `${b.billing_address_line_1 || ""} ${b.billing_address_line_2 || ""}`.trim(),
          city: b.billing_city || "",
          state: b.billing_state || "",
          pincode: b.billing_pincode || "",
          gstin: customerDetails.gstin_no || "",
        },
        shippingAddress: {
          address: `${b.shipping_address_line_1 || ""} ${b.shipping_address_line_2 || ""}`.trim(),
          city: b.shipping_city || "",
          state: b.shipping_state || "",
          pincode: b.shipping_pincode || "",
          gstin: customerDetails.gstin_no || "",
        },
      })),
    };

    const customerAddresses = getCustomerAddressesForSalesOrder(base as any);
    const billToAddr = customerAddresses.find((a) => a.id === form.billToAddressId);
    const shipToAddr = customerAddresses.find((a) => a.id === form.shipToAddressId);

    if (billToAddr) {
      billToObj = {
        address: billToAddr.addressLine1,
        city: billToAddr.city,
        state: billToAddr.state,
        pincode: billToAddr.pincode,
      };
    }
    if (shipToAddr) {
      shipToObj = {
        address: shipToAddr.addressLine1,
        city: shipToAddr.city,
        state: shipToAddr.state,
        pincode: shipToAddr.pincode,
      };
    }
  }

  if (!billToObj && form.billToAddressId) {
    billToObj = { address: form.billToAddressId, city: "Mumbai", state: "Maharashtra", pincode: "400001" };
  }
  if (!shipToObj && form.shipToAddressId) {
    shipToObj = { address: form.shipToAddressId, city: "Pune", state: "Maharashtra", pincode: "411001" };
  }

  return { billToObj, shipToObj };
}

function buildBackendWriteBody(
  form: SalesOrderFormValues,
  options: { soNumber: string; status: string },
  customerDetails?: any
): Record<string, unknown> {
  const totals = calculateOrderTotalsSummary(form.lineItems, form.additionalExpenses);
  const { billToObj, shipToObj } = resolveBillShipObjects(form, customerDetails);

  return {
    so_number: options.soNumber,
    customer_id: form.customerId,
    salesman_id: form.salesManId,
    order_date: form.orderDate ? new Date(form.orderDate).toISOString() : null,
    delivery_date: form.deliveryDate ? new Date(form.deliveryDate).toISOString() : null,
    status: mapFrontendStatusToBackend(options.status),
    remarks: form.remarks || null,
    subtotal_amount: totals.netTotal,
    discount_amount: totals.productDiscountTotal + totals.expenseDiscountTotal,
    tax_amount: totals.totalGst,
    grand_total: totals.grandTotal,
    source_warehouse_id: toUuidOrNull(form.warehouseId),
    bill_to: billToObj,
    ship_to: shipToObj,
    expenses: (form.additionalExpenses ?? []).map((exp) => {
      const isInter = (exp.igstAmount || 0) > 0;
      const gstPct = asNumber(exp.gstRate);
      return {
        charge_name: exp.expenseName,
        amount: exp.amount,
        gst_percent: gstPct,
        cgst_percentage: isInter ? 0 : gstPct / 2,
        cgst_amount: isInter ? 0 : exp.cgstAmount,
        sgst_percentage: isInter ? 0 : gstPct / 2,
        sgst_amount: isInter ? 0 : exp.sgstAmount,
        igst_percentage: isInter ? gstPct : 0,
        igst_amount: isInter ? exp.igstAmount : 0,
        total_amount: exp.totalAmount,
        remarks: exp.remarks || "",
      };
    }),
    items: form.lineItems.map((line) => ({
      product_id: line.productId,
      base_qty: line.quantity,
      unit_price: line.unitPrice,
      discount_type: line.schemeDiscountType === "Percentage" ? "Percentage" : "Flat",
      discount_percentage: line.schemeDiscountPercent || 0,
      discount_amount: line.discountValue || 0,
      gst_percentage: line.gstPercentage ?? 18,
      gst_amount: line.gstAmount,
      cgst_percentage: line.cgstPercentage ?? 0,
      cgst_amount: line.cgstAmount || 0,
      sgst_percentage: line.sgstPercentage ?? 0,
      sgst_amount: line.sgstAmount || 0,
      igst_percentage: line.igstPercentage ?? 0,
      igst_amount: line.igstAmount || 0,
      item_total: line.lineTotal,
      remarks: "",
    })),
  };
}

export const SalesOrderService = {
  async getNextSoNumber(signal?: AbortSignal): Promise<string> {
    const response = await axiosInstance.get(API_ENDPOINTS.SALES.SALES_ORDER.NEXT_SO_NUMBER, { signal });
    return response.data?.data?.so_number || "";
  },

  async list(params: {
    page: number;
    pageSize: number;
    search?: string;
    ordering?: string;
    apiFilters?: Record<string, unknown>;
    signal?: AbortSignal;
  }): Promise<{ items: SalesOrder[]; total: number }> {
    const queryParams = new URLSearchParams();
    queryParams.set("page", String(params.page));
    queryParams.set("page_size", String(params.pageSize));
    if (params.ordering) queryParams.set("ordering", params.ordering);
    if (params.search) queryParams.set("search", params.search);

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.SALES.SALES_ORDER.LIST}?${queryParams.toString()}`,
      {
        filters: params.apiFilters ?? {},
      },
      { signal: params.signal }
    );

    const payload = response.data;
    const items = (payload.data || []).map((row: any) => mapBackendSalesOrder(row));
    return {
      items,
      total: Number(payload.totalRecords ?? items.length),
    };
  },

  async getById(id: string | number, signal?: AbortSignal): Promise<SalesOrder> {
    const response = await axiosInstance.get(API_ENDPOINTS.SALES.SALES_ORDER.DETAILS(String(id)), { signal });
    return mapBackendSalesOrder(response.data?.data || {});
  },

  async create(form: SalesOrderFormValues, options: { soNumber: string; status: string }): Promise<SalesOrder> {
    const customerDetails = form.customerId ? await this.getCustomerDetails(String(form.customerId)) : null;
    const body = buildBackendWriteBody(form, options, customerDetails);
    const response = await axiosInstance.post(API_ENDPOINTS.SALES.SALES_ORDER.CREATE, body);
    return mapBackendSalesOrder(response.data?.data || {});
  },

  async update(id: string | number, form: SalesOrderFormValues, options: { soNumber: string; status: string }): Promise<SalesOrder> {
    const customerDetails = form.customerId ? await this.getCustomerDetails(String(form.customerId)) : null;
    const body = buildBackendWriteBody(form, options, customerDetails);
    const response = await axiosInstance.put(API_ENDPOINTS.SALES.SALES_ORDER.UPDATE(String(id)), body);
    return mapBackendSalesOrder(response.data?.data || {});
  },

  async approveReject(id: string | number, action: "APPROVE" | "REJECT", remarks?: string): Promise<SalesOrder> {
    const response = await axiosInstance.post(API_ENDPOINTS.SALES.SALES_ORDER.APPROVE_REJECT(String(id)), {
      action,
      remarks,
    });
    return mapBackendSalesOrder(response.data?.data || {});
  },

  async cancel(id: string | number, remarks?: string): Promise<SalesOrder> {
    const response = await axiosInstance.post(API_ENDPOINTS.SALES.SALES_ORDER.CANCEL(String(id)), {
      remarks,
    });
    return mapBackendSalesOrder(response.data?.data || {});
  },

  async getFilterDropdown(fieldName: string, activeTab?: string, signal?: AbortSignal): Promise<any[]> {
    const queryParams = new URLSearchParams();
    queryParams.set("field_name", fieldName);
    if (activeTab && activeTab !== "all" && activeTab !== "sales_return") {
      queryParams.set("status", activeTab.toUpperCase());
    }
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.SALES.SALES_ORDER.FILTER}?${queryParams.toString()}`,
      { signal }
    );
    return response.data?.data || [];
  },

  async getCustomersDropdown(): Promise<any[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.CUSTOMER.DROPDOWN);
    return response.data?.data || [];
  },

  async getCustomerDetails(id: string): Promise<any> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.CUSTOMER.VIEW(id));
    return response.data?.data || {};
  },

  async getWarehousesDropdown(): Promise<any[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER_DROPDOWNS.WAREHOUSE);
    return response.data?.data || [];
  },

  async getSalesmenDropdown(): Promise<any[]> {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.USER_MANAGEMENT.USER.DROPDOWN}?role_type=Field User`
    );
    return response.data?.data || [];
  },

  async getProductsDropdown(): Promise<any[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.PRODUCT.DROPDOWN);
    return response.data?.data || [];
  },

  async getProductPricingDropdown(): Promise<any[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.PRICING.DROPDOWN);
    return response.data?.data || [];
  },

  async export(params: {
    search?: string;
    ordering?: string;
    apiFilters?: Record<string, unknown>;
  }): Promise<void> {
    const queryParams = new URLSearchParams();
    if (params.ordering) queryParams.set("ordering", params.ordering);
    if (params.search) queryParams.set("search", params.search);

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.SALES.SALES_ORDER.EXPORT}?${queryParams.toString()}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" }
    );

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales_orders_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async split(
    id: string | number,
    form: SalesOrderFormValues,
    options: { status: string; reason?: string }
  ): Promise<any> {
    const customerDetails = form.customerId ? await this.getCustomerDetails(String(form.customerId)) : null;
    const { billToObj, shipToObj } = resolveBillShipObjects(form, customerDetails);
    const totals = calculateOrderTotalsSummary(form.lineItems, form.additionalExpenses);
    const body = {
      reason: options.reason || "Quantity not available",
      customer_id: form.customerId,
      salesman_id: form.salesManId,
      order_date: form.orderDate ? new Date(form.orderDate).toISOString() : null,
      delivery_date: form.deliveryDate ? new Date(form.deliveryDate).toISOString() : null,
      status: mapFrontendStatusToBackend(options.status),
      remarks: form.remarks || null,
      source_warehouse_id: toUuidOrNull(form.warehouseId),
      bill_to: billToObj,
      ship_to: shipToObj,
      subtotal_amount: totals.netTotal,
      discount_amount: totals.productDiscountTotal + totals.expenseDiscountTotal,
      tax_amount: totals.totalGst,
      grand_total: totals.grandTotal,
      items: form.lineItems.map((line) => ({
        product_id: line.productId,
        base_qty: line.quantity,
        unit_price: line.unitPrice,
        discount_type: line.schemeDiscountType === "Percentage" ? "Percentage" : "Flat",
        discount_percentage: line.schemeDiscountPercent || 0,
        discount_amount: line.discountValue || 0,
        gst_percentage: line.gstPercentage ?? 18,
        gst_amount: line.gstAmount,
        cgst_percentage: line.cgstPercentage ?? 0,
        cgst_amount: line.cgstAmount || 0,
        sgst_percentage: line.sgstPercentage ?? 0,
        sgst_amount: line.sgstAmount || 0,
        igst_percentage: line.igstPercentage ?? 0,
        igst_amount: line.igstAmount || 0,
        item_total: line.lineTotal,
        remarks: "",
      })),
    };

    const response = await axiosInstance.post(API_ENDPOINTS.SALES.SALES_ORDER.SPLIT(String(id)), body);
    return response.data?.data || {};
  },

  async downloadPI(id: string | number): Promise<void> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SALES.SALES_ORDER.DOWNLOAD_PI(String(id)),
      { responseType: "blob" }
    );
    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `proforma-invoice-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async createPackingList(payload: {
    source_type: string;
    source_id: string;
    warehouse_id: string;
    remarks?: string;
    products: Array<{
      source_item_id: string;
      batch_code: string;
      order_qty: number;
      available_inventory_id: string;
    }>;
  }): Promise<any> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.WAREHOUSE.PACKING_LIST.CREATE,
      payload
    );
    return response.data?.data || {};
  },

  async getBatches(productId: string | number, warehouseId: string | number): Promise<any[]> {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.WAREHOUSE.PACKING_LIST.BATCHES}?product_id=${productId}&warehouse_id=${warehouseId}`
    );
    return response.data?.data || [];
  },
};
