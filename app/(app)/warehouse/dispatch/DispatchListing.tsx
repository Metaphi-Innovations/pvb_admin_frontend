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

import { DispatchRecord, DeliveryDetails, SalesReturnRecord, SalesReturnProduct } from "./types";
import { markAsDelivered, revertDispatch } from "./services";
import {
  getSalesReturnRecords,
  saveSalesReturnRecords,
  getDispatchRecords,
  saveDispatchRecords,
} from "./mock-data";
import {
  CUSTOMER_OPTIONS,
  DELIVERY_STATUS_OPTIONS,
  DELIVERY_STATUS_BADGE_CONFIG,
  WAREHOUSE_OPTIONS,
} from "./constants";

import Link from "next/link";

interface DispatchListingProps {
  rawDispatches: DispatchRecord[];
  activeTab?: string;
  reload: () => void;
}

export function DispatchListing({ rawDispatches, activeTab, reload }: DispatchListingProps) {
  const router = useRouter();

  // Table state for Dispatches
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [subTab, setSubTab] = useState<"sales_order" | "sample_order" | "stock_transfer">("sales_order");

  // Table state for Sales Returns
  const [returnFilters, setReturnFilters] = useState<FilterState>({});
  const [returnSort, setReturnSort] = useState<SortState>({ key: "", direction: "none" });
  const [returnPage, setReturnPage] = useState(1);
  const [returnPageSize, setReturnPageSize] = useState(10);
  const [salesReturns, setSalesReturns] = useState<SalesReturnRecord[]>([]);

  // Modal states
  const [revertTarget, setRevertTarget] = useState<DispatchRecord | null>(null);
  const [challanTarget, setChallanTarget] = useState<DispatchRecord | null>(null);
  const [deliveryTarget, setDeliveryTarget] = useState<DispatchRecord | null>(null);
  const [deliveryForm, setDeliveryForm] = useState<DeliveryDetails>({ deliveryDate: "", receiverName: "", remarks: "" });

  // Sales Return Form states
  const [returnSalesTarget, setReturnSalesTarget] = useState<DispatchRecord | null>(null);
  const [checkedProducts, setCheckedProducts] = useState<Record<string, boolean>>({});
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  const [returnRemarks, setReturnRemarks] = useState("");
  const [viewReturnTarget, setViewReturnTarget] = useState<SalesReturnRecord | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSalesReturns(getSalesReturnRecords());
    }
  }, [activeTab]);

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

  // Sales Returns table filtering & sorting
  const returnProcessed = useMemo(() => {
    let result = [...salesReturns];
    Object.keys(returnFilters).forEach(key => {
      const val = returnFilters[key];
      if (!val) return;
      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(r =>
          r.returnNumber.toLowerCase().includes(q) ||
          r.dispatchNumber.toLowerCase().includes(q) ||
          r.salesOrderNumber.toLowerCase().includes(q) ||
          r.customer.toLowerCase().includes(q)
        );
      }
    });
    if (returnSort.key && returnSort.direction !== "none") {
      result.sort((a, b) => {
        const valA = String(a[returnSort.key as keyof SalesReturnRecord] || "");
        const valB = String(b[returnSort.key as keyof SalesReturnRecord] || "");
        return returnSort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [salesReturns, returnFilters, returnSort]);

  const returnPaginated = useMemo(() => {
    const start = (returnPage - 1) * returnPageSize;
    return returnProcessed.slice(start, start + returnPageSize);
  }, [returnProcessed, returnPage, returnPageSize]);

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

  const returnColumns: ColumnConfig<SalesReturnRecord>[] = [
    {
      key: "returnNumber",
      header: "Return No",
      sortable: true,
      width: "135px",
      render: (val) => <span className="font-mono text-xs font-semibold text-brand-700">{val}</span>
    },
    {
      key: "dispatchNumber",
      header: "Dispatch No",
      sortable: true,
      width: "135px",
      render: (val) => <span className="font-mono text-xs">{val}</span>
    },
    {
      key: "salesOrderNumber",
      header: "Sales Order No",
      sortable: true,
      width: "140px",
      render: (val) => <span className="font-mono text-xs">{val}</span>
    },
    { key: "customer", header: "Customer", sortable: true, width: "160px" },
    { key: "returnDate", header: "Return Date", sortable: true, width: "135px" },
    {
      key: "products",
      header: "Returned Products",
      width: "250px",
      render: (val, row) => (
        <div className="space-y-0.5 text-xs">
          {row.products.map((p, idx) => (
            <div key={idx} className="text-foreground font-medium">
              {p.product} <span className="text-muted-foreground font-semibold">({p.returnQty} / {p.dispatchQty})</span>
            </div>
          ))}
        </div>
      )
    }
  ];

  const returnActions: ActionItemConfig<SalesReturnRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => setViewReturnTarget(row),
    },
  ];

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
    {
      label: "Return Sales",
      action: "return_sales",
      icon: RotateCcw,
      onClick: (row) => openReturnSales(row),
      hide: (row) => row.deliveryStatus !== "Delivered",
    },
  ];

  const openReturnSales = (row: DispatchRecord) => {
    setReturnSalesTarget(row);
    setCheckedProducts({});
    setReturnQuantities(
      row.products.reduce((acc, p) => ({ ...acc, [p.sku]: String(p.dispatchQty) }), {})
    );
    setReturnRemarks("");
  };

  const handleReturnSalesSave = () => {
    if (!returnSalesTarget) return;

    const productsToReturn = returnSalesTarget.products
      .filter((p) => checkedProducts[p.sku])
      .map((p) => {
        const returnQty = parseFloat(returnQuantities[p.sku]) || 0;
        return {
          product: p.product,
          sku: p.sku,
          dispatchQty: p.dispatchQty,
          returnQty,
        };
      });

    if (productsToReturn.length === 0) {
      alert("Please select at least one product to return.");
      return;
    }

    for (const p of productsToReturn) {
      if (p.returnQty <= 0) {
        alert(`Please enter a valid return quantity for ${p.product}.`);
        return;
      }
      if (p.returnQty > p.dispatchQty) {
        alert(`Return quantity for ${p.product} cannot exceed dispatched quantity of ${p.dispatchQty}.`);
        return;
      }
    }

    const existingReturns = getSalesReturnRecords();
    const returnNumber = `RET-2026-${String(existingReturns.length + 1).padStart(3, "0")}`;

    const newReturn: SalesReturnRecord = {
      id: `ret-${Date.now()}`,
      returnNumber,
      dispatchNumber: returnSalesTarget.dispatchNumber,
      salesOrderNumber: returnSalesTarget.salesOrderNumber,
      customer: returnSalesTarget.customer,
      returnDate: new Date().toISOString().split("T")[0],
      warehouse: returnSalesTarget.warehouse,
      products: productsToReturn,
      remarks: returnRemarks,
    };

    const updatedReturns = [...existingReturns, newReturn];
    saveSalesReturnRecords(updatedReturns);
    setSalesReturns(updatedReturns);

    const allDispatches = getDispatchRecords();
    const dIdx = allDispatches.findIndex((d) => d.id === returnSalesTarget.id);
    if (dIdx !== -1) {
      allDispatches[dIdx].deliveryStatus = "Returned";
      saveDispatchRecords(allDispatches);
    }

    setReturnSalesTarget(null);
    reload();
  };

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

      {activeTab === "dispatch" && (
        <Tabs value={subTab} onValueChange={(val: any) => setSubTab(val)} className="w-full">
          <TabsList>
            <TabsTrigger value="sales_order" className="text-xs">Sales Order</TabsTrigger>
            <TabsTrigger value="sample_order" className="text-xs">Sample Order</TabsTrigger>
            <TabsTrigger value="stock_transfer" className="text-xs">Stock Transfer</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {activeTab === "dispatch" ? (
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
      ) : (
        <MasterListing<SalesReturnRecord>
          columns={returnColumns}
          data={returnPaginated}
          totalRecords={returnProcessed.length}
          page={returnPage}
          pageSize={returnPageSize}
          onPageChange={setReturnPage}
          onPageSizeChange={setReturnPageSize}
          onSortChange={setReturnSort}
          onFilterChange={setReturnFilters}
          actions={returnActions}
          emptyMessage="sales return records"
          searchPlaceholder="Search return number, dispatch number, customer..."
        />
      )}

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

      {/* ── RETURN SALES DIALOG ── */}
      <Dialog open={!!returnSalesTarget} onOpenChange={() => setReturnSalesTarget(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-red-600" />
              </div>
              Process Sales Return
            </DialogTitle>
          </DialogHeader>
          {returnSalesTarget && (
            <div className="space-y-4 py-1 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-border space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Dispatch No</p>
                    <p className="font-bold font-mono">{returnSalesTarget.dispatchNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Sales Order No</p>
                    <p className="font-bold font-mono">{returnSalesTarget.salesOrderNumber}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Customer</p>
                  <p className="font-bold">{returnSalesTarget.customer}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="font-semibold text-foreground border-b pb-1 text-xs">Select Products & Quantities to Return</p>
                <div className="space-y-3">
                  {returnSalesTarget.products.map((p) => {
                    const isChecked = !!checkedProducts[p.sku];
                    return (
                      <div key={p.sku} className="flex items-center justify-between gap-3 p-2 rounded-lg border bg-white shadow-sm">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                            checked={isChecked}
                            onChange={(e) => {
                              setCheckedProducts((prev) => ({ ...prev, [p.sku]: e.target.checked }));
                            }}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{p.product}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">SKU: {p.sku} | Dispatch Qty: {p.dispatchQty}</p>
                          </div>
                        </div>

                        {isChecked && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">Return Qty:</span>
                            <Input
                              type="number"
                              min={1}
                              max={p.dispatchQty}
                              value={returnQuantities[p.sku] || ""}
                              onChange={(e) => setReturnQuantities((prev) => ({ ...prev, [p.sku]: e.target.value }))}
                              className="h-8 w-20 text-xs text-center"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Return Remarks</p>
                <textarea
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  className="w-full h-16 text-xs border border-input rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Reason for return..."
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 justify-end pt-2 border-t">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setReturnSalesTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white gap-1" onClick={handleReturnSalesSave}>
              <RotateCcw className="w-3.5 h-3.5" /> Save Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── VIEW SALES RETURN DIALOG ── */}
      <Dialog open={!!viewReturnTarget} onOpenChange={() => setViewReturnTarget(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center">
                <Eye className="w-4 h-4 text-brand-600" />
              </div>
              Sales Return Details
            </DialogTitle>
          </DialogHeader>
          {viewReturnTarget && (
            <div className="space-y-4 py-1 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-border space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Return No</p>
                    <p className="font-bold font-mono text-brand-700">{viewReturnTarget.returnNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Return Date</p>
                    <p className="font-bold">{viewReturnTarget.returnDate}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t pt-2 border-slate-200">
                  <div>
                    <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Dispatch No</p>
                    <p className="font-bold font-mono">{viewReturnTarget.dispatchNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Sales Order No</p>
                    <p className="font-bold font-mono">{viewReturnTarget.salesOrderNumber}</p>
                  </div>
                </div>
                <div className="border-t pt-2 border-slate-200">
                  <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Customer</p>
                  <p className="font-bold">{viewReturnTarget.customer}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-foreground border-b pb-1 text-xs">Returned Products</p>
                <div className="space-y-2">
                  {viewReturnTarget.products.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded-lg border bg-white shadow-sm">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{p.product}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">SKU: {p.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">{p.returnQty} Qty Returned</p>
                        <p className="text-[10px] text-muted-foreground">Dispatched Qty: {p.dispatchQty}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {viewReturnTarget.remarks && (
                <div className="space-y-1 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                  <p className="text-amber-800 font-semibold uppercase tracking-wider text-[9px]">Return Remarks</p>
                  <p className="text-muted-foreground italic text-xs">"{viewReturnTarget.remarks}"</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" size="sm" className="h-8 text-xs w-full" onClick={() => setViewReturnTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
