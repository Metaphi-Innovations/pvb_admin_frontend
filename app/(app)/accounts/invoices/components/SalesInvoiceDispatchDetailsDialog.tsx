"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";
import { DispatchDetailsPanel } from "@/app/(app)/sales/orders/components/DispatchDetailsPanel";
import { getDispatchById, getDispatchByNumber } from "@/lib/accounts/dispatch-invoice-bridge";
import { hydrateOrders, loadOrders } from "@/app/(app)/sales/orders/orders-data";

interface SalesInvoiceDispatchDetailsDialogProps {
  dispatchId?: string;
  dispatchNo?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Goods generate: compact read-only ERP context only. */
  goodsInvoiceFields?: boolean;
  /** Optional overrides from invoice prefill. */
  context?: {
    salesOrderNo?: string;
    salesOrderDate?: string;
    placeOfSupply?: string;
    billFrom?: string;
    billTo?: string;
    shipTo?: string;
    warehouse?: string;
    dispatchQty?: number;
    qtyUnit?: string;
  };
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="so-info-row-label">{label}</span>
      <span className="so-info-row-value break-words">{value || "—"}</span>
    </div>
  );
}

function formatDate(iso?: string): string {
  if (!iso?.trim()) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

export function SalesInvoiceDispatchDetailsDialog({
  dispatchId,
  dispatchNo,
  open,
  onOpenChange,
  goodsInvoiceFields = false,
  context,
}: SalesInvoiceDispatchDetailsDialogProps) {
  const dispatch =
    (dispatchId ? getDispatchById(dispatchId) : null) ??
    (dispatchNo ? getDispatchByNumber(dispatchNo) : null);

  if (!dispatch && !goodsInvoiceFields) return null;

  const title =
    dispatch?.dispatchNumber ||
    dispatch?.dispatch_no ||
    context?.salesOrderNo ||
    dispatchNo ||
    "Dispatch";

  if (!goodsInvoiceFields) {
    if (!dispatch) return null;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
            <div className="flex items-start gap-2 pr-6">
              <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                <Truck className="w-4 h-4 text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-sm font-semibold leading-tight font-mono text-brand-700">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Dispatch & transport details
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-muted/10">
            <DispatchDetailsPanel dispatch={dispatch} />
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex justify-end flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  let orderDate = context?.salesOrderDate || "";
  if (!orderDate && typeof window !== "undefined" && dispatch?.salesOrderNumber) {
    const bySo = hydrateOrders(loadOrders()).find((o) => o.soNumber === dispatch.salesOrderNumber);
    orderDate = bySo?.orderDate || "";
  }

  const qty =
    context?.dispatchQty ??
    dispatch?.products?.reduce((s, p) => s + (p.dispatchQty || 0), 0) ??
    0;
  const unit = context?.qtyUnit || "BAG";

  const rows = [
    {
      label: "Sales Order No.",
      value: context?.salesOrderNo || dispatch?.salesOrderNumber || "—",
    },
    { label: "Sales Order Date", value: formatDate(orderDate) },
    {
      label: "Dispatch No.",
      value: dispatch?.dispatchNumber || dispatch?.dispatch_no || dispatchNo || "—",
    },
    {
      label: "Dispatch Date",
      value: formatDate(dispatch?.dispatchDate || dispatch?.dispatch_date),
    },
    {
      label: "Warehouse",
      value:
        context?.warehouse ||
        dispatch?.warehouse ||
        dispatch?.source_warehouse_name ||
        "—",
    },
    {
      label: "Place of Supply",
      value: context?.placeOfSupply || "—",
    },
    {
      label: "Bill From",
      value:
        context?.billFrom ||
        dispatch?.source_warehouse_name ||
        dispatch?.warehouse ||
        "—",
    },
    {
      label: "Bill To",
      value: context?.billTo || dispatch?.customer || dispatch?.customer_name || "—",
    },
    {
      label: "Ship To",
      value: context?.shipTo || dispatch?.customer || dispatch?.customer_name || "—",
    },
    {
      label: "Dispatch Qty",
      value: qty > 0 ? `${qty} ${unit}` : "—",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sales-order-invoice-form-compact sales-order-invoice-dialog max-w-[680px] w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-start gap-2 pr-6">
            <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
              <Truck className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="so-dialog-title so-dialog-title--code leading-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="so-dialog-desc mt-0.5">
                Read-only dispatch reference
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-4 py-3">
          <div className="rounded-xl border border-border bg-muted/10 px-3 py-0.5">
            {rows.map((r) => (
              <InfoRow key={r.label} label={r.label} value={r.value} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
