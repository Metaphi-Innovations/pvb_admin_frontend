import type { FilterState, SortState } from "@/components/listing/types";
import { exportRowsToExcel } from "@/lib/warehouse/export-excel";
import { getQcSourceType } from "@/lib/warehouse/grn-source";
import { QcService } from "@/services/qc.service";
import type { QcRecord } from "../types";
import type { QcStatusTab } from "./qc-list-nav";

type QcBackendSource =
  | "PURCHASE_ORDER"
  | "SALES_RETURN"
  | "SAMPLE_RETURN"
  | "STOCK_TRANSFER";

type QcListSource = "purchase" | "sales-return" | "sample-return" | "stock-transfer";

const EXPORT_PAGE_SIZE = 100;

const SOURCE_TYPE_MAP: Record<QcListSource, QcBackendSource> = {
  purchase: "PURCHASE_ORDER",
  "sales-return": "SALES_RETURN",
  "sample-return": "SAMPLE_RETURN",
  "stock-transfer": "STOCK_TRANSFER",
};

const FRONTEND_SOURCE_MAP: Record<QcListSource, string> = {
  purchase: "purchase",
  "sales-return": "sales_return",
  "sample-return": "sample_return",
  "stock-transfer": "stock_transfer",
};

function firstFilterValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  if (value == null) return "";
  return String(value).trim();
}

function buildQcApiFilters(
  source: QcListSource,
  statusTab: QcStatusTab,
  filters: FilterState,
): Record<string, unknown> {
  const api: Record<string, unknown> = {
    source_type: SOURCE_TYPE_MAP[source],
  };
  const pending = statusTab === "pending";

  const qcNo = firstFilterValue(filters.qcNo);
  if (qcNo) api.qcNumber = qcNo;

  const grnNo = firstFilterValue(filters.grnNo);
  if (grnNo) {
    if (pending) api.grnNumber = grnNo;
    else api.grn = { ...(api.grn as object), grnNumber: grnNo };
  }

  if (source === "purchase") {
    const poNumber = firstFilterValue(filters.poNumber);
    if (poNumber) api.poNumber = poNumber;
    const vendorName = firstFilterValue(filters.vendorName);
    if (vendorName) {
      if (pending) {
        api.supplier = { supplier_name: vendorName };
      } else {
        api.grn = {
          ...(api.grn as object),
          supplier: { supplier_name: vendorName },
        };
      }
    }
  } else if (source === "sales-return") {
    const returnNo = firstFilterValue(filters.poNumber) || firstFilterValue(filters.salesReturnNo);
    if (returnNo) {
      if (pending) api.sales_return_no = returnNo;
      else api.poNumber = returnNo;
    }
    const customer = firstFilterValue(filters.vendorName);
    if (customer) {
      if (pending) api.customer_name = customer;
      else api.vendorName = customer;
    }
  } else if (source === "sample-return") {
    const returnNo = firstFilterValue(filters.poNumber) || firstFilterValue(filters.sampleReturnNo);
    if (returnNo) {
      if (pending) api.sample_return_no = returnNo;
      else api.poNumber = returnNo;
    }
    const customer = firstFilterValue(filters.vendorName);
    if (customer) {
      if (pending) api.customer_name = customer;
      else api.vendorName = customer;
    }
  } else {
    const stNo = firstFilterValue(filters.stockTransferNo);
    if (stNo) {
      if (pending) api.stock_transfer_no = stNo;
      else api.poNumber = stNo;
    }
    const fromWh = firstFilterValue(filters.fromWarehouse);
    if (fromWh) api.from_warehouse = fromWh;
    const toWh = firstFilterValue(filters.toWarehouse);
    if (toWh) {
      if (pending) api.warehouse = { warehouse_name: toWh };
      else {
        api.grn = {
          ...(api.grn as object),
          warehouse: { warehouse_name: toWh },
        };
      }
    }
  }

  const warehouse = firstFilterValue(filters.warehouse);
  if (warehouse && source !== "stock-transfer") {
    if (pending) {
      api.warehouse = { warehouse_name: warehouse };
    } else {
      api.grn = {
        ...(api.grn as object),
        warehouse: { warehouse_name: warehouse },
      };
    }
  }

  const inspectionDate = filters.inspectionDate;
  if (inspectionDate && typeof inspectionDate === "object" && !Array.isArray(inspectionDate)) {
    const range = inspectionDate as { fromDate?: string; toDate?: string };
    if (range.fromDate || range.toDate) {
      api.range = {
        qcDate: {
          from: range.fromDate || undefined,
          to: range.toDate || undefined,
        },
      };
    }
  }

  return api;
}

function buildQcOrdering(
  source: QcListSource,
  statusTab: QcStatusTab,
  sort: SortState,
): string | undefined {
  if (!sort.key || sort.direction === "none") return undefined;
  const pending = statusTab === "pending";
  let baseKey = sort.key;

  if (source === "stock-transfer") {
    const mapping = pending
      ? {
          grnNo: "grnNumber",
          stockTransferNo: "stock_transfer_no",
          fromWarehouse: "from_warehouse",
          toWarehouse: "warehouse__warehouse_name",
          warehouse: "warehouse__warehouse_name",
          itemCount: "item_count",
        }
      : {
          qcNo: "qcNumber",
          grnNo: "grn__grnNumber",
          stockTransferNo: "poNumber",
          fromWarehouse: "vendorName",
          toWarehouse: "grn__warehouse__warehouse_name",
          warehouse: "grn__warehouse__warehouse_name",
          inspectionDate: "qcDate",
          itemCount: "item_count",
        };
    baseKey = mapping[sort.key as keyof typeof mapping] || sort.key;
  } else if (pending) {
    const mapping: Record<string, string> = {
      grnNo: "grnNumber",
      poNumber:
        source === "sales-return"
          ? "sales_return_no"
          : source === "sample-return"
            ? "sample_return_no"
            : "po_no",
      vendorName:
        source === "purchase" ? "supplier__supplier_name" : "customer_name",
      warehouse: "warehouse__warehouse_name",
      itemCount: "item_count",
    };
    baseKey = mapping[sort.key] || sort.key;
  } else {
    const mapping: Record<string, string> = {
      qcNo: "qcNumber",
      grnNo: "grn__grnNumber",
      poNumber: "poNumber",
      inspectionDate: "qcDate",
      vendorName: "vendorName",
      warehouse: "grn__warehouse__warehouse_name",
      itemCount: "item_count",
    };
    baseKey = mapping[sort.key] || sort.key;
  }

  return sort.direction === "desc" ? `-${baseKey}` : baseKey;
}

async function fetchAllQcRecords(opts: {
  source: QcListSource;
  statusTab: QcStatusTab;
  filters: FilterState;
  sort: SortState;
}): Promise<QcRecord[]> {
  const apiFilters = buildQcApiFilters(opts.source, opts.statusTab, opts.filters);
  const ordering = buildQcOrdering(opts.source, opts.statusTab, opts.sort);
  const search = String(opts.filters.search || "").trim() || undefined;
  const fetchMethod =
    opts.statusTab === "pending" ? QcService.listPending : QcService.list;
  const frontendSource = FRONTEND_SOURCE_MAP[opts.source];

  const first = await fetchMethod({
    page: 1,
    page_size: EXPORT_PAGE_SIZE,
    search,
    ordering,
    filters: apiFilters,
  });

  const all = (first.data || []).filter(
    (q) => getQcSourceType(q) === frontendSource,
  );

  const total = first.totalRecords || all.length;
  const totalPages = Math.max(1, Math.ceil(total / EXPORT_PAGE_SIZE));
  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchMethod({
      page,
      page_size: EXPORT_PAGE_SIZE,
      search,
      ordering,
      filters: apiFilters,
    });
    all.push(
      ...(next.data || []).filter((q) => getQcSourceType(q) === frontendSource),
    );
  }
  return all;
}

function statusLabel(status: QcRecord["status"]): string {
  return status === "completed" ? "Completed" : "Pending QC";
}

export function mapPurchaseQcExcelRow(row: QcRecord) {
  return {
    "QC No.": row.qcNo || "",
    "GRN No.": row.grnNo || "",
    "PO No.": row.poNumber || "",
    Supplier: row.vendorName || "",
    Warehouse: row.warehouse || "",
    "Inspection Date": row.inspectionDate?.trim() || "",
    Items: row.itemCount ?? row.items?.length ?? 0,
    Status: statusLabel(row.status),
  };
}

export function mapSalesReturnQcExcelRow(row: QcRecord) {
  return {
    "QC No.": row.qcNo || "",
    "GRN No.": row.grnNo || "",
    "Sales Return No.": row.poNumber || "",
    Customer: row.vendorName || "",
    Warehouse: row.warehouse || "",
    "Inspection Date": row.inspectionDate?.trim() || "",
    Items: row.itemCount ?? row.items?.length ?? 0,
    Status: statusLabel(row.status),
  };
}

export function mapSampleReturnQcExcelRow(row: QcRecord) {
  return {
    "QC No.": row.qcNo || "",
    "GRN No.": row.grnNo || "",
    "Sample Return No.": row.poNumber || "",
    Customer: row.vendorName || "",
    Warehouse: row.warehouse || "",
    "Inspection Date": row.inspectionDate?.trim() || "",
    Items: row.itemCount ?? row.items?.length ?? 0,
    Status: statusLabel(row.status),
  };
}

export function mapStockTransferQcExcelRow(row: QcRecord) {
  return {
    "QC No.": row.qcNo || "",
    "Stock Transfer No.": row.stockTransferNo || row.poNumber || "",
    "GRN No.": row.grnNo || "",
    "From Warehouse": row.fromWarehouse || row.vendorName || "",
    "To Warehouse": row.toWarehouse || row.warehouse || "",
    "Inspection Date": row.inspectionDate?.trim() || "",
    Items: row.itemCount ?? row.items?.length ?? 0,
    "QC Status": statusLabel(row.status),
  };
}

export async function exportQcListingExcel(opts: {
  source: QcListSource;
  statusTab: QcStatusTab;
  filters: FilterState;
  sort: SortState;
}): Promise<void> {
  const items = await fetchAllQcRecords(opts);
  const statusSuffix = opts.statusTab === "pending" ? "Pending" : "Completed";

  if (opts.source === "purchase") {
    await exportRowsToExcel(items.map(mapPurchaseQcExcelRow), {
      sheetName: `QC Purchase ${statusSuffix}`,
      filePrefix: `QC_Purchase_${statusSuffix}`,
    });
    return;
  }
  if (opts.source === "sales-return") {
    await exportRowsToExcel(items.map(mapSalesReturnQcExcelRow), {
      sheetName: `QC Sales Return ${statusSuffix}`,
      filePrefix: `QC_Sales_Return_${statusSuffix}`,
    });
    return;
  }
  if (opts.source === "sample-return") {
    await exportRowsToExcel(items.map(mapSampleReturnQcExcelRow), {
      sheetName: `QC Sample Return ${statusSuffix}`,
      filePrefix: `QC_Sample_Return_${statusSuffix}`,
    });
    return;
  }
  await exportRowsToExcel(items.map(mapStockTransferQcExcelRow), {
    sheetName: `QC Stock Transfer ${statusSuffix}`,
    filePrefix: `QC_Stock_Transfer_${statusSuffix}`,
  });
}
