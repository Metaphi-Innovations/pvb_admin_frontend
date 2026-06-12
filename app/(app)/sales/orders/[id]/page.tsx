"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Edit2,
  FileText,
  Package,
  Split,
  Trash2,
  CheckCircle2,
  XCircle,
  Check,
  X,
  Building2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CancelOrderDialog from "../components/CancelOrderDialog";
import PackingListDialog from "../components/PackingListDialog";
import ApproveOrderDialog from "../components/ApproveOrderDialog";
import RejectOrderDialog from "../components/RejectOrderDialog";
import { downloadProformaInvoice } from "../pi-document";
import { getPackingListById, PACKING_LIST_STATUS_LABELS } from "../packing-list-data";
import {
  type SalesOrder,
  type OrderStatus,
  getOrderById,
  hydrateOrderLineItems,
  formatOrderStatus,
  calculateOrderTotalsSummary,
  canEditOrder,
  canSplitOrder,
  canCancelOrder,
  canDownloadPI,
  canGeneratePackingList,
  approveSalesOrder,
  canApproveOrder,
  formatApprovalStatus,
  resolveApprovalStatus,
  getProductById,
} from "../orders-data";

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft:              { bg: "bg-slate-100 border-slate-200",    text: "text-slate-600",   dot: "bg-slate-400",   label: "Draft" },
  pending_approval:   { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   dot: "bg-amber-400",   label: "Pending Approval" },
  approved:           { bg: "bg-emerald-50 border-emerald-200",   text: "text-emerald-700", dot: "bg-emerald-500", label: "Approved" },
  rejected:           { bg: "bg-red-50 border-red-200",       text: "text-red-700",     dot: "bg-red-400",     label: "Rejected" },
  confirmed:          { bg: "bg-blue-50 border-blue-200",      text: "text-blue-700",    dot: "bg-blue-500",    label: "Confirmed" },
  dispatched:         { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   dot: "bg-amber-400",   label: "Dispatched" },
  delivered:          { bg: "bg-emerald-50 border-emerald-200",   text: "text-emerald-700", dot: "bg-emerald-500", label: "Delivered" },
  cancelled:          { bg: "bg-red-50 border-red-200",       text: "text-red-700",     dot: "bg-red-400",     label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || {
    bg: "bg-slate-100 border-slate-200",
    text: "text-slate-600",
    dot: "bg-slate-400",
    label: status,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
        cfg.bg,
        cfg.text
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}) {
  const displayVal =
    value !== undefined && value !== null && value !== "" ? value : "—";
  return (
    <div className="py-2 space-y-1 border-b border-border/50 last:border-0">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div
        className={cn(
          "text-xs font-semibold text-foreground break-all",
          mono && "font-mono"
        )}
      >
        {displayVal}
      </div>
    </div>
  );
}

export default function ViewSalesOrderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(params.id);
  const approvalMode = searchParams.get("from") === "approval";

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [packingOpen, setPackingOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("overview");

  const refresh = () => {
    const o = getOrderById(id);
    if (o) setOrder(hydrateOrderLineItems(o));
  };

  useEffect(() => {
    refresh();
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  if (!order) {
    return (
      <AppLayout>
        <div className="p-8 text-sm font-semibold text-muted-foreground">
          Sales order not found.{" "}
          <Link href="/sales/orders" className="text-brand-600 hover:underline">
            Back to listing
          </Link>
        </div>
      </AppLayout>
    );
  }

  const totals = calculateOrderTotalsSummary(order.lineItems);
  const packingList = order.packingListId ? getPackingListById(order.packingListId) : undefined;

  const editable = canEditOrder(order);
  const splittable = canSplitOrder(order);
  const cancellable = canCancelOrder(order);
  const piAllowed = canDownloadPI(order);
  const packingAllowed = canGeneratePackingList(order);
  const showApprovalActions = approvalMode && canApproveOrder(order);
  const approvalStatus = resolveApprovalStatus(order);

  const formatRupee = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });

  const handleBack = () => {
    router.push(approvalMode ? "/sales/orders?tab=approval" : "/sales/orders");
  };

  const handleApprove = () => {
    const result = approveSalesOrder(order.id);
    if ("error" in result) {
      showToast(result.error, "error");
      return;
    }
    router.push("/sales/orders?tab=approval&toast=approved");
  };

  const handleRejectSuccess = (_updated: SalesOrder) => {
    router.push("/sales/orders?tab=approval&toast=rejected");
  };

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      {!approvalMode && editable && (
        <Link href={`/sales/orders/${order.id}/edit`}>
          <Button variant="outline" size="sm" className="h-9 text-xs font-semibold gap-1.5 border-border hover:bg-muted">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </Button>
        </Link>
      )}
      {!approvalMode && piAllowed && (
        <Button variant="outline" size="sm" className="h-9 text-xs font-semibold gap-1.5 border-border hover:bg-muted" onClick={() => downloadProformaInvoice(order)}>
          <FileText className="w-3.5 h-3.5" /> Download PI
        </Button>
      )}
      {!approvalMode && packingAllowed && (
        <Button variant="outline" size="sm" className="h-9 text-xs font-semibold gap-1.5 border-border hover:bg-muted" onClick={() => setPackingOpen(true)}>
          <Package className="w-3.5 h-3.5" /> Generate Packing List
        </Button>
      )}
      {!approvalMode && splittable && (
        <Link href={`/sales/orders/${order.id}/split`}>
          <Button variant="outline" size="sm" className="h-9 text-xs font-semibold gap-1.5 border-border hover:bg-muted">
            <Split className="w-3.5 h-3.5" /> Split Order
          </Button>
        </Link>
      )}
      {!approvalMode && cancellable && (
        <Button variant="outline" size="sm" className="h-9 text-xs font-semibold gap-1.5 text-red-600 hover:bg-red-50 border-red-200" onClick={() => setCancelOpen(true)}>
          <Trash2 className="w-3.5 h-3.5" /> Cancel Order
        </Button>
      )}
    </div>
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "products", label: `Products (${order.lineItems.length})`, icon: Building2 },
  ];

  return (
    <AppLayout>
      <div className="w-full space-y-6">
        {/* ── HEADER SECTION ── */}
        <div className="flex flex-col gap-4 pb-5 border-b sm:flex-row sm:items-center sm:justify-between border-border/80">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 rounded-lg hover:bg-muted border-border"
              onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </Button>
            <h1 className="text-base font-bold text-foreground">Sales Order Details</h1>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md">
              {order.soNumber}
            </span>
            <StatusBadge status={order.status} />
          </div>
          {headerActions}
        </div>

        {/* Approval Actions Alert */}
        {showApprovalActions && (
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-foreground">Approval Required</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Review order details below and approve or reject this sales order.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-red-600 hover:bg-red-50 border-red-200"
                  onClick={() => setRejectOpen(true)}
                >
                  <X className="w-3.5 h-3.5" /> Reject Order
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setApproveOpen(true)}
                >
                  <Check className="w-3.5 h-3.5" /> Approve Order
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── TOP SUMMARY CARD ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Profile Summary Card */}
          <div className="flex flex-col justify-between p-5 bg-white border shadow-sm lg:col-span-2 rounded-xl border-border">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 text-lg font-bold border rounded-full bg-brand-50 border-brand-100 text-brand-600">
                SO
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">
                    {order.customerName}
                  </h2>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex flex-wrap items-center text-xs gap-x-4 gap-y-1 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">SO No:</span>
                    <span className="font-mono">{order.soNumber}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">Order Date:</span>
                    {order.orderDate}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">Delivery Date:</span>
                    {order.deliveryDate || "—"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center pt-1 text-xs gap-x-4 gap-y-1 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">Grand Total:</span>
                    <span className="font-mono font-bold text-emerald-650">{formatRupee(order.totalAmount)}</span>
                  </span>
                  {order.warehouseName && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-foreground">Warehouse:</span>
                        {order.warehouseName}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4 Compact KPI blocks */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Order Date
              </p>
              <p className="mt-1 text-xs font-bold text-foreground truncate">
                {order.orderDate || "—"}
              </p>
            </div>

            <div className="flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Delivery Date
              </p>
              <p className="mt-1 text-xs font-bold text-foreground truncate">
                {order.deliveryDate || "—"}
              </p>
            </div>

            <div className="flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Products
              </p>
              <p className="mt-1 text-xs font-bold text-foreground truncate">
                {order.lineItems.length}
              </p>
            </div>

            <div className="flex flex-col justify-between p-4 bg-white border shadow-sm rounded-xl border-border">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Grand Total
              </p>
              <p className="mt-1 text-xs font-bold text-emerald-650 truncate font-mono">
                {formatRupee(order.totalAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* ── UNDERLINE TAB NAVIGATION ── */}
        <div className="border-b border-border">
          <div className="flex gap-6">
            {tabs.map((t) => {
              const active = activeSubTab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  className={cn(
                    "pb-3 text-xs font-semibold border-b-2 transition-colors focus:outline-none flex items-center gap-1.5",
                    active
                      ? "border-brand-600 text-brand-600 font-bold"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setActiveSubTab(t.id)}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="w-full">
          {/* TAB 1: OVERVIEW */}
          {activeSubTab === "overview" && (
            <div className="space-y-5">
              {/* Card 1: Sales Order Information */}
              <div className="p-6 bg-white border shadow-sm rounded-xl border-border space-y-4">
                <h3 className="pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground">
                  Sales Order Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                  <DetailField label="Sales Order No." value={order.soNumber} mono />
                  <DetailField label="Order Date" value={order.orderDate} />
                  <DetailField label="Delivery Date" value={order.deliveryDate} />
                  <DetailField label="Source Warehouse" value={order.warehouseName} />
                  <DetailField label="Order Status" value={formatOrderStatus(order.status)} />
                  <DetailField label="Approval Status" value={formatApprovalStatus(approvalStatus)} />
                  {order.referenceOrderNumber && <DetailField label="Reference Order" value={order.referenceOrderNumber} mono />}
                  {order.parentOrderNumber && <DetailField label="Parent Order" value={order.parentOrderNumber} mono />}
                  {order.splitFromOrderNumber && <DetailField label="Split From" value={order.splitFromOrderNumber} mono />}

                  {order.status === "cancelled" && (
                    <>
                      <DetailField label="Cancellation Reason" value={order.cancellationReason} />
                      <DetailField label="Cancelled By" value={order.cancelledBy} />
                      <DetailField label="Cancelled Date" value={order.cancelledDate} />
                    </>
                  )}

                  {(order.approvalStatus === "approved" || order.status === "approved") && (
                    <>
                      <DetailField label="Approved By" value={order.approvedBy} />
                      <DetailField label="Approved Date" value={order.approvedDate} />
                    </>
                  )}

                  {(order.approvalStatus === "rejected" || order.status === "rejected") && (
                    <>
                      <DetailField label="Rejection Reason" value={order.rejectionReason} />
                      <DetailField label="Rejected By" value={order.rejectedBy} />
                      <DetailField label="Rejected Date" value={order.rejectedDate} />
                    </>
                  )}

                  {(order.packingListNumber || packingList) && (
                    <>
                      <DetailField label="PL Number" value={order.packingListNumber} mono />
                      <DetailField
                        label="Packing Status"
                        value={order.packingStatus ? (PACKING_LIST_STATUS_LABELS[order.packingStatus] ?? order.packingStatus) : "—"}
                      />
                      <DetailField label="Packing Warehouse" value={order.warehouseName ?? packingList?.warehouseName} />
                    </>
                  )}

                  <DetailField label="Created By" value={order.createdBy} />
                  <DetailField label="Created Date" value={order.createdDate} />
                  <DetailField label="Updated By" value={order.updatedBy} />
                  <DetailField label="Updated Date" value={order.updatedDate} />
                </div>
              </div>

              {/* Card 2: Customer Details */}
              <div className="p-6 bg-white border shadow-sm rounded-xl border-border space-y-4">
                <h3 className="pb-2 text-xs font-bold tracking-wider uppercase border-b text-foreground">
                  Customer Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                  <DetailField label="Customer Name" value={order.customerName} />
                  <DetailField label="Customer Code" value={order.customerCode} mono />
                  <DetailField label="Territory" value={order.territory} />
                  <DetailField label="Salesman ID" value={order.salesManId} mono />
                  <DetailField label="Salesman Name" value={order.salesManName} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS */}
          {activeSubTab === "products" && (
            <div className="space-y-5">
              <div className="p-6 bg-white border shadow-sm rounded-xl border-border space-y-4">
                <h3 className="pb-1 text-xs font-bold tracking-wider uppercase border-b text-foreground">
                  Product Details
                </h3>
                <div className="overflow-x-auto border border-border rounded-lg bg-white">
                  <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="font-semibold border-b border-border bg-slate-50 text-muted-foreground">
                        <th className="px-4 py-2 w-12 text-center">Sr.</th>
                        <th className="px-4 py-2">Product</th>
                        <th className="px-4 py-2 w-28">SKU/Code</th>
                        <th className="px-4 py-2 w-24 text-right">Stock</th>
                        <th className="px-4 py-2 w-24 text-right">Qty</th>
                        <th className="px-4 py-2 w-28 text-right">Unit Price</th>
                        <th className="px-4 py-2 w-20 text-right">Discount</th>
                        <th className="px-4 py-2 w-32 text-right">GST % / Amt</th>
                        <th className="px-4 py-2 w-32 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {order.lineItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-xs text-muted-foreground font-semibold">No products added.</td>
                        </tr>
                      ) : (
                        order.lineItems.map((line, idx) => {
                          const product = line.productId ? getProductById(line.productId) : undefined;
                          return (
                            <tr key={line.id} className="hover:bg-slate-50/50 font-medium">
                              <td className="px-4 py-2 text-center text-muted-foreground">{idx + 1}</td>
                              <td className="px-4 py-2">
                                <p className="font-semibold text-foreground">{line.productName || "—"}</p>
                              </td>
                              <td className="px-4 py-2 font-mono text-brand-700 font-semibold">{line.productCode}</td>
                              <td className="px-4 py-2 text-right font-mono text-muted-foreground">{line.productId ? line.availableStock : "—"}</td>
                              <td className="px-4 py-2 text-right font-mono">{line.quantity}</td>
                              <td className="px-4 py-2 text-right font-mono">{formatRupee(line.unitPrice)}</td>
                              <td className="px-4 py-2 text-right font-mono">{line.discount}%</td>
                              <td className="px-4 py-2 text-right font-mono">
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] text-muted-foreground font-semibold">{product?.gstRate || "0%"}</span>
                                  <span>{formatRupee(line.gstAmount)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2 font-mono font-bold text-right text-brand-650">{formatRupee(line.lineTotal)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Amount Summary Cards */}
                <div className="pt-4 flex flex-col md:flex-row md:justify-end">
                  <div className="w-full md:w-80 border border-border rounded-xl bg-slate-50/40 p-4 space-y-2">
                    <h4 className="text-xs font-bold text-foreground border-b pb-1.5 uppercase tracking-wider">Amount Summary</h4>
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                      <span>Subtotal (Before Discount)</span>
                      <span className="font-mono text-foreground">{formatRupee(totals.subtotalBeforeDiscount)}</span>
                    </div>
                    {totals.totalItemDiscounts > 0 && (
                      <div className="flex justify-between text-xs font-semibold text-red-650">
                        <span>Total Discounts</span>
                        <span className="font-mono">-{formatRupee(totals.totalItemDiscounts)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                      <span>Net Total</span>
                      <span className="font-mono text-foreground">{formatRupee(totals.netTotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                      <span>Total GST</span>
                      <span className="font-mono text-foreground">{formatRupee(totals.totalGst)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-foreground border-t pt-2 mt-1">
                      <span>Grand Total</span>
                      <span className="font-mono text-brand-700">{formatRupee(totals.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CancelOrderDialog
        order={order}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onSuccess={() => {
          refresh();
          showToast("Sales order cancelled successfully.");
        }}
      />

      <PackingListDialog
        order={order}
        open={packingOpen}
        onClose={() => setPackingOpen(false)}
        onSuccess={(updatedOrder, list) => {
          setOrder(updatedOrder);
          showToast(`Packing list ${list.packingListNumber} generated.`);
        }}
      />

      <ApproveOrderDialog
        order={order}
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApprove}
      />

      <RejectOrderDialog
        order={order}
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onSuccess={handleRejectSuccess}
      />

      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}
