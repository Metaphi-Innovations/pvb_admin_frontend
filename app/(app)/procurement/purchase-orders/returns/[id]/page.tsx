"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Send, IndianRupee, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordDetailPage } from "@/components/record-detail";
import { formatCurrency } from "@/lib/procurement/utils";
import { PReturnFormLayout } from "../../../purchase-returns/components/PReturnFormLayout";
import { PReturnFormFooter } from "../../../purchase-returns/components/PReturnFormFooter";
import { PurchaseReturnForm } from "../../../purchase-returns/components/PurchaseReturnForm";
import {
  PURCHASE_RETURN_STATUS_CFG,
  type PurchaseReturn,
} from "@/app/(app)/procurement/purchase-returns/purchase-return-data";
import {
  canEditPurchaseReturn,
  parsePurchaseReturnNavSource,
  purchaseReturnListHref,
  purchaseReturnRoutes,
  resolvePurchaseReturnBackHref,
  resolvePurchaseReturnRedirectWithToast,
  validateReturnItems,
} from "@/app/(app)/procurement/purchase-returns/purchase-return-utils";
import { usePurchaseReturn, useUpdatePurchaseReturn } from "@/hooks/procurement";
import { useFlashToast } from "../../../hooks/useFlashToast";
import { Toast } from "../../../components/ProcurementUI";

export default function PurchaseReturnDetailPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
      <PurchaseReturnDetailContent />
    </Suspense>
  );
}

function PurchaseReturnDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = String(params.id);
  const from = parsePurchaseReturnNavSource(searchParams.get("from"));
  const backHref = resolvePurchaseReturnBackHref(from);
  const [record, setRecord] = useState<PurchaseReturn | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const detailQuery = usePurchaseReturn(id);
  const updateMutation = useUpdatePurchaseReturn();

  useFlashToast(setToast);

  useEffect(() => {
    if (detailQuery.data) setRecord(detailQuery.data);
  }, [detailQuery.data]);

  if (!record) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Purchase return not found.{" "}
        <Link href={purchaseReturnListHref()} className="text-brand-600 hover:underline">
          Back
        </Link>
      </div>
    );
  }

  const statusCfg = PURCHASE_RETURN_STATUS_CFG[record.status];
  // View page draft branch is Draft-only (Edit permissions for PO Return live on the Edit page).
  const isDraft = record.status === "Draft" || record.status === "draft";
  const canEdit = canEditPurchaseReturn(record);

  const handleSubmit = () => {
    const e = validateReturnItems(record.items);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    updateMutation.mutate(
      { id: String(record.id), record },
      {
        onSuccess: () =>
          router.push(resolvePurchaseReturnRedirectWithToast(from, "pret-submitted")),
      },
    );
  };

  if (isDraft) {
    return (
      <>
        {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
        <PReturnFormLayout
          mode="view"
          returnNumber={record.returnNumber}
          backHref={backHref}
          footer={
            <PReturnFormFooter
              readOnly
              onCancel={() => router.push(backHref)}
            />
          }
        >
        <div className="flex justify-end gap-2 mb-3">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => router.push(purchaseReturnRoutes.edit(id, from))}
            >
              Edit Draft
            </Button>
          )}
          {canEdit && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={handleSubmit}
            >
              <Send className="w-3.5 h-3.5" /> Submit
            </Button>
          )}
        </div>
        <PurchaseReturnForm record={record} onChange={() => {}} readOnly errors={errors} />
        </PReturnFormLayout>
      </>
    );
  }

  return (
    <>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      <RecordDetailPage
      listHref={backHref}
      listLabel="Purchase Order"
      recordName="Purchase Return"
      recordCode={record.returnNumber}
      statusLabel={statusCfg?.label ?? record.status}
      statusVariant={
        record.status === "Received_By_Supplier"
          ? "active"
          : record.status === "Draft"
            ? "draft"
            : "neutral"
      }
      headerActions={
        record.packingListId ? (
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Link
              href={
                record.status === "Ready For Packing" ||
                record.status === "PO_return" ||
                record.status === "Draft" ||
                record.status === "Partially Packed"
                  ? `/warehouse/packing/create/${record.packingListId}`
                  : "/warehouse/packing/purchase-return"
              }
            >
              <Package className="h-3.5 w-3.5" />
              {record.status === "Ready For Packing" ||
              record.status === "PO_return" ||
              record.status === "Draft" ||
              record.status === "Partially Packed"
                ? "Continue to Packing"
                : `View Packing (${record.packingListNo || "PL"})`}
            </Link>
          </Button>
        ) : undefined
      }
      kpis={[
        {
          icon: Send,
          iconBg: "bg-brand-50",
          iconColor: "text-brand-600",
          value: String(record.totalItems),
          label: "Total Items",
        },
        {
          icon: Send,
          iconBg: "bg-red-50",
          iconColor: "text-red-600",
          value: String(record.totalReturnQty),
          label: "Total Return Qty",
        },
        {
          icon: IndianRupee,
          iconBg: "bg-emerald-50",
          iconColor: "text-emerald-700",
          value: formatCurrency(record.summary?.grandTotal ?? 0),
          label: "Grand Total",
        },
      ]}
      tabs={[{ value: "overview", label: "Overview" }]}
      activeTab="overview"
      onTabChange={() => {}}
    >
      <PurchaseReturnForm record={record} onChange={() => {}} readOnly />
      </RecordDetailPage>
    </>
  );
}
