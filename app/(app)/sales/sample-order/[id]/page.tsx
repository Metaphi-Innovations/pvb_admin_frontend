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
  getSampleOrderDisplayRecipient,
  SAMPLE_BILLING_DETAILS,
} from "../orders-data";

function orderStatusVariant(status: OrderStatus): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (["approved", "confirmed", "packed", "delivered", "dispatched"].includes(status)) return "active";
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
        Sample Order not found.{" "}
        <Link href="/sales/sample-order" className="text-brand-600">Back to sample orders</Link>
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
  const pendingApproval = canApproveOrder(order);
  const showApprovalActions = pendingApproval;
  const approvalStatus = resolveApprovalStatus(order);

  const formatRupee = (_n: number) => "₹0.00";

  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });

  const handleApprove = () => {
    const result = approveSalesOrder(order.id);
    if ("error" in result) {
      showToast(result.error, "error");
      return;
    }
    router.push("/sales/sample-order?tab=pending_approval&toast=approved");
  };

  const handleRejectSuccess = (_updated: SalesOrder) => {
    router.push("/sales/sample-order?tab=pending_approval&toast=rejected");
  };

  const quickActions: RecordDetailSidebarProps["quickActions"] = [];
  if (!showApprovalActions && editable) {
    quickActions.push({
      label: "Edit Order",
      icon: Edit,
      onClick: () => router.push(`/sales/sample-order/${order.id}/edit`),
    });
  }
  if (!showApprovalActions && piAllowed) {
    quickActions.push({
      label: "Sample Issue Note",
      icon: FileText,
      onClick: () => downloadProformaInvoice(order),
    });
  }
  if (!showApprovalActions && packingAllowed) {
    quickActions.push({
      label: "Generate Packing List",
      icon: Package,
      onClick: () => router.push(`/sales/sample-order/${order.id}/packing-list/new`),
    });
  }
  if (!showApprovalActions && splittable) {
    quickActions.push({
      label: "Split Order",
      icon: Split,
      onClick: () => router.push(`/sales/sample-order/${order.id}/split`),
    });
  }
  if (!showApprovalActions && cancellable) {
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
      { label: "Salesperson", value: getSampleOrderDisplayRecipient(order) },
      { label: "Billing", value: SAMPLE_BILLING_DETAILS.companyName },
      { label: "Order Date", value: order.orderDate },
      { label: "Warehouse", value: order.warehouseName || "—" },
      { label: "Grand Total", value: formatRupee(0), highlight: true },
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
            Review order details below and approve or reject this sample order.
          </p>
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <>
      <RecordDetailPage
        listHref={approvalMode ? "/sales/sample-order?tab=pending_approval" : "/sales/sample-order"}
        listLabel={approvalMode ? "Sample Order Approvals" : "Sample Orders"}
        recordName={getSampleOrderDisplayRecipient(order)}
        recordCode={order.soNumber}
        statusLabel={formatOrderStatus(order.status)}
        statusVariant={orderStatusVariant(order.status)}
        metaItems={[{ label: (order.issuedToEmployeeRole ?? order.territory) || "—" }]}
        kpis={[
          {
            icon: IndianRupee,
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-700",
            value: formatRupee(0),
            label: "Order Value",
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
            <RecordSectionCard title="Sample Order Details" accent="blue">
              <RecordKvRow label="Sample Order No." value={order.soNumber} mono />
              <RecordKvRow label="Order Date" value={order.orderDate} />
              <RecordKvRow label="Salesperson" value={order.salesManName} />
              <RecordKvRow label="Source Warehouse" value={order.warehouseName || "—"} />
              <RecordKvRow label="Remarks" value={order.remarks || "—"} />
              <RecordKvRow label="Order Status" value={formatOrderStatus(order.status)} />
              <RecordKvRow label="Approval Status" value={formatApprovalStatus(approvalStatus)} />
              <RecordKvRow label="Total Amount" value={formatRupee(0)} amount isLast />
            </RecordSectionCard>

            <RecordSectionCard title="Billing" accent="slate">
              <RecordKvRow label="Company" value={SAMPLE_BILLING_DETAILS.companyName} />
              <RecordKvRow label="Address" value={SAMPLE_BILLING_DETAILS.address} />
              <RecordKvRow label="GSTIN" value={SAMPLE_BILLING_DETAILS.gstin} mono />
              <RecordKvRow label="Mobile" value={SAMPLE_BILLING_DETAILS.mobile} />
              <RecordKvRow label="Contact No." value={SAMPLE_BILLING_DETAILS.contactNo} isLast />
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
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b bg-muted/40 border-border">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold">Product</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold w-16">Stock</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold w-16">Qty</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold w-16">Unit</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold">Batch</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold">Expiry</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Rate</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold w-24">GST %</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lineItems.map(line => {
                    const product = line.productId ? getProductById(line.productId) : undefined;
                    return (
                      <tr key={line.id} className="border-b border-border/60">
                        <td className="px-4 py-2">
                          <p className="text-xs font-semibold text-foreground">{line.productName || "—"}</p>
                          <p className="text-[11px] font-mono text-brand-700">{line.productCode}</p>
                        </td>
                        <td className="px-4 py-2 text-xs text-right tabular-nums">{line.productId ? line.availableStock : "—"}</td>
                        <td className="px-4 py-2 text-xs text-right tabular-nums">{line.quantity}</td>
                        <td className="px-4 py-2 text-xs">{line.unit || product?.uom || "—"}</td>
                        <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{line.batchNumber || "—"}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{line.expiryDate || "—"}</td>
                        <td className="px-4 py-2 text-xs text-right tabular-nums">{formatRupee(0)}</td>
                        <td className="px-4 py-2 text-xs text-right tabular-nums">{product?.gstRate || "0%"}</td>
                        <td className="px-4 py-2 text-xs font-semibold text-right tabular-nums">{formatRupee(0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end px-4 py-3 border-t border-border bg-muted/20">
              <div className="w-full max-w-xs space-y-1 text-xs">
                <div className="flex justify-between font-bold text-brand-700"><span>Grand Total</span><span>{formatRupee(0)}</span></div>
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
          showToast("Sample Order cancelled successfully.");
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



