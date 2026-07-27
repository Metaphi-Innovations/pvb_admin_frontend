"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Edit2,
  ListOrdered,
  ShoppingCart,
  Trash2,
  XCircle,
} from "lucide-react";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import {
  PurchaseRequestForm,
} from "../components/PurchaseRequestForm";
import { ProcurementApprovalModal } from "../../components/ProcurementApprovalModal";
import { Toast } from "../../components/ProcurementUI";
import { getErrorMessage } from "@/lib/masters/master-query-errors";
import { getPRStatusLabel } from "@/lib/procurement/pr-status";
import {
  detailToFormValues,
  useApproveRejectPurchaseRequest,
  useDeletePurchaseRequest,
  usePurchaseRequest,
} from "@/hooks/procurement";

function prStatusVariant(
  status: string,
): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "approved") return "active";
  if (status === "draft") return "draft";
  if (status === "rejected") return "blocked";
  if (status === "pending_approval") return "neutral";
  return "inactive";
}

export default function PRViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id ?? "");
  const detailQuery = usePurchaseRequest(id);
  const approveRejectMutation = useApproveRejectPurchaseRequest();
  const deleteMutation = useDeletePurchaseRequest();

  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">(
    "approve",
  );
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const detail = detailQuery.data;
  const formValues = useMemo(
    () => (detail ? detailToFormValues(detail) : null),
    [detail],
  );

  if (detailQuery.isLoading) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Loading purchase request…
      </div>
    );
  }

  if (!detail || !formValues) {
    return (
      <div className="p-8 text-sm font-semibold text-muted-foreground">
        Purchase Request not found.{" "}
        <Link
          href="/procurement/purchase-requests"
          className="text-brand-600 hover:underline"
        >
          Back to listing
        </Link>
      </div>
    );
  }

  const statusLabel = getPRStatusLabel(detail.status);
  const totalQty = detail.lines.reduce(
    (sum, line) => sum + (line.totalQtyBase || line.requestedQty || 0),
    0,
  );

  const headerActions = (
    <>
      {["draft", "rejected"].includes(detail.status) && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() =>
            router.push(`/procurement/purchase-requests/${id}/edit`)
          }
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </Button>
      )}
      {detail.status === "pending_approval" && (
        <>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => {
              setApprovalAction("approve");
              setApprovalOpen(true);
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => {
              setApprovalAction("reject");
              setApprovalOpen(true);
            }}
          >
            <XCircle className="w-3.5 h-3.5" /> Reject
          </Button>
        </>
      )}
      {detail.status === "approved" && detail.poStatus !== "created" && (
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
          onClick={() =>
            router.push(`/procurement/purchase-orders/new?prId=${id}`)
          }
        >
          <ShoppingCart className="w-3.5 h-3.5" /> Create PO
        </Button>
      )}
      {detail.status === "draft" && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (!window.confirm("Delete this draft purchase request?")) return;
            deleteMutation.mutate(id, {
              onSuccess: () => {
                router.push("/procurement/purchase-requests?toast=pr-deleted");
              },
              onError: (err) => {
                setToast({
                  msg: getErrorMessage(err, "Failed to delete."),
                  type: "error",
                });
              },
            });
          }}
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
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
        recordCode={detail.prNumber}
        statusLabel={statusLabel}
        statusVariant={prStatusVariant(detail.status)}
        kpis={[
          {
            icon: ListOrdered,
            iconBg: "bg-blue-100",
            iconColor: "text-blue-700",
            value: String(detail.lines.length),
            label: "Line Items",
          },
          {
            icon: ListOrdered,
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-700",
            value: String(totalQty),
            label: "Total Qty",
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
          prNumber={detail.prNumber}
        />
      </RecordDetailPage>

      <ProcurementApprovalModal
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        documentNo={detail.prNumber}
        documentLabel="Purchase Request"
        action={approvalAction}
        onConfirm={(remarks) => {
          approveRejectMutation.mutate(
            {
              id,
              action: approvalAction,
              remarks: remarks || undefined,
            },
            {
              onSuccess: () => {
                setToast({
                  msg:
                    approvalAction === "approve"
                      ? "PR approved."
                      : "PR rejected.",
                  type: "success",
                });
                setApprovalOpen(false);
                void detailQuery.refetch();
              },
              onError: (err) => {
                setToast({
                  msg: getErrorMessage(err, "Action failed."),
                  type: "error",
                });
              },
            },
          );
        }}
      />
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
