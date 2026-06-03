"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Send } from "lucide-react";
import { CURRENT_USER } from "@/lib/procurement/config";
import { PurchaseOrderForm, defaultPOForm, type POFormValues } from "../components/PurchaseOrderForm";
import {
  loadPurchaseOrders,
  savePurchaseOrders,
  generatePONumber,
  recalcPO,
  submitPO,
} from "../po-data";
import { nextId, todayStr } from "@/lib/procurement/utils";
import type { PurchaseOrder } from "../po-data";
import { loadPurchaseRequests, savePurchaseRequests } from "../../purchase-requests/pr-data";

export default function NewPOPage() {
  return (
    <Suspense fallback={<AppLayout><p className="text-sm p-4">Loading…</p></AppLayout>}>
      <NewPOContent />
    </Suspense>
  );
}

function NewPOContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prId = searchParams.get("prId") ? Number(searchParams.get("prId")) : null;
  const [form, setForm] = useState<POFormValues | null>(null);
  const [poNumber, setPoNumber] = useState("");

  useEffect(() => {
    const list = loadPurchaseOrders();
    setPoNumber(generatePONumber(list));
    setForm(defaultPOForm(prId));
  }, [prId]);

  if (!form) return <AppLayout><p className="text-sm p-4">Loading…</p></AppLayout>;

  const persist = (submit: boolean) => {
    const list = loadPurchaseOrders();
    const today = todayStr();
    const draft: PurchaseOrder = {
      id: nextId(list),
      poNumber,
      ...form,
      summary: {
        grossAmount: 0,
        totalDiscount: 0,
        taxableValue: 0,
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 0,
        otherCharges: form.otherCharges,
        grandTotal: 0,
        amountInWords: "",
      },
      status: "draft",
      createdBy: CURRENT_USER,
      createdDate: today,
      updatedBy: CURRENT_USER,
      updatedDate: today,
      approvedBy: "",
      approvedDate: "",
      activity: [{ date: today, action: "Created", by: CURRENT_USER }],
    };
    let record = recalcPO(draft);
    if (submit) record = submitPO(record);
    savePurchaseOrders([...list, record]);

    if (form.sourcePrId) {
      const prs = loadPurchaseRequests().map((p) => {
        if (p.id !== form.sourcePrId) return p;
        return {
          ...p,
          convertedPoIds: [...p.convertedPoIds, record.id],
          status: "partially_converted" as const,
        };
      });
      savePurchaseRequests(prs);
    }
    router.push("/procurement/purchase-orders");
  };

  return (
    <AppLayout noPadding>
      <div className="min-h-[calc(100vh-104px)] bg-background flex flex-col">
        <header className="bg-white border-b border-border/70 px-6 py-3 sticky top-0 z-20">
          <div className="max-w-[1400px] mx-auto flex items-center gap-3">
            <button type="button" onClick={() => router.push("/procurement/purchase-orders")} className="w-8 h-8 rounded-md border border-border/70 hover:bg-muted/40 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold">Create Purchase Order</h2>
              <p className="text-[11px] text-muted-foreground">Procurement / Purchase Orders / New</p>
            </div>
            <span className="font-mono text-xs font-semibold text-brand-700">{poNumber}</span>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => persist(false)}>
              <Save className="w-3.5 h-3.5 mr-1" /> Save Draft
            </Button>
            <Button size="sm" className="h-8 text-xs bg-brand-600 text-white" onClick={() => persist(true)}>
              <Send className="w-3.5 h-3.5 mr-1" /> Submit
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-[1400px] mx-auto">
            <PurchaseOrderForm form={form} onChange={setForm} poNumber={poNumber} />
          </div>
        </div>

        <footer className="bg-white border-t border-border/70 px-6 py-2.5 sticky bottom-0 z-20">
          <div className="max-w-[1400px] mx-auto flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push("/procurement/purchase-orders")}>
              Cancel
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => persist(false)}>
              Save Draft
            </Button>
            <Button size="sm" className="h-8 text-xs bg-brand-600 text-white" onClick={() => persist(true)}>
              Submit
            </Button>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
}
