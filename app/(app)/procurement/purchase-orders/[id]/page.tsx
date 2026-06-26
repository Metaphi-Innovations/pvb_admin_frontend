"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Edit2, Send, CheckCircle2, FileText, Upload, Scissors, XCircle } from "lucide-react";
import {
  RecordDetailPage,
  type RecordDetailSidebarProps,
  type RecordDetailTab,
} from "@/components/record-detail";
import { UploadVendorInvoiceDialog } from "../components/UploadVendorInvoiceDialog";
import { ShortClosePOModal } from "../components/ShortClosePOModal";
import {
	POClosureInformation,
	POQtySummaryCard,
} from "../components/POClosureSection";
import { POIntegrationTabs } from "../components/POIntegrationTabs";
import { VendorFollowUpPanel } from "../components/VendorFollowUpPanel";
import { ProcurementApprovalModal } from "../../components/ProcurementApprovalModal";
import { Toast } from "../../components/ProcurementUI";
import { PurchaseOrderForm, poToFormValues } from "../components/PurchaseOrderForm";
import { ProcButton } from "../../design/proc-design";
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
import { canShortClosePO, getPOQtySummary } from "../po-qty";
import { canUploadPOInvoice } from "../po-invoice-utils";
import { getPOTotalSkuQty } from "../po-listing-utils";
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

function poApprovalTone(status: POStatus): "pending" | "approved" | "rejected" | "neutral" {
  if (status === "pending_approval") return "pending";
  if (["approved", "invoice_uploaded", "short_closed", "closed"].includes(status)) return "approved";
  if (status === "rejected" || status === "cancelled") return "rejected";
  return "neutral";
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
			<>
				<div className='p-8 text-sm text-[#6B80A0]'>
					Purchase order not found.{" "}
					<Link href='/procurement/purchase-orders' className='text-brand-600'>
						Back
					</Link>
				</div>
			</>
		);
	}

  const canUploadInvoice = canUploadPOInvoice(po);
  const submittedDate = po.activity.find((a) => a.action.toLowerCase().includes("submit"))?.date ?? po.updatedDate;
  const qtySummary = getPOQtySummary(po);
  const formatRupee = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  const quickActions: RecordDetailSidebarProps["quickActions"] = [];
  if (["draft", "rejected"].includes(po.status)) {
    quickActions.push({
      label: "Edit",
      icon: Edit2,
      onClick: () => router.push(`/procurement/purchase-orders/${po.id}/edit`),
      variant: "primary",
    });
  }
  if (po.status === "draft") {
    quickActions.push({
      label: "Submit",
      icon: Send,
      onClick: () => update(submitPO(po), "po-submitted"),
    });
  }
  if (po.status === "pending_approval") {
    quickActions.push(
      {
        label: "Approve",
        icon: CheckCircle2,
        onClick: () => {
          setApprovalAction("approve");
          setApprovalOpen(true);
        },
        variant: "primary",
      },
      {
        label: "Reject",
        icon: XCircle,
        onClick: () => {
          setApprovalAction("reject");
          setApprovalOpen(true);
        },
      },
    );
  }
  if (canUploadInvoice) {
    quickActions.push({
      label: "Upload Invoice",
      icon: Upload,
      onClick: () => {
        setUploadReplace(po.status === "invoice_uploaded");
        setUploadOpen(true);
      },
    });
  }

  const headerActions = (
    <>
      {["draft", "rejected"].includes(po.status) && (
        <ProcButton variant="outline" size="sm" onClick={() => router.push(`/procurement/purchase-orders/${po.id}/edit`)}>
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </ProcButton>
      )}
      {po.status === "draft" && (
        <ProcButton variant="success" size="sm" onClick={() => update(submitPO(po), "po-submitted")}>
          <Send className="w-3.5 h-3.5" /> Submit
        </ProcButton>
      )}
      {po.status === "pending_approval" && (
        <>
          <ProcButton variant="success" size="sm" onClick={() => { setApprovalAction("approve"); setApprovalOpen(true); }}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </ProcButton>
          <ProcButton variant="danger" size="sm" onClick={() => { setApprovalAction("reject"); setApprovalOpen(true); }}>
            Reject
          </ProcButton>
        </>
      )}
      {canUploadInvoice && (
        <ProcButton variant="primary" size="sm" onClick={() => { setUploadReplace(po.status === "invoice_uploaded"); setUploadOpen(true); }}>
          <Upload className="w-3.5 h-3.5" /> Upload Invoice
        </ProcButton>
      )}
      {canShortClosePO(po) && (
        <ProcButton variant="outline" size="sm" onClick={() => setShortCloseOpen(true)}>
          <Scissors className="w-3.5 h-3.5" /> Short Close PO
        </ProcButton>
      )}
      {["approved", "invoice_uploaded"].includes(po.status) && (
        <ProcButton variant="outline" size="sm" onClick={() => update(closePO(po), "po-saved")}>Close PO</ProcButton>
      )}
      {!["closed", "cancelled", "short_closed"].includes(po.status) && (
        <ProcButton variant="danger" size="sm" onClick={() => update(cancelPO(po), "po-saved")}>Cancel</ProcButton>
      )}
      <ProcButton variant="outline" size="sm"><FileText className="w-3.5 h-3.5" /> PDF</ProcButton>
    </>
  );

  const sidebar: RecordDetailSidebarProps = {
    quickActions,
    summary: [
      { label: "Supplier", value: po.supplierName },
      { label: "PO Date", value: po.poDate },
      { label: "PR Reference", value: po.sourcePrNumber || "—" },
      { label: "Warehouse", value: po.warehouseName || "—" },
      { label: "Line Items", value: String(po.lines.filter((l) => l.productId > 0).length) },
      { label: "Total SKU Qty", value: String(getPOTotalSkuQty(po)) },
      { label: "Product Total", value: formatCurrency(po.summary.productTotal ?? po.summary.taxableValue) },
      { label: "Grand Total", value: formatRupee(po.summary.grandTotal), highlight: true },
      { label: "Ordered Qty", value: String(qtySummary.orderedQty) },
      { label: "Pending Qty", value: String(qtySummary.pendingQty) },
    ],
    activity: [...po.activity].reverse().map((a, i) => ({
      id: `${a.date}-${i}`,
      title: a.action,
      subtitle: a.note ? `${a.by} · ${a.note}` : a.by,
      date: a.date,
    })),
    approval: [
      {
        label: "Status",
        value: PO_STATUS_CFG[po.status]?.label ?? po.status,
        tone: poApprovalTone(po.status),
      },
    ],
  };

  return (
    <>
      <RecordDetailPage
        listHref="/procurement/purchase-orders"
        listLabel="Purchase Orders"
        recordName="Purchase Order"
        recordCode={po.poNumber}
        statusLabel={PO_STATUS_CFG[po.status]?.label ?? po.status}
        statusVariant={poStatusVariant(po.status)}
        tabs={PO_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        headerActions={headerActions}
        sidebar={sidebar}
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
            onUpload={() => { setUploadReplace(false); setUploadOpen(true); }}
            onReplace={() => { setUploadReplace(true); setUploadOpen(true); }}
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
					setToast({ msg: "Supplier invoice saved.", type: "success" });
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
				documentLabel='Purchase Order'
				action={approvalAction}
				onConfirm={(remarks) => {
					update(
						approvalAction === "approve"
							? approvePO(po)
							: rejectPO(po, remarks),
						approvalAction === "approve" ? "po-approved" : "po-rejected",
					);
					setApprovalOpen(false);
				}}
			/>

			{toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
		</>
	);
}
