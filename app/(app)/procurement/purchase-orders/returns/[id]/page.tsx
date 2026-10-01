"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Send, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordDetailPage } from "@/components/record-detail";
import { formatCurrency } from "@/lib/procurement/utils";
import { PReturnFormLayout } from "../../../purchase-returns/components/PReturnFormLayout";
import { PReturnFormFooter } from "../../../purchase-returns/components/PReturnFormFooter";
import { PurchaseReturnForm } from "../../../purchase-returns/components/PurchaseReturnForm";
import {
  getPurchaseReturnById,
  PURCHASE_RETURN_STATUS_CFG,
  submitPurchaseReturn,
  type PurchaseReturn,
} from "../../../purchase-returns/purchase-return-data";
import { getPOById } from "../../po-data";
import { recalcPurchaseReturn } from "../../../purchase-returns/purchase-return-calc";
import {
  buildReturnableLinesForPO,
  purchaseReturnListHref,
  purchaseReturnRoutes,
  validateReturnItems,
} from "../../../purchase-returns/purchase-return-utils";

export default function PurchaseReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [record, setRecord] = useState<PurchaseReturn | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const existing = getPurchaseReturnById(id);
    if (!existing) return;
    const po = getPOById(existing.poId);
    if (!po) {
      setRecord(existing);
      return;
    }
    const freshLines = buildReturnableLinesForPO(po, existing.id, existing.items);
    setRecord(recalcPurchaseReturn({ ...existing, items: freshLines }, po));
  }, [id]);

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
  const isDraft = record.status === "draft";

  const handleSubmit = () => {
    const e = validateReturnItems(record.items);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    submitPurchaseReturn(record);
    router.push(`${purchaseReturnListHref()}&toast=pret-submitted`);
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
      statusLabel={statusCfg.label}
      statusVariant={
        record.status === "returned" || record.status === "approved"
          ? "active"
          : record.status === "draft"
            ? "draft"
            : "neutral"
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
