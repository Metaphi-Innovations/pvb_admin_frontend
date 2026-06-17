"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PRFormLayout } from "../components/PRFormLayout";
import { PurchaseRequestForm, prToFormValues } from "../components/PurchaseRequestForm";
import { PRFormFooter } from "../components/PRFormFooter";
import { ProcButton } from "../../design/proc-design";
import { PRApprovalModal, type PRApprovalAction } from "../components/PRApprovalModal";
import {
  getPRById,
  loadPurchaseRequests,
  savePurchaseRequests,
  approvePR,
  rejectPR,
} from "../pr-data";
import { CheckCircle2, Edit2, ShoppingCart, XCircle } from "lucide-react";
import { Toast } from "../../components/ProcurementUI";

export default function PRViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [pr, setPr] = useState(getPRById(id));
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<PRApprovalAction>("approve");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => setPr(getPRById(id)), [id]);

  if (!pr) {
    return (
      <div className="p-8 text-sm">
        Not found.{" "}
        <Link href="/procurement/purchase-requests" className="text-brand-600">
          Back
        </Link>
      </div>
    );
  }

  const openApproval = (action: PRApprovalAction) => {
    setApprovalAction(action);
    setApprovalOpen(true);
  };

  const headerActions = (
    <>
      {pr.status === "pending_approval" && (
        <>
          <ProcButton variant="danger" size="sm" onClick={() => openApproval("reject")}>
            <XCircle className="w-3.5 h-3.5" /> Reject
          </ProcButton>
          <ProcButton variant="success" size="sm" onClick={() => openApproval("approve")}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </ProcButton>
        </>
      )}
      {["draft", "rejected"].includes(pr.status) && (
        <Link href={`/procurement/purchase-requests/${id}/edit`}>
          <ProcButton variant="outline" size="sm"><Edit2 className="w-3.5 h-3.5" /> Edit</ProcButton>
        </Link>
      )}
      {pr.status === "approved" && (
        <Link href={`/procurement/purchase-orders/new?prId=${id}`}>
          <ProcButton variant="primary" size="sm"><ShoppingCart className="w-3.5 h-3.5" /> Create PO</ProcButton>
        </Link>
      )}
    </>
  );

  return (
    <>
      <PRFormLayout
        mode="view"
        prNumber={pr.prNumber}
        status={pr.status}
        headerActions={headerActions}
        footer={
          <PRFormFooter
            readOnly
            onCancel={() => router.push("/procurement/purchase-requests")}
          />
        }
      >
        <PurchaseRequestForm
          form={prToFormValues(pr)}
          onChange={() => {}}
          readOnly
          prNumber={pr.prNumber}
        />
      </PRFormLayout>

      <PRApprovalModal
        open={approvalOpen}
        onClose={() => setApprovalOpen(false)}
        pr={pr}
        action={approvalAction}
        onConfirm={(remarks) => {
          const updated =
            approvalAction === "approve" ? approvePR(pr, remarks) : rejectPR(pr, remarks);
          savePurchaseRequests(loadPurchaseRequests().map((p) => (p.id === updated.id ? updated : p)));
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
