"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout, PageShell } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit2, Send, CheckCircle2, Mail, FileText } from "lucide-react";
import {
  ActivityTimeline,
  ApprovalHistoryPanel,
  StatusPill,
} from "../../components/ProcurementUI";
import { PurchaseOrderForm, poToFormValues } from "../components/PurchaseOrderForm";
import {
  getPOById,
  loadPurchaseOrders,
  savePurchaseOrders,
  PO_STATUS_CFG,
  submitPO,
  approvePO,
  rejectPO,
} from "../po-data";
import { PROCUREMENT_APPROVAL, CURRENT_USER } from "@/lib/procurement/config";
import { formatCurrency, todayStr } from "@/lib/procurement/utils";

export default function PODetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [po, setPo] = useState(getPOById(id));

  useEffect(() => setPo(getPOById(id)), [id]);

  if (!po) {
    return (
      <AppLayout>
        <p className="text-sm">Purchase order not found.</p>
        <Link href="/procurement/purchase-orders" className="text-brand-600 text-xs">Back</Link>
      </AppLayout>
    );
  }

  const update = (updated: typeof po) => {
    savePurchaseOrders(loadPurchaseOrders().map((p) => (p.id === updated.id ? updated : p)));
    setPo(updated);
  };

  return (
    <AppLayout>
      <PageShell className="max-w-none space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.back()} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold font-mono">{po.poNumber}</h1>
              <p className="text-xs text-muted-foreground">{po.supplierName}</p>
              <div className="flex gap-2 mt-1 items-center">
                <StatusPill status={po.status} config={PO_STATUS_CFG} />
                <span className="text-sm font-bold text-brand-700">{formatCurrency(po.summary.grandTotal)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {["draft", "rejected"].includes(po.status) && (
              <Link href={`/procurement/purchase-orders/${po.id}/edit`}>
                <Button variant="outline" size="sm" className="h-8 text-xs"><Edit2 className="w-3.5 h-3.5 mr-1" /> Edit</Button>
              </Link>
            )}
            {po.status === "draft" && (
              <Button size="sm" className="h-8 text-xs bg-brand-600 text-white" onClick={() => update(submitPO(po))}><Send className="w-3.5 h-3.5 mr-1" /> Submit</Button>
            )}
            {po.status === "pending_approval" && (
              <>
                <Button size="sm" className="h-8 text-xs" onClick={() => update(approvePO(po))}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve</Button>
                <Button variant="outline" size="sm" className="h-8 text-xs text-red-600" onClick={() => update(rejectPO(po))}>Reject</Button>
              </>
            )}
            {po.status === "approved" && (
              <Button size="sm" className="h-8 text-xs" onClick={() => update({ ...po, status: "sent_to_supplier", activity: [...po.activity, { date: todayStr(), action: "Sent to Supplier", by: CURRENT_USER }] })}>
                <Mail className="w-3.5 h-3.5 mr-1" /> Send to Supplier
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 text-xs"><FileText className="w-3.5 h-3.5 mr-1" /> PDF / Print</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <PurchaseOrderForm form={poToFormValues(po)} onChange={() => {}} poNumber={po.poNumber} readOnly />
          </div>
          <div className="space-y-4">
            <div className="bg-white border border-border rounded-xl p-4 text-[11px] space-y-2">
              <p className="text-xs font-semibold">Audit Trail</p>
              <p>Created: {po.createdBy} · {po.createdDate}</p>
              <p>Updated: {po.updatedBy} · {po.updatedDate}</p>
              {po.approvedBy && <p>Approved: {po.approvedBy} · {po.approvedDate}</p>}
            </div>
            <ApprovalHistoryPanel enabled={PROCUREMENT_APPROVAL.poEnabled} status={po.status} approvedBy={po.approvedBy} approvedDate={po.approvedDate} />
            <div className="bg-white border border-border rounded-xl p-4">
              <p className="text-xs font-semibold mb-3">Activity Timeline</p>
              <ActivityTimeline entries={po.activity} />
            </div>
          </div>
        </div>
      </PageShell>
    </AppLayout>
  );
}
