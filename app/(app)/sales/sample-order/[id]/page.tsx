"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Edit,
  FileText,
  Package,
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
import { getPackingListById, PACKING_LIST_STATUS_LABELS } from "../packing-list-data";
import {
  type SalesOrder,
  type OrderStatus,
  formatOrderStatus,
  canEditOrder,
  canCancelOrder,
  canGeneratePackingList,
  formatApprovalStatus,
  resolveApprovalStatus,
  getSampleOrderDisplayRecipient,
  SAMPLE_BILLING_DETAILS,
} from "../orders-data";
import {
  useSampleOrder,
  useUpdateSampleOrderStatus,
} from "@/hooks/sales/use-sample-orders";
import { useCustomer } from "@/hooks/masters/use-customers";
import { SampleOrderService } from "@/services/sample-order.service";

function orderStatusVariant(status: OrderStatus): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (["approved", "confirmed", "packed", "delivered", "dispatched"].includes(status)) return "active";
  if (status === "draft") return "draft";
  if (["rejected", "cancelled"].includes(status)) return "blocked";
  if (status === "pending_approval") return "neutral";
  return "inactive";
}

function approvalTone(status: string): "pending" | "approved" | "rejected" | "neutral" {
  if (status === "pending_approval" || status === "submitted") return "pending";
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "neutral";
}

export default function ViewSalesOrderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = String(params.id);
  const approvalMode = searchParams.get("from") === "approval";

  const [activeTab, setActiveTab] = useState("overview");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const { data: order, isLoading, refetch } = useSampleOrder(id);
  const { data: billingCustomer } = useCustomer("1a15aac2-1e1d-4337-8642-0d1cd6e1366c");
  const updateStatusMutation = useUpdateSampleOrderStatus();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  if (isLoading) {
    return (
      <div className="p-8 text-sm">
        Loading sample order details…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-sm">
        Sample Order not found.{" "}
        <Link href="/sales/sample-order" className="text-brand-600">Back to sample orders</Link>
      </div>
    );
  }

  const packingListIdNum = typeof order.packingListId === "string" ? parseInt(order.packingListId, 10) : order.packingListId;
  const packingList = (packingListIdNum && !isNaN(packingListIdNum)) ? getPackingListById(packingListIdNum) : undefined;

  const editable = canEditOrder(order);
  const cancellable = canCancelOrder(order);
  const packingAllowed = canGeneratePackingList(order);
  const pendingApproval = order.status === "pending_approval";
  const showApprovalActions = pendingApproval;
  const approvalStatus = resolveApprovalStatus(order);

  const formatRupee = (value: number) =>
    `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });

  const handleDownloadNote = async () => {
    try {
      showToast("Downloading sample note...");
      const blob = await SampleOrderService.downloadNote(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sample-note-${order.soNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast("Failed to download note.", "error");
    }
  };

  const handleApprove = () => {
    updateStatusMutation.mutate(
      { id, status: "approved" },
      {
        onSuccess: () => {
          refetch();
          showToast("Sample Order approved successfully.");
          setApproveOpen(false);
        },
        onError: () => {
          showToast("Failed to approve order.", "error");
        }
      }
    );
  };

  const handleReject = (reason: string) => {
    updateStatusMutation.mutate(
      { id, status: "rejected", remarks: reason },
      {
        onSuccess: () => {
          refetch();
          showToast("Sample Order rejected successfully.");
          setRejectOpen(false);
        },
        onError: () => {
          showToast("Failed to reject order.", "error");
        }
      }
    );
  };

  const handleCancel = (reason: string) => {
    updateStatusMutation.mutate(
      { id, status: "cancelled", remarks: reason },
      {
        onSuccess: () => {
          refetch();
          showToast("Sample Order cancelled successfully.");
          setCancelOpen(false);
        },
        onError: () => {
          showToast("Failed to cancel order.", "error");
        }
      }
    );
  };

  const quickActions: RecordDetailSidebarProps["quickActions"] = [];
  if (!showApprovalActions && editable) {
    quickActions.push({
      label: "Edit Order",
      icon: Edit,
      onClick: () => router.push(`/sales/sample-order/${order.id}/edit`),
    });
  }
  // Download Note is always allowed for viewing
  quickActions.push({
    label: "Download Sample Note",
    icon: FileText,
    onClick: handleDownloadNote,
  });
  if (!showApprovalActions && packingAllowed) {
    quickActions.push({
      label: "Generate Packing List",
      icon: Package,
      onClick: () => router.push(`/sales/sample-order/${order.id}/packing-list/new`),
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
      { label: "Billing", value: billingCustomer?.customerName || SAMPLE_BILLING_DETAILS.companyName },
      { label: "Order Date", value: order.orderDate },
      { label: "Warehouse", value: order.warehouseName || "—" },
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
        metaItems={[{ label: order.territory || "—" }]}
        kpis={[
          {
            icon: IndianRupee,
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-700",
            value: formatRupee(order.totalAmount),
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
              <RecordKvRow label="Total Amount" value={formatRupee(order.totalAmount)} amount isLast />
            </RecordSectionCard>

            <RecordSectionCard title="Billing" accent="slate">
              <RecordKvRow label="Company" value={billingCustomer?.customerName || SAMPLE_BILLING_DETAILS.companyName} />
              <RecordKvRow label="Address" value={billingCustomer?.registeredGstAddress || SAMPLE_BILLING_DETAILS.address} />
              <RecordKvRow label="GSTIN" value={billingCustomer?.gstinNo || SAMPLE_BILLING_DETAILS.gstin} mono />
              <RecordKvRow label="Mobile" value={billingCustomer?.mobileNo || SAMPLE_BILLING_DETAILS.mobile} />
              <RecordKvRow label="Contact No." value={SAMPLE_BILLING_DETAILS.contactNo} isLast />
            </RecordSectionCard>

            <div className="space-y-4">
              {order.status === "cancelled" && (
                <RecordSectionCard title="Cancellation" accent="orange">
                  <RecordKvRow label="Reason" value={order.cancellationReason || "—"} />
                  <RecordKvRow label="Cancelled By" value={order.cancelledBy || "—"} />
                  <RecordKvRow label="Cancelled Date" value={order.cancelledDate || "—"} isLast />
                </RecordSectionCard>
              )}

              {(order.status === "approved") && (
                <RecordSectionCard title="Approval" accent="green">
                  <RecordKvRow label="Approved By" value={order.approvedBy || "—"} />
                  <RecordKvRow label="Approved Date" value={order.approvedDate || "—"} isLast />
                </RecordSectionCard>
              )}

              {(order.status === "rejected") && (
                <RecordSectionCard title="Rejection" accent="orange">
                  <RecordKvRow label="Reason" value={order.rejectionReason || "—"} />
                  <RecordKvRow label="Rejected By" value={order.rejectedBy || "—"} />
                  <RecordKvRow label="Rejected Date" value={order.rejectedDate || "—"} isLast />
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
                    return (
                      <tr key={line.id} className="border-b border-border/60">
                        <td className="px-4 py-2">
                          <p className="text-xs font-semibold text-foreground">{line.productName || "—"}</p>
                          <p className="text-[11px] font-mono text-brand-700">{line.productCode}</p>
                        </td>
                        <td className="px-4 py-2 text-xs text-right tabular-nums">{line.productId ? line.availableStock : "—"}</td>
                        <td className="px-4 py-2 text-xs text-right tabular-nums">{line.quantity}</td>
                        <td className="px-4 py-2 text-xs">{line.unit || "—"}</td>
                        <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{line.batchNumber || "—"}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{line.expiryDate || "—"}</td>
                        <td className="px-4 py-2 text-xs text-right tabular-nums">{formatRupee(line.unitPrice)}</td>
                        <td className="px-4 py-2 text-xs text-right tabular-nums">{line.discount === 100 ? "0%" : `${100 - line.discount}%`}</td>
                        <td className="px-4 py-2 text-xs font-semibold text-right tabular-nums">{formatRupee(line.lineTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end px-4 py-3 border-t border-border bg-muted/20">
              <div className="w-full max-w-xs space-y-1 text-xs">
                <div className="flex justify-between font-bold text-brand-700"><span>Grand Total</span><span>{formatRupee(order.totalAmount)}</span></div>
              </div>
            </div>
          </div>
        )}
      </RecordDetailPage>

      <CancelOrderDialog
        order={order}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
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
        onConfirm={handleReject}
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
