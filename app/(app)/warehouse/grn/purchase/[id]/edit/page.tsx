"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function EditPurchaseGrnPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  return (
    <RecordDetailPage
      listHref="/warehouse/grn/purchase"
      listLabel="GRN"
      recordName={`Edit GRN #${params.id}`}
      statusLabel="Under Development"
      statusVariant="neutral"
    >
      <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
        <AlertCircle className="w-12 h-12 text-brand-600 mx-auto" />
        <h1 className="text-base font-bold text-foreground">Edit Purchase GRN</h1>
        <p className="text-xs text-muted-foreground">
          Editing finalized/received Goods Receipt Notes is currently restricted in the system.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push(`/warehouse/grn/purchase/${params.id}`)}>
          Back to View
        </Button>
      </div>
    </RecordDetailPage>
  );
}
