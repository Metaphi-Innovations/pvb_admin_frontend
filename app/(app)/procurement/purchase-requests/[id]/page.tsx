"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Check,
  CheckCircle2,
  Edit2,
  IndianRupee,
  ListOrdered,
  ShoppingCart,
  X,
  XCircle,
} from "lucide-react";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import { PurchaseRequestForm, prToFormValues } from "../components/PurchaseRequestForm";
import { PRApprovalModal, type PRApprovalAction } from "../components/PRApprovalModal";
import {
  getPRById,
  loadPurchaseRequests,
  savePurchaseRequests,
  approvePR,
  rejectPR,
  PR_STATUS_CFG,
  type PRStatus,
} from "../pr-data";
import {
  getPRTotalAmount,
  getPRTotalItems,
} from "../pr-listing-utils";
import { formatCurrency } from "@/lib/procurement/utils";
import { Toast } from "../../components/ProcurementUI";

function prStatusVariant(status: PRStatus): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "approved" || status === "fully_converted") return "active";
  if (status === "draft") return "draft";
  if (status === "rejected") return "blocked";
  if (status === "pending_approval") return "neutral";
  return "inactive";
}

export default function PRViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [pr, setPr] = useState(getPRById(id));
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<PRApprovalAction>("approve");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => setPr(getPRById(id)), [id]);

  const formValues = useMemo(() => (pr ? prToFormValues(pr) : null), [pr]);

  if (!pr || !formValues) {
    return (
      <div className="p-8 text-sm font-semibold text-muted-foreground">
        Purchase Request not found.{" "}
        <Link href="/procurement/purchase-requests" className="text-brand-600 hover:underline">
          Back to listing
        </Link>
      </div>
    );
  }

  const openApproval = (action: PRApprovalAction) => {
    setApprovalAction(action);
    setApprovalOpen(true);
  };

  const statusLabel = PR_STATUS_CFG[pr.status]?.label ?? pr.status;
  const totalAmount = getPRTotalAmount(pr);

  const headerActions = (
    <>
      {["draft", "rejected"].includes(pr.status) && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => router.push(`/procurement/purchase-requests/${id}/edit`)}
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </Button>
      )}
      {pr.status === "pending_approval" && (
        <>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => openApproval("approve")}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => openApproval("reject")}
          >
            <XCircle className="w-3.5 h-3.5" /> Reject
          </Button>
        </>
      )}
      {pr.status === "approved" && (
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
          onClick={() => router.push(`/procurement/purchase-orders/new?prId=${id}`)}
        >
          <ShoppingCart className="w-3.5 h-3.5" /> Create PO
        </Button>
      )}
    </>
  );

  return (
    <>
      <RecordDetailPage
        listHref="/procurement/purchase-requests"
        listLabel="Purchase Requests"
        recordName="Purchase Request"
        recordCode={pr.prNumber}
        statusLabel={statusLabel}
        statusVariant={prStatusVariant(pr.status)}
        kpis={[
          {
            icon: IndianRupee,
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-700",
            value: formatCurrency(totalAmount),
            label: "Total Amount",
          },
          {
            icon: ListOrdered,
            iconBg: "bg-blue-100",
            iconColor: "text-blue-700",
            value: String(getPRTotalItems(pr)),
            label: "Line Items",
          },
          {
            icon: Activity,
            iconBg: "bg-amber-100",
            iconColor: "text-amber-700",
            value: statusLabel,
            label: "Status",
          },
        ]}
        headerActions={headerActions}
      >
        <PurchaseRequestForm
          form={formValues}
          onChange={() => {}}
          readOnly
          prNumber={pr.prNumber}
        />
      </RecordDetailPage>

      <PRApprovalModal
        open={approvalOpen}
        onClose={() => setApprovalOpen(false)}
        pr={pr}
        action={approvalAction}
        onConfirm={(remarks) => {
          const updated =
            approvalAction === "approve" ? approvePR(pr, remarks) : rejectPR(pr, remarks);
          savePurchaseRequests(
            loadPurchaseRequests().map((p) => (p.id === updated.id ? updated : p)),
          );
          setPr(updated);
          setToast({
            msg: approvalAction === "approve" ? "PR approved." : "PR rejected.",
            type: "success",
          });
        }}
      />
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
