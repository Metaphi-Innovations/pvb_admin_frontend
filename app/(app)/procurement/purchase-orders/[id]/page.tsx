"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
	Edit2,
	Send,
	CheckCircle2,
	FileText,
	Upload,
	Scissors,
} from "lucide-react";
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
import {
	PurchaseOrderForm,
	poToFormValues,
} from "../components/PurchaseOrderForm";
import { POFormLayout } from "../components/POFormLayout";
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
} from "../po-data";
import { canShortClosePO } from "../po-qty";
import { canUploadPOInvoice } from "../po-invoice-utils";

export default function PODetailPage() {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const id = Number(params.id);
	const [po, setPo] = useState(getPOById(id));
	const [uploadOpen, setUploadOpen] = useState(
		searchParams.get("upload") === "1",
	);
	const [uploadReplace, setUploadReplace] = useState(false);
	const [approvalOpen, setApprovalOpen] = useState(false);
	const [shortCloseOpen, setShortCloseOpen] = useState(false);
	const [approvalAction, setApprovalAction] = useState<"approve" | "reject">(
		"approve",
	);
	const [invoiceTick, setInvoiceTick] = useState(0);
	const [followUpTick, setFollowUpTick] = useState(0);
	const [toast, setToast] = useState<{
		msg: string;
		type: "success" | "error";
	} | null>(null);

	const refreshInvoices = useCallback(() => setInvoiceTick((t) => t + 1), []);

	useEffect(() => {
		setPo(getPOById(id));
	}, [id, invoiceTick, followUpTick]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (window.location.hash === "#follow-up-history") {
			const t = window.setTimeout(() => {
				document
					.getElementById("follow-up-history")
					?.scrollIntoView({ behavior: "smooth", block: "start" });
			}, 300);
			return () => window.clearTimeout(t);
		}
		if (window.location.hash === "#vendor-invoice") {
			const t = window.setTimeout(() => {
				document
					.getElementById("vendor-invoice")
					?.scrollIntoView({ behavior: "smooth", block: "start" });
			}, 300);
			return () => window.clearTimeout(t);
		}
		if (window.location.hash === "#three-way-match") {
			const t = window.setTimeout(() => {
				document
					.getElementById("three-way-match")
					?.scrollIntoView({ behavior: "smooth", block: "start" });
			}, 300);
			return () => window.clearTimeout(t);
		}
	}, [id, followUpTick, invoiceTick]);

	if (!po) {
		return (
			<div className='p-8 text-sm text-[#6B80A0]'>
				Purchase order not found.{" "}
				<Link href='/procurement/purchase-orders' className='text-brand-600'>
					Back
				</Link>
			</div>
		);
	}

	const canUploadInvoice = canUploadPOInvoice(po);
	const submittedDate =
		po.activity.find((a) => a.action.toLowerCase().includes("submit"))?.date ??
		po.updatedDate;

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
				<ProcButton
					variant='outline'
					size='sm'
					onClick={() =>
						router.push(`/procurement/purchase-orders/${po.id}/edit`)
					}
				>
					<Edit2 className='w-3.5 h-3.5' /> Edit
				</ProcButton>
			)}
			{po.status === "draft" && (
				<ProcButton
					variant='success'
					size='sm'
					onClick={() => update(submitPO(po), "po-submitted")}
				>
					<Send className='w-3.5 h-3.5' /> Submit
				</ProcButton>
			)}
			{po.status === "pending_approval" && (
				<>
					<ProcButton
						variant='success'
						size='sm'
						onClick={() => {
							setApprovalAction("approve");
							setApprovalOpen(true);
						}}
					>
						<CheckCircle2 className='w-3.5 h-3.5' /> Approve
					</ProcButton>
					<ProcButton
						variant='danger'
						size='sm'
						onClick={() => {
							setApprovalAction("reject");
							setApprovalOpen(true);
						}}
					>
						Reject
					</ProcButton>
				</>
			)}
			{canUploadInvoice && (
				<ProcButton
					variant='primary'
					size='sm'
					onClick={() => {
						setUploadReplace(po.status === "invoice_uploaded");
						setUploadOpen(true);
					}}
				>
					<Upload className='w-3.5 h-3.5' /> Upload Invoice
				</ProcButton>
			)}
			{canShortClosePO(po) && (
				<ProcButton
					variant='outline'
					size='sm'
					onClick={() => setShortCloseOpen(true)}
				>
					<Scissors className='w-3.5 h-3.5' /> Short Close PO
				</ProcButton>
			)}
			{["approved", "invoice_uploaded"].includes(po.status) && (
				<ProcButton
					variant='outline'
					size='sm'
					onClick={() => update(closePO(po), "po-saved")}
				>
					Close PO
				</ProcButton>
			)}
			{!["closed", "cancelled", "short_closed"].includes(po.status) && (
				<ProcButton
					variant='danger'
					size='sm'
					onClick={() => update(cancelPO(po), "po-saved")}
				>
					Cancel
				</ProcButton>
			)}
			<ProcButton variant='outline' size='sm'>
				<FileText className='w-3.5 h-3.5' /> PDF
			</ProcButton>
		</>
	);

	return (
		<>
			<POFormLayout
				mode='view'
				poNumber={po.poNumber}
				status={po.status}
				backHref='/procurement/purchase-orders'
				headerActions={headerActions}
			>
				<div className='grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 items-start'>
					<div className='space-y-4 min-w-0'>
						<POQtySummaryCard po={po} />
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
					<VendorFollowUpPanel
						po={po}
						onPOUpdated={(updated) => {
							savePurchaseOrders(
								loadPurchaseOrders().map((p) =>
									p.id === updated.id ? updated : p,
								),
							);
							setPo(updated);
							setFollowUpTick((t) => t + 1);
						}}
						onToast={(msg) => setToast({ msg, type: "success" })}
					/>
				</div>
			</POFormLayout>

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
