"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Edit,
  FileText,
  Package,
  Split,
  Trash2,
  CheckCircle2,
  XCircle,
  Check,
  X,
  IndianRupee,
  ListOrdered,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RecordDetailPage,
  RecordSectionCard,
  RecordKvRow,
  type RecordDetailSidebarProps,
  type RecordDetailTab,
} from "@/components/record-detail";
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
  isProductDiscountSchemeApplied,
} from "../orders-data";
import {
  formatSchemeRupee,
} from "@/app/(app)/masters/scheme/product-discount-scheme";
import { Badge } from "@/components/ui/badge";

function orderStatusVariant(status: OrderStatus): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (["approved", "confirmed", "delivered", "dispatched"].includes(status)) return "active";
  if (status === "draft") return "draft";
  if (["rejected", "cancelled"].includes(status)) return "blocked";
  if (status === "pending_approval") return "neutral";
  return "inactive";
}

function approvalTone(status: ReturnType<typeof resolveApprovalStatus>): "pending" | "approved" | "rejected" | "neutral" {
  if (status === "pending_approval") return "pending";
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "neutral";
}

export default function ViewSalesOrderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(params.id);
  const approvalMode = searchParams.get("from") === "approval";

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
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
      <div className="p-8 text-sm">
        Sales order not found.{" "}
        <Link href="/sales/orders" className="text-brand-600">Back to orders</Link>
      </div>
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

  const quickActions: RecordDetailSidebarProps["quickActions"] = [];
  if (!approvalMode && editable) {
    quickActions.push({
      label: "Edit Order",
      icon: Edit,
      onClick: () => router.push(`/sales/orders/${order.id}/edit`),
    });
  }
  if (!approvalMode && piAllowed) {
    quickActions.push({
      label: "Download PI",
      icon: FileText,
      onClick: () => downloadProformaInvoice(order),
    });
  }
  if (!approvalMode && packingAllowed) {
    quickActions.push({
      label: "Generate Packing List",
      icon: Package,
      onClick: () => setPackingOpen(true),
    });
  }
  if (!approvalMode && splittable) {
    quickActions.push({
      label: "Split Order",
      icon: Split,
      onClick: () => router.push(`/sales/orders/${order.id}/split`),
    });
  }
  if (!approvalMode && cancellable) {
    quickActions.push({
      label: "Cancel Order",
      icon: Trash2,
      onClick: () => setCancelOpen(true),
    });
  }

  const approvalItems: RecordDetailSidebarProps["approval"] = [
    {
      label: "Approval Status",
      value: formatApprovalStatus(approvalStatus),
      tone: approvalTone(approvalStatus),
    },
    {
      label: "Order Status",
      value: formatOrderStatus(order.status),
      tone: orderStatusVariant(order.status) === "active" ? "approved" : orderStatusVariant(order.status) === "blocked" ? "rejected" : "neutral",
    },
  ];
  if (order.approvedBy) {
    approvalItems.push({ label: "Approved By", value: order.approvedBy, tone: "neutral" });
  }
  if (order.approvedDate) {
    approvalItems.push({ label: "Approved Date", value: order.approvedDate, tone: "neutral" });
  }
  if (order.rejectionReason) {
    approvalItems.push({ label: "Rejection Reason", value: order.rejectionReason, tone: "rejected" });
  }

  const sidebar: RecordDetailSidebarProps = {
    quickActions,
    summary: [
      { label: "Customer", value: `${order.customerCode} — ${order.customerName}` },
      { label: "Order Date", value: order.orderDate },
      { label: "Delivery Date", value: order.deliveryDate || "—" },
      { label: "Salesman", value: order.salesManName || "—" },
      { label: "Territory", value: order.territory || "—" },
      { label: "Grand Total", value: formatRupee(order.totalAmount), highlight: true },
    ],
    approval: approvalItems,
  };

  const tabs: RecordDetailTab[] = [
    { value: "overview", label: "Overview" },
    { value: "line-items", label: "Line Items", count: order.lineItems.length },
  ];

  const headerActions = showApprovalActions ? (
    <>
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
    </>
  ) : undefined;

  const approvalBanner = showApprovalActions ? (
    <div className="p-4 bg-white border shadow-sm rounded-xl border-border">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground">Approval Required</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Review order details below and approve or reject this sales order.
          </p>
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <>
      <RecordDetailPage
        listHref={approvalMode ? "/sales/orders?tab=approval" : "/sales/orders"}
        listLabel={approvalMode ? "Order Approvals" : "Sales Orders"}
        recordName={order.customerName}
        recordCode={order.soNumber}
        statusLabel={formatOrderStatus(order.status)}
        statusVariant={orderStatusVariant(order.status)}
        metaItems={[{ label: order.territory || "—" }]}
        kpis={[
          {
            icon: IndianRupee,
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-700",
            value: formatRupee(order.totalAmount),
            label: "Total Amount",
          },
          {
            icon: ListOrdered,
            iconBg: "bg-blue-100",
            iconColor: "text-blue-700",
            value: String(order.lineItems.length),
            label: "Line Items",
          },
          {
            icon: Activity,
            iconBg: "bg-amber-100",
            iconColor: "text-amber-700",
            value: formatOrderStatus(order.status),
            label: "Status",
          },
        ]}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        headerActions={headerActions}
        sidebar={sidebar}
        banner={approvalBanner}
      >
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RecordSectionCard title="Order Details" accent="blue">
              <RecordKvRow label="Order Number" value={order.soNumber} mono />
              <RecordKvRow label="Order Date" value={order.orderDate} />
              <RecordKvRow label="Delivery Date" value={order.deliveryDate} />
              <RecordKvRow label="Customer" value={`${order.customerCode} — ${order.customerName}`} />
              <RecordKvRow label="Salesman ID" value={order.salesManId ?? "—"} />
              <RecordKvRow label="Salesman" value={order.salesManName} />
              <RecordKvRow label="Territory" value={order.territory} />
              <RecordKvRow label="Order Status" value={formatOrderStatus(order.status)} />
              <RecordKvRow label="Approval Status" value={formatApprovalStatus(approvalStatus)} />
              <RecordKvRow label="Total Amount" value={formatRupee(order.totalAmount)} amount />
              <RecordKvRow label="Remarks" value={order.remarks?.trim() || "—"} isLast />
            </RecordSectionCard>

            <div className="space-y-4">
              {(order.referenceOrderNumber || order.parentOrderNumber || order.splitFromOrderNumber) && (
                <RecordSectionCard title="Split Reference" accent="purple">
                  {order.referenceOrderNumber && (
                    <RecordKvRow label="Reference Order" value={order.referenceOrderNumber} mono />
                  )}
                  {order.parentOrderNumber && (
                    <RecordKvRow label="Parent Order" value={order.parentOrderNumber} mono />
                  )}
                  {order.splitFromOrderNumber && (
                    <RecordKvRow label="Split From" value={order.splitFromOrderNumber} mono isLast />
                  )}
                </RecordSectionCard>
              )}

              {order.status === "cancelled" && (
                <RecordSectionCard title="Cancellation" accent="orange">
                  <RecordKvRow label="Reason" value={order.cancellationReason} />
                  <RecordKvRow label="Cancelled By" value={order.cancelledBy} />
                  <RecordKvRow label="Cancelled Date" value={order.cancelledDate} isLast />
                </RecordSectionCard>
              )}

              {(order.approvalStatus === "approved" || order.status === "approved") && (
                <RecordSectionCard title="Approval" accent="green">
                  <RecordKvRow label="Approved By" value={order.approvedBy} />
                  <RecordKvRow label="Approved Date" value={order.approvedDate} isLast />
                </RecordSectionCard>
              )}

              {(order.approvalStatus === "rejected" || order.status === "rejected") && (
                <RecordSectionCard title="Rejection" accent="orange">
                  <RecordKvRow label="Reason" value={order.rejectionReason} />
                  <RecordKvRow label="Rejected By" value={order.rejectedBy} />
                  <RecordKvRow label="Rejected Date" value={order.rejectedDate} isLast />
                </RecordSectionCard>
              )}

              {(order.packingListNumber || packingList) && (
                <RecordSectionCard title="Packing List" accent="blue">
                  <RecordKvRow label="PL Number" value={order.packingListNumber} mono />
                  <RecordKvRow
                    label="Packing Status"
                    value={order.packingStatus ? (PACKING_LIST_STATUS_LABELS[order.packingStatus] ?? order.packingStatus) : "—"}
                  />
                  <RecordKvRow
                    label="Warehouse"
                    value={order.warehouseName ?? packingList?.warehouseName}
                    isLast
                  />
                </RecordSectionCard>
              )}

              <RecordSectionCard title="Audit" accent="slate">
                <RecordKvRow label="Created By" value={order.createdBy} />
                <RecordKvRow label="Created Date" value={order.createdDate} />
                <RecordKvRow label="Updated By" value={order.updatedBy} />
                <RecordKvRow label="Updated Date" value={order.updatedDate} isLast />
              </RecordSectionCard>
            </div>
          </div>
        )}

        {activeTab === "line-items" && (
          <div className="overflow-hidden bg-white border shadow-sm rounded-xl border-border">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-foreground">Product Lines</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b bg-muted/40 border-border">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold">Product</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold w-16">Stock</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold w-16">Qty</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">DP</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold">Offer</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Disc. Amt</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Final Rate</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold w-24">GST % / Amt</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lineItems.map(line => {
                    const product = line.productId ? getProductById(line.productId) : undefined;
                    const hasScheme = isProductDiscountSchemeApplied(line);
                    return (
                      <tr key={line.id} className="border-b border-border/60">
                        <td className="px-4 py-2">
                          <p className="text-xs font-semibold text-foreground">{line.productName || "—"}</p>
                          <p className="text-[11px] font-mono text-brand-700">{line.productCode}</p>
                        </td>
                        <td className="px-4 py-2 text-xs text-right tabular-nums">{line.productId ? line.availableStock : "—"}</td>
                        <td className="px-4 py-2 text-xs text-right tabular-nums">{line.quantity}</td>
                        <td className="px-4 py-2 text-xs text-right tabular-nums">{formatSchemeRupee(line.dealerPrice)}</td>
                        <td className="px-4 py-2">
                          {hasScheme ? (
                            <div className="flex flex-col gap-0.5">
                              <Badge className="w-fit px-1.5 py-0 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-600">
                                Applied
                              </Badge>
                              <span className="text-[10px] font-mono text-brand-700">
                                {line.appliedSchemeCode ?? line.schemeCode}
                              </span>
                              <span className="text-[10px] text-emerald-700 tabular-nums">
                                {formatSchemeRupee(line.schemeDiscountAmount)} off
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No Scheme</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-right tabular-nums">
                          {hasScheme ? formatSchemeRupee(line.schemeDiscountAmount) : "—"}
                        </td>
                        <td className="px-4 py-2 text-xs text-right tabular-nums font-medium">{formatSchemeRupee(line.finalRate)}</td>
                        <td className="px-4 py-2 text-xs text-right tabular-nums">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-muted-foreground font-semibold">{product?.gstRate || "0%"}</span>
                            <span>{formatRupee(line.gstAmount)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-xs font-semibold text-right tabular-nums">{formatRupee(line.lineTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end px-4 py-3 border-t border-border bg-muted/20">
              <div className="w-full max-w-xs space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Net Total</span><span>{formatRupee(totals.netTotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total GST</span><span>{formatRupee(totals.totalGst)}</span></div>
                <div className="flex justify-between font-bold text-brand-700"><span>Grand Total</span><span>{formatRupee(totals.grandTotal)}</span></div>
              </div>
            </div>
          </div>
        )}
      </RecordDetailPage>

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
    </>
  );
}
