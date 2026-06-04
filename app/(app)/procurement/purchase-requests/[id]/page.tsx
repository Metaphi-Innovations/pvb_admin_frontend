"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PRFormLayout } from "../components/PRFormLayout";
import { PurchaseRequestForm, prToFormValues } from "../components/PurchaseRequestForm";
import { PRFormFooter } from "../components/PRFormFooter";
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
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-sm text-red-600 border-red-200"
            onClick={() => openApproval("reject")}
          >
            <XCircle className="w-4 h-4 mr-1" /> Reject
          </Button>
          <Button
            size="sm"
            className="h-9 text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => openApproval("approve")}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
          </Button>
        </>
      )}
      {["draft", "rejected"].includes(pr.status) && (
        <Link href={`/procurement/purchase-requests/${id}/edit`}>
          <Button variant="outline" size="sm" className="h-9 text-sm">
            <Edit2 className="w-4 h-4 mr-1" /> Edit
          </Button>
        </Link>
      )}
      {pr.status === "approved" && (
        <Link href={`/procurement/purchase-orders/new?prId=${id}`}>
          <Button size="sm" className="h-9 text-sm bg-brand-600 text-white">
            <ShoppingCart className="w-4 h-4 mr-1" /> Create PO
          </Button>
        </Link>
      )}
    </>
  );

  return (
    <>
      <PRFormLayout
        mode="view"
        prNumber={pr.prNumber}
        pr={pr}
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
