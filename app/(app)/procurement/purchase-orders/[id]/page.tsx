"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Edit2,
  FileText,
  IndianRupee,
  ListOrdered,
  RotateCcw,
  Scissors,
} from "lucide-react";
import {
  RecordDetailPage,
  type RecordDetailTab,
} from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import { ShortClosePOModal } from "../components/ShortClosePOModal";
import {
  POClosureInformation,
  POQtySummaryCard,
} from "../components/POClosureSection";
import { POIntegrationTabs } from "../components/POIntegrationTabs";
import { VendorFollowUpPanel } from "../components/VendorFollowUpPanel";
import {
  POActionConfirmModal,
  type POActionConfirmType,
} from "../components/POActionConfirmModal";
import { Toast } from "../../components/ProcurementUI";
import {
  PurchaseOrderForm,
  poToFormValues,
} from "../components/PurchaseOrderForm";
import { PO_STATUS_CFG, type POStatus } from "../po-data";
import { getPOTotalItems } from "../po-listing-utils";
import {
  canCancelPO,
  canClosePO,
  canCreatePurchaseReturnPO,
  canShortClosePO,
} from "../po-actions";
import { formatCurrency } from "@/lib/procurement/utils";
import {
  useCancelPurchaseOrder,
  useClosePurchaseOrder,
  useCreatePOFollowup,
  usePurchaseOrder,
  useShortClosePurchaseOrder,
} from "@/hooks/procurement";
import {
  mapFollowupsFromDetail,
  mapInvoicesFromDetail,
  PurchaseOrderService,
} from "@/services/purchase-order.service";
import { getErrorMessage } from "@/lib/masters/master-query-errors";
import { getPOStatusLabel } from "@/lib/procurement/po-status";
import { shortCloseReasonLabel } from "../po-qty";
import { PODetailPageSkeleton } from "../components/POSkeletons";
import { purchaseReturnRoutes } from "../../purchase-returns/purchase-return-utils";

const PO_TABS: RecordDetailTab[] = [
  { value: "overview", label: "Overview" },
  { value: "integration", label: "Integration" },
  { value: "follow-up", label: "Follow-up" },
];

function poStatusVariant(
  status: POStatus,
): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (
    status === "approved" ||
    status === "invoice_uploaded" ||
    status === "received"
  )
    return "active";
  if (status === "draft") return "draft";
  if (status === "rejected" || status === "cancelled") return "blocked";
  if (status === "pending_approval") return "neutral";
  return "inactive";
}

export default function PODetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = String(params.id ?? "");
  const detailQuery = usePurchaseOrder(id);
  const followupMutation = useCreatePOFollowup();
  const shortCloseMutation = useShortClosePurchaseOrder();
  const closeMutation = useClosePurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();

  const po = detailQuery.data;
  // console.log(po);
  const [activeTab, setActiveTab] = useState("overview");
  const [shortCloseOpen, setShortCloseOpen] = useState(
    searchParams.get("shortClose") === "1",
  );
  const [actionConfirmOpen, setActionConfirmOpen] = useState(false);
  const [actionConfirmType, setActionConfirmType] =
    useState<POActionConfirmType>("close");
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [rawDetail, setRawDetail] = useState<Record<string, unknown> | null>(
    null,
  );
  const [rawLoading, setRawLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setRawLoading(true);
    PurchaseOrderService.getRawById(id)
      .then((data) => {
        if (!cancelled) {
          setRawDetail(data);
          setRawLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRawDetail(null);
          setRawLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, detailQuery.dataUpdatedAt]);

  const invoices = useMemo(
    () => (rawDetail ? mapInvoicesFromDetail(rawDetail) : []),
    [rawDetail],
  );
  const followups = useMemo(
    () => (rawDetail ? mapFollowupsFromDetail(rawDetail) : []),
    [rawDetail],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash === "#follow-up-history") setActiveTab("follow-up");
    if (hash === "#vendor-invoice" || hash === "#three-way-match")
      setActiveTab("integration");
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  if (detailQuery.isLoading) {
    return <PODetailPageSkeleton />;
  }

  if (detailQuery.isError || !po) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        {getErrorMessage(detailQuery.error, "Purchase order not found.")}{" "}
        <Link
          href="/procurement/purchase-orders"
          className="text-brand-600 hover:underline"
        >
          Back
        </Link>
      </div>
    );
  }

  const statusLabel =
    PO_STATUS_CFG[po.status]?.label ?? getPOStatusLabel(po.status);

  const headerActions = (
    <>
      {["draft", "rejected"].includes(po.status) && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() =>
            router.push(`/procurement/purchase-orders/${po.id}/edit`)
          }
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </Button>
      )}
      {canShortClosePO(po) && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => setShortCloseOpen(true)}
        >
          <Scissors className="w-3.5 h-3.5" /> Short Close PO
        </Button>
      )}
      {canClosePO(po) && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            setActionConfirmType("close");
            setActionConfirmOpen(true);
          }}
        >
          Close PO
        </Button>
      )}
      {canCreatePurchaseReturnPO(po) && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => router.push(purchaseReturnRoutes.new(po.id, "po"))}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Purchase Return
        </Button>
      )}
      {canCancelPO(po) && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => {
            setActionConfirmType("cancel");
            setActionConfirmOpen(true);
          }}
        >
          Cancel
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        disabled={pdfLoading}
        onClick={async () => {
          try {
            setPdfLoading(true);
            await PurchaseOrderService.downloadPdfById(po.id);
            setToast({ msg: "PO PDF ready. Use browser save as PDF.", type: "success" });
          } catch (error) {
            setToast({
              msg: getErrorMessage(error, "Failed to generate PO PDF."),
              type: "error",
            });
          } finally {
            setPdfLoading(false);
          }
        }}
      >
        <FileText className="w-3.5 h-3.5" /> {pdfLoading ? "Generating..." : "Download PDF"}
      </Button>
    </>
  );

  return (
    <>
      <RecordDetailPage
        listHref="/procurement/purchase-orders"
        listLabel="Purchase Orders"
        recordName="Purchase Order"
        recordCode={po.poNumber}
        statusLabel={statusLabel}
        statusVariant={poStatusVariant(po.status)}
        kpis={[
          {
            icon: IndianRupee,
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-700",
            value: formatCurrency(po.summary.grandTotal),
            label: "Grand Total",
          },
          {
            icon: ListOrdered,
            iconBg: "bg-blue-100",
            iconColor: "text-blue-700",
            value: String(getPOTotalItems(po)),
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
        tabs={PO_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        headerActions={headerActions}
      >
        {activeTab === "overview" && (
          <div className="space-y-4">
            <POQtySummaryCard po={po} />
            <PurchaseOrderForm
              form={poToFormValues(po)}
              onChange={() => {}}
              poNumber={po.poNumber}
              readOnly
              status={po.status}
              submittedDate={po.updatedDate}
            />
            <POClosureInformation po={po} />
          </div>
        )}
        {activeTab === "integration" &&
          (rawLoading ? (
            <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
              <div className="h-8 w-44 rounded bg-muted animate-pulse" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-10 rounded bg-muted/60 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : (
            <POIntegrationTabs
              po={po}
              refreshKey={detailQuery.dataUpdatedAt}
              invoices={invoices}
            />
          ))}
        {activeTab === "follow-up" &&
          (rawLoading ? (
            <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
              <div className="h-8 w-48 rounded bg-muted animate-pulse" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-10 rounded bg-muted/60 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : (
            <VendorFollowUpPanel
              po={po}
              followups={followups}
              onSubmitFollowUp={(input) => {
                followupMutation.mutate(
                  {
                    purchaseOrderId: po.id,
                    followupDate: input.followUpAt,
                    followupType: input.followUpType,
                    nextFollowupDate: input.nextFollowUpAt,
                    spokeWith: input.spokeWith,
                    remarks: input.remarks,
                  },
                  {
                    onSuccess: () => {
                      setToast({ msg: "Follow-up saved.", type: "success" });
                      void detailQuery.refetch();
                    },
                    onError: (error) => {
                      setToast({
                        msg: getErrorMessage(
                          error,
                          "Failed to save follow-up.",
                        ),
                        type: "error",
                      });
                    },
                  },
                );
              }}
              submitting={followupMutation.isPending}
              onToast={(msg) => setToast({ msg, type: "success" })}
            />
          ))}
      </RecordDetailPage>

      <ShortClosePOModal
        open={shortCloseOpen}
        onOpenChange={setShortCloseOpen}
        po={po}
        submitting={shortCloseMutation.isPending}
        onConfirm={(payload) => {
          shortCloseMutation.mutate(
            {
              purchaseOrderId: po.id,
              shortCloseReason: shortCloseReasonLabel(payload.reason),
              shortCloseRemarks: payload.remarks,
              products: payload.products,
            },
            {
              onSuccess: () => {
                setShortCloseOpen(false);
                router.push(
                  "/procurement/purchase-orders?toast=po-short-closed",
                );
              },
              onError: (error) => {
                setToast({
                  msg: getErrorMessage(error, "Failed to short close PO."),
                  type: "error",
                });
              },
            },
          );
        }}
      />

      <POActionConfirmModal
        open={actionConfirmOpen}
        onOpenChange={setActionConfirmOpen}
        po={po}
        action={actionConfirmType}
        submitting={closeMutation.isPending || cancelMutation.isPending}
        onConfirm={() => {
          const mutation =
            actionConfirmType === "close" ? closeMutation : cancelMutation;
          mutation.mutate(po.id, {
            onSuccess: () => {
              setActionConfirmOpen(false);
              setToast({
                msg:
                  actionConfirmType === "close"
                    ? "PO closed."
                    : "PO cancelled.",
                type: "success",
              });
              void detailQuery.refetch();
            },
            onError: (error) => {
              setToast({
                msg: getErrorMessage(
                  error,
                  actionConfirmType === "close"
                    ? "Failed to close purchase order."
                    : "Failed to cancel purchase order.",
                ),
                type: "error",
              });
            },
          });
        }}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
