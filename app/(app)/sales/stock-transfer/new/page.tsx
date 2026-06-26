"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Save, CheckCircle2, XCircle } from "lucide-react";
import StockTransferForm from "../components/StockTransferForm";
import {
  type StockTransferFormValues,
  validateStockTransferForm,
  buildTransferFromForm,
  createEmptyLineItem,
  generateTransferNumber,
  loadTransfers,
  saveTransfers,
  todayStr,
} from "../stock-transfer-data";
import { loadProductCatalog, type ProductCatalogItem } from "@/app/(app)/sales/orders/orders-data";

export default function AddStockTransferPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [transferNumber, setTransferNumber] = useState("ST-2024-004");
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const [form, setForm] = useState<StockTransferFormValues>({
    transferDate: todayStr(),
    deliveryDate: "",
    sourceWarehouseId: null,
    targetWarehouseId: null,
    status: "approved",
    lineItems: [createEmptyLineItem()],
    additionalExpenses: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setProducts(loadProductCatalog());
    const transfers = loadTransfers();
    setTransferNumber(generateTransferNumber(transfers));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSave = (asDraft: boolean) => {
    const e = validateStockTransferForm(form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      return;
    }

    const newTransfer = buildTransferFromForm(
      form,
      { transferNumber },
      asDraft
    );
    if (!newTransfer) {
      setToast({
        msg: "Invalid warehouse selection.",
        type: "error",
      });
      return;
    }

    const transfers = loadTransfers();
    saveTransfers([...transfers, newTransfer]);
    setToast({
      msg: asDraft
        ? "Stock transfer saved as draft."
        : "Stock transfer completed successfully.",
      type: "success",
    });
    setTimeout(() => router.push("/sales/stock-transfer"), 1000);
  };

  return (
    <FormContainer
      title="Add Stock Transfer"
      description="Sales → Stock Transfer → New Transfer"
      onBack={() => router.push("/sales/stock-transfer")}
      onCancel={() => router.push("/sales/stock-transfer")}
      cancelLabel="Discard"
      noCard={true}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleSave(true)}
          >
            Save as Draft
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => handleSave(false)}
          >
            <Save className="w-3.5 h-3.5" /> Submit Transfer
          </Button>
        </div>
      }
    >
      <StockTransferForm
        mode="add"
        transferNumber={transferNumber}
        form={form}
        onChange={setForm}
        errors={errors}
        products={products}
      />

      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {toast.msg}
        </div>
      )}
    </FormContainer>
  );
}
