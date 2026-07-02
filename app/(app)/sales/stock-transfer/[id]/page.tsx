"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  ListOrdered,
  Activity,
  Warehouse,
  IndianRupee,
  FileText,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RecordDetailPage,
  RecordSectionCard,
  RecordKvRow,
  type RecordDetailSidebarProps,
  type RecordDetailTab,
} from "@/components/record-detail";
import {
  type StockTransfer,
  type TransferStatus,
  getTransferById,
  formatTransferStatus,
  canEditTransfer,
  canCancelTransfer,
  canDownloadNote,
  canGeneratePackingList,
  approveStockTransfer,
  rejectStockTransfer,
} from "../stock-transfer-data";
import { getProductById, calculateOrderTotalsSummary } from "@/app/(app)/sales/orders/orders-data";
import { downloadTransferNote, printTransferPackingList } from "../transfer-note-document";
import CancelTransferDialog from "../components/CancelTransferDialog";

function transferStatusVariant(status: TransferStatus): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "approved") return "active";
  if (status === "draft") return "draft";
  if (status === "cancelled" || status === "rejected") return "blocked";
  if (status === "pending") return "neutral";
  return "inactive";
}

export default function ViewStockTransferPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [transfer, setTransfer] = useState<StockTransfer | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const refresh = () => {
    const t = getTransferById(id);
    if (t) setTransfer(t);
  };

  useEffect(() => {
    refresh();
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  if (!transfer) {
    return (
      <div className="p-8 text-sm">
        Stock transfer not found.{" "}
        <Link href="/sales/stock-transfer" className="text-brand-600">Back to transfers</Link>
      </div>
    );
  }
  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });

  const totals = calculateOrderTotalsSummary(transfer.lineItems, transfer.additionalExpenses || []);

  const formatRupee = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleCancelSuccess = (_updatedTransfer: StockTransfer) => {
    refresh();
    showToast("Stock transfer cancelled successfully.");
  };

  const handleApprove = () => {
    const res = approveStockTransfer(transfer.id);
    if ("error" in res) {
      showToast(res.error, "error");
    } else {
      showToast("Stock transfer approved successfully.");
      refresh();
    }
  };

  const handleReject = () => {
    const res = rejectStockTransfer(transfer.id);
    if ("error" in res) {
      showToast(res.error, "error");
    } else {
      showToast("Stock transfer rejected.");
      refresh();
    }
  };

  const quickActions: RecordDetailSidebarProps["quickActions"] = [];
  if (canEditTransfer(transfer)) {
    quickActions.push({
      label: "Edit Transfer",
      icon: Edit,
      onClick: () => router.push(`/sales/stock-transfer/${transfer.id}/edit`),
    });
  }
  if (canDownloadNote(transfer)) {
    quickActions.push({
      label: "Download Note",
      icon: FileText,
      onClick: () => downloadTransferNote(transfer),
    });
  }
  if (canGeneratePackingList(transfer)) {
    quickActions.push({
      label: "Generate Packing List",
      icon: Package,
      onClick: () => router.push(`/sales/stock-transfer/${transfer.id}/packing-list/new`),
    });
  }
  if (canCancelTransfer(transfer)) {
    quickActions.push({
      label: "Cancel Transfer",
      icon: Trash2,
      onClick: () => setCancelOpen(true),
    });
  }

  const sidebar: RecordDetailSidebarProps = {
    quickActions,
    summary: [
      { label: "Source Warehouse", value: `${transfer.sourceWarehouseCode} — ${transfer.sourceWarehouseName}` },
      { label: "Target Warehouse", value: `${transfer.targetWarehouseCode} — ${transfer.targetWarehouseName}` },
      { label: "Transfer Date", value: transfer.transferDate },
      { label: "Delivery Date", value: transfer.deliveryDate },
      { label: "Grand Total", value: formatRupee(transfer.totalAmount), highlight: true },
    ],
    approval: [
      {
        label: "Status",
        value: formatTransferStatus(transfer.status),
        tone: transfer.status === "approved" ? "approved" : (transfer.status === "cancelled" || transfer.status === "rejected") ? "rejected" : transfer.status === "pending" ? "pending" : "neutral",
      },
    ],
  };

  const tabs: RecordDetailTab[] = [
    { value: "overview", label: "Overview" },
    { value: "line-items", label: "Items", count: transfer.lineItems.length },
  ];

  return (
    <>
      <RecordDetailPage
        listHref="/sales/stock-transfer"
        listLabel="Stock Transfers"
        recordName={`${transfer.sourceWarehouseName} ➔ ${transfer.targetWarehouseName}`}
        recordCode={transfer.transferNumber}
        statusLabel={formatTransferStatus(transfer.status)}
        statusVariant={transferStatusVariant(transfer.status)}
        metaItems={[{ label: `Date: ${transfer.transferDate}` }]}
        kpis={[
          {
            icon: IndianRupee,
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-700",
            value: formatRupee(transfer.totalAmount),
            label: "Total Amount",
          },
          {
            icon: ListOrdered,
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-700",
            value: String(transfer.totalItems),
            label: "Line Items",
          },
          {
            icon: Activity,
            iconBg: "bg-amber-100",
            iconColor: "text-amber-700",
            value: formatTransferStatus(transfer.status),
            label: "Status",
          },
        ]}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sidebar={sidebar}
      >
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RecordSectionCard title="Transfer Details" accent="blue">
              <RecordKvRow label="Transfer Number" value={transfer.transferNumber} mono />
              <RecordKvRow label="Transfer Date" value={transfer.transferDate} />
              <RecordKvRow label="Delivery Date" value={transfer.deliveryDate} />
              <RecordKvRow label="Source Warehouse" value={`${transfer.sourceWarehouseCode} — ${transfer.sourceWarehouseName}`} />
              <RecordKvRow label="Target Warehouse" value={`${transfer.targetWarehouseCode} — ${transfer.targetWarehouseName}`} />
              <RecordKvRow label="Status" value={formatTransferStatus(transfer.status)} />
              <RecordKvRow label="Total Amount" value={formatRupee(transfer.totalAmount)} isLast />
            </RecordSectionCard>

            <div className="space-y-4">
              <RecordSectionCard title="Packaging Details" accent="green">
                <RecordKvRow label="Packaging List" value={transfer.packingListId ? "Generated" : "Not Generated"} />
                {transfer.packingListId ? (
                  <>
                    <RecordKvRow label="Packaging List No." value={transfer.packingListNumber || "—"} mono />
                    <RecordKvRow label="Packing Status" value={transfer.packingStatus || "Pending"} />
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 gap-1 hover:bg-slate-50"
                        onClick={() => router.push(`/warehouse/packing`)}
                      >
                        <Package className="w-3.5 h-3.5" /> Open in Packing Module
                      </Button>
                    </div>
                  </>
                ) : null}
              </RecordSectionCard>
              {transfer.status === "cancelled" && (
                <RecordSectionCard title="Cancellation" accent="orange">
                  <RecordKvRow label="Reason" value={transfer.cancellationReason || "No reason provided."} />
                  <RecordKvRow label="Cancelled By" value={transfer.cancelledBy || "—"} />
                  <RecordKvRow label="Cancelled Date" value={transfer.cancelledDate || "—"} isLast />
                </RecordSectionCard>
              )}

              {transfer.status === "rejected" && (
                <RecordSectionCard title="Rejection" accent="orange">
                  <RecordKvRow label="Reason" value={transfer.rejectionReason || "No reason provided."} />
                  <RecordKvRow label="Rejected By" value={transfer.rejectedBy || "—"} />
                  <RecordKvRow label="Rejected Date" value={transfer.rejectedDate || "—"} isLast />
                </RecordSectionCard>
              )}

              <RecordSectionCard title="Audit" accent="slate">
                <RecordKvRow label="Created By" value={transfer.createdBy} />
                <RecordKvRow label="Created Date" value={transfer.createdDate} />
                <RecordKvRow label="Updated By" value={transfer.updatedBy} />
                <RecordKvRow label="Updated Date" value={transfer.updatedDate} isLast />
              </RecordSectionCard>
            </div>
          </div>
        )}

        {activeTab === "line-items" && (
          <div className="space-y-4">
            <div className="overflow-hidden bg-white border shadow-sm rounded-xl border-border">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <p className="text-xs font-semibold text-foreground">Transferred Items</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b bg-muted/40 border-border">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold">Product</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold w-16">Stock</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold w-16">Qty</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold">Unit Price</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold w-20">Discount (%)</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold w-24">GST % / Amt</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfer.lineItems.map(line => {
                      const product = line.productId ? getProductById(line.productId) : undefined;
                      return (
                        <tr key={line.id} className="border-b border-border/60">
                          <td className="px-4 py-2">
                            <p className="text-xs font-semibold text-foreground">{line.productName || "—"}</p>
                            <p className="text-[11px] font-mono text-brand-700">{line.productCode}</p>
                          </td>
                          <td className="px-4 py-2 text-xs text-right tabular-nums">{line.productId ? line.availableStock : "—"}</td>
                          <td className="px-4 py-2 text-xs text-right tabular-nums">{line.quantity}</td>
                          <td className="px-4 py-2 text-xs text-right tabular-nums">{formatRupee(line.unitPrice)}</td>
                          <td className="px-4 py-2 text-xs text-right tabular-nums">{line.discount}%</td>
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
            </div>

            {transfer.additionalExpenses && transfer.additionalExpenses.length > 0 && (
              <div className="overflow-hidden bg-white border shadow-sm rounded-xl border-border">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                  <p className="text-xs font-semibold text-foreground">Additional Expenses</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/40 border-border">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold">Expense Name</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold">Amount</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold">Discount</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold">Net Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfer.additionalExpenses.map(exp => (
                        <tr key={exp.id} className="border-b border-border/60">
                          <td className="px-4 py-2 text-xs font-semibold">{exp.expenseName}</td>
                          <td className="px-4 py-2 text-xs text-right tabular-nums">{formatRupee(exp.amount)}</td>
                          <td className="px-4 py-2 text-xs text-left">
                            {exp.discountType === "percent" ? `${exp.discountValue}%` : formatRupee(exp.discountValue)}
                          </td>
                          <td className="px-4 py-2 text-xs font-semibold text-right tabular-nums">{formatRupee(exp.netAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-1 text-xs bg-white border border-border p-3 rounded-xl shadow-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Product Subtotal</span><span>{formatRupee(totals.productSubtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Product Discount</span><span>{formatRupee(totals.productDiscountTotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Additional Expenses</span><span>{formatRupee(totals.netAdditionalExpenses)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Taxable Amount</span><span>{formatRupee(totals.taxableAmount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total GST</span><span>{formatRupee(totals.totalGst)}</span></div>
                <div className="flex justify-between font-bold text-brand-700 border-t border-border pt-1 mt-1"><span>Grand Total</span><span>{formatRupee(totals.grandTotal)}</span></div>
              </div>
            </div>
          </div>
        )}
      </RecordDetailPage>



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







