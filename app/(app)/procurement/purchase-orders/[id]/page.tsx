"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Edit2,
  FileText,
  IndianRupee,
  ListOrdered,
  Scissors,
  Send,
  Upload,
  XCircle,
} from "lucide-react";
import { RecordDetailPage, type RecordDetailTab } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import { UploadVendorInvoiceDialog } from "../components/UploadVendorInvoiceDialog";
import { ShortClosePOModal } from "../components/ShortClosePOModal";
import {
  POClosureInformation,
  POQtySummaryCard,
} from "../components/POClosureSection";
import { POIntegrationTabs } from "../components/POIntegrationTabs";
import { VendorFollowUpPanel } from "../components/VendorFollowUpPanel";
import { POActionConfirmModal, type POActionConfirmType } from "../components/POActionConfirmModal";
import { ProcurementApprovalModal } from "../../components/ProcurementApprovalModal";
import { Toast } from "../../components/ProcurementUI";
import { PurchaseOrderForm, poToFormValues } from "../components/PurchaseOrderForm";
import {
  getPOById,
  loadPurchaseOrders,
  savePurchaseOrders,
  submitPO,
  approvePO,
  rejectPO,
  closePO,
  cancelPO,
  PO_STATUS_CFG,
  type POStatus,
} from "../po-data";
import { getPOTotalItems } from "../po-listing-utils";
import { canShortClosePO } from "../po-qty";
import { canUploadPOInvoice } from "../po-invoice-utils";
import { formatCurrency } from "@/lib/procurement/utils";

const PO_TABS: RecordDetailTab[] = [
  { value: "overview", label: "Overview" },
  { value: "integration", label: "Integration" },
  { value: "follow-up", label: "Follow-up" },
];

function poStatusVariant(status: POStatus): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "approved" || status === "invoice_uploaded") return "active";
  if (status === "draft") return "draft";
  if (status === "rejected" || status === "cancelled") return "blocked";
  if (status === "pending_approval") return "neutral";
  return "inactive";
}

export default function PODetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(params.id);
  const [po, setPo] = useState(getPOById(id));
  const [activeTab, setActiveTab] = useState("overview");
  const [uploadOpen, setUploadOpen] = useState(searchParams.get("upload") === "1");
  const [uploadReplace, setUploadReplace] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [shortCloseOpen, setShortCloseOpen] = useState(false);
  const [actionConfirmOpen, setActionConfirmOpen] = useState(false);
  const [actionConfirmType, setActionConfirmType] = useState<POActionConfirmType>("close");
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [invoiceTick, setInvoiceTick] = useState(0);
  const [followUpTick, setFollowUpTick] = useState(0);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const refreshInvoices = useCallback(() => setInvoiceTick((t) => t + 1), []);

  useEffect(() => {
    setPo(getPOById(id));
  }, [id, invoiceTick, followUpTick]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash === "#follow-up-history") setActiveTab("follow-up");
    if (hash === "#vendor-invoice" || hash === "#three-way-match") setActiveTab("integration");
  }, [id, followUpTick, invoiceTick]);

  if (!po) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Purchase order not found.{" "}
        <Link href="/procurement/purchase-orders" className="text-brand-600 hover:underline">
          Back
        </Link>
      </div>
    );
  }

  const canUploadInvoice = canUploadPOInvoice(po);
  const submittedDate = po.activity.find((a) => a.action.toLowerCase().includes("submit"))?.date ?? po.updatedDate;
  const statusLabel = PO_STATUS_CFG[po.status]?.label ?? po.status;

  const update = (updated: typeof po, redirectToast?: string) => {
    savePurchaseOrders(
      loadPurchaseOrders().map((p) => (p.id === updated.id ? updated : p)),
    );
    if (redirectToast) {
      router.push(`/procurement/purchase-orders?toast=${redirectToast}`);
      return;
    }
    setPo(updated);
  };

  const headerActions = (
    <>
      {["draft", "rejected"].includes(po.status) && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => router.push(`/procurement/purchase-orders/${po.id}/edit`)}
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </Button>
      )}
      {po.status === "draft" && (
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
          onClick={() => update(submitPO(po), "po-submitted")}
        >
          <Send className="w-3.5 h-3.5" /> Submit
        </Button>
      )}
      {po.status === "pending_approval" && (
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
      {canUploadInvoice && (
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
          onClick={() => {
            setUploadReplace(po.status === "invoice_uploaded");
            setUploadOpen(true);
          }}
        >
          <Upload className="w-3.5 h-3.5" /> Upload Invoice
        </Button>
      )}
      {canShortClosePO(po) && (
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShortCloseOpen(true)}>
          <Scissors className="w-3.5 h-3.5" /> Short Close PO
        </Button>
      )}
      {["approved", "invoice_uploaded"].includes(po.status) && (
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
      {!["closed", "cancelled", "short_closed"].includes(po.status) && (
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
      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
        <FileText className="w-3.5 h-3.5" /> PDF
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
              submittedDate={submittedDate}
            />
            <POClosureInformation po={po} />
          </div>
        )}
        {activeTab === "integration" && (
          <POIntegrationTabs
            po={po}
            refreshKey={invoiceTick}
            onUpload={() => {
              setUploadReplace(false);
              setUploadOpen(true);
            }}
            onReplace={() => {
              setUploadReplace(true);
              setUploadOpen(true);
            }}
          />
        )}
        {activeTab === "follow-up" && (
          <VendorFollowUpPanel
            po={po}
            onPOUpdated={(updated) => {
              savePurchaseOrders(loadPurchaseOrders().map((p) => (p.id === updated.id ? updated : p)));
              setPo(updated);
              setFollowUpTick((t) => t + 1);
            }}
            onToast={(msg) => setToast({ msg, type: "success" })}
          />
        )}
      </RecordDetailPage>

      <UploadVendorInvoiceDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        po={po}
        replaceMode={uploadReplace}
        onSaved={() => {
          refreshInvoices();
          setPo(getPOById(id));
          setToast({ msg: "Vendor invoice saved.", type: "success" });
        }}
      />

      <ShortClosePOModal
        open={shortCloseOpen}
        onOpenChange={setShortCloseOpen}
        po={po}
        onConfirm={(updated) => update(updated, "po-short-closed")}
      />

      <ProcurementApprovalModal
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        documentNo={po.poNumber}
        documentLabel="Purchase Order"
        action={approvalAction}
        onConfirm={(remarks) => {
          update(
            approvalAction === "approve" ? approvePO(po) : rejectPO(po, remarks),
            approvalAction === "approve" ? "po-approved" : "po-rejected",
          );
          setApprovalOpen(false);
        }}
      />

      <POActionConfirmModal
        open={actionConfirmOpen}
        onOpenChange={setActionConfirmOpen}
        po={po}
        action={actionConfirmType}
        onConfirm={() => {
          update(
            actionConfirmType === "close" ? closePO(po) : cancelPO(po),
            "po-saved",
          );
          setToast({
            msg: actionConfirmType === "close" ? "PO closed." : "PO cancelled.",
            type: "success",
          });
        }}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
