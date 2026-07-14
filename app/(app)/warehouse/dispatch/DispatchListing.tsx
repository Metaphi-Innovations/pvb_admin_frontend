"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import {
  Truck, Package, Eye, Pencil, RotateCcw, FileText, CheckCircle2,
  Clock, XCircle, Download, Printer, X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DispatchRecord, DeliveryDetails } from "./types";
import { getDispatches, revertDispatch, getDispatchFilterDropdown, updateDispatchStatus } from "./services";
import {
  DELIVERY_STATUS_BADGE_CONFIG,
  TRANSPORTER_OPTIONS,
} from "./constants";

import Link from "next/link";
import {
  resolveWarehouseOrderType,
  matchesOrderTypeFilter,
  ORDER_TYPE_BADGE_CONFIG,
  formatWarehouseOrderAmount,
  formatDispatchStatusLabel,
  type OrderTypeFilterTab,
} from "@/app/(app)/warehouse/lib/order-document-type";
import { getSampleOrderByDocumentNo } from "@/app/(app)/sales/sample-order/packing-sync";
import { downloadProformaInvoice } from "@/app/(app)/sales/sample-order/pi-document";

interface DispatchListingProps {
  selectedWarehouse: string;
}

export function DispatchListing({ selectedWarehouse }: DispatchListingProps) {
  const router = useRouter();

  // Table state for Dispatches
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [subTab, setSubTab] = useState<"sales_order" | "sample_order" | "stock_transfer" | "purchase_return">("sales_order");

  // Modal states
  const [revertTarget, setRevertTarget] = useState<any>(null);
  const [challanTarget, setChallanTarget] = useState<any>(null);
  const [deliveryTarget, setDeliveryTarget] = useState<any>(null);
  const [closeTarget, setCloseTarget] = useState<any>(null);
  const [deliveryForm, setDeliveryForm] = useState<DeliveryDetails>({ deliveryDate: "", receiverName: "", remarks: "" });

  useEffect(() => {
    setPage(1);
  }, [subTab]);

  const [data, setData] = useState<DispatchRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);

  const [customerOptions, setCustomerOptions] = useState<{label: string, value: string}[]>([]);
  const [statusOptions, setStatusOptions] = useState<{label: string, value: string}[]>([]);

  const [dispatchNoOptions, setDispatchNoOptions] = useState<{label: string, value: string}[]>([]);
  const [sourceDocOptions, setSourceDocOptions] = useState<{label: string, value: string}[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<{label: string, value: string}[]>([]);
  const [driverOptions, setDriverOptions] = useState<{label: string, value: string}[]>([]);
  const [sourceWarehouseOptions, setSourceWarehouseOptions] = useState<{label: string, value: string}[]>([]);

  const loadedFiltersRef = useRef<Set<string>>(new Set());

  const FILTER_FIELD_MAP: Record<string, { field: string; setter: (opts: { label: string; value: string }[]) => void }> = useMemo(() => ({
    "dispatch_number": { field: "dispatch_number", setter: setDispatchNoOptions },
    "source_document_no": { field: "source_document_no", setter: setSourceDocOptions },
    "customer.customer_name": { field: "customer__customer_name", setter: setCustomerOptions },
    "source_warehouse_name": { field: "warehouse__warehouse_name", setter: setSourceWarehouseOptions },
    "vehicleNumber": { field: "vehicle_number", setter: setVehicleOptions },
    "driverName": { field: "transporter", setter: setDriverOptions },
    "status": { field: "status", setter: setStatusOptions },
  }), []);

  const handleOpenFilter = useCallback(async (columnKey: string) => {
    if (loadedFiltersRef.current.has(columnKey)) return;
    const mapping = FILTER_FIELD_MAP[columnKey];
    if (!mapping) return;
    loadedFiltersRef.current.add(columnKey);
    try {
      let apiSourceType;
      if (subTab === "sales_order") apiSourceType = "normal_sales";
      else if (subTab === "sample_order") apiSourceType = "sample_order";
      else if (subTab === "stock_transfer") apiSourceType = "stock_transfer";
      else if (subTab === "purchase_return") apiSourceType = "purchase_return";

      const res = await getDispatchFilterDropdown(mapping.field, apiSourceType);
      console.log(`Filter dropdown response for ${columnKey} (${mapping.field}):`, res);
      mapping.setter(res.map((x: any) => ({ label: x[mapping.field] || x.status || x.customer__customer_name, value: x[mapping.field] || x.status || x.customer__customer_name })));
    } catch (err) {
      console.error(`Failed to fetch filter options for ${columnKey}`, err);
      loadedFiltersRef.current.delete(columnKey);
    }
  }, [FILTER_FIELD_MAP, subTab]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const payload: any = {
        page,
        page_size: pageSize,
      };
      
      if (sort.key && sort.direction !== "none") {
        payload.ordering = sort.direction === "desc" ? `-${sort.key}` : sort.key;
      }
      
      if (filters.search) {
        payload.search = filters.search;
      }
      
      const queryFilters: any = {};
      if (selectedWarehouse !== "All") {
        queryFilters.warehouse_id = selectedWarehouse;
      }
      
      if (subTab === "sales_order") queryFilters.source_type = "normal_sales";
      else if (subTab === "sample_order") queryFilters.source_type = "sample_order";
      else if (subTab === "stock_transfer") queryFilters.source_type = "stock_transfer";
      else if (subTab === "purchase_return") queryFilters.source_type = "purchase_return";

      Object.entries(filters).forEach(([k, v]) => {
        if (k === "search") return;
        if (v !== undefined && v !== "") {
          if (typeof v === "object" && v !== null && ("fromDate" in v || "toDate" in v)) {
            queryFilters.range = queryFilters.range || {};
            queryFilters.range[k] = {
              from: (v as any).fromDate,
              to: (v as any).toDate,
            };
          } else {
            queryFilters[k] = v;
          }
        }
      });
      
      if (Object.keys(queryFilters).length > 0) {
        payload.filters = queryFilters;
      }

      const res = await getDispatches(payload);
      setData(res?.data || []);
      setTotalRecords(res?.totalRecords || res?.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sort, filters, selectedWarehouse, subTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const partyHeader =
    subTab === "sample_order"
      ? "Issued To Employee"
      : subTab === "stock_transfer"
        ? "Target Warehouse"
        : subTab === "purchase_return"
          ? "Supplier"
          : "Customer";

  const orderNoHeader = subTab === "purchase_return" ? "Return No" : "Order No";

  // Columns
  const salesOrderColumns = useMemo(() => {
    return [

      {
        key: "dispatch_number",
        header: "Dispatch No",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: dispatchNoOptions,
        width: "135px",
        render: (_: unknown, row: DispatchRecord) => (
          <Link
            href={`/warehouse/dispatch/view/${row.id}`}
            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
          >
            {row.dispatch_no || row.dispatchNumber || row.dispatch_number}
          </Link>
        ),
      },
      {
        key: "source_document_no",
        header: orderNoHeader,
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: sourceDocOptions,
        width: "140px",
        render: (_: unknown, row: DispatchRecord) => (
          <span className="font-mono text-xs font-semibold">
            {row.source_document_no || row.salesOrderNumber || (row.packing_done as any)?.packing_done_no || row.source_id}
          </span>
        ),
      },
      {
        key: "customer.customer_name",
        header: partyHeader,
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: customerOptions,
        width: "160px",
        render: (_: unknown, row: DispatchRecord) => {
          const type = resolveWarehouseOrderType({
            sourceDocumentType: row.sourceDocumentType,
            source_type: row.source_type,
            salesOrderNo: row.salesOrderNumber,
            source_document_no: row.source_document_no,
          });
          const label = row.customer_name || (row.customer as any)?.customer_name || row.customer || "Unknown";
          return (
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">{label}</span>
              {type === "purchase_return" && row.supplierCode && (
                <span className="text-[11px] text-muted-foreground font-mono">{row.supplierCode}</span>
              )}
            </div>
          );
        },
      },
      {
        key: "source_warehouse_name",
        header: "Source Warehouse",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: sourceWarehouseOptions,
        width: "150px",
        render: (_: unknown, row: DispatchRecord) => (
          <span className="text-xs text-foreground font-medium">
            {row.source_warehouse_name || row.sourceWarehouse || (row.warehouse as any)?.warehouse_name || row.warehouse}
          </span>
        ),
      },
      {
        key: "orderAmount",
        header: "Amount",
        align: "right",
        width: "90px",
        render: (_: unknown, row: DispatchRecord) => {
          const type = resolveWarehouseOrderType({
            sourceDocumentType: row.sourceDocumentType,
            source_type: row.source_type,
            salesOrderNo: row.salesOrderNumber,
            source_document_no: row.source_document_no,
          });
          if (type === "sample_order") {
            return (
              <span className="font-mono text-xs tabular-nums">
                {formatWarehouseOrderAmount(type, 0)}
              </span>
            );
          }
          return <span className="text-xs text-muted-foreground">—</span>;
        },
      },
      {
        key: "vehicleNumber",
        header: "Vehicle No",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: vehicleOptions,
        width: "120px",
        render: (_: unknown, row: DispatchRecord) => <span className="font-mono text-xs">{(row.vehicleNumber || row.vehicle_number || "—") as string}</span>,
      },
      { 
        key: "driverName", 
        header: "Driver / Transporter", 
        sortable: true, 
        filterable: true, 
        filterType: "dropdown",
        filterOptions: driverOptions,
        render: (_: unknown, row: DispatchRecord) => <span className="text-xs text-muted-foreground">{(row.driverName || row.transporter || "—") as string}</span>
      },
      {
        key: "dispatch_date",
        header: "Dispatch Date",
        sortable: true,
        filterable: true,
        filterType: "date",
        width: "135px",
        render: (_: unknown, row: DispatchRecord) => {
          const dateStr = row.dispatch_date || row.dispatchDate;
          if (!dateStr) return <span className="text-xs">—</span>;
          const date = new Date(dateStr);
          const formatted = date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          });
          return <span className="text-xs">{formatted}</span>;
        }
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: statusOptions,
        width: "155px",
        render: (_: unknown, row: DispatchRecord) => {
          const type = resolveWarehouseOrderType({
            sourceDocumentType: row.sourceDocumentType,
            source_type: row.source_type,
            salesOrderNo: row.salesOrderNumber,
            source_document_no: row.source_document_no,
          });
          const rawStatus = row.dispatch_status || row.status || row.deliveryStatus;
          const label = formatDispatchStatusLabel(type, rawStatus);
          const cfg = DELIVERY_STATUS_BADGE_CONFIG[label] || {
            bg: "bg-slate-100 text-slate-600 border-slate-200",
            label,
          };
          return (
            <span
              className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}
            >
              {cfg.label}
            </span>
          );
        },
      },
    ] as ColumnConfig<DispatchRecord>[];
  }, [partyHeader, orderNoHeader, dispatchNoOptions, sourceDocOptions, customerOptions, sourceWarehouseOptions, vehicleOptions, driverOptions, statusOptions]);

  const columns = salesOrderColumns;

  // Actions
  const actions: ActionItemConfig<DispatchRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/dispatch/view/${row.id}`),
    },
    {
      label: "Edit",
      action: "edit",
      icon: Pencil,
      onClick: (row) => router.push(`/warehouse/dispatch/edit/${row.id}`),
      hide: (row) => row.status === "DELIVERED" || row.status === "CLOSED" || row.status === "CANCELLED",
    },
    {
      label: "Revert",
      action: "revert",
      icon: RotateCcw,
      onClick: (row) => setRevertTarget(row),
      hide: (row) => row.status === "DELIVERED" || row.status === "CLOSED" || row.status === "CANCELLED",
    },
    {
      label: "Download Challan",
      action: "challan",
      icon: FileText,
      onClick: (row) => setChallanTarget(row),
      hide: (row) =>
        resolveWarehouseOrderType({
          sourceDocumentType: row.sourceDocumentType,
          source_type: row.source_type,
          salesOrderNo: row.salesOrderNumber,
          source_document_no: row.source_document_no,
        }) === "sample_order",
    },
    {
      label: "Sample Issue Note",
      action: "sample_issue_note",
      icon: FileText,
      onClick: (row) => {
        const docNo = row.source_document_no || row.salesOrderNumber;
        const order = getSampleOrderByDocumentNo(docNo);
        if (order) downloadProformaInvoice(order);
      },
      hide: (row) =>
        resolveWarehouseOrderType({
          sourceDocumentType: row.sourceDocumentType,
          source_type: row.source_type,
          salesOrderNo: row.salesOrderNumber,
          source_document_no: row.source_document_no,
        }) !== "sample_order",
    },
    {
      label: "Delivery Done",
      action: "delivery_done",
      icon: CheckCircle2,
      onClick: (row) => {
        setDeliveryTarget(row);
        setDeliveryForm({ deliveryDate: new Date().toISOString().split("T")[0], receiverName: "", remarks: "" });
      },
      hide: (row) => row.status === "DELIVERED" || row.status === "CLOSED" || row.status === "CANCELLED",
    },
    {
      label: "Close Dispatch",
      action: "close_dispatch",
      icon: X,
      onClick: (row) => setCloseTarget(row),
      hide: (row) => row.status === "DELIVERED" || row.status === "CLOSED" || row.status === "CANCELLED",
    },
  ];

  const handleRevertConfirm = async () => {
    if (!revertTarget) return;
    try {
      await revertDispatch(revertTarget.id);
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setRevertTarget(null);
    }
  };

  const handleDeliveryConfirm = async () => {
    if (!deliveryTarget) return;
    try {
      await updateDispatchStatus(deliveryTarget.id, "DELIVERED");
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setDeliveryTarget(null);
    }
  };

  const handleCloseConfirm = async () => {
    if (!closeTarget) return;
    try {
      await updateDispatchStatus(closeTarget.id, "CLOSED");
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setCloseTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={(val: any) => setSubTab(val)} className="w-full">
        <TabsList>
          <TabsTrigger value="sales_order" className="text-xs">Sales Order</TabsTrigger>
          <TabsTrigger value="sample_order" className="text-xs">Sample Order</TabsTrigger>
          <TabsTrigger value="stock_transfer" className="text-xs">Stock Transfer</TabsTrigger>
          <TabsTrigger value="purchase_return" className="text-xs">Purchase Return</TabsTrigger>
        </TabsList>
      </Tabs>

      <MasterListing<DispatchRecord>
        columns={columns}
        data={data}
        loading={loading}
        totalRecords={totalRecords}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        onFilterChange={setFilters}
        actions={actions}
        onAdd={() => {
          const query = subTab === "purchase_return" ? "?sourceType=purchase_return" : "";
          router.push(`/warehouse/dispatch/create${query}`);
        }}
        emptyMessage="dispatch records"
        searchPlaceholder="Search dispatches..."
        onOpenFilter={handleOpenFilter}
      />

      {/* ── REVERT CONFIRMATION DIALOG ── */}
      <Dialog open={!!revertTarget} onOpenChange={() => setRevertTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-amber-500" />
              </div>
              Revert Dispatch?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to revert{" "}
            <span className="font-semibold text-foreground">{revertTarget?.dispatchNumber}</span>{" "}
            back to Packing? This action cannot be undone.
          </p>
          <DialogFooter className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRevertTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={handleRevertConfirm}>
              Confirm Revert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CHALLAN PREVIEW DIALOG ── */}
      <Dialog open={!!challanTarget} onOpenChange={() => setChallanTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center">
                <FileText className="w-4 h-4 text-brand-600" />
              </div>
              Delivery Challan Preview
            </DialogTitle>
          </DialogHeader>
          {challanTarget && (
            <div className="space-y-5">
              {/* Challan Header */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-brand-600 px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">DELIVERY CHALLAN</p>
                    <p className="text-brand-100 text-xs">{challanTarget.dispatch_number || challanTarget.dispatch_no || challanTarget.dispatchNumber}</p>
                  </div>
                  <Truck className="w-8 h-8 text-brand-200" />
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2.5">
                    <div><p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Sales Order No</p><p className="font-bold">{challanTarget.source_document_no || challanTarget.packing_done?.packing_done_no || "—"}</p></div>
                    <div><p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Customer</p><p className="font-bold">{((challanTarget as any).customer)?.customer_name || challanTarget.customer_name || "--"}</p></div>
                    <div><p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Dispatch Date</p><p className="font-bold">{challanTarget.dispatch_date ? new Date(challanTarget.dispatch_date).toLocaleDateString() : new Date(challanTarget.created_at).toLocaleDateString()}</p></div>
                  </div>
                  <div className="space-y-2.5">
                    <div><p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Vehicle No</p><p className="font-mono font-bold">{challanTarget.vehicle_number || "—"}</p></div>
                    <div><p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Driver Name</p><p className="font-bold">{challanTarget.driver_name || "—"}</p></div>
                    <div><p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Transporter</p><p className="font-bold">{challanTarget.transporter || "—"}</p></div>
                  </div>
                </div>
              </div>
              {/* Product Table */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-border">
                  <p className="text-xs font-bold text-foreground">Product Details</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 px-4 text-left text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Product</th>
                      <th className="py-2 px-4 text-left text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">SKU</th>
                      <th className="py-2 px-4 text-center text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Dispatch Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(challanTarget.items || challanTarget.products || []).map((p: any, i: number) => {
                      const packSize = Number(p.product?.unit_per_packing || p.product?.conversion_rate || 1);
                      const baseQty = Number(p.dispatched_base_qty || p.dispatchQty || 0);
                      const cases = Math.floor(baseQty / packSize);
                      return (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5 px-4 font-bold">{p.product?.product_name || p.product || "—"}</td>
                          <td className="py-2.5 px-4 font-mono text-brand-700">{p.product?.product_code || p.sku || "—"}</td>
                          <td className="py-2.5 px-4 text-center font-bold">{cases > 0 ? cases : baseQty} {cases > 0 && packSize > 1 ? "Cases" : "Units"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 justify-end pt-2 border-t">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setChallanTarget(null)}>
              <X className="w-3 h-3" /> Close
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Printer className="w-3 h-3" /> Print
            </Button>
            <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1">
              <Download className="w-3 h-3" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELIVERY DONE DIALOG ── */}
      <Dialog open={!!deliveryTarget} onOpenChange={() => setDeliveryTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              Mark as Delivered
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Mark{" "}
            <span className="font-semibold text-foreground">{deliveryTarget?.dispatchNumber}</span>{" "}
            as delivered. Please fill in the delivery confirmation details.
          </p>
          <div className="space-y-3 py-1">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Delivery Date *</p>
              <Input
                type="date"
                value={deliveryForm.deliveryDate}
                onChange={e => setDeliveryForm(f => ({ ...f, deliveryDate: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Receiver Name *</p>
              <Input
                value={deliveryForm.receiverName}
                onChange={e => setDeliveryForm(f => ({ ...f, receiverName: e.target.value }))}
                className="h-8 text-xs"
                placeholder="Enter receiver name"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Remarks</p>
              <textarea
                value={deliveryForm.remarks}
                onChange={e => setDeliveryForm(f => ({ ...f, remarks: e.target.value }))}
                className="w-full h-20 text-xs border border-input rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Optional remarks..."
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDeliveryTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              onClick={handleDeliveryConfirm}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CLOSE DISPATCH DIALOG ── */}
      <Dialog open={!!closeTarget} onOpenChange={() => setCloseTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
                <X className="w-4 h-4 text-red-500" />
              </div>
              Close Dispatch?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to close{" "}
            <span className="font-semibold text-foreground">{closeTarget?.dispatchNumber || closeTarget?.dispatch_no}</span>? 
            You will no longer be able to edit or revert it.
          </p>
          <DialogFooter className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCloseTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={handleCloseConfirm}>
              Confirm Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
