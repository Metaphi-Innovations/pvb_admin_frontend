"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Edit2, ShoppingCart, XCircle } from "lucide-react";
import {
  RecordDetailPage,
  OVERVIEW_TAB,
  type RecordDetailSidebarProps,
} from "@/components/record-detail";
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
import { Toast } from "../../components/ProcurementUI";

function prStatusVariant(status: PRStatus): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "approved" || status === "fully_converted") return "active";
  if (status === "draft") return "draft";
  if (status === "rejected") return "blocked";
  if (status === "pending_approval") return "neutral";
  return "inactive";
}

function prApprovalTone(status: PRStatus): "pending" | "approved" | "rejected" | "neutral" {
  if (status === "pending_approval") return "pending";
  if (status === "approved" || status === "fully_converted" || status === "partially_converted") return "approved";
  if (status === "rejected") return "rejected";
  return "neutral";
}

export default function PRViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [pr, setPr] = useState(getPRById(id));
  const [activeTab, setActiveTab] = useState("overview");
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

  const quickActions: RecordDetailSidebarProps["quickActions"] = [];
  if (pr.status === "pending_approval") {
    quickActions.push(
      {
        label: "Approve",
        icon: CheckCircle2,
        onClick: () => openApproval("approve"),
        variant: "primary",
      },
      {
        label: "Reject",
        icon: XCircle,
        onClick: () => openApproval("reject"),
      },
    );
  }
  if (["draft", "rejected"].includes(pr.status)) {
    quickActions.push({
      label: "Edit",
      icon: Edit2,
      onClick: () => router.push(`/procurement/purchase-requests/${id}/edit`),
    });
  }
  if (pr.status === "approved") {
    quickActions.push({
      label: "Create PO",
      icon: ShoppingCart,
      onClick: () => router.push(`/procurement/purchase-orders/new?prId=${id}`),
      variant: "primary",
    });
  }

  const sidebar: RecordDetailSidebarProps = {
    quickActions,
    summary: [
      { label: "PR Date", value: pr.prDate },
      { label: "Requested By", value: pr.requestedBy },
      { label: "Required By", value: pr.requiredByDate },
      { label: "Created By", value: pr.createdBy },
      { label: "Line Items", value: String(pr.lines.length) },
    ],
    activity: [...pr.activity].reverse().map((a, i) => ({
      id: `${a.date}-${i}`,
      title: a.action,
      subtitle: a.note ? `${a.by} · ${a.note}` : a.by,
      date: a.date,
    })),
    approval: [
      {
        label: "Status",
        value: PR_STATUS_CFG[pr.status]?.label ?? pr.status,
        tone: prApprovalTone(pr.status),
      },
    ],
  };

  return (
    <>
      <RecordDetailPage
        listHref="/procurement/purchase-requests"
        listLabel="Purchase Requests"
        recordName="Purchase Request"
        recordCode={pr.prNumber}
        statusLabel={PR_STATUS_CFG[pr.status]?.label ?? pr.status}
        statusVariant={prStatusVariant(pr.status)}
        tabs={[OVERVIEW_TAB]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sidebar={sidebar}
      >
        {activeTab === "overview" && (
          <PurchaseRequestForm
            form={prToFormValues(pr)}
            onChange={() => {}}
            readOnly
            prNumber={pr.prNumber}
          />
        )}
      </RecordDetailPage>

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
