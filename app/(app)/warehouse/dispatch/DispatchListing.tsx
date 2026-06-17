"use client";

import React, { useState, useMemo } from "react";
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

  // Table state
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [revertTarget, setRevertTarget] = useState<DispatchRecord | null>(null);
  const [challanTarget, setChallanTarget] = useState<DispatchRecord | null>(null);
  const [deliveryTarget, setDeliveryTarget] = useState<DispatchRecord | null>(null);
  const [deliveryForm, setDeliveryForm] = useState<DeliveryDetails>({ deliveryDate: "", receiverName: "", remarks: "" });

  // Filtered & Sorted records
  const processed = useMemo(() => {
    let result = [...rawDispatches];
    Object.keys(filters).forEach(key => {
      const val = filters[key];
      if (!val) return;
      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(d =>
          d.dispatchNumber.toLowerCase().includes(q) ||
          d.salesOrderNumber.toLowerCase().includes(q) ||
          d.customer.toLowerCase().includes(q) ||
          d.vehicleNumber.toLowerCase().includes(q) ||
          d.driverName.toLowerCase().includes(q)
        );
      } else if (key === "dispatchNumber" || key === "salesOrderNumber" || key === "vehicleNumber" || key === "driverName") {
        const q = (val as string).toLowerCase();
        result = result.filter(d => String(d[key as keyof DispatchRecord]).toLowerCase().includes(q));
      } else if (key === "customer" || key === "deliveryStatus") {
        const selected = val as string[];
        result = result.filter(d => selected.includes(String(d[key as keyof DispatchRecord])));
      } else if (key === "dispatchDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter(d => d.dispatchDate >= range.fromDate);
        if (range.toDate) result = result.filter(d => d.dispatchDate <= range.toDate);
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
  }, [rawDispatches, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, page, pageSize]);

  // Columns
  const columns: ColumnConfig<DispatchRecord>[] = [
    {
      key: "dispatchNumber",
      header: "Dispatch No",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "135px",
      render: (val, row) => (
        <Link
          href={`/warehouse/dispatch/view/${row.id}`}
          className="font-mono text-xs font-semibold text-brand-700 hover:underline"
        >
          {val}
        </Link>
      )
    },
    {
      key: "salesOrderNumber",
      header: "Sales Order No",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "140px",
      render: (val) => <span className="font-mono text-xs font-semibold">{val}</span>
    },
    { key: "customer", header: "Customer", sortable: true, filterable: true, filterType: "dropdown", filterOptions: CUSTOMER_OPTIONS, width: "160px" },
    {
      key: "vehicleNumber",
      header: "Vehicle No",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val) => <span className="font-mono text-xs">{val}</span>
    },
    { key: "driverName", header: "Driver Name", sortable: true, filterable: true, filterType: "text" },
    { key: "transporterName", header: "Transporter", sortable: true },
    { key: "dispatchDate", header: "Dispatch Date", sortable: true, filterable: true, filterType: "date", width: "135px" },
    {
      key: "deliveryStatus",
      header: "Delivery Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: DELIVERY_STATUS_OPTIONS,
      width: "155px",
      render: (val: any) => {
        const cfg = DELIVERY_STATUS_BADGE_CONFIG[val] || { bg: "bg-slate-100 text-slate-600 border-slate-200", label: val };
        return (
          <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}>
            {cfg.label}
          </span>
        );
      },
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
      onClick: (row) => {
        if (row.deliveryStatus === "Delivered") {
          alert("Cannot edit a delivered dispatch.");
          return;
        }
        router.push(`/warehouse/dispatch/edit/${row.id}`);
      },
    },
    {
      label: "Revert",
      action: "revert",
      icon: RotateCcw,
      onClick: (row) => setRevertTarget(row),
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
