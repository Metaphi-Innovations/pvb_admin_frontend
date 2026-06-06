"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Edit, FileText, Package, Split, Trash2, CheckCircle2, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CancelOrderDialog from "../components/CancelOrderDialog";
import PackingListDialog from "../components/PackingListDialog";
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
} from "../orders-data";

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  draft:              { bg: "bg-slate-100",    text: "text-slate-600",   dot: "bg-slate-400"   },
  pending_approval:   { bg: "bg-amber-50",     text: "text-amber-700",   dot: "bg-amber-400"   },
  approved:           { bg: "bg-emerald-50",   text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected:           { bg: "bg-red-50",       text: "text-red-700",     dot: "bg-red-400"     },
  confirmed:          { bg: "bg-blue-50",      text: "text-blue-700",    dot: "bg-blue-500"    },
  dispatched:         { bg: "bg-amber-50",     text: "text-amber-700",   dot: "bg-amber-400"   },
  delivered:          { bg: "bg-emerald-50",   text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled:          { bg: "bg-red-50",       text: "text-red-700",     dot: "bg-red-400"     },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {formatOrderStatus(status as OrderStatus)}
    </span>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground flex-shrink-0 w-32">{label}</span>
      <span className={cn("text-xs font-medium text-foreground text-right flex-1", mono && "font-mono text-brand-700")}>
        {value !== undefined && value !== null && value !== "" ? value : "—"}
      </span>
    </div>
  );
}

export default function ViewSalesOrderPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [packingOpen, setPackingOpen] = useState(false);

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
        <p className="text-sm p-4">Sales order not found.</p>
        <Link href="/sales/orders" className="text-brand-600 text-xs px-4">Back to orders</Link>
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

  const formatRupee = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });

  return (
    <AppLayout noPadding>
      <div className="px-5 py-4 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/sales/orders")}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold font-mono text-brand-700">{order.soNumber}</h1>
              <p className="text-xs text-muted-foreground">{order.customerName}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusPill status={order.status} />
                <span className="text-sm font-bold text-foreground">{formatRupee(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {editable && (
              <Link href={`/sales/orders/${order.id}/edit`}>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Edit className="w-3.5 h-3.5" /> Edit
                </Button>
              </Link>
            )}
            {piAllowed && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => downloadProformaInvoice(order)}>
                <FileText className="w-3.5 h-3.5" /> Download PI
              </Button>
            )}
            {packingAllowed && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setPackingOpen(true)}>
                <Package className="w-3.5 h-3.5" /> Generate Packing List
              </Button>
            )}
            {splittable && (
              <Link href={`/sales/orders/${order.id}/split`}>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Split className="w-3.5 h-3.5" /> Split Order
                </Button>
              </Link>
            )}
            {cancellable && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-red-600 hover:bg-red-50" onClick={() => setCancelOpen(true)}>
                <Trash2 className="w-3.5 h-3.5" /> Cancel Order
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Order Details</p>
            <InfoRow label="Order Number" value={order.soNumber} mono />
            <InfoRow label="Order Date" value={order.orderDate} />
            <InfoRow label="Delivery Date" value={order.deliveryDate} />
            <InfoRow label="Customer" value={`${order.customerCode} — ${order.customerName}`} />
            <InfoRow label="Salesman ID" value={order.salesManId ?? "—"} />
            <InfoRow label="Salesman" value={order.salesManName} />
            <InfoRow label="Territory" value={order.territory} />
            <InfoRow label="Order Status" value={formatOrderStatus(order.status)} />
            <InfoRow
              label="Approval Status"
              value={order.requiresApproval ? "Requires Approval" : order.status === "pending_approval" ? "Pending Approval" : "Not Required"}
            />
            <InfoRow label="Total Amount" value={formatRupee(order.totalAmount)} />
          </div>

          <div className="bg-white rounded-xl border border-border shadow-sm p-4 space-y-4">
            {(order.referenceOrderNumber || order.parentOrderNumber || order.splitFromOrderNumber) && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Split Reference</p>
                {order.referenceOrderNumber && <InfoRow label="Reference Order" value={order.referenceOrderNumber} mono />}
                {order.parentOrderNumber && <InfoRow label="Parent Order" value={order.parentOrderNumber} mono />}
                {order.splitFromOrderNumber && <InfoRow label="Split From" value={order.splitFromOrderNumber} mono />}
              </div>
            )}

            {order.status === "cancelled" && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Cancellation</p>
                <InfoRow label="Reason" value={order.cancellationReason} />
                <InfoRow label="Cancelled By" value={order.cancelledBy} />
                <InfoRow label="Cancelled Date" value={order.cancelledDate} />
              </div>
            )}

            {(order.packingListNumber || packingList) && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Packing List</p>
                <InfoRow label="PL Number" value={order.packingListNumber} mono />
                <InfoRow
                  label="Packing Status"
                  value={order.packingStatus ? (PACKING_LIST_STATUS_LABELS[order.packingStatus] ?? order.packingStatus) : "—"}
                />
                <InfoRow label="Warehouse" value={order.warehouseName ?? packingList?.warehouseName} />
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Audit</p>
              <InfoRow label="Created By" value={order.createdBy} />
              <InfoRow label="Created Date" value={order.createdDate} />
              <InfoRow label="Updated By" value={order.updatedBy} />
              <InfoRow label="Updated Date" value={order.updatedDate} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold text-foreground">Product Lines</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold">Product</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold w-16">Stock</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold w-16">Qty</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold">Unit Price</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold w-20">Discount</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold w-20">GST</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {order.lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">No product lines</td>
                  </tr>
                ) : order.lineItems.map(line => (
                  <tr key={line.id} className="border-b border-border/60">
                    <td className="px-4 py-2">
                      <p className="text-xs font-semibold text-foreground">{line.productName || "—"}</p>
                      <p className="text-[11px] font-mono text-brand-700">{line.productCode}</p>
                    </td>
                    <td className="px-4 py-2 text-xs text-right tabular-nums">{line.productId ? line.availableStock : "—"}</td>
                    <td className="px-4 py-2 text-xs text-right tabular-nums">{line.quantity}</td>
                    <td className="px-4 py-2 text-xs text-right tabular-nums">{formatRupee(line.unitPrice)}</td>
                    <td className="px-4 py-2 text-xs text-right tabular-nums">{formatRupee(line.discount)}</td>
                    <td className="px-4 py-2 text-xs text-right tabular-nums">{formatRupee(line.gstAmount)}</td>
                    <td className="px-4 py-2 text-xs text-right font-semibold tabular-nums">{formatRupee(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Net Total</span><span>{formatRupee(totals.netTotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total GST</span><span>{formatRupee(totals.totalGst)}</span></div>
              <div className="flex justify-between font-bold text-brand-700"><span>Grand Total</span><span>{formatRupee(totals.grandTotal)}</span></div>
            </div>
          </div>
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
