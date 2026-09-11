"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  ListOrdered,
  Activity,
  IndianRupee,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RecordDetailPage,
  RecordSectionCard,
  RecordKvRow,
  type RecordDetailTab,
} from "@/components/record-detail";
import {
  type TransferStatus,
  formatTransferStatus,
} from "../stock-transfer-data";
import { formatFulfillmentStatus } from "@/app/(app)/sales/orders/orders-data";
import { getProductById, calculateOrderTotalsSummary } from "@/app/(app)/sales/orders/orders-data";
import { useStockTransfer } from "@/hooks/sales/use-stock-transfers";

function transferStatusVariant(status: TransferStatus): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "approved" || status === "confirmed" || status === "received") return "active";
  if (status === "draft") return "draft";
  if (status === "cancelled" || status === "rejected") return "blocked";
  return "neutral";
}

export default function ViewStockTransferPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState("overview");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const { data: transfer, isLoading, isError } = useStockTransfer(id);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  if (isLoading) {
    return <div className="p-8 text-sm">Loading stock transfer...</div>;
  }

  if (isError || !transfer) {
    return (
      <div className="p-8 text-sm text-red-600">
        Stock transfer not found.{" "}
        <Link href="/sales/stock-transfer" className="text-brand-600 font-semibold underline ml-1">Back to transfers</Link>
      </div>
    );
  }

  const totals = calculateOrderTotalsSummary(transfer.lineItems, transfer.additionalExpenses || []);

  const showIgst =
    transfer.lineItems.some((l) => Number(l.igstAmount || 0) > 0) ||
    (transfer.additionalExpenses || []).some((e) => Number(e.igstAmount || 0) > 0);
  const showCgstSgst =
    !showIgst &&
    (transfer.lineItems.some(
      (l) => Number(l.cgstAmount || 0) > 0 || Number(l.sgstAmount || 0) > 0,
    ) ||
      (transfer.additionalExpenses || []).some(
        (e) => Number(e.cgstAmount || 0) > 0 || Number(e.sgstAmount || 0) > 0,
      ) ||
      transfer.lineItems.some((l) => Number(l.gstAmount || l.gstPercentage || 0) > 0) ||
      (transfer.additionalExpenses || []).some((e) => Number(e.gstAmount || 0) > 0));

  const formatRupee = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
            value: formatRupee(totals.grandTotal),
            label: "Total Amount",
          },
          {
            icon: ListOrdered,
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-700",
            value: String(transfer.lineItems.length || transfer.totalItems),
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
              <RecordKvRow label="Fulfillment Status" value={formatFulfillmentStatus(transfer.fulfillmentStatus)} />
              <RecordKvRow label="Total Amount" value={formatRupee(totals.grandTotal)} isLast />
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
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b bg-muted/40 border-border">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold">Product</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold w-24">Qty (Cases/Loose)</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold">Unit Price</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold w-20">Discount</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold">Taxable</th>
                      {showCgstSgst && (
                        <>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold">CGST</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold">SGST</th>
                        </>
                      )}
                      {showIgst && (
                        <th className="px-4 py-2.5 text-right text-xs font-semibold">IGST</th>
                      )}
                      <th className="px-4 py-2.5 text-right text-xs font-semibold">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfer.lineItems.map(line => {
                      const product = line.productId ? getProductById(line.productId) : undefined;
                      const packSize = product?.packSize || line.unitsPerPackingUnit || 1;
                      const cases = Math.floor(line.quantity / packSize);
                      const loose = line.quantity % packSize;
                      const taxable = Math.round(
                        Math.max(0, (line.quantity || 0) * (line.finalRate ?? line.unitPrice ?? 0) - (line.discountValue || 0)) * 100,
                      ) / 100;
                      const cgstAmt = Number(line.cgstAmount || 0);
                      const sgstAmt = Number(line.sgstAmount || 0);
                      const igstAmt = Number(line.igstAmount || 0);
                      const lineGst = Number(line.gstAmount || 0) || cgstAmt + sgstAmt + igstAmt;
                      const lineTotal = Number(line.lineTotal || 0) || Math.round((taxable + lineGst) * 100) / 100;
                      const cgstPct = Number(line.cgstPercentage || 0);
                      const sgstPct = Number(line.sgstPercentage || 0);
                      const igstPct = Number(line.igstPercentage || 0);

                      return (
                        <tr key={line.id} className="border-b border-border/60">
                          <td className="px-4 py-2">
                            <p className="text-xs font-semibold text-foreground">{line.productName || "—"}</p>
                            <p className="text-[11px] font-mono text-brand-700">{line.productCode}</p>
                          </td>
                          <td className="px-4 py-2 text-xs text-right tabular-nums">
                            <div className="flex flex-col items-end">
                              <span className="font-semibold">{cases > 0 ? `${cases} Cases` : ""} {loose > 0 ? `${loose} Loose` : ""} {cases === 0 && loose === 0 ? "0" : ""}</span>
                              <span className="text-[10px] text-muted-foreground">{line.quantity} Base Qty</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-xs text-right tabular-nums">{formatRupee(line.unitPrice)}</td>
                          <td className="px-4 py-2 text-xs text-right tabular-nums">
                            {line.discountValue > 0
                              ? formatRupee(line.discountValue)
                              : line.discount > 0
                                ? `${line.discount}%`
                                : "—"}
                          </td>
                          <td className="px-4 py-2 text-xs text-right tabular-nums">{formatRupee(taxable)}</td>
                          {showCgstSgst && (
                            <>
                              <td className="px-4 py-2 text-xs text-right tabular-nums">
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] text-muted-foreground">{cgstPct}%</span>
                                  <span>{formatRupee(cgstAmt)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-xs text-right tabular-nums">
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] text-muted-foreground">{sgstPct}%</span>
                                  <span>{formatRupee(sgstAmt)}</span>
                                </div>
                              </td>
                            </>
                          )}
                          {showIgst && (
                            <td className="px-4 py-2 text-xs text-right tabular-nums">
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-muted-foreground">{igstPct}%</span>
                                <span>{formatRupee(igstAmt)}</span>
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-2 text-xs font-semibold text-right tabular-nums">{formatRupee(lineTotal)}</td>
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
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b bg-muted/40 border-border">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold">Expense Name</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold">Amount</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold">Discount</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold">Net</th>
                        {showCgstSgst && (
                          <>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold">CGST</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold">SGST</th>
                          </>
                        )}
                        {showIgst && (
                          <th className="px-4 py-2.5 text-right text-xs font-semibold">IGST</th>
                        )}
                        <th className="px-4 py-2.5 text-right text-xs font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfer.additionalExpenses.map(exp => {
                        const gstPct = Number(parseFloat(String(exp.gstRate || "0")) || 0);
                        const isInter = Number(exp.igstAmount || 0) > 0;
                        const halfPct = isInter ? 0 : gstPct / 2;
                        const igstPct = isInter ? gstPct : 0;
                        return (
                          <tr key={exp.id} className="border-b border-border/60">
                            <td className="px-4 py-2 text-xs font-semibold">{exp.expenseName}</td>
                            <td className="px-4 py-2 text-xs text-right tabular-nums">{formatRupee(exp.amount)}</td>
                            <td className="px-4 py-2 text-xs text-right tabular-nums">
                              {exp.discountType === "percent"
                                ? `${exp.discountValue || 0}%`
                                : formatRupee(exp.discountValue || 0)}
                            </td>
                            <td className="px-4 py-2 text-xs text-right tabular-nums">{formatRupee(exp.netAmount)}</td>
                            {showCgstSgst && (
                              <>
                                <td className="px-4 py-2 text-xs text-right tabular-nums">
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-muted-foreground">{halfPct}%</span>
                                    <span>{formatRupee(exp.cgstAmount || 0)}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-xs text-right tabular-nums">
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-muted-foreground">{halfPct}%</span>
                                    <span>{formatRupee(exp.sgstAmount || 0)}</span>
                                  </div>
                                </td>
                              </>
                            )}
                            {showIgst && (
                              <td className="px-4 py-2 text-xs text-right tabular-nums">
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] text-muted-foreground">{igstPct}%</span>
                                  <span>{formatRupee(exp.igstAmount || 0)}</span>
                                </div>
                              </td>
                            )}
                            <td className="px-4 py-2 text-xs font-semibold text-right tabular-nums">
                              {formatRupee(exp.totalAmount || exp.netAmount + (exp.gstAmount || 0))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-1 text-xs bg-white border border-border p-3 rounded-xl shadow-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Product Line Total</span><span>{formatRupee(totals.productSubtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>{formatRupee(totals.productDiscountTotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Additional Expenses</span><span>{formatRupee(totals.netAdditionalExpenses)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Taxable Amount</span><span>{formatRupee(totals.taxableAmount)}</span></div>
                {showCgstSgst ? (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>{formatRupee(totals.cgstTotal)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>{formatRupee(totals.sgstTotal)}</span></div>
                  </>
                ) : null}
                {showIgst ? (
                  <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span>{formatRupee(totals.igstTotal)}</span></div>
                ) : null}
                <div className="flex justify-between"><span className="text-muted-foreground">Total Tax</span><span>{formatRupee(totals.totalGst)}</span></div>
                <div className="flex justify-between font-bold text-brand-700 border-t border-border pt-1 mt-1">
                  <span>Grand Total</span>
                  <span>{formatRupee(totals.grandTotal)}</span>
                </div>
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
