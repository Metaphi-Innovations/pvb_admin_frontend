"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import { markAsDelivered, revertDispatch } from "./services";
import {
  CUSTOMER_OPTIONS,
  DELIVERY_STATUS_OPTIONS,
  DELIVERY_STATUS_BADGE_CONFIG,
  WAREHOUSE_OPTIONS,
} from "./constants";

import Link from "next/link";

interface DispatchListingProps {
  rawDispatches: DispatchRecord[];
  reload: () => void;
}

export function DispatchListing({ rawDispatches, reload }: DispatchListingProps) {
  const router = useRouter();

  // Table state for Dispatches
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [subTab, setSubTab] = useState<"sales_order" | "sample_order" | "stock_transfer">("sales_order");

  // Modal states
  const [revertTarget, setRevertTarget] = useState<DispatchRecord | null>(null);
  const [challanTarget, setChallanTarget] = useState<DispatchRecord | null>(null);
  const [deliveryTarget, setDeliveryTarget] = useState<DispatchRecord | null>(null);
  const [deliveryForm, setDeliveryForm] = useState<DeliveryDetails>({ deliveryDate: "", receiverName: "", remarks: "" });

  useEffect(() => {
    setPage(1);
  }, [subTab]);

  const filteredDispatches = useMemo(() => {
    return rawDispatches.filter(d => {
      const type = d.source_type || (d.sourceDocumentType === "Stock Transfer" ? "stock_transfer" : d.sourceDocumentType === "Sample Order" ? "sample_order" : "sales_order");
      return type === subTab;
    });
  }, [rawDispatches, subTab]);

  // Filtered & Sorted records
  const processed = useMemo(() => {
    let result = [...filteredDispatches];
    Object.keys(filters).forEach(key => {
      const val = filters[key];
      if (!val) return;
      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(d => {
          const dispNo = d.dispatch_no || d.dispatchNumber || "";
          const docNo = d.source_document_no || d.salesOrderNumber || "";
          const cust = d.customer_name || d.customer || "";
          const veh = d.vehicleNumber || "";
          const drv = d.driverName || "";
          return (
            dispNo.toLowerCase().includes(q) ||
            docNo.toLowerCase().includes(q) ||
            cust.toLowerCase().includes(q) ||
            veh.toLowerCase().includes(q) ||
            drv.toLowerCase().includes(q)
          );
        });
      } else if (key === "dispatch_no" || key === "dispatchNumber" || key === "source_document_no" || key === "salesOrderNumber" || key === "vehicleNumber" || key === "driverName") {
        const q = (val as string).toLowerCase();
        result = result.filter(d => {
          const rawVal = d[key as keyof DispatchRecord] || (key === "dispatch_no" ? d.dispatchNumber : d.salesOrderNumber);
          return String(rawVal || "").toLowerCase().includes(q);
        });
      } else if (key === "customer_name" || key === "customer" || key === "dispatch_status" || key === "deliveryStatus") {
        const selected = val as string[];
        result = result.filter(d => {
          const rawVal = d[key as keyof DispatchRecord] || (key === "customer_name" ? d.customer : d.deliveryStatus);
          return selected.includes(String(rawVal || ""));
        });
      } else if (key === "dispatch_date" || key === "dispatchDate") {
        const range = val as { fromDate: string; toDate: string };
        result = result.filter(d => {
          const dateVal = d.dispatch_date || d.dispatchDate;
          if (range.fromDate && dateVal < range.fromDate) return false;
          if (range.toDate && dateVal > range.toDate) return false;
          return true;
        });
      }
    });
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const valA = String(a[sort.key as keyof DispatchRecord] || "");
        const valB = String(b[sort.key as keyof DispatchRecord] || "");
        return sort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [filteredDispatches, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, page, pageSize]);

  // Columns
  const salesOrderColumns = useMemo(() => {
    return [
      {
        key: "dispatch_no",
        header: "Dispatch No",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "135px",
        render: (val: any, row: DispatchRecord) => (
          <Link
            href={`/warehouse/dispatch/view/${row.id}`}
            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
          >
            {row.dispatch_no || row.dispatchNumber}
          </Link>
        )
      },
      {
        key: "source_document_no",
        header: "Sales Order No",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "140px",
        render: (val: any, row: DispatchRecord) => <span className="font-mono text-xs font-semibold">{row.source_document_no || row.salesOrderNumber}</span>
      },
      {
        key: "customer_name",
        header: "Customer",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: CUSTOMER_OPTIONS,
        width: "160px",
        render: (val: any, row: DispatchRecord) => <span className="text-xs font-bold text-foreground">{row.customer_name || row.customer}</span>
      },
      {
        key: "vehicleNumber",
        header: "Vehicle No",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "120px",
        render: (val: any) => <span className="font-mono text-xs">{val}</span>
      },
      { key: "driverName", header: "Driver Name", sortable: true, filterable: true, filterType: "text" },
      { key: "transporterName", header: "Transporter", sortable: true },
      {
        key: "dispatch_date",
        header: "Dispatch Date",
        sortable: true,
        filterable: true,
        filterType: "date",
        width: "135px",
        render: (val: any, row: DispatchRecord) => <span className="text-xs">{row.dispatch_date || row.dispatchDate}</span>
      },
      {
        key: "dispatch_status",
        header: "Dispatch Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: DELIVERY_STATUS_OPTIONS,
        width: "155px",
        render: (val: any, row: DispatchRecord) => {
          const status = row.dispatch_status || row.deliveryStatus;
          const cfg = DELIVERY_STATUS_BADGE_CONFIG[status] || { bg: "bg-slate-100 text-slate-600 border-slate-200", label: status };
          return (
            <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
              {cfg.label}
            </span>
          );
        },
      },
    ] as ColumnConfig<DispatchRecord>[];
  }, []);

  const sampleOrderColumns = useMemo(() => {
    return [
      {
        key: "dispatch_no",
        header: "Dispatch No",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "135px",
        render: (val: any, row: DispatchRecord) => (
          <Link
            href={`/warehouse/dispatch/view/${row.id}`}
            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
          >
            {row.dispatch_no || row.dispatchNumber}
          </Link>
        )
      },
      {
        key: "source_document_no",
        header: "Sample Order No",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "140px",
        render: (val: any, row: DispatchRecord) => <span className="font-mono text-xs font-semibold">{row.source_document_no || row.salesOrderNumber}</span>
      },
      {
        key: "customer_name",
        header: "Customer",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: CUSTOMER_OPTIONS,
        width: "160px",
        render: (val: any, row: DispatchRecord) => <span className="text-xs font-bold text-foreground">{row.customer_name || row.customer}</span>
      },
      {
        key: "vehicleNumber",
        header: "Vehicle No",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "120px",
        render: (val: any) => <span className="font-mono text-xs">{val}</span>
      },
      { key: "driverName", header: "Driver Name", sortable: true, filterable: true, filterType: "text" },
      { key: "transporterName", header: "Transporter", sortable: true },
      {
        key: "dispatch_date",
        header: "Dispatch Date",
        sortable: true,
        filterable: true,
        filterType: "date",
        width: "135px",
        render: (val: any, row: DispatchRecord) => <span className="text-xs">{row.dispatch_date || row.dispatchDate}</span>
      },
      {
        key: "dispatch_status",
        header: "Dispatch Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: DELIVERY_STATUS_OPTIONS,
        width: "155px",
        render: (val: any, row: DispatchRecord) => {
          const status = row.dispatch_status || row.deliveryStatus;
          const cfg = DELIVERY_STATUS_BADGE_CONFIG[status] || { bg: "bg-slate-100 text-slate-600 border-slate-200", label: status };
          return (
            <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
              {cfg.label}
            </span>
          );
        },
      },
    ] as ColumnConfig<DispatchRecord>[];
  }, []);

  const stockTransferColumns = useMemo(() => {
    return [
      {
        key: "dispatch_no",
        header: "Dispatch No.",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "135px",
        render: (val: any, row: DispatchRecord) => (
          <Link
            href={`/warehouse/dispatch/view/${row.id}`}
            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
          >
            {row.dispatch_no || row.dispatchNumber}
          </Link>
        )
      },
      {
        key: "source_document_no",
        header: "Stock Transfer No",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "140px",
        render: (val: any, row: DispatchRecord) => <span className="font-mono text-xs font-semibold">{row.source_document_no || row.salesOrderNumber}</span>
      },
      {
        key: "dispatch_date",
        header: "Dispatch Date",
        sortable: true,
        filterable: true,
        filterType: "date",
        width: "135px",
        render: (val: any, row: DispatchRecord) => <span className="text-xs">{row.dispatch_date || row.dispatchDate}</span>
      },
      {
        key: "source_warehouse_name",
        header: "Source Warehouse",
        sortable: true,
        width: "160px",
        render: (val: any, row: DispatchRecord) => <span className="text-xs text-foreground font-medium">{row.source_warehouse_name || row.sourceWarehouse || row.warehouse}</span>
      },
      {
        key: "target_warehouse_name",
        header: "Target Warehouse",
        sortable: true,
        width: "160px",
        render: (val: any, row: DispatchRecord) => <span className="text-xs text-foreground font-bold text-brand-700">{row.target_warehouse_name || row.targetWarehouse || row.customer}</span>
      },
      {
        key: "total_items",
        header: "Total Items",
        sortable: true,
        width: "100px",
        render: (val: any, row: DispatchRecord) => <span className="text-xs">{row.total_items ?? row.products.length}</span>
      },
      {
        key: "total_quantity",
        header: "Dispatch Quantity",
        sortable: true,
        width: "120px",
        render: (val: any, row: DispatchRecord) => <span className="text-xs font-bold">{row.total_quantity ?? row.products.reduce((acc, p) => acc + p.dispatchQty, 0)}</span>
      },
      {
        key: "dispatch_status",
        header: "Dispatch Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: DELIVERY_STATUS_OPTIONS,
        width: "155px",
        render: (val: any, row: DispatchRecord) => {
          const status = row.dispatch_status || row.deliveryStatus;
          const cfg = DELIVERY_STATUS_BADGE_CONFIG[status] || { bg: "bg-slate-100 text-slate-600 border-slate-200", label: status };
          return (
            <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
              {cfg.label}
            </span>
          );
        },
      },
    ] as ColumnConfig<DispatchRecord>[];
  }, []);

  const columns = useMemo(() => {
    if (subTab === "sales_order") return salesOrderColumns;
    if (subTab === "sample_order") return sampleOrderColumns;
    return stockTransferColumns;
  }, [subTab, salesOrderColumns, sampleOrderColumns, stockTransferColumns]);

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
      hide: (row) => row.deliveryStatus === "Delivered" || row.deliveryStatus === "Returned" || row.deliveryStatus === "Cancelled",
    },
    {
      label: "Revert",
      action: "revert",
      icon: RotateCcw,
      onClick: (row) => setRevertTarget(row),
      hide: (row) => row.deliveryStatus === "Delivered" || row.deliveryStatus === "Returned" || row.deliveryStatus === "Cancelled",
    },
    {
      label: "Download Challan",
      action: "challan",
      icon: FileText,
      onClick: (row) => setChallanTarget(row),
    },
    {
      label: "Delivery Done",
      action: "delivery_done",
      icon: CheckCircle2,
      onClick: (row) => {
        setDeliveryTarget(row);
        setDeliveryForm({ deliveryDate: new Date().toISOString().split("T")[0], receiverName: "", remarks: "" });
      },
      hide: (row) => row.deliveryStatus === "Delivered" || row.deliveryStatus === "Returned" || row.deliveryStatus === "Cancelled",
    },
  ];

  const handleRevertConfirm = () => {
    if (!revertTarget) return;
    revertDispatch(revertTarget.id);
    setRevertTarget(null);
    reload();
  };

  const handleDeliveryConfirm = () => {
    if (!deliveryTarget) return;
    if (!deliveryForm.deliveryDate || !deliveryForm.receiverName) {
      alert("Please fill in all required fields.");
      return;
    }
    markAsDelivered(deliveryTarget.id, deliveryForm);
    setDeliveryTarget(null);
    reload();
  };

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={(val: any) => setSubTab(val)} className="w-full">
        <TabsList>
          <TabsTrigger value="sales_order" className="text-xs">Sales Order</TabsTrigger>
          <TabsTrigger value="sample_order" className="text-xs">Sample Order</TabsTrigger>
          <TabsTrigger value="stock_transfer" className="text-xs">Stock Transfer</TabsTrigger>
        </TabsList>
      </Tabs>

      <MasterListing<DispatchRecord>
        columns={columns}
        data={paginated}
        totalRecords={processed.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        onFilterChange={setFilters}
        actions={actions}
        onAdd={() => router.push("/warehouse/dispatch/create")}
        addLabel="Create Dispatch"
        emptyMessage="dispatch records"
        searchPlaceholder="Search dispatch..."
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
                    <p className="text-brand-100 text-xs">{challanTarget.dispatchNumber}</p>
                  </div>
                  <Truck className="w-8 h-8 text-brand-200" />
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2.5">
                    <div><p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Sales Order No</p><p className="font-bold">{challanTarget.salesOrderNumber}</p></div>
                    <div><p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Customer</p><p className="font-bold">{challanTarget.customer}</p></div>
                    <div><p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Dispatch Date</p><p className="font-bold">{challanTarget.dispatchDate}</p></div>
                  </div>
                  <div className="space-y-2.5">
                    <div><p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Vehicle No</p><p className="font-mono font-bold">{challanTarget.vehicleNumber}</p></div>
                    <div><p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Driver Name</p><p className="font-bold">{challanTarget.driverName}</p></div>
                    <div><p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Transporter</p><p className="font-bold">{challanTarget.transporterName}</p></div>
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
                    {challanTarget.products.map((p, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 px-4 font-bold">{p.product}</td>
                        <td className="py-2.5 px-4 font-mono text-brand-700">{p.sku}</td>
                        <td className="py-2.5 px-4 text-center font-bold">{p.dispatchQty}</td>
                      </tr>
                    ))}
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
    </div>
  );
}
