"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Banknote, Download, Eye } from "lucide-react";
import { AccountsFormLayout } from "./components/AccountsFormLayout";
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
import { EXPENSE_BREADCRUMB, EXPENSE_LIST_PATH, formatINR } from "./expense-utils";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
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
    <AccountsFormLayout
      title="View Expense / Claim"
      breadcrumb={[...EXPENSE_BREADCRUMB]}
      code={record.referenceNo}
      footer={
        actions.includes("mark_paid") ? (
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1"
            onClick={() => setPaymentOpen(true)}
          >
            <Banknote className="w-3.5 h-3.5" /> Mark as Paid
          </Button>
        ) : null
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8">
        <div className="lg:col-span-2 space-y-4">
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
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => attachmentAction(att, "download")}>
                      <Download className="w-3.5 h-3.5" />
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
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-border/60 p-4">
            <h2 className="text-sm font-semibold mb-3">Approval History</h2>
            <p className="text-[10px] text-muted-foreground mb-2">Managed in HR → TA/DA Claims</p>
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
                    <p className="text-[10px] text-muted-foreground">{new Date(h.at).toLocaleString()}</p>
                    {h.claimedAmount != null && <p>Claimed: {formatINR(h.claimedAmount)}</p>}
                    {h.approvedAmount != null && <p className="text-emerald-700">Approved: {formatINR(h.approvedAmount)}</p>}
                    {h.remarks && <p className="mt-1">{h.remarks}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <FinancePaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        record={record}
        onConfirm={(payload) => persist(markPaymentPaid(record, payload))}
      />
    </AccountsFormLayout>
  );
}
