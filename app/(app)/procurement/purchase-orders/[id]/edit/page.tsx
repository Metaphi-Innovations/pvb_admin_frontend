"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Send } from "lucide-react";
import { CURRENT_USER } from "@/lib/procurement/config";
import { PurchaseOrderForm, poToFormValues, type POFormValues } from "../../components/PurchaseOrderForm";
import { getPOById, loadPurchaseOrders, savePurchaseOrders, recalcPO, submitPO } from "../../po-data";
import { todayStr } from "@/lib/procurement/utils";

export default function EditPOPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<POFormValues | null>(null);
  const [poNumber, setPoNumber] = useState("");

  useEffect(() => {
    const po = getPOById(id);
    if (po) {
      setForm(poToFormValues(po));
      setPoNumber(po.poNumber);
    }
  }, [id]);

  if (!form) return <AppLayout><p className="text-sm p-4">Loading…</p></AppLayout>;

  const save = (submit = false) => {
    const po = getPOById(id);
    if (!po) return;
    let updated = recalcPO({
      ...po,
      ...form,
      updatedBy: CURRENT_USER,
      updatedDate: todayStr(),
      activity: [...po.activity, { date: todayStr(), action: "Updated", by: CURRENT_USER }],
    });
    if (submit) updated = submitPO(updated);
    savePurchaseOrders(loadPurchaseOrders().map((p) => (p.id === id ? updated : p)));
    router.push(`/procurement/purchase-orders/${id}`);
  };

  return (
    <AppLayout noPadding>
      <div className="min-h-[calc(100vh-104px)] bg-background flex flex-col">
        <header className="bg-white border-b border-border/70 px-6 py-3 sticky top-0 z-20">
          <div className="max-w-[1400px] mx-auto flex items-center gap-3">
            <button type="button" onClick={() => router.push(`/procurement/purchase-orders/${id}`)} className="w-8 h-8 rounded-md border border-border/70 hover:bg-muted/40 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <h2 className="text-sm font-semibold">Edit Purchase Order</h2>
              <p className="text-[11px] text-muted-foreground">Procurement / Purchase Orders / {poNumber}</p>
            </div>
            <span className="font-mono text-xs font-semibold text-brand-700">{poNumber}</span>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => save(false)}>
              <Save className="w-3.5 h-3.5 mr-1" /> Save Draft
            </Button>
            <Button size="sm" className="h-8 text-xs bg-brand-600 text-white" onClick={() => save(true)}>
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
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push(`/procurement/purchase-orders/${id}`)}>
              Cancel
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => save(false)}>
              Save Draft
            </Button>
            <Button size="sm" className="h-8 text-xs bg-brand-600 text-white" onClick={() => save(true)}>
              Submit
            </Button>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
}
