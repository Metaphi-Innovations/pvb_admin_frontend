"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Banknote, Calendar, Pencil } from "lucide-react";
import { RecordDetailPage } from "@/components/record-detail";
import { PaymentAmountSummary } from "./components/PaymentAmountSummary";
import { PaymentStatusBadge } from "./components/PaymentStatusBadge";
import { PaymentInstallmentModal } from "./components/PaymentInstallmentModal";
import {
  addPaymentInstallment,
  getBalanceAmount,
  getCompanyPaymentById,
  getPaymentRowActions,
  payeeDisplay,
  sourceTypeLabel,
  type CompanyPaymentRecord,
} from "./payments-data";
import { ThreeWayMatchStatusBadge } from "@/components/erp/ThreeWayMatchStatusBadge";
import { getPurchasePaymentMatchContext, purchaseMatchWarning } from "@/lib/erp/payment-match-context";
import { formatINR, PAYMENTS_LIST_PATH } from "./payment-utils";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-medium text-foreground mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

function paymentStatusVariant(status: string): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "paid") return "active";
  if (status === "partial") return "neutral";
  if (status === "pending") return "draft";
  if (status === "cancelled") return "blocked";
  return "neutral";
}

export default function PaymentViewPageClient({ paymentId }: { paymentId: number }) {
  const router = useRouter();
  const [record, setRecord] = useState<CompanyPaymentRecord | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const refresh = () => {
    const r = getCompanyPaymentById(paymentId);
    if (!r) {
      router.replace(PAYMENTS_LIST_PATH);
      return;
    }
    setRecord(r);
  };

  useEffect(() => {
    refresh();
  }, [paymentId]);

  if (!record) return null;

  const actions = getPaymentRowActions(record);
  const balance = getBalanceAmount(record);
  const matchCtx = getPurchasePaymentMatchContext(record);
  const mismatchWarning = matchCtx ? purchaseMatchWarning(matchCtx.matchStatus) : null;

  return (
    <RecordDetailPage
      embedded
      listHref={PAYMENTS_LIST_PATH}
      listLabel="Payments"
      recordName={payeeDisplay(record)}
      recordCode={record.paymentNo}
      statusLabel={record.paymentStatus.charAt(0).toUpperCase() + record.paymentStatus.slice(1)}
      statusVariant={paymentStatusVariant(record.paymentStatus)}
      metaItems={[
        { icon: Calendar, label: record.paymentDate },
        { label: sourceTypeLabel(record.sourceType) },
      ]}
      onEdit={actions.includes("edit") ? () => router.push(`${PAYMENTS_LIST_PATH}/${record.id}/edit`) : undefined}
      secondaryAction={
        actions.includes("pay") ? { label: "Record Payment", onClick: () => setPayOpen(true) } : undefined
      }
      headerActions={
        actions.includes("pay") ? (
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1" onClick={() => setPayOpen(true)}>
            <Banknote className="w-3.5 h-3.5" /> Record Payment
          </Button>
        ) : undefined
      }
      sidebar={{
        summary: [
          { label: "Approved", value: formatINR(record.approvedAmount) },
          { label: "Paid", value: formatINR(record.paidAmount) },
          { label: "Balance", value: formatINR(balance), highlight: true },
          { label: "Source Ref", value: record.sourceReferenceNo || "—" },
        ],
        activity: [...record.activity].reverse().slice(0, 5).map((a, i) => ({
          id: `${a.at}-${i}`,
          title: a.action.replaceAll("_", " "),
          subtitle: a.detail,
          date: new Date(a.at).toLocaleString(),
        })),
        quickActions: actions.includes("pay")
          ? [
              {
                label: "Record Payment",
                icon: Banknote,
                variant: "primary" as const,
                onClick: () => setPayOpen(true),
              },
            ]
          : [],
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Amount details</h2>
          <PaymentStatusBadge status={record.paymentStatus} />
        </div>
        <PaymentAmountSummary record={record} />

        <div className="bg-white rounded-lg border border-border/60 p-4">
          <h2 className="text-sm font-semibold mb-3">Payment Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DetailRow label="Payment No." value={record.paymentNo} />
            <DetailRow label="Payment Date" value={record.paymentDate} />
            <DetailRow label="Payee" value={payeeDisplay(record)} />
            <DetailRow label="Payment Mode (latest)" value={record.paymentMode} />
            <DetailRow label="Reference Number" value={record.paymentReferenceNo} />
          </div>
        </div>

        {matchCtx && (
          <div className="bg-white rounded-lg border border-border/60 p-4 space-y-2">
            <h2 className="text-sm font-semibold">Procurement Match (before payment)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailRow label="PO No." value={matchCtx.poNumber} />
              <DetailRow label="Supplier Invoice No." value={matchCtx.vendorInvoiceNo} />
              <DetailRow label="Purchase No." value={matchCtx.purchaseNo} />
              <DetailRow label="3-Way Match" value={<ThreeWayMatchStatusBadge status={matchCtx.matchStatus} />} />
            </div>
            {mismatchWarning && (
              <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p>{mismatchWarning}</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg border border-border/60 p-4">
          <h2 className="text-sm font-semibold mb-3">Source Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DetailRow label="Source Type" value={sourceTypeLabel(record.sourceType)} />
            <DetailRow label="Source Reference" value={record.sourceReferenceNo || "—"} />
            <DetailRow label="Total Amount" value={formatINR(record.approvedAmount)} />
            <DetailRow label="Already Paid" value={formatINR(record.paidAmount)} />
            <DetailRow label="Balance" value={formatINR(balance)} />
            {record.sourceType === "tada_claim" && (
              <DetailRow label="Note" value="Approved in HR — payment only in Accounts" />
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-border/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Payment History</h2>
            <p className="text-xs font-semibold text-emerald-700">Total Paid: {formatINR(record.paidAmount)}</p>
          </div>
          {record.installments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No payments recorded yet. Balance {formatINR(balance)}.</p>
          ) : (
            <table className="accounts-table w-full text-xs">
              <thead className="border-b">
                <tr>
                  {["Date", "Amount", "Mode", "Reference", "Transaction", "Entered By"].map((h) => (
                    <th key={h} className="py-1.5 text-left text-[10px] uppercase text-muted-foreground font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {record.installments.map((inst) => (
                  <tr key={inst.id} className="border-b border-border/40">
                    <td className="py-1.5">{inst.paymentDate}</td>
                    <td className="py-1.5 tabular-nums font-medium">{formatINR(inst.amount)}</td>
                    <td className="py-1.5">{inst.paymentMode}</td>
                    <td className="py-1.5 font-mono">{inst.paymentReferenceNo || "—"}</td>
                    <td className="py-1.5 font-mono">{inst.transactionNo || "—"}</td>
                    <td className="py-1.5 text-muted-foreground">{inst.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {record.attachments && record.attachments.length > 0 && (
          <div className="bg-white rounded-lg border p-4">
            <h2 className="text-sm font-semibold mb-2">Attachments</h2>
            <ul className="text-xs space-y-1">
              {record.attachments.map((a, i) => (
                <li key={i}>{a.fileName ?? a.documentName ?? "Attachment"}</li>
              ))}
            </ul>
          </div>
        )}

        {record.activity.length > 0 && (
          <div className="bg-white rounded-lg border p-4">
            <h2 className="text-sm font-semibold mb-3">Activity Timeline</h2>
            <div className="space-y-2">
              {[...record.activity].reverse().map((a, i) => (
                <div key={i} className="text-xs border-l-2 border-brand-200 pl-3 py-0.5">
                  <p className="font-medium capitalize">{a.action.replaceAll("_", " ")}</p>
                  <p className="text-muted-foreground">{a.detail}</p>
                  <p className="text-[10px] text-muted-foreground">{a.by} · {new Date(a.at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <PaymentInstallmentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        record={record}
        onConfirm={(payload) => {
          addPaymentInstallment(record.id, payload);
          refresh();
        }}
      />
    </RecordDetailPage>
  );
}
