"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  purchaseReturnListHref,
  purchaseReturnRoutes,
  validateReturnItems,
} from "@/app/(app)/procurement/purchase-returns/purchase-return-utils";
import { usePurchaseReturn, useUpdatePurchaseReturn } from "@/hooks/procurement";

export default function PurchaseReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [record, setRecord] = useState<PurchaseReturn | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const detailQuery = usePurchaseReturn(id);
  const updateMutation = useUpdatePurchaseReturn();

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

  const handleSubmit = () => {
    const e = validateReturnItems(record.items);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    updateMutation.mutate(
      { id: String(record.id), record },
      { onSuccess: () => router.push(`${purchaseReturnListHref()}&toast=pret-submitted`) },
    );
  };

  if (isDraft) {
    return (
      <PReturnFormLayout
        mode="view"
        returnNumber={record.returnNumber}
        footer={
          <PReturnFormFooter
            readOnly
            onCancel={() => router.push(purchaseReturnListHref())}
          />
        }
      >
        <div className="flex justify-end gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => router.push(purchaseReturnRoutes.edit(id))}
          >
            Edit Draft
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleSubmit}
          >
            <Send className="w-3.5 h-3.5" /> Submit
          </Button>
        </div>
        <PurchaseReturnForm record={record} onChange={() => {}} readOnly errors={errors} />
      </PReturnFormLayout>
    );
  }

  return (
    <RecordDetailPage
      listHref={purchaseReturnListHref()}
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
                record.status === "PO_return" || record.status === "Draft"
                  ? `/warehouse/packing/create/${record.packingListId}`
                  : "/warehouse/packing/purchase-return"
              }
            >
              <Package className="h-3.5 w-3.5" />
              {record.status === "PO_return" || record.status === "Draft"
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
  );
}
