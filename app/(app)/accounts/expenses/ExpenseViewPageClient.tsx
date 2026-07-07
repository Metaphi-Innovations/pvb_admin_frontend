"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Banknote, Calendar, Download, Eye } from "lucide-react";
import { RecordDetailPage } from "@/components/record-detail";
import { FinancePaymentStatusBadge } from "./components/FinancePaymentStatusBadge";
import { FinancePaymentModal } from "./components/FinancePaymentModal";
import { PaymentAmountBreakdown } from "./components/PaymentAmountBreakdown";
import {
  getPaymentActions,
  getPaymentById,
  loadAccountPayments,
  markPaymentPaid,
  saveAccountPayments,
} from "./accounts-payment-data";
import type { AccountPaymentRecord } from "./accounts-payment-data";
import type { ClaimAttachment } from "@/app/(app)/hr/claims/tada/tada-claim-data";
import { EXPENSE_LIST_PATH, formatINR } from "./expense-utils";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-medium text-foreground mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

function attachmentAction(att: ClaimAttachment, action: "view" | "download") {
  const anyAtt = att as ClaimAttachment & { dataUrl?: string };
  if (!anyAtt.dataUrl) {
    alert(`File ${att.fileName} — preview stored in HR claim.`);
    return;
  }
  if (action === "view") window.open(anyAtt.dataUrl, "_blank");
  else {
    const a = document.createElement("a");
    a.href = anyAtt.dataUrl;
    a.download = att.fileName;
    a.click();
  }
}

function expenseStatusVariant(status: string): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "paid") return "active";
  if (status === "pending") return "draft";
  if (status === "cancelled") return "blocked";
  return "neutral";
}

export default function ExpenseViewPageClient({ paymentId }: { paymentId: number }) {
  const router = useRouter();
  const [record, setRecord] = useState<AccountPaymentRecord | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const refresh = () => {
    const r = getPaymentById(paymentId);
    if (!r) {
      router.replace(EXPENSE_LIST_PATH);
      return;
    }
    setRecord(r);
  };

  useEffect(() => {
    refresh();
  }, [paymentId]);

  if (!record) return null;

  const actions = getPaymentActions(record);

  const persist = (updated: AccountPaymentRecord) => {
    const list = loadAccountPayments();
    saveAccountPayments(list.map((r) => (r.id === updated.id ? updated : r)));
    setRecord(updated);
  };

  return (
    <RecordDetailPage
      embedded
      listHref={EXPENSE_LIST_PATH}
      listLabel="Expenses"
      recordName={record.employeeName}
      recordCode={record.referenceNo}
      statusLabel={record.paymentStatus.charAt(0).toUpperCase() + record.paymentStatus.slice(1)}
      statusVariant={expenseStatusVariant(record.paymentStatus)}
      metaItems={[
        { icon: Calendar, label: record.claimDate },
        { label: record.categoryName },
      ]}
      secondaryAction={
        actions.includes("mark_paid") ? { label: "Mark as Paid", onClick: () => setPaymentOpen(true) } : undefined
      }
      headerActions={
        actions.includes("mark_paid") ? (
          <Button
            size="sm"
            className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1"
            onClick={() => setPaymentOpen(true)}
          >
            <Banknote className="w-4 h-4" /> Mark as Paid
          </Button>
        ) : undefined
      }
      sidebar={{
        summary: [
          { label: "Approved Amount", value: formatINR(record.approvedAmount), highlight: true },
          { label: "Paid Amount", value: formatINR(record.paidAmount) },
          { label: "Employee Code", value: record.employeeCode },
          { label: "Department", value: record.department },
          { label: "Source Module", value: record.sourceModuleLabel },
        ],
        approval: record.approvalTrail.slice(-3).map((h, i) => ({
          label: h.levelLabel,
          value: h.action,
          tone: h.action === "approved" ? ("approved" as const) : h.action === "rejected" ? ("rejected" as const) : ("pending" as const),
        })),
        quickActions: actions.includes("mark_paid")
          ? [
              {
                label: "Mark as Paid",
                icon: Banknote,
                variant: "primary" as const,
                onClick: () => setPaymentOpen(true),
              },
            ]
          : [],
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Payment amounts</h2>
          <FinancePaymentStatusBadge status={record.paymentStatus} />
        </div>
        <PaymentAmountBreakdown record={record} />

        <div className="bg-white rounded-lg border border-border/60 p-4">
          <h2 className="text-sm font-semibold mb-3">Claim / Expense Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DetailRow label="Source Module" value={record.sourceModuleLabel} />
            <DetailRow label="Claim Date" value={record.claimDate} />
            <DetailRow label="Category" value={record.categoryName} />
            <DetailRow label="Description" value={record.description} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-border/60 p-4">
          <h2 className="text-sm font-semibold mb-3">Employee Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DetailRow label="Employee Name" value={record.employeeName} />
            <DetailRow label="Employee Code" value={record.employeeCode} />
            <DetailRow label="Department / Role" value={record.department} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-border/60 p-4">
          <h2 className="text-sm font-semibold mb-3">Attachments</h2>
          {record.attachments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No attachments.</p>
          ) : (
            <div className="space-y-2">
              {record.attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 py-2 px-3 rounded-md border text-xs">
                  <span className="font-medium">{att.documentName}</span>
                  <span className="text-muted-foreground flex-1 truncate">{att.fileName}</span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => attachmentAction(att, "view")}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => attachmentAction(att, "download")}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {(record.paymentDate || record.paidAmount > 0) && (
          <div className="bg-white rounded-lg border border-border/60 p-4">
            <h2 className="text-sm font-semibold mb-3">Payment Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailRow label="Payment Date" value={record.paymentDate} />
              <DetailRow label="Payment Mode" value={record.paymentMode} />
              <DetailRow label="Reference No." value={record.paymentReferenceNo} />
              <DetailRow label="Paid Amount" value={formatINR(record.paidAmount)} />
              <DetailRow label="Paid By" value={record.paidBy} />
              <DetailRow label="Remarks" value={record.paymentRemarks} />
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-border/60 p-4">
          <h2 className="text-sm font-semibold mb-3">Approval History</h2>
          <p className="text-xs text-muted-foreground mb-2">Managed in HR â†’ TA/DA Claims</p>
          <div className="space-y-3">
            {record.approvalTrail.length === 0 ? (
              <p className="text-xs text-muted-foreground">No trail recorded.</p>
            ) : (
              record.approvalTrail.map((h, i) => (
                <div key={i} className="text-xs border-l-2 border-brand-200 pl-3">
                  <p className="font-medium capitalize">
                    {h.levelLabel} — {h.action}
                  </p>
                  <p className="text-muted-foreground">
                    {h.actorName} ({h.actorRole}) · {h.channel}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(h.at).toLocaleString()}</p>
                  {h.claimedAmount != null && <p>Claimed: {formatINR(h.claimedAmount)}</p>}
                  {h.approvedAmount != null && <p className="text-emerald-700">Approved: {formatINR(h.approvedAmount)}</p>}
                  {h.remarks && <p className="mt-1">{h.remarks}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <FinancePaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        record={record}
        onConfirm={(payload) => persist(markPaymentPaid(record, payload))}
      />
    </RecordDetailPage>
  );
}
